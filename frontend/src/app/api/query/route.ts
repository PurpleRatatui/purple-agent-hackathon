import { NextRequest, NextResponse } from 'next/server';
import {
    aggregateKnowledge,
    SourcedKnowledge,
    SOURCE_TRUST_SCORES,
    SOURCE_INFO,
    KnowledgeSource
} from '@/lib/knowledge-sources';

interface OnChainKnowledgeEntry {
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
    source: KnowledgeSource;
    sourceLabel: string;
    sourceEmoji: string;
    sourceUrl?: string;
    verified: boolean;
}

// Generate response based on aggregated multi-source matches
function generateMultiSourceResponse(
    query: string,
    results: {
        id: string;
        title: string;
        content: string;
        category: string;
        source: KnowledgeSource;
        sourceUrl?: string;
        relevanceScore: number;
        combinedScore: number;
        verified: boolean;
    }[],
    totalSources: number,
    processingTime: number
): string {
    if (results.length === 0) {
        return `🤔 I don't have specific knowledge about "${query}" yet.

The SolSage knowledge base aggregates from multiple sources including:
• **On-Chain** - Community-staked knowledge backed by SOL
• **Official Docs** - Solana documentation
• **Moltbook AI** - AI agent network
• **GitHub** - Open source repositories

**Be the first to contribute!** Head to the Stake page and share your expertise on this topic. 🌭`;
    }

    const topMatch = results[0];
    const sourceInfo = SOURCE_INFO[topMatch.source];

    if (results.length === 1) {
        return `${sourceInfo.emoji} **Source: ${sourceInfo.label}**${topMatch.verified ? ' ✓ Verified' : ''}

## ${topMatch.title}

${topMatch.content}

---
*Relevance: ${topMatch.relevanceScore}% | Trust: ${SOURCE_TRUST_SCORES[topMatch.source]}% | Aggregated in ${processingTime}ms*`;
    }

    // Multiple matches from multiple sources
    let response = `📚 **Found ${results.length} results from ${totalSources} source${totalSources > 1 ? 's' : ''}** (${processingTime}ms)\n\n`;

    results.forEach((r, i) => {
        const info = SOURCE_INFO[r.source];
        response += `### ${i + 1}. ${r.title}\n`;
        response += `${info.emoji} ${info.label}${r.verified ? ' ✓' : ''} | Relevance: ${r.relevanceScore}%\n\n`;
        response += `${r.content}\n\n`;
        if (r.sourceUrl) {
            response += `[View Source](${r.sourceUrl})\n\n`;
        }
    });

    response += `---\n*Knowledge aggregated from ${totalSources} source${totalSources > 1 ? 's' : ''}. On-chain contributors receive $SAGE rewards.*`;

    return response;
}

export async function POST(request: NextRequest) {
    try {
        const { query, knowledgeEntries } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Convert on-chain entries to SourcedKnowledge format
        const onChainEntries: OnChainKnowledgeEntry[] = knowledgeEntries || [];
        const onChainKnowledge: SourcedKnowledge[] = onChainEntries.map((entry, i) => ({
            id: `on-chain-${i}`,
            title: entry.title,
            content: entry.content,
            category: entry.category,
            source: 'on_chain' as KnowledgeSource,
            sourceMetadata: { staker: entry.staker },
            trustScore: SOURCE_TRUST_SCORES.on_chain,
            verified: true,
        }));

        // Aggregate from all sources (on-chain + external)
        const aggregation = await aggregateKnowledge(query, onChainKnowledge);

        // Generate attributions for on-chain sources (they get rewards)
        const attributions: Attribution[] = aggregation.results
            .map((r, i) => {
                const info = SOURCE_INFO[r.source];
                return {
                    staker: r.sourceMetadata?.staker || r.source,
                    title: r.title,
                    relevance: r.relevanceScore,
                    reward: r.source === 'on_chain'
                        ? Math.max(1, Math.floor(r.combinedScore / 15) - i)
                        : 0, // Only on-chain sources get rewards
                    source: r.source,
                    sourceLabel: info.label,
                    sourceEmoji: info.emoji,
                    sourceUrl: r.sourceUrl,
                    verified: r.verified,
                };
            });

        // Generate response
        const answer = generateMultiSourceResponse(
            query,
            aggregation.results,
            aggregation.totalSources,
            aggregation.processingTime
        );

        return NextResponse.json({
            answer,
            attributions,
            matchedCount: aggregation.results.length,
            hasMatches: aggregation.results.length > 0,
            sourceBreakdown: aggregation.sourceBreakdown,
            totalSources: aggregation.totalSources,
            processingTime: aggregation.processingTime,
        });

    } catch (error) {
        console.error('Query API error:', error);
        return NextResponse.json(
            { error: 'Failed to process query' },
            { status: 500 }
        );
    }
}
