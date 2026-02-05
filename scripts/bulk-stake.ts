// Bulk Knowledge Staking Script for SolSage
// Run with: npx ts-node scripts/bulk-stake.ts

import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    Keypair,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PROGRAM_ID = new PublicKey('7E5HrDxxHXMxz4rNHj8k6JXwSP34GC7SgssemZWVBF5R');
const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const PROTOCOL_SEED = 'protocol';
const KNOWLEDGE_SEED = 'knowledge';

// Knowledge entries - useful for both humans and AI agents
const KNOWLEDGE_ENTRIES = [
    // Solana Basics
    {
        title: "How to connect to Solana RPC",
        content: "Use @solana/web3.js: const connection = new Connection('https://api.mainnet-beta.solana.com'). For devnet use 'https://api.devnet.solana.com'. Consider using private RPC providers like Helius, QuickNode, or Alchemy for production.",
        category: "solana-basics"
    },
    {
        title: "Understanding Solana accounts",
        content: "Solana accounts store data and SOL. Every account has an owner program that can modify its data. Accounts must be rent-exempt (hold ~0.00089 SOL per byte). Use SystemProgram.createAccount() to create new accounts.",
        category: "solana-basics"
    },
    {
        title: "What are Program Derived Addresses (PDAs)",
        content: "PDAs are deterministic addresses derived from seeds and a program ID using Pubkey.findProgramAddress(['seed'], programId). They have no private key and can only be signed by their owning program. Use for storing program state.",
        category: "solana-basics"
    },

    // DeFi Knowledge
    {
        title: "How to swap tokens on Jupiter",
        content: "Jupiter aggregates liquidity across Solana DEXs. Use the Jupiter API: GET https://quote-api.jup.ag/v6/quote?inputMint=SOL&outputMint=USDC&amount=1000000. Then POST to /swap for the transaction. Always check slippage settings.",
        category: "defi"
    },
    {
        title: "Understanding liquidity pools",
        content: "Liquidity pools are smart contracts holding token pairs (e.g., SOL/USDC). LPs deposit equal value of both tokens and earn trading fees. AMMs like Raydium use x*y=k formula. Impermanent loss occurs when prices diverge.",
        category: "defi"
    },
    {
        title: "How to stake SOL",
        content: "Native staking: Delegate SOL to validators using StakeProgram.delegate(). Liquid staking: Use protocols like Marinade (mSOL), Jito (jitoSOL), or Lido (stSOL) to get liquid staking tokens while earning ~7% APY.",
        category: "defi"
    },
    {
        title: "DeFi lending on Solana",
        content: "Lending protocols: Kamino, Solend, MarginFi. Deposit collateral, borrow against it. Watch health factor - below 1.0 means liquidation. Typical collateral ratios: 65-80%. Use flash loans for arbitrage.",
        category: "defi"
    },

    // Development
    {
        title: "Getting started with Anchor framework",
        content: "Anchor is Solana's Rust framework. Install: cargo install --git https://github.com/coral-xyz/anchor anchor-cli. Create project: anchor init myproject. Key macros: #[program], #[derive(Accounts)], #[account]. Build: anchor build. Deploy: anchor deploy.",
        category: "development"
    },
    {
        title: "Solana transaction structure",
        content: "Transactions contain: recent blockhash, fee payer, array of instructions. Each instruction has: program ID, accounts array (with isSigner/isWritable), data buffer. Max size: 1232 bytes. Use versioned transactions for more accounts.",
        category: "development"
    },
    {
        title: "Testing Solana programs",
        content: "Use anchor test for integration tests. For unit tests: solana-program-test crate. Get test validators: solana-test-validator. Airdrop SOL: solana airdrop 2. Check logs: solana logs. Debug with msg! macro.",
        category: "development"
    },

    // AI Agent Integration
    {
        title: "Building AI agents on Solana",
        content: "AI agents can hold wallets and execute transactions autonomously. Use @solana/web3.js with a Keypair. Store private keys securely (env vars, Vault). Implement transaction simulation before sending. Monitor for errors and retry with exponential backoff.",
        category: "ai-agents"
    },
    {
        title: "AI agent wallet management",
        content: "Generate wallets: Keypair.generate(). For deterministic: Keypair.fromSeed(). Never log private keys. Use HD wallets for multiple addresses. Implement spending limits and rate limiting. Consider multisig for high-value operations.",
        category: "ai-agents"
    },
    {
        title: "MCP servers for Solana AI agents",
        content: "Model Context Protocol (MCP) enables AI-Solana integration. Create tools for: balance checks, token transfers, swap execution, NFT operations. Return structured JSON. Implement confirmation callbacks. Handle RPC rate limits.",
        category: "ai-agents"
    },

    // Security & Best Practices
    {
        title: "Solana security best practices",
        content: "1) Validate all account ownership 2) Check PDA derivations 3) Use checked math (checked_add) 4) Verify signer permissions 5) Prevent reentrancy 6) Validate instruction data length 7) Never trust client-provided accounts without verification.",
        category: "security"
    },
    {
        title: "Gas optimization on Solana",
        content: "Compute units (CUs) determine priority. Set with setComputeUnitLimit(). Priority fees: setComputeUnitPrice(). Reduce CUs: fewer accounts, smaller data, efficient algorithms. Typical costs: 5000 CUs = 0.000005 SOL at 1 microlamport/CU.",
        category: "development"
    },
];

// Helper functions
function serializeString(str: string): Buffer {
    const encoded = Buffer.from(str, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(encoded.length, 0);
    return Buffer.concat([len, encoded]);
}

async function hashContent(content: string): Promise<Buffer> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest();
}

async function main() {
    console.log('🌭 SolSage Bulk Knowledge Staking Script\n');

    // Load or create keypair
    const keypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
    let keypair: Keypair;

    if (fs.existsSync(keypairPath)) {
        const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        console.log(`📝 Using wallet: ${keypair.publicKey.toBase58()}`);
    } else {
        console.error('❌ No keypair found at ~/.config/solana/id.json');
        console.log('Run: solana-keygen new');
        process.exit(1);
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

    if (balance < 0.1 * 1e9) {
        console.error('❌ Insufficient balance. Need at least 0.1 SOL');
        console.log('Get devnet SOL: solana airdrop 2');
        process.exit(1);
    }

    // Derive protocol PDA
    const [protocolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(PROTOCOL_SEED)],
        PROGRAM_ID
    );

    // Stake knowledge discriminator (sha256("global:stake_knowledge")[0:8])
    const discriminator = Buffer.from([113, 12, 110, 85, 80, 21, 46, 84]);

    console.log(`📚 Staking ${KNOWLEDGE_ENTRIES.length} knowledge entries...\n`);

    let successCount = 0;

    for (const entry of KNOWLEDGE_ENTRIES) {
        try {
            console.log(`  Staking: "${entry.title}"...`);

            const contentHash = await hashContent(entry.content);

            // Derive knowledge PDA
            const [knowledgePDA] = PublicKey.findProgramAddressSync(
                [Buffer.from(KNOWLEDGE_SEED), keypair.publicKey.toBuffer(), contentHash],
                PROGRAM_ID
            );

            // Build instruction data
            const titleBuffer = serializeString(entry.title.slice(0, 100));
            const categoryBuffer = serializeString(entry.category.slice(0, 50));

            const instructionData = Buffer.concat([
                discriminator,
                contentHash,
                titleBuffer,
                categoryBuffer,
            ]);

            const instruction = new TransactionInstruction({
                programId: PROGRAM_ID,
                keys: [
                    { pubkey: protocolPDA, isSigner: false, isWritable: true },
                    { pubkey: knowledgePDA, isSigner: false, isWritable: true },
                    { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                data: instructionData,
            });

            const transaction = new Transaction().add(instruction);

            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [keypair],
                { commitment: 'confirmed' }
            );

            console.log(`    ✅ Success! TX: ${signature.slice(0, 20)}...`);
            successCount++;

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (error: any) {
            if (error.message?.includes('already in use')) {
                console.log(`    ⏭️  Already staked, skipping`);
            } else {
                console.log(`    ❌ Failed: ${error.message?.slice(0, 50)}`);
            }
        }
    }

    console.log(`\n✨ Done! Staked ${successCount} new knowledge entries.`);
    console.log(`📊 Total entries attempted: ${KNOWLEDGE_ENTRIES.length}`);
}

main().catch(console.error);
