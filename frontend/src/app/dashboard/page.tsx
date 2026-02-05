"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    fetchKnowledgeEntriesByStaker,
    fetchAllKnowledgeEntries,
    fetchProtocolState,
    claimRewards,
    getExplorerUrl,
    KnowledgeEntryData,
    ProtocolData,
} from "@/lib/solsage-program";

// Reputation tiers based on $SAGE earned
const REPUTATION_TIERS = [
    { name: "Apprentice", emoji: "🌱", minSage: 0, color: "text-gray-400" },
    { name: "Scholar", emoji: "📚", minSage: 10, color: "text-blue-400" },
    { name: "Expert", emoji: "🧙", minSage: 50, color: "text-purple-400" },
    { name: "Sage Master", emoji: "🌭", minSage: 200, color: "text-emerald-400" },
];

function getReputationTier(sageEarned: number) {
    for (let i = REPUTATION_TIERS.length - 1; i >= 0; i--) {
        if (sageEarned >= REPUTATION_TIERS[i].minSage) {
            return REPUTATION_TIERS[i];
        }
    }
    return REPUTATION_TIERS[0];
}

function getNextTier(sageEarned: number) {
    for (const tier of REPUTATION_TIERS) {
        if (sageEarned < tier.minSage) {
            return tier;
        }
    }
    return null;
}

interface Attribution {
    id: string;
    query: string;
    timestamp: Date;
    relevance: number;
    reward: number;
    knowledgeTitle: string;
}

// Mock attributions for demo (would come from indexer in production)
const MOCK_ATTRIBUTIONS: Attribution[] = [
    {
        id: "a1",
        query: "How do I swap SOL for USDC?",
        timestamp: new Date(Date.now() - 3600000),
        relevance: 92,
        reward: 9,
        knowledgeTitle: "How to swap tokens on Jupiter",
    },
    {
        id: "a2",
        query: "Explain PDAs in Solana",
        timestamp: new Date(Date.now() - 7200000),
        relevance: 85,
        reward: 8,
        knowledgeTitle: "Understanding PDAs",
    },
    {
        id: "a3",
        query: "What's the best DEX on Solana?",
        timestamp: new Date(Date.now() - 14400000),
        relevance: 75,
        reward: 7,
        knowledgeTitle: "How to swap tokens on Jupiter",
    },
];

export default function DashboardPage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntryData[]>([]);
    const [allEntries, setAllEntries] = useState<KnowledgeEntryData[]>([]);
    const [protocolState, setProtocolState] = useState<ProtocolData | null>(null);
    const [attributions] = useState<Attribution[]>(MOCK_ATTRIBUTIONS);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimResult, setClaimResult] = useState<{
        success: boolean;
        message: string;
        explorerUrl?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"entries" | "attributions" | "leaderboard">("entries");

    // Fetch data on mount
    const fetchData = useCallback(async () => {
        if (!publicKey) return;

        setIsLoading(true);
        try {
            const [entries, protocol, all] = await Promise.all([
                fetchKnowledgeEntriesByStaker(publicKey),
                fetchProtocolState(),
                fetchAllKnowledgeEntries(),
            ]);
            setKnowledgeEntries(entries);
            setProtocolState(protocol);
            setAllEntries(all);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate totals
    const totalPendingRewards = knowledgeEntries.reduce(
        (sum, entry) => sum + entry.pendingRewards,
        0
    );
    const totalAttributions = knowledgeEntries.reduce(
        (sum, entry) => sum + entry.totalAttributions,
        0
    );
    const totalEarned = attributions.reduce((sum, a) => sum + a.reward, 0); // Mock

    const handleClaim = async (entryIndex: number) => {
        // For demo, we'll claim from the first entry with pending rewards
        const entry = knowledgeEntries[entryIndex];
        if (!entry || entry.pendingRewards === 0) return;

        setIsClaiming(true);
        setClaimResult(null);

        try {
            // Derive the PDA for this entry
            const { deriveKnowledgePDA } = await import("@/lib/solsage-program");
            const [knowledgePDA] = deriveKnowledgePDA(publicKey!, entry.contentHash);

            const signature = await claimRewards(wallet, knowledgePDA);

            setClaimResult({
                success: true,
                message: `Claimed ${entry.pendingRewards / 1_000_000} $SAGE successfully!`,
                explorerUrl: getExplorerUrl(signature),
            });

            // Refresh data
            await fetchData();
        } catch (error: any) {
            setClaimResult({
                success: false,
                message: error.message || "Failed to claim rewards",
            });
        } finally {
            setIsClaiming(false);
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center glass rounded-2xl p-12 max-w-md">
                    <div className="text-6xl mb-6">📊</div>
                    <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                    <p className="text-gray-400">
                        Connect your Solana wallet to view your dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="gradient-text">Your Dashboard</span>
                    </h1>
                    <p className="text-gray-400">
                        Track your knowledge contributions and earnings.
                    </p>
                    <div className="mt-2 text-sm text-emerald-400">
                        🔗 Connected to Solana Devnet
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid md:grid-cols-4 gap-6 mb-12">
                            <StatCard
                                icon="📚"
                                label="Knowledge Entries"
                                value={knowledgeEntries.length.toString()}
                            />
                            <StatCard
                                icon="🔗"
                                label="Total Attributions"
                                value={totalAttributions.toString()}
                            />
                            <StatCard
                                icon="💰"
                                label="Pending Rewards"
                                value={`${(totalPendingRewards / 1_000_000).toFixed(2)} $SAGE`}
                                highlight={totalPendingRewards > 0}
                            />
                            <StatCard
                                icon="✅"
                                label="Total Earned"
                                value={`${totalEarned} $SAGE`}
                            />
                        </div>

                        {/* Reputation Card */}
                        <ReputationCard sageEarned={totalEarned} />

                        {/* Protocol Stats */}
                        {protocolState && (
                            <div className="mb-8 p-4 glass rounded-xl">
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Protocol Stats</h3>
                                <div className="flex gap-6 text-sm">
                                    <span>Total Entries: <strong>{protocolState.totalKnowledgeEntries}</strong></span>
                                    <span>Total Attributions: <strong>{protocolState.totalAttributions}</strong></span>
                                    <span>Reward per Attribution: <strong>{protocolState.rewardPerAttribution / 1_000_000} $SAGE</strong></span>
                                </div>
                            </div>
                        )}

                        {/* Claim Result */}
                        {claimResult && (
                            <div
                                className={`mb-6 p-4 rounded-xl ${claimResult.success
                                    ? "bg-emerald-500/20 border border-emerald-500/50"
                                    : "bg-red-500/20 border border-red-500/50"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{claimResult.success ? "✅" : "❌"}</span>
                                    <span>{claimResult.message}</span>
                                    {claimResult.explorerUrl && (
                                        <a
                                            href={claimResult.explorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-auto text-sm text-purple-400 hover:text-purple-300 underline"
                                        >
                                            View on Explorer →
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setActiveTab("entries")}
                                className={`px-4 py-2 rounded-lg transition-all ${activeTab === "entries"
                                    ? "bg-purple-500/30 text-white"
                                    : "bg-gray-800/50 text-gray-400 hover:text-white"
                                    }`}
                            >
                                Knowledge ({knowledgeEntries.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("attributions")}
                                className={`px-4 py-2 rounded-lg transition-all ${activeTab === "attributions"
                                    ? "bg-purple-500/30 text-white"
                                    : "bg-gray-800/50 text-gray-400 hover:text-white"
                                    }`}
                            >
                                Recent Attributions ({attributions.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("leaderboard")}
                                className={`px-4 py-2 rounded-lg transition-all ${activeTab === "leaderboard"
                                    ? "bg-purple-500/30 text-white"
                                    : "bg-gray-800/50 text-gray-400 hover:text-white"
                                    }`}
                            >
                                🏆 Leaderboard
                            </button>
                        </div>

                        {/* Knowledge Entries Tab */}
                        {activeTab === "entries" && (
                            <div className="glass rounded-2xl overflow-hidden">
                                {knowledgeEntries.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400">
                                        <div className="text-4xl mb-4">📝</div>
                                        <p>You haven&apos;t staked any knowledge yet.</p>
                                        <a
                                            href="/stake"
                                            className="inline-block mt-4 btn-primary"
                                        >
                                            Stake Knowledge →
                                        </a>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-700">
                                                <th className="text-left p-4 text-gray-400 font-medium">Title</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                                                <th className="text-center p-4 text-gray-400 font-medium">Attributions</th>
                                                <th className="text-right p-4 text-gray-400 font-medium">Pending</th>
                                                <th className="text-right p-4 text-gray-400 font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {knowledgeEntries.map((entry, idx) => (
                                                <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                                                    <td className="p-4">
                                                        <div className="font-medium">{entry.title}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(entry.createdAt * 1000).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-gray-400">{entry.category}</td>
                                                    <td className="p-4 text-center">{entry.totalAttributions}</td>
                                                    <td className="p-4 text-right">
                                                        <span className={entry.pendingRewards > 0 ? "text-emerald-400" : "text-gray-500"}>
                                                            {(entry.pendingRewards / 1_000_000).toFixed(2)} $SAGE
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {entry.pendingRewards > 0 && (
                                                            <button
                                                                onClick={() => handleClaim(idx)}
                                                                disabled={isClaiming}
                                                                className="btn-primary text-sm px-3 py-1"
                                                            >
                                                                {isClaiming ? "..." : "Claim"}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Attributions Tab */}
                        {activeTab === "attributions" && (
                            <div className="glass rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="text-left p-4 text-gray-400 font-medium">Query</th>
                                            <th className="text-left p-4 text-gray-400 font-medium">Source</th>
                                            <th className="text-center p-4 text-gray-400 font-medium">Relevance</th>
                                            <th className="text-right p-4 text-gray-400 font-medium">Reward</th>
                                            <th className="text-right p-4 text-gray-400 font-medium">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attributions.map((attr) => (
                                            <tr key={attr.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                                                <td className="p-4">
                                                    <div className="text-sm truncate max-w-xs">{attr.query}</div>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">{attr.knowledgeTitle}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs ${attr.relevance >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                                                        attr.relevance >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                                                            "bg-gray-500/20 text-gray-400"
                                                        }`}>
                                                        {attr.relevance}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right text-emerald-400">+{attr.reward} $SAGE</td>
                                                <td className="p-4 text-right text-gray-500 text-sm">
                                                    {formatTimeAgo(attr.timestamp)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Leaderboard Tab */}
                        {activeTab === "leaderboard" && (
                            <Leaderboard entries={allEntries} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    highlight,
}: {
    icon: string;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className={`glass rounded-xl p-6 ${highlight ? "ring-2 ring-emerald-500/50" : ""}`}>
            <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{icon}</span>
                <span className="text-gray-400 text-sm">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${highlight ? "text-emerald-400" : ""}`}>
                {value}
            </div>
        </div>
    );
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function ReputationCard({ sageEarned }: { sageEarned: number }) {
    const tier = getReputationTier(sageEarned);
    const nextTier = getNextTier(sageEarned);
    const progress = nextTier
        ? ((sageEarned - tier.minSage) / (nextTier.minSage - tier.minSage)) * 100
        : 100;

    return (
        <div className="mb-8 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Your Reputation</h3>
                <div className="flex items-center gap-2">
                    <span className={`text-2xl ${tier.color}`}>{tier.emoji}</span>
                    <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                </div>
            </div>

            {/* Progress to next tier */}
            {nextTier && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>{sageEarned} $SAGE</span>
                        <span>{nextTier.minSage} $SAGE to {nextTier.name}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="gradient-sage h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* All tiers display */}
            <div className="flex justify-between gap-2">
                {REPUTATION_TIERS.map((t) => (
                    <div
                        key={t.name}
                        className={`flex-1 text-center p-2 rounded-lg ${t.name === tier.name
                            ? 'bg-purple-500/20 ring-1 ring-purple-500/50'
                            : 'bg-gray-800/50'
                            }`}
                    >
                        <div className="text-lg">{t.emoji}</div>
                        <div className={`text-xs ${t.name === tier.name ? t.color : 'text-gray-500'}`}>
                            {t.name}
                        </div>
                        <div className="text-xs text-gray-500">{t.minSage}+</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Leaderboard({ entries }: { entries: KnowledgeEntryData[] }) {
    // Aggregate by staker
    const stakerStats = new Map<string, { total: number; count: number }>();

    entries.forEach(entry => {
        const staker = entry.staker.toBase58();
        const current = stakerStats.get(staker) || { total: 0, count: 0 };
        stakerStats.set(staker, {
            total: current.total + entry.totalAttributions,
            count: current.count + 1,
        });
    });

    // Convert to array and sort by attributions
    const leaderboard = Array.from(stakerStats.entries())
        .map(([address, stats]) => ({
            address,
            attributions: stats.total,
            entries: stats.count,
            sageEarned: stats.total * 10, // 10 SAGE per attribution (mock)
        }))
        .sort((a, b) => b.sageEarned - a.sageEarned)
        .slice(0, 10);

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-700">
                        <th className="text-left p-4 text-gray-400 font-medium">Rank</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Contributor</th>
                        <th className="text-center p-4 text-gray-400 font-medium">Entries</th>
                        <th className="text-center p-4 text-gray-400 font-medium">Attributions</th>
                        <th className="text-right p-4 text-gray-400 font-medium">$SAGE Earned</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Tier</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.map((entry, idx) => {
                        const tier = getReputationTier(entry.sageEarned);
                        return (
                            <tr key={entry.address} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                                <td className="p-4">
                                    {idx === 0 && <span className="text-xl">🥇</span>}
                                    {idx === 1 && <span className="text-xl">🥈</span>}
                                    {idx === 2 && <span className="text-xl">🥉</span>}
                                    {idx > 2 && <span className="text-gray-500">#{idx + 1}</span>}
                                </td>
                                <td className="p-4">
                                    <span className="font-mono text-sm">
                                        {entry.address.slice(0, 4)}...{entry.address.slice(-4)}
                                    </span>
                                </td>
                                <td className="p-4 text-center">{entry.entries}</td>
                                <td className="p-4 text-center">{entry.attributions}</td>
                                <td className="p-4 text-right text-emerald-400">{entry.sageEarned}</td>
                                <td className="p-4 text-right">
                                    <span className={tier.color}>{tier.emoji} {tier.name}</span>
                                </td>
                            </tr>
                        );
                    })}
                    {leaderboard.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">
                                No contributors yet. Be the first to stake knowledge!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
