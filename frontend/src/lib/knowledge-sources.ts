// Knowledge Source Types and Aggregation
// Defines the multi-source knowledge system for SolSage

import { getSolanaKnowledge, convertMoltbookToKnowledge, isMoltbookConfigured } from './moltbook-api';

export type KnowledgeSource =
    | "on_chain"      // Staked knowledge on SolSage program
    | "moltbook"      // From Moltbook AI agent network
    | "github"        // From GitHub repos/issues/discussions
    | "docs"          // From official Solana docs
    | "agent_learned" // Discovered by AI agents
    | "oracle"        // From trusted oracles
    | "manual";        // Manual human input

export interface SourcedKnowledge {
    id: string;
    title: string;
    content: string;
    category: string;
    source: KnowledgeSource;
    sourceUrl?: string;
    sourceMetadata?: {
        agentId?: string;       // For moltbook/agent sources
        repoUrl?: string;       // For github sources
        docPath?: string;       // For docs sources
        oracleId?: string;      // For oracle sources
        staker?: string;        // For on_chain sources
        timestamp?: number;
    };
    trustScore: number;         // 0-100 based on source reliability
    verified: boolean;          // Has it been verified by the protocol?
}

// Source trust scores (default weights)
export const SOURCE_TRUST_SCORES: Record<KnowledgeSource, number> = {
    on_chain: 100,        // Highest trust - backed by SOL stake
    docs: 95,             // Official documentation
    oracle: 90,           // Trusted oracles
    github: 75,           // Open source but unverified
    moltbook: 70,         // AI agent network
    agent_learned: 60,    // AI discovered
    manual: 50,           // Unverified human input
};

// Source display info
export const SOURCE_INFO: Record<KnowledgeSource, { label: string; emoji: string; color: string }> = {
    on_chain: { label: "On-Chain", emoji: "⛓️", color: "text-emerald-400" },
    docs: { label: "Official Docs", emoji: "📖", color: "text-blue-400" },
    oracle: { label: "Oracle", emoji: "🔮", color: "text-purple-400" },
    github: { label: "GitHub", emoji: "🐙", color: "text-gray-300" },
    moltbook: { label: "Moltbook AI", emoji: "🤖", color: "text-cyan-400" },
    agent_learned: { label: "Agent Learned", emoji: "🧠", color: "text-yellow-400" },
    manual: { label: "Manual", emoji: "✍️", color: "text-gray-500" },
};

// Extended knowledge entry with source tracking
export interface AggregatedKnowledge extends SourcedKnowledge {
    relevanceScore: number;     // How relevant to the query (0-100)
    combinedScore: number;      // relevance * trustScore / 100
}

// Aggregation result
export interface AggregationResult {
    query: string;
    results: AggregatedKnowledge[];
    sourceBreakdown: Record<KnowledgeSource, number>;
    totalSources: number;
    processingTime: number;
}

// Fetch from Moltbook AI (real API when configured, mock fallback)
export async function fetchMoltbookKnowledge(query: string): Promise<SourcedKnowledge[]> {
    // Try real Moltbook API first
    if (isMoltbookConfigured()) {
        try {
            const posts = await getSolanaKnowledge(query);
            if (posts.length > 0) {
                console.log(`[Moltbook] Found ${posts.length} posts for query: ${query}`);
                return convertMoltbookToKnowledge(posts);
            }
        } catch (error) {
            console.error("[Moltbook] API error, falling back to mock:", error);
        }
    }

    // Fallback to mock data for demo
    const mockMoltbookData: SourcedKnowledge[] = [
        {
            id: "moltbook-1",
            title: "Jupiter Aggregator MEV Protection",
            content: "Jupiter v6 implements MEV protection through delayed execution and private RPC endpoints. Transactions are routed through Jito block builders for MEV resistance. Set 'usePrivateRpc: true' in your swap config.",
            category: "defi",
            source: "moltbook",
            sourceMetadata: { agentId: "jupiter-oracle-01" },
            trustScore: SOURCE_TRUST_SCORES.moltbook,
            verified: true,
        },
        {
            id: "moltbook-2",
            title: "Solana Validator Economics",
            content: "Current validator APY on mainnet averages 6-7%. Commission rates range from 0-10%. Use stake pools like Marinade or JitoSOL for liquid staking with better risk distribution.",
            category: "solana",
            source: "moltbook",
            sourceMetadata: { agentId: "validator-tracker-03" },
            trustScore: SOURCE_TRUST_SCORES.moltbook,
            verified: true,
        },
    ];

    // Filter based on query relevance
    return mockMoltbookData.filter(k =>
        k.title.toLowerCase().includes(query.toLowerCase()) ||
        k.content.toLowerCase().includes(query.toLowerCase())
    );
}


export async function fetchGithubKnowledge(query: string): Promise<SourcedKnowledge[]> {
    // Simulated GitHub-sourced knowledge
    const mockGithubData: SourcedKnowledge[] = [
        {
            id: "github-1",
            title: "Anchor Account Constraints",
            content: "Use #[account(constraint = ...)] for custom validation. Common patterns: `constraint = authority.key() == expected_authority` for ownership checks. Combine with #[account(mut)] for mutable accounts.",
            category: "dev",
            source: "github",
            sourceUrl: "https://github.com/coral-xyz/anchor/blob/master/docs/constraints.md",
            sourceMetadata: { repoUrl: "coral-xyz/anchor" },
            trustScore: SOURCE_TRUST_SCORES.github,
            verified: false,
        },
        {
            id: "github-2",
            title: "SPL Token 2022 Extensions",
            content: "Token-2022 supports: Transfer fees, Interest-bearing tokens, Non-transferable tokens, and Confidential transfers. Use `spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` for Token-2022.",
            category: "dev",
            source: "github",
            sourceUrl: "https://github.com/solana-labs/solana-program-library/tree/master/token/program-2022",
            sourceMetadata: { repoUrl: "solana-labs/solana-program-library" },
            trustScore: SOURCE_TRUST_SCORES.github,
            verified: false,
        },
    ];

    return mockGithubData.filter(k =>
        k.title.toLowerCase().includes(query.toLowerCase()) ||
        k.content.toLowerCase().includes(query.toLowerCase())
    );
}

export async function fetchDocsKnowledge(query: string): Promise<SourcedKnowledge[]> {
    // Simulated official docs knowledge
    const mockDocsData: SourcedKnowledge[] = [
        {
            id: "docs-1",
            title: "Solana Transaction Fees",
            content: "Base fee is 5000 lamports per signature. Priority fees are additive and measured in micro-lamports per compute unit. Use getRecentPrioritizationFees() to get current rates. Set computeUnitLimit to reduce unused CU charges.",
            category: "solana",
            source: "docs",
            sourceUrl: "https://solana.com/docs/core/fees",
            sourceMetadata: { docPath: "/core/fees" },
            trustScore: SOURCE_TRUST_SCORES.docs,
            verified: true,
        },
        {
            id: "docs-2",
            title: "Program Derived Addresses (PDAs)",
            content: "PDAs are addresses derived from seeds and a program ID. They have no private key and can only be signed by the program. Use findProgramAddressSync([seeds], programId) in client code. Bump seed ensures off-curve result.",
            category: "dev",
            source: "docs",
            sourceUrl: "https://solana.com/docs/core/pda",
            sourceMetadata: { docPath: "/core/pda" },
            trustScore: SOURCE_TRUST_SCORES.docs,
            verified: true,
        },
        {
            id: "docs-3",
            title: "Compute Units and Budgets",
            content: "Default compute budget is 200,000 CUs. Max is 1.4M per transaction. Use ComputeBudgetProgram.setComputeUnitLimit() to specify exact needs. Under-utilized CUs still incur fees. Complex cross-program invocations cost 1000 CUs each.",
            category: "dev",
            source: "docs",
            sourceUrl: "https://solana.com/docs/core/runtime",
            sourceMetadata: { docPath: "/core/runtime" },
            trustScore: SOURCE_TRUST_SCORES.docs,
            verified: true,
        },
    ];

    return mockDocsData.filter(k =>
        k.title.toLowerCase().includes(query.toLowerCase()) ||
        k.content.toLowerCase().includes(query.toLowerCase())
    );
}

// Aggregate knowledge from all sources
export async function aggregateKnowledge(
    query: string,
    onChainKnowledge: SourcedKnowledge[]
): Promise<AggregationResult> {
    const startTime = Date.now();

    // Fetch from all sources in parallel
    const [moltbookResults, githubResults, docsResults] = await Promise.all([
        fetchMoltbookKnowledge(query),
        fetchGithubKnowledge(query),
        fetchDocsKnowledge(query),
    ]);

    // Combine all sources with on-chain data
    const allKnowledge = [
        ...onChainKnowledge,
        ...moltbookResults,
        ...githubResults,
        ...docsResults,
    ];

    // Calculate relevance and combined scores
    const queryLower = query.toLowerCase();
    const stopWords = ['the', 'and', 'for', 'how', 'what', 'why', 'when', 'where', 'who', 'which', 'this', 'that', 'with', 'from'];
    const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3 && !stopWords.includes(w));

    const scoredResults: AggregatedKnowledge[] = allKnowledge.map(k => {
        const titleLower = k.title.toLowerCase();
        const contentLower = k.content.toLowerCase();

        let relevance = 0;
        let matchedWords = 0;

        // Exact phrase match in title
        if (titleLower.includes(queryLower)) {
            relevance += 50;
        }

        for (const word of queryWords) {
            if (titleLower.includes(word)) {
                relevance += 15;
                matchedWords++;
            }
            if (contentLower.includes(word)) {
                relevance += 5;
                matchedWords++;
            }
        }

        // Coverage bonus
        if (queryWords.length > 0) {
            relevance = Math.round(relevance * (matchedWords / queryWords.length));
        }

        relevance = Math.min(100, relevance);

        // Combined score: relevance weighted by trust
        const combinedScore = Math.round((relevance * k.trustScore) / 100);

        return {
            ...k,
            relevanceScore: relevance,
            combinedScore,
        };
    });

    // Filter by minimum relevance and sort by combined score
    const filteredResults = scoredResults
        .filter(r => r.relevanceScore >= 20)
        .sort((a, b) => b.combinedScore - a.combinedScore);

    // Calculate source breakdown
    const sourceBreakdown: Record<KnowledgeSource, number> = {
        on_chain: 0,
        moltbook: 0,
        github: 0,
        docs: 0,
        agent_learned: 0,
        oracle: 0,
        manual: 0,
    };

    filteredResults.forEach(r => {
        sourceBreakdown[r.source]++;
    });

    const processingTime = Date.now() - startTime;

    return {
        query,
        results: filteredResults.slice(0, 5), // Top 5 results
        sourceBreakdown,
        totalSources: Object.values(sourceBreakdown).filter(v => v > 0).length,
        processingTime,
    };
}
