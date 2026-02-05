import { NextRequest, NextResponse } from 'next/server';

interface KnowledgeEntry {
    staker: string;
    title: string;
    content: string;
    category: string;
}

interface Attribution {
    staker: string;
    title: string;
    relevance: number;
    reward: number;
}

// Simple keyword-based matching score
function calculateRelevance(query: string, entry: KnowledgeEntry): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const titleWords = entry.title.toLowerCase().split(/\s+/);
    const contentWords = entry.content.toLowerCase().split(/\s+/);

    let matches = 0;
    let totalWeight = 0;

    for (const word of queryWords) {
        if (word.length < 3) continue; // Skip short words

        // Title matches are worth more
        if (titleWords.some(w => w.includes(word) || word.includes(w))) {
            matches += 3;
        }
        // Content matches
        if (contentWords.some(w => w.includes(word) || word.includes(w))) {
            matches += 1;
        }
        totalWeight += 4;
    }

    if (totalWeight === 0) return 0;
    return Math.min(95, Math.round((matches / totalWeight) * 100));
}

// Generate response using the matched knowledge
function generateResponse(query: string, matches: { entry: KnowledgeEntry; relevance: number }[]): string {
    if (matches.length === 0) {
        return `I don't have specific knowledge about that yet. The SolSage knowledge base is growing as more contributors stake their expertise.\n\nWant to be the first to contribute knowledge on this topic? Head to the Stake page and share your expertise!`;
    }

    // Build context from matched knowledge
    const context = matches.map(m => `**${m.entry.title}** (${m.entry.category}):\n${m.entry.content}`).join('\n\n---\n\n');

    const intro = matches.length === 1
        ? `Based on knowledge staked by the community, here's what I found:`
        : `I found ${matches.length} relevant knowledge entries from our contributors:`;

    return `${intro}\n\n${context}\n\n---\n*This response was generated using knowledge staked on SolSage. Contributors have been attributed and will receive $SAGE rewards.*`;
}

export async function POST(request: NextRequest) {
    try {
        const { query, knowledgeEntries } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const entries: KnowledgeEntry[] = knowledgeEntries || [];

        // Calculate relevance for each entry
        const scoredEntries = entries
            .map(entry => ({
                entry,
                relevance: calculateRelevance(query, entry)
            }))
            .filter(e => e.relevance > 20) // Minimum threshold
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3); // Top 3 matches

        // Generate attributions
        const attributions: Attribution[] = scoredEntries.map((e, i) => ({
            staker: e.entry.staker,
            title: e.entry.title,
            relevance: e.relevance,
            reward: Math.max(1, Math.floor(e.relevance / 10) - i) // Decreasing rewards
        }));

        // Generate response
        const answer = generateResponse(query, scoredEntries);

        return NextResponse.json({
            answer,
            attributions,
            matchedCount: scoredEntries.length
        });

    } catch (error) {
        console.error('Query API error:', error);
        return NextResponse.json(
            { error: 'Failed to process query' },
            { status: 500 }
        );
    }
}
