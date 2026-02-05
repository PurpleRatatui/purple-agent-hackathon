// SolSage Program Configuration
// Deployed via Solana Playground to Devnet

import { PublicKey, clusterApiUrl } from '@solana/web3.js';

// Program ID - Deployed to Solana Devnet
export const SOLSAGE_PROGRAM_ID = new PublicKey('7E5HrDxxHXMxz4rNHj8k6JXwSP34GC7SgssemZWVBF5R');

// Wallet Authority (from deployment)
export const WALLET_AUTHORITY = 'ALd1imXGVc8GC8CkP71ifrZa8FKMVBXxTSX9MRFXrSu';

// Network Configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = clusterApiUrl('devnet');

// Program Seeds
export const PROTOCOL_SEED = 'protocol';
export const KNOWLEDGE_SEED = 'knowledge';
export const ATTRIBUTION_SEED = 'attribution';

// Reward Configuration
export const REWARD_PER_ATTRIBUTION = 1_000_000; // 1 SAGE token (6 decimals)

// Account Sizes (for rent calculation)
export const PROTOCOL_SIZE = 32 + 8 + 8 + 8 + 1; // 57 bytes
export const KNOWLEDGE_ENTRY_SIZE = 32 + 32 + 104 + 54 + 8 + 8 + 8 + 1 + 1; // 248 bytes
export const ATTRIBUTION_SIZE = 32 + 32 + 1 + 8 + 1 + 1; // 75 bytes

// Helper function to derive PDAs
export async function deriveProtocolPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(PROTOCOL_SEED)],
        SOLSAGE_PROGRAM_ID
    );
}

export async function deriveKnowledgePDA(
    staker: PublicKey,
    contentHash: Uint8Array
): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(KNOWLEDGE_SEED), staker.toBuffer(), contentHash],
        SOLSAGE_PROGRAM_ID
    );
}

export async function deriveAttributionPDA(
    queryHash: Uint8Array,
    knowledgeEntry: PublicKey
): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(ATTRIBUTION_SEED), queryHash, knowledgeEntry.toBuffer()],
        SOLSAGE_PROGRAM_ID
    );
}
