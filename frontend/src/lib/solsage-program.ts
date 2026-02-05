// SolSage Program Service
// Builds and sends transactions to the deployed SolSage program

import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
    SOLSAGE_PROGRAM_ID,
    RPC_ENDPOINT,
    PROTOCOL_SEED,
    KNOWLEDGE_SEED,
    ATTRIBUTION_SEED,
} from './solsage-config';

// Connection to Solana devnet
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Borsh schema helpers for instruction serialization
function serializeString(str: string): Uint8Array {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, encoded.length, true);
    const result = new Uint8Array(4 + encoded.length);
    result.set(len);
    result.set(encoded, 4);
    return result;
}

function serializeU8(value: number): Uint8Array {
    return new Uint8Array([value]);
}

function serializeU64(value: bigint): Uint8Array {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigUint64(0, value, true);
    return new Uint8Array(buffer);
}

// Instruction discriminators (first 8 bytes of sha256("global:<instruction_name>"))
const INSTRUCTION_DISCRIMINATORS = {
    initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
    stake_knowledge: new Uint8Array([113, 12, 110, 85, 80, 21, 46, 84]),
    record_attribution: new Uint8Array([226, 192, 112, 45, 156, 82, 14, 31]),
    claim_rewards: new Uint8Array([4, 144, 132, 71, 116, 23, 151, 80]),
};

// Interface for knowledge entry data
export interface KnowledgeEntryData {
    staker: PublicKey;
    contentHash: Uint8Array;
    title: string;
    category: string;
    createdAt: number;
    totalAttributions: number;
    pendingRewards: number;
    isActive: boolean;
    bump: number;
}

// Interface for protocol state
export interface ProtocolData {
    authority: PublicKey;
    totalKnowledgeEntries: number;
    totalAttributions: number;
    rewardPerAttribution: number;
    bump: number;
}

// Derive PDAs
export function deriveProtocolPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(PROTOCOL_SEED)],
        SOLSAGE_PROGRAM_ID
    );
}

export function deriveKnowledgePDA(
    staker: PublicKey,
    contentHash: Uint8Array
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(KNOWLEDGE_SEED), staker.toBuffer(), contentHash],
        SOLSAGE_PROGRAM_ID
    );
}

export function deriveAttributionPDA(
    queryHash: Uint8Array,
    knowledgeEntry: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(ATTRIBUTION_SEED), queryHash, knowledgeEntry.toBuffer()],
        SOLSAGE_PROGRAM_ID
    );
}

// Hash content using SHA-256
export async function hashContent(content: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    return new Uint8Array(hashBuffer);
}

// Check if protocol is initialized
export async function isProtocolInitialized(): Promise<boolean> {
    try {
        const [protocolPDA] = deriveProtocolPDA();
        const accountInfo = await connection.getAccountInfo(protocolPDA);
        return accountInfo !== null;
    } catch {
        return false;
    }
}

// Initialize the protocol (one-time setup)
export async function initializeProtocol(
    wallet: WalletContextState
): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    const [protocolPDA] = deriveProtocolPDA();

    // Build instruction data: discriminator only
    const instructionData = INSTRUCTION_DISCRIMINATORS.initialize;

    const instruction = new TransactionInstruction({
        programId: SOLSAGE_PROGRAM_ID,
        keys: [
            { pubkey: protocolPDA, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(instructionData),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
}

// Stake knowledge to the protocol
export async function stakeKnowledge(
    wallet: WalletContextState,
    content: string,
    title: string,
    category: string
): Promise<{ signature: string; contentHash: Uint8Array; knowledgePDA: PublicKey }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (title.length > 100) throw new Error('Title must be 100 characters or less');
    if (category.length > 50) throw new Error('Category must be 50 characters or less');

    // Compute content hash
    const contentHash = await hashContent(content);

    // Derive PDAs
    const [protocolPDA] = deriveProtocolPDA();
    const [knowledgePDA] = deriveKnowledgePDA(wallet.publicKey, contentHash);

    // Build instruction data: discriminator + content_hash + title + category
    const instructionData = new Uint8Array([
        ...INSTRUCTION_DISCRIMINATORS.stake_knowledge,
        ...contentHash,
        ...serializeString(title),
        ...serializeString(category),
    ]);

    const instruction = new TransactionInstruction({
        programId: SOLSAGE_PROGRAM_ID,
        keys: [
            { pubkey: protocolPDA, isSigner: false, isWritable: true },
            { pubkey: knowledgePDA, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(instructionData),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return { signature, contentHash, knowledgePDA };
}

// Record an attribution when knowledge is used
export async function recordAttribution(
    wallet: WalletContextState,
    knowledgeEntryPDA: PublicKey,
    queryHash: Uint8Array,
    relevanceScore: number
): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    if (relevanceScore > 100) throw new Error('Relevance score must be 0-100');

    // Derive PDAs
    const [protocolPDA] = deriveProtocolPDA();
    const [attributionPDA] = deriveAttributionPDA(queryHash, knowledgeEntryPDA);

    // Build instruction data: discriminator + query_hash + relevance_score
    const instructionData = new Uint8Array([
        ...INSTRUCTION_DISCRIMINATORS.record_attribution,
        ...queryHash,
        ...serializeU8(relevanceScore),
    ]);

    const instruction = new TransactionInstruction({
        programId: SOLSAGE_PROGRAM_ID,
        keys: [
            { pubkey: protocolPDA, isSigner: false, isWritable: true },
            { pubkey: knowledgeEntryPDA, isSigner: false, isWritable: true },
            { pubkey: attributionPDA, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(instructionData),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
}

// Claim pending rewards
export async function claimRewards(
    wallet: WalletContextState,
    knowledgeEntryPDA: PublicKey
): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    // Build instruction data: discriminator only
    const instructionData = INSTRUCTION_DISCRIMINATORS.claim_rewards;

    const instruction = new TransactionInstruction({
        programId: SOLSAGE_PROGRAM_ID,
        keys: [
            { pubkey: knowledgeEntryPDA, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.from(instructionData),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
}

// Fetch protocol state
export async function fetchProtocolState(): Promise<ProtocolData | null> {
    try {
        const [protocolPDA] = deriveProtocolPDA();
        const accountInfo = await connection.getAccountInfo(protocolPDA);

        if (!accountInfo) return null;

        // Parse account data (skip 8-byte discriminator for Anchor accounts)
        const data = accountInfo.data;
        let offset = 8;

        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const totalKnowledgeEntries = Number(data.readBigUInt64LE(offset));
        offset += 8;

        const totalAttributions = Number(data.readBigUInt64LE(offset));
        offset += 8;

        const rewardPerAttribution = Number(data.readBigUInt64LE(offset));
        offset += 8;

        const bump = data[offset];

        return {
            authority,
            totalKnowledgeEntries,
            totalAttributions,
            rewardPerAttribution,
            bump,
        };
    } catch (error) {
        console.error('Error fetching protocol state:', error);
        return null;
    }
}

// Fetch all knowledge entries for a staker
export async function fetchKnowledgeEntriesByStaker(
    staker: PublicKey
): Promise<KnowledgeEntryData[]> {
    try {
        // Get all program accounts filtered by staker
        const accounts = await connection.getProgramAccounts(SOLSAGE_PROGRAM_ID, {
            filters: [
                // Filter by account size (knowledge entry size)
                { dataSize: 8 + 32 + 32 + 4 + 100 + 4 + 50 + 8 + 8 + 8 + 1 + 1 },
                // Filter by staker pubkey at offset 8 (after discriminator)
                {
                    memcmp: {
                        offset: 8,
                        bytes: staker.toBase58(),
                    },
                },
            ],
        });

        return accounts.map(({ account }) => {
            const data = account.data;
            let offset = 8;

            const stakerPubkey = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;

            const contentHash = new Uint8Array(data.slice(offset, offset + 32));
            offset += 32;

            // Read title (4-byte length + string)
            const titleLen = data.readUInt32LE(offset);
            offset += 4;
            const title = data.slice(offset, offset + titleLen).toString('utf8');
            offset += titleLen;

            // Read category (4-byte length + string)
            const categoryLen = data.readUInt32LE(offset);
            offset += 4;
            const category = data.slice(offset, offset + categoryLen).toString('utf8');
            offset += categoryLen;

            const createdAt = Number(data.readBigInt64LE(offset));
            offset += 8;

            const totalAttributions = Number(data.readBigUInt64LE(offset));
            offset += 8;

            const pendingRewards = Number(data.readBigUInt64LE(offset));
            offset += 8;

            const isActive = data[offset] === 1;
            offset += 1;

            const bump = data[offset];

            return {
                staker: stakerPubkey,
                contentHash,
                title,
                category,
                createdAt,
                totalAttributions,
                pendingRewards,
                isActive,
                bump,
            };
        });
    } catch (error) {
        console.error('Error fetching knowledge entries:', error);
        return [];
    }
}

// Get Solana Explorer URL for a transaction
export function getExplorerUrl(signature: string): string {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

// Get connection for external use
export function getConnection(): Connection {
    return connection;
}
