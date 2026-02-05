import { NextRequest, NextResponse } from "next/server";

// Scoring weights
const WEIGHTS = {
    originality: 0.25,
    actionability: 0.25,
    accuracy: 0.20,
    relevance: 0.15,
    clarity: 0.15,
};

// Minimum score to approve
const MIN_SCORE = 70;

// Grant tiers based on score
const GRANT_TIERS = [
    { minScore: 90, grant: 30, tier: "gold" },
    { minScore: 80, grant: 15, tier: "silver" },
    { minScore: 70, grant: 5, tier: "bronze" },
];

interface ProposalRequest {
    title: string;
    content: string;
    category: string;
    source?: string;
    sourceUrl?: string;
    proposerWallet: string;
}

interface ScoreBreakdown {
    originality: number;
    actionability: number;
    accuracy: number;
    relevance: number;
    clarity: number;
}

interface CuratorResponse {
    approved: boolean;
    totalScore: number;
    breakdown: ScoreBreakdown;
    feedback: string;
    grantAmount: number;
    tier: string | null;
}

// AI Curator scoring function
async function scoreProposal(proposal: ProposalRequest): Promise<CuratorResponse> {
    const { title, content, category, source } = proposal;

    // Scoring criteria (in production, this would use an LLM)
    const breakdown: ScoreBreakdown = {
        originality: 0,
        actionability: 0,
        accuracy: 0,
        relevance: 0,
        clarity: 0,
    };

    // === ORIGINALITY (0-100) ===
    // Check for unique content, not generic
    const genericPhrases = ["how to", "what is", "guide to", "introduction"];
    const hasGenericTitle = genericPhrases.some(p => title.toLowerCase().includes(p));
    const contentLength = content.length;

    breakdown.originality = Math.min(100,
        50 + // Base score
        (contentLength > 500 ? 20 : contentLength / 25) + // Longer = more detailed
        (hasGenericTitle ? 0 : 15) + // Non-generic title bonus
        (source ? 15 : 0) // Has source = more credible
    );

    // === ACTIONABILITY (0-100) ===
    // Does it contain executable knowledge?
    const hasCode = /```[\s\S]*```|`[^`]+`/.test(content);
    const hasSteps = /\d\.\s|step\s*\d|first|then|finally/i.test(content);
    const hasParams = /\{|\[|=|:/.test(content);
    const hasCommands = /npm|yarn|solana|anchor|cargo|curl|POST|GET/i.test(content);

    breakdown.actionability = Math.min(100,
        30 + // Base
        (hasCode ? 30 : 0) +
        (hasSteps ? 15 : 0) +
        (hasParams ? 10 : 0) +
        (hasCommands ? 15 : 0)
    );

    // === ACCURACY (0-100) ===
    // Check for verifiable claims
    const hasNumbers = /\d+%|\d+\s*(sol|usdc|lamports)/i.test(content);
    const hasAddresses = /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(content);
    const hasUrls = /https?:\/\//.test(content);

    breakdown.accuracy = Math.min(100,
        50 + // Base - assume reasonable accuracy
        (hasNumbers ? 15 : 0) +
        (hasAddresses ? 20 : 0) +
        (hasUrls ? 15 : 0)
    );

    // === RELEVANCE (0-100) ===
    // Is it Solana/crypto related?
    const solanaKeywords = ["solana", "sol", "spl", "anchor", "program", "pda", "account", "lamport"];
    const cryptoKeywords = ["defi", "swap", "stake", "token", "wallet", "transaction", "blockchain"];
    const devKeywords = ["api", "sdk", "function", "contract", "deploy", "test"];

    const contentLower = (title + " " + content + " " + category).toLowerCase();
    const solanaScore = solanaKeywords.filter(k => contentLower.includes(k)).length * 10;
    const cryptoScore = cryptoKeywords.filter(k => contentLower.includes(k)).length * 8;
    const devScore = devKeywords.filter(k => contentLower.includes(k)).length * 5;

    breakdown.relevance = Math.min(100,
        20 + solanaScore + cryptoScore + devScore
    );

    // === CLARITY (0-100) ===
    // Is it well-written?
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = content.length / Math.max(sentences.length, 1);
    const hasSections = /##|###|\*\*|__/.test(content);
    const hasBullets = /^[-*•]\s/m.test(content);

    // Ideal sentence length is 15-25 words (~75-125 chars)
    const sentenceLengthScore = avgSentenceLength > 50 && avgSentenceLength < 200 ? 30 : 15;

    breakdown.clarity = Math.min(100,
        35 + // Base
        sentenceLengthScore +
        (hasSections ? 15 : 0) +
        (hasBullets ? 10 : 0) +
        (title.length > 10 && title.length < 80 ? 10 : 0)
    );

    // Calculate weighted total
    const totalScore = Math.round(
        breakdown.originality * WEIGHTS.originality +
        breakdown.actionability * WEIGHTS.actionability +
        breakdown.accuracy * WEIGHTS.accuracy +
        breakdown.relevance * WEIGHTS.relevance +
        breakdown.clarity * WEIGHTS.clarity
    );

    // Determine approval and grant
    const approved = totalScore >= MIN_SCORE;
    let grantAmount = 0;
    let tier: string | null = null;

    if (approved) {
        for (const t of GRANT_TIERS) {
            if (totalScore >= t.minScore) {
                grantAmount = t.grant;
                tier = t.tier;
                break;
            }
        }
    }

    // Generate feedback
    const feedback = generateFeedback(breakdown, totalScore, approved);

    return {
        approved,
        totalScore,
        breakdown,
        feedback,
        grantAmount,
        tier,
    };
}

function generateFeedback(breakdown: ScoreBreakdown, total: number, approved: boolean): string {
    const weakest = Object.entries(breakdown)
        .sort(([, a], [, b]) => a - b)[0];

    if (!approved) {
        return `Your proposal scored ${total}/100, below the 70 threshold. ` +
            `Focus on improving ${weakest[0]} (scored ${weakest[1]}/100). ` +
            `Consider adding more specific details, code examples, or verifiable references.`;
    }

    if (total >= 90) {
        return `Excellent proposal! Your knowledge is highly actionable and well-documented. Gold tier approved.`;
    } else if (total >= 80) {
        return `Great proposal! Silver tier approved. To reach Gold, improve ${weakest[0]}.`;
    } else {
        return `Good proposal! Bronze tier approved. Consider enhancing ${weakest[0]} for higher rewards.`;
    }
}

// Rate limiting store (in production, use Redis)
const submissionCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_SUBMISSIONS_PER_DAY = 3;

function checkRateLimit(wallet: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let record = submissionCounts.get(wallet);

    // Reset if day has passed
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

export async function POST(request: NextRequest) {
    try {
        const proposal: ProposalRequest = await request.json();

        // Validate required fields
        if (!proposal.title || !proposal.content || !proposal.category || !proposal.proposerWallet) {
            return NextResponse.json(
                { error: "Missing required fields: title, content, category, proposerWallet" },
                { status: 400 }
            );
        }

        // Check rate limit
        const rateLimit = checkRateLimit(proposal.proposerWallet);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. Maximum 3 proposals per day.",
                    nextReset: "24 hours"
                },
                { status: 429 }
            );
        }

        // Score the proposal
        const result = await scoreProposal(proposal);

        return NextResponse.json({
            ...result,
            remainingSubmissions: rateLimit.remaining,
            depositRefunded: result.approved,
            depositToTreasury: !result.approved,
            proposal: {
                title: proposal.title,
                category: proposal.category,
                source: proposal.source || "manual",
            },
        });

    } catch (error) {
        console.error("Curator error:", error);
        return NextResponse.json(
            { error: "Failed to evaluate proposal" },
            { status: 500 }
        );
    }
}

// GET endpoint to check rate limit status
export async function GET(request: NextRequest) {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
        return NextResponse.json(
            { error: "Missing wallet parameter" },
            { status: 400 }
        );
    }

    const now = Date.now();
    const record = submissionCounts.get(wallet);

    if (!record || record.resetAt < now) {
        return NextResponse.json({
            remaining: MAX_SUBMISSIONS_PER_DAY,
            resetAt: null,
        });
    }

    return NextResponse.json({
        remaining: Math.max(0, MAX_SUBMISSIONS_PER_DAY - record.count),
        resetAt: new Date(record.resetAt).toISOString(),
    });
}
