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

// More sophisticated keyword matching with exact and partial match scoring
function calculateRelevance(query: string, entry: KnowledgeEntry): number {
    const queryLower = query.toLowerCase();
    const titleLower = entry.title.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const categoryLower = entry.category.toLowerCase();

    let score = 0;

    // Extract meaningful words (3+ chars, no common words)
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would', 'could', 'should', 'about', 'into', 'your', 'does', 'know', 'tell', 'about'];
    const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3 && !stopWords.includes(w));

    if (queryWords.length === 0) return 0;

    // Check for exact phrase match in title (highest weight)
    if (titleLower.includes(queryLower)) {
        score += 50;
    }

    // Check each query word
    let matchedWords = 0;
    for (const word of queryWords) {
        // Exact word match in title
        if (titleLower.includes(word)) {
            score += 15;
            matchedWords++;
        }
        // Exact word match in category
        if (categoryLower.includes(word)) {
            score += 10;
            matchedWords++;
        }
        // Exact word match in content
        if (contentLower.includes(word)) {
            score += 5;
            matchedWords++;
        }
    }

    // Require at least one meaningful word to match
    if (matchedWords === 0) {
        return 0;
    }

    // Coverage bonus - what percentage of query words matched?
    const coverage = matchedWords / queryWords.length;
    score = Math.round(score * coverage);

    return Math.min(95, score);
}

// Generate intelligent response based on matches (or lack thereof)
function generateResponse(query: string, matches: { entry: KnowledgeEntry; relevance: number }[]): string {
    // No good matches found
    if (matches.length === 0) {
        return `🤔 I don't have specific knowledge about "${query}" yet.

The SolSage knowledge base is still growing! Here's what you can do:

• **Be the first to contribute** - Head to the Stake page and share your expertise on this topic
• **Try different keywords** - Rephrase your question with related terms
• **Browse existing knowledge** - Check the Dashboard to see what topics are covered

The more experts stake their knowledge, the smarter I become! 🌭`;
    }

    // Build response from matched knowledge
    const topMatch = matches[0];

    if (matches.length === 1) {
        return `Based on community knowledge, here's what I found about your question:

📚 **${topMatch.entry.title}** (${topMatch.entry.category})

${topMatch.entry.content}

---
*Relevance: ${topMatch.relevance}% match. The contributor has been attributed $SAGE rewards.*`;
    }

    // Multiple matches
    let response = `I found ${matches.length} relevant knowledge entries:\n\n`;

    matches.forEach((m, i) => {
        response += `**${i + 1}. ${m.entry.title}** (${m.entry.category})\n`;
        response += `${m.entry.content}\n\n`;
    });

    response += `---\n*All contributors have been attributed and will receive $SAGE rewards.*`;

    return response;
}

export async function POST(request: NextRequest) {
    try {
        const { query, knowledgeEntries } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const entries: KnowledgeEntry[] = knowledgeEntries || [];

        // Calculate relevance for each entry with HIGHER threshold
        const scoredEntries = entries
            .map(entry => ({
                entry,
                relevance: calculateRelevance(query, entry)
            }))
            .filter(e => e.relevance >= 30) // HIGHER threshold - need 30%+ to match
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3); // Top 3 matches

        // Generate attributions only for real matches
        const attributions: Attribution[] = scoredEntries.map((e, i) => ({
            staker: e.entry.staker,
            title: e.entry.title,
            relevance: e.relevance,
            reward: Math.max(1, Math.floor(e.relevance / 15) - i) // More proportional rewards
        }));

        // Generate appropriate response
        const answer = generateResponse(query, scoredEntries);

        return NextResponse.json({
            answer,
            attributions,
            matchedCount: scoredEntries.length,
            hasMatches: scoredEntries.length > 0
        });

    } catch (error) {
        console.error('Query API error:', error);
        return NextResponse.json(
            { error: 'Failed to process query' },
            { status: 500 }
        );
    }
}
