import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Import config
const SOLSAGE_PROGRAM_ID = new PublicKey("7E5HrDxxHXMxz4rNHj8k6JXwSP34GC7SgssemZWVBF5R");
const RPC_ENDPOINT = "https://api.devnet.solana.com";
const PROTOCOL_SEED = "protocol";
const KNOWLEDGE_SEED = "knowledge";

// Scoring weights
const WEIGHTS = {
    originality: 0.25,
    actionability: 0.25,
    accuracy: 0.20,
    relevance: 0.15,
    clarity: 0.15,
};

const MIN_SCORE = 70;
const DEPOSIT_AMOUNT = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL

// Grant tiers (in USDC-equivalent lamports for demo)
const GRANT_TIERS = [
    { minScore: 90, grantUsdc: 30, tier: "gold" },
    { minScore: 80, grantUsdc: 15, tier: "silver" },
    { minScore: 70, grantUsdc: 5, tier: "bronze" },
];

// Rate limiting store
const submissionCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_SUBMISSIONS_PER_DAY = 3;

// Treasury wallet (would be protocol PDA in production)
const TREASURY_WALLET = new PublicKey("655kFGrvGTkX239NgPJNp2UjnxNXGPXMhcRDjsDGP94R");

// Connection
const connection = new Connection(RPC_ENDPOINT, "confirmed");

// Borsh helpers
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

// Instruction discriminators
const INSTRUCTION_DISCRIMINATORS = {
    stake_knowledge: new Uint8Array([113, 12, 110, 85, 80, 21, 46, 84]),
};

// Hash content
async function hashContent(content: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
    return new Uint8Array(hashBuffer);
}

// Derive PDAs
function deriveProtocolPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(PROTOCOL_SEED)],
        SOLSAGE_PROGRAM_ID
    );
}

function deriveKnowledgePDA(staker: PublicKey, contentHash: Uint8Array): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(KNOWLEDGE_SEED), staker.toBuffer(), contentHash],
        SOLSAGE_PROGRAM_ID
    );
}

// Rate limit check
function checkRateLimit(wallet: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let record = submissionCounts.get(wallet);

    if (!record || record.resetAt < now) {
        record = { count: 0, resetAt: now + dayMs };
        submissionCounts.set(wallet, record);
    }

    if (record.count >= MAX_SUBMISSIONS_PER_DAY) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: MAX_SUBMISSIONS_PER_DAY - record.count };
}

interface ScoreBreakdown {
    originality: number;
    actionability: number;
    accuracy: number;
    relevance: number;
    clarity: number;
}

// AI Curator scoring
async function scoreProposal(title: string, content: string, category: string, source?: string): Promise<{
    totalScore: number;
    breakdown: ScoreBreakdown;
    approved: boolean;
    grantUsdc: number;
    tier: string | null;
    feedback: string;
}> {
    const breakdown: ScoreBreakdown = {
        originality: 0,
        actionability: 0,
        accuracy: 0,
        relevance: 0,
        clarity: 0,
    };

    // === ORIGINALITY ===
    const genericPhrases = ["how to", "what is", "guide to", "introduction"];
    const hasGenericTitle = genericPhrases.some(p => title.toLowerCase().includes(p));
    const contentLength = content.length;

    breakdown.originality = Math.min(100,
        50 + (contentLength > 500 ? 20 : contentLength / 25) +
        (hasGenericTitle ? 0 : 15) + (source ? 15 : 0)
    );

    // === ACTIONABILITY ===
    const hasCode = /```[\s\S]*```|`[^`]+`/.test(content);
    const hasSteps = /\d\.\s|step\s*\d|first|then|finally/i.test(content);
    const hasParams = /\{|\[|=|:/.test(content);
    const hasCommands = /npm|yarn|solana|anchor|cargo|curl|POST|GET/i.test(content);

    breakdown.actionability = Math.min(100,
        30 + (hasCode ? 30 : 0) + (hasSteps ? 15 : 0) + (hasParams ? 10 : 0) + (hasCommands ? 15 : 0)
    );

    // === ACCURACY ===
    const hasNumbers = /\d+%|\d+\s*(sol|usdc|lamports)/i.test(content);
    const hasAddresses = /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(content);
    const hasUrls = /https?:\/\//.test(content);

    breakdown.accuracy = Math.min(100, 50 + (hasNumbers ? 15 : 0) + (hasAddresses ? 20 : 0) + (hasUrls ? 15 : 0));

    // === RELEVANCE ===
    const solanaKeywords = ["solana", "sol", "spl", "anchor", "program", "pda", "account", "lamport"];
    const cryptoKeywords = ["defi", "swap", "stake", "token", "wallet", "transaction", "blockchain"];
    const devKeywords = ["api", "sdk", "function", "contract", "deploy", "test"];

    const contentLower = (title + " " + content + " " + category).toLowerCase();
    const solanaScore = solanaKeywords.filter(k => contentLower.includes(k)).length * 10;
    const cryptoScore = cryptoKeywords.filter(k => contentLower.includes(k)).length * 8;
    const devScore = devKeywords.filter(k => contentLower.includes(k)).length * 5;

    breakdown.relevance = Math.min(100, 20 + solanaScore + cryptoScore + devScore);

    // === CLARITY ===
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = content.length / Math.max(sentences.length, 1);
    const hasSections = /##|###|\*\*|__/.test(content);
    const hasBullets = /^[-*•]\s/m.test(content);
    const sentenceLengthScore = avgSentenceLength > 50 && avgSentenceLength < 200 ? 30 : 15;

    breakdown.clarity = Math.min(100,
        35 + sentenceLengthScore + (hasSections ? 15 : 0) + (hasBullets ? 10 : 0)
    );

    // Calculate total
    const totalScore = Math.round(
        breakdown.originality * WEIGHTS.originality +
        breakdown.actionability * WEIGHTS.actionability +
        breakdown.accuracy * WEIGHTS.accuracy +
        breakdown.relevance * WEIGHTS.relevance +
        breakdown.clarity * WEIGHTS.clarity
    );

    const approved = totalScore >= MIN_SCORE;
    let grantUsdc = 0;
    let tier: string | null = null;

    if (approved) {
        for (const t of GRANT_TIERS) {
            if (totalScore >= t.minScore) {
                grantUsdc = t.grantUsdc;
                tier = t.tier;
                break;
            }
        }
    }

    const weakest = Object.entries(breakdown).sort(([, a], [, b]) => a - b)[0];
    const feedback = approved
        ? `Approved! ${tier?.toUpperCase()} tier. Grant: $${grantUsdc} USDC.`
        : `Rejected (${totalScore}/100). Improve ${weakest[0]}.`;

    return { totalScore, breakdown, approved, grantUsdc, tier, feedback };
}

// Build stake transaction
async function buildStakeTransaction(
    stakerPubkey: PublicKey,
    title: string,
    category: string,
    content: string
): Promise<{ transaction: string; contentHash: string; knowledgePDA: string }> {
    const contentHash = await hashContent(content);
    const [protocolPDA] = deriveProtocolPDA();
    const [knowledgePDA] = deriveKnowledgePDA(stakerPubkey, contentHash);

    const instructionData = new Uint8Array([
        ...INSTRUCTION_DISCRIMINATORS.stake_knowledge,
        ...contentHash,
        ...serializeString(title),
        ...serializeString(category),
    ]);

    const stakeInstruction = new TransactionInstruction({
        programId: SOLSAGE_PROGRAM_ID,
        keys: [
            { pubkey: protocolPDA, isSigner: false, isWritable: true },
            { pubkey: knowledgePDA, isSigner: false, isWritable: true },
            { pubkey: stakerPubkey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(instructionData),
    });

    const transaction = new Transaction().add(stakeInstruction);
    transaction.feePayer = stakerPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Serialize unsigned transaction for agent to sign
    const serialized = transaction.serialize({ requireAllSignatures: false }).toString("base64");

    return {
        transaction: serialized,
        contentHash: Buffer.from(contentHash).toString("hex"),
        knowledgePDA: knowledgePDA.toBase58(),
    };
}

interface AgentProposalRequest {
    title: string;
    content: string;
    category: string;
    source?: string;
    sourceUrl?: string;
    agentWallet: string; // Base58 public key
    agentApiKey?: string; // Optional API key for higher limits
}

export async function POST(request: NextRequest) {
    try {
        const body: AgentProposalRequest = await request.json();

        // Validate required fields
        if (!body.title || !body.content || !body.category || !body.agentWallet) {
            return NextResponse.json(
                { error: "Missing required fields: title, content, category, agentWallet" },
                { status: 400 }
            );
        }

        // Validate wallet address
        let stakerPubkey: PublicKey;
        try {
            stakerPubkey = new PublicKey(body.agentWallet);
        } catch {
            return NextResponse.json(
                { error: "Invalid wallet address" },
                { status: 400 }
            );
        }

        // Check rate limit
        const rateLimit = checkRateLimit(body.agentWallet);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded",
                    message: "Maximum 3 proposals per day per wallet",
                    nextReset: "24 hours"
                },
                { status: 429 }
            );
        }

        // Score the proposal
        const scoring = await scoreProposal(body.title, body.content, body.category, body.source);

        if (!scoring.approved) {
            return NextResponse.json({
                status: "rejected",
                score: scoring.totalScore,
                breakdown: scoring.breakdown,
                feedback: scoring.feedback,
                depositAction: "to_treasury",
                remainingSubmissions: rateLimit.remaining,
            });
        }

        // Build stake transaction for approved proposals
        const txData = await buildStakeTransaction(
            stakerPubkey,
            body.title,
            body.category,
            body.content
        );

        return NextResponse.json({
            status: "approved",
            score: scoring.totalScore,
            breakdown: scoring.breakdown,
            tier: scoring.tier,
            grantUsdc: scoring.grantUsdc,
            feedback: scoring.feedback,
            depositAction: "refunded",
            remainingSubmissions: rateLimit.remaining,

            // Auto-stake data
            staking: {
                transaction: txData.transaction,
                contentHash: txData.contentHash,
                knowledgePDA: txData.knowledgePDA,
                instructions: [
                    "1. Decode the base64 transaction",
                    "2. Sign with your wallet",
                    "3. Send to Solana devnet",
                    "4. Your knowledge will be staked and earn $SAGE on queries"
                ]
            },

            // Grant info (in production, this would trigger actual USDC transfer)
            grant: {
                amount: scoring.grantUsdc,
                currency: "USDC",
                status: "pending", // Would be "sent" after actual transfer
                message: `Grant of $${scoring.grantUsdc} USDC will be sent upon on-chain confirmation`
            }
        });

    } catch (error) {
        console.error("Agent proposal error:", error);
        return NextResponse.json(
            { error: "Failed to process proposal" },
            { status: 500 }
        );
    }
}

// GET endpoint for agents to check their status
export async function GET(request: NextRequest) {
    const wallet = request.nextUrl.searchParams.get("wallet");
    const action = request.nextUrl.searchParams.get("action");

    if (!wallet) {
        return NextResponse.json({
            name: "SolSage Agent API",
            version: "1.0.0",
            endpoints: {
                "POST /api/agent/propose": "Submit knowledge proposal for AI curator review",
                "GET /api/agent/propose?wallet=<pubkey>": "Check rate limit status",
                "GET /api/agent/propose?action=schema": "Get request schema"
            },
            rateLimit: "3 proposals per day per wallet",
            depositRequired: "0.01 SOL (refunded on approval, to treasury on rejection)",
            grantTiers: GRANT_TIERS,
        });
    }

    if (action === "schema") {
        return NextResponse.json({
            schema: {
                title: { type: "string", required: true, maxLength: 100 },
                content: { type: "string", required: true, description: "Knowledge content with markdown support" },
                category: { type: "string", required: true, enum: ["solana", "defi", "dev", "ai", "security", "trading"] },
                source: { type: "string", optional: true, enum: ["original", "moltbook", "github", "docs", "other"] },
                sourceUrl: { type: "string", optional: true },
                agentWallet: { type: "string", required: true, description: "Solana wallet address (base58)" },
            }
        });
    }

    const now = Date.now();
    const record = submissionCounts.get(wallet);

    if (!record || record.resetAt < now) {
        return NextResponse.json({
            wallet,
            remaining: MAX_SUBMISSIONS_PER_DAY,
            resetAt: null,
        });
    }

    return NextResponse.json({
        wallet,
        remaining: Math.max(0, MAX_SUBMISSIONS_PER_DAY - record.count),
        resetAt: new Date(record.resetAt).toISOString(),
    });
}
