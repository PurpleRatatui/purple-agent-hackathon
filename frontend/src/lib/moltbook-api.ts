// Moltbook AI API Integration
// Fetches knowledge from the AI-exclusive social network on Solana

const MOLTBOOK_API_BASE = "https://www.moltbook.com/api/v1";

// Environment variable for API key (set in .env.local)
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;

export interface MoltbookPost {
    id: string;
    title: string;
    content: string;
    author: {
        id: string;
        name: string;
    };
    submolt: string; // Community/category
    upvotes: number;
    created_at: string;
    tags?: string[];
}

export interface MoltbookSearchResult {
    posts: MoltbookPost[];
    total: number;
    page: number;
}

export interface MoltbookAgent {
    id: string;
    name: string;
    reputation: number;
    posts_count: number;
}

// Check if Moltbook is configured
export function isMoltbookConfigured(): boolean {
    return !!MOLTBOOK_API_KEY;
}

// Generic fetch wrapper with auth
async function moltbookFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T | null> {
    if (!MOLTBOOK_API_KEY) {
        console.log("[Moltbook] API key not configured, skipping");
        return null;
    }

    try {
        const response = await fetch(`${MOLTBOOK_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${MOLTBOOK_API_KEY}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        if (!response.ok) {
            console.error(`[Moltbook] API error: ${response.status} ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("[Moltbook] Fetch error:", error);
        return null;
    }
}

// Search Moltbook for posts matching a query
export async function searchMoltbook(query: string): Promise<MoltbookPost[]> {
    const result = await moltbookFetch<MoltbookSearchResult>(
        `/posts/search?q=${encodeURIComponent(query)}&limit=5`
    );

    return result?.posts || [];
}

// Get posts from a specific submolt (community)
export async function getSubmoltFeed(
    submolt: string,
    limit: number = 10
): Promise<MoltbookPost[]> {
    const result = await moltbookFetch<{ posts: MoltbookPost[] }>(
        `/submolts/${submolt}/posts?limit=${limit}&sort=top`
    );

    return result?.posts || [];
}

// Get Solana-related knowledge from specific submolts
export async function getSolanaKnowledge(query: string): Promise<MoltbookPost[]> {
    // Solana-focused submolts we want to pull from
    const solanaSubmolts = ["solana", "defi", "crypto", "developers", "trading"];

    // First try direct search
    const searchResults = await searchMoltbook(query);

    // If no search results, browse relevant submolts
    if (searchResults.length === 0) {
        const allPosts: MoltbookPost[] = [];

        // Fetch from first two relevant submolts
        for (const submolt of solanaSubmolts.slice(0, 2)) {
            const posts = await getSubmoltFeed(submolt, 5);
            allPosts.push(...posts);
        }

        // Filter by query keywords
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3);

        return allPosts.filter(post => {
            const titleLower = post.title.toLowerCase();
            const contentLower = post.content.toLowerCase();

            return queryWords.some(word =>
                titleLower.includes(word) || contentLower.includes(word)
            );
        });
    }

    return searchResults;
}

// Get agent information
export async function getAgentInfo(agentId: string): Promise<MoltbookAgent | null> {
    return await moltbookFetch<MoltbookAgent>(`/agents/${agentId}`);
}

// Check agent registration status
export async function checkAgentStatus(): Promise<boolean> {
    const status = await moltbookFetch<{ registered: boolean }>("/agents/status");
    return status?.registered ?? false;
}

// Convert Moltbook posts to our SourcedKnowledge format
export function convertMoltbookToKnowledge(posts: MoltbookPost[]): Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    source: "moltbook";
    sourceUrl: string;
    sourceMetadata: {
        agentId: string;
        submolt: string;
        upvotes: number;
    };
    trustScore: number;
    verified: boolean;
}> {
    return posts.map(post => ({
        id: `moltbook-${post.id}`,
        title: post.title,
        content: post.content,
        category: mapSubmoltToCategory(post.submolt),
        source: "moltbook" as const,
        sourceUrl: `https://www.moltbook.com/post/${post.id}`,
        sourceMetadata: {
            agentId: post.author.id,
            submolt: post.submolt,
            upvotes: post.upvotes,
        },
        trustScore: calculateMoltbookTrust(post),
        verified: post.upvotes >= 10, // Consider high-upvote posts as verified
    }));
}

// Map Moltbook submolt to our category system
function mapSubmoltToCategory(submolt: string): string {
    const mapping: Record<string, string> = {
        solana: "solana",
        defi: "defi",
        developers: "dev",
        trading: "trading",
        security: "security",
        ai: "ai",
        crypto: "solana",
    };

    return mapping[submolt.toLowerCase()] || "solana";
}

// Calculate trust score based on post engagement
function calculateMoltbookTrust(post: MoltbookPost): number {
    // Base trust for Moltbook posts
    let trust = 70;

    // Boost for upvotes (max +20)
    trust += Math.min(20, Math.floor(post.upvotes / 5));

    // Boost for being in certain high-quality submolts
    const highQualitySubmolts = ["developers", "security", "solana"];
    if (highQualitySubmolts.includes(post.submolt.toLowerCase())) {
        trust += 5;
    }

    return Math.min(95, trust);
}
