"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface ScoreBreakdown {
    originality: number;
    actionability: number;
    accuracy: number;
    relevance: number;
    clarity: number;
}

interface CuratorResult {
    approved: boolean;
    totalScore: number;
    breakdown: ScoreBreakdown;
    feedback: string;
    grantAmount: number;
    tier: string | null;
    remainingSubmissions: number;
    depositRefunded: boolean;
    depositToTreasury: boolean;
}

const CATEGORIES = [
    { value: "solana", label: "Solana", emoji: "☀️" },
    { value: "defi", label: "DeFi", emoji: "💰" },
    { value: "dev", label: "Development", emoji: "🛠️" },
    { value: "ai", label: "AI Agents", emoji: "🤖" },
    { value: "security", label: "Security", emoji: "🔒" },
    { value: "trading", label: "Trading", emoji: "📈" },
];

const SOURCES = [
    { value: "original", label: "Original Discovery" },
    { value: "moltbook", label: "Moltbook AI" },
    { value: "github", label: "GitHub" },
    { value: "docs", label: "Official Docs" },
    { value: "other", label: "Other" },
];

export default function ProposePage() {
    const { connected, publicKey } = useWallet();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("solana");
    const [source, setSource] = useState("original");
    const [sourceUrl, setSourceUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<CuratorResult | null>(null);
    const [remainingSubmissions, setRemainingSubmissions] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Check rate limit on load
    useEffect(() => {
        if (publicKey) {
            fetch(`/api/curator?wallet=${publicKey.toBase58()}`)
                .then(res => res.json())
                .then(data => setRemainingSubmissions(data.remaining))
                .catch(() => setRemainingSubmissions(3));
        }
    }, [publicKey]);

    const handleSubmit = async () => {
        if (!publicKey || !title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch("/api/curator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    content,
                    category,
                    source,
                    sourceUrl: sourceUrl || undefined,
                    proposerWallet: publicKey.toBase58(),
                }),
            });

            if (response.status === 429) {
                setError("Rate limit exceeded. Maximum 3 proposals per day.");
                return;
            }

            if (!response.ok) {
                throw new Error("Submission failed");
            }

            const data = await response.json();
            setResult(data);
            setRemainingSubmissions(data.remainingSubmissions);

            // Clear form on approval
            if (data.approved) {
                setTitle("");
                setContent("");
                setSourceUrl("");
            }
        } catch (err) {
            setError("Failed to submit proposal. Please try again.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen py-12">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="gradient-text">Propose Knowledge</span> 📝
                    </h1>
                    <div className="glass rounded-2xl p-12">
                        <p className="text-gray-400 mb-4">Connect your wallet to propose knowledge</p>
                        <p className="text-sm text-gray-500">
                            Earn USDC grants for quality knowledge contributions
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="gradient-text">Propose Knowledge</span> 📝
                    </h1>
                    <p className="text-gray-400">
                        Submit quality knowledge to earn USDC grants
                    </p>

                    {/* Rate limit status */}
                    {remainingSubmissions !== null && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full">
                            <span className={remainingSubmissions > 0 ? "text-emerald-400" : "text-red-400"}>
                                {remainingSubmissions > 0 ? "✓" : "⚠️"}
                            </span>
                            <span className="text-gray-400">
                                {remainingSubmissions} submissions remaining today
                            </span>
                        </div>
                    )}
                </div>

                {/* Grant Tiers Info */}
                <div className="glass rounded-2xl p-6 mb-8">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        🏆 Grant Tiers
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-amber-500/10 rounded-xl text-center">
                            <div className="text-2xl mb-1">🥇</div>
                            <div className="font-bold text-amber-400">Gold</div>
                            <div className="text-sm text-gray-400">Score 90+</div>
                            <div className="text-lg font-bold text-emerald-400 mt-1">$30 USDC</div>
                        </div>
                        <div className="p-4 bg-gray-400/10 rounded-xl text-center">
                            <div className="text-2xl mb-1">🥈</div>
                            <div className="font-bold text-gray-300">Silver</div>
                            <div className="text-sm text-gray-400">Score 80-89</div>
                            <div className="text-lg font-bold text-emerald-400 mt-1">$15 USDC</div>
                        </div>
                        <div className="p-4 bg-orange-500/10 rounded-xl text-center">
                            <div className="text-2xl mb-1">🥉</div>
                            <div className="font-bold text-orange-400">Bronze</div>
                            <div className="text-sm text-gray-400">Score 70-79</div>
                            <div className="text-lg font-bold text-emerald-400 mt-1">$5 USDC</div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        Proposals scoring below 70 are rejected. Deposit (0.01 SOL) goes to grants treasury.
                    </p>
                </div>

                {/* Result Display */}
                {result && (
                    <div className={`mb-8 p-6 rounded-2xl ${result.approved
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-red-500/10 border border-red-500/30"
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{result.approved ? "✅" : "❌"}</span>
                            <div>
                                <h3 className="text-xl font-bold">
                                    {result.approved ? "Proposal Approved!" : "Proposal Rejected"}
                                </h3>
                                <p className="text-gray-400">Score: {result.totalScore}/100</p>
                            </div>
                            {result.approved && (
                                <div className="ml-auto text-right">
                                    <div className="text-sm text-gray-400">Grant Earned</div>
                                    <div className="text-2xl font-bold text-emerald-400">
                                        ${result.grantAmount} USDC
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-5 gap-2 mb-4">
                            {Object.entries(result.breakdown).map(([key, value]) => (
                                <div key={key} className="text-center">
                                    <div className="text-xs text-gray-500 capitalize">{key}</div>
                                    <div className={`text-lg font-bold ${value >= 70 ? "text-emerald-400" :
                                            value >= 50 ? "text-yellow-400" : "text-red-400"
                                        }`}>
                                        {value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-sm text-gray-300">{result.feedback}</p>

                        {result.approved && (
                            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                                <span className="text-emerald-400">✓</span> Deposit refunded •
                                <span className="text-emerald-400 ml-2">✓</span> Knowledge staked on SolSage
                            </div>
                        )}
                        {!result.approved && (
                            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400">
                                <span className="text-yellow-400">→</span> Deposit added to grants treasury
                            </div>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                        {error}
                    </div>
                )}

                {/* Proposal Form */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-6">Submit Knowledge Proposal</h2>

                    {/* Title */}
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-2">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., How to optimize Jupiter swaps for lower slippage"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                        <div className="text-xs text-gray-500 mt-1">{title.length}/100</div>
                    </div>

                    {/* Category */}
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-2">
                            Category <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.value}
                                    onClick={() => setCategory(cat.value)}
                                    className={`p-3 rounded-xl text-center transition-all ${category === cat.value
                                            ? "bg-purple-500/30 ring-2 ring-purple-500"
                                            : "bg-gray-800/50 hover:bg-gray-700/50"
                                        }`}
                                >
                                    <div className="text-xl">{cat.emoji}</div>
                                    <div className="text-xs mt-1">{cat.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-2">
                            Knowledge Content <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            className="textarea min-h-[200px]"
                            placeholder="Share actionable knowledge. Include:
• Step-by-step instructions
• Code snippets (use ```code```)
• Specific parameters, addresses, or values
• Sources and references"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Supports Markdown formatting</span>
                            <span>{content.length} characters</span>
                        </div>
                    </div>

                    {/* Source */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Knowledge Source
                            </label>
                            <select
                                className="input"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                            >
                                {SOURCES.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Source URL (optional)
                            </label>
                            <input
                                type="url"
                                className="input"
                                placeholder="https://..."
                                value={sourceUrl}
                                onChange={(e) => setSourceUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            <span className="text-yellow-400">⚠️</span> Requires 0.01 SOL deposit
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !title.trim() || !content.trim() || remainingSubmissions === 0}
                            className={`btn-primary px-8 ${isSubmitting || !title.trim() || !content.trim() || remainingSubmissions === 0
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                        >
                            {isSubmitting ? "Evaluating..." : "Submit Proposal"}
                        </button>
                    </div>
                </div>

                {/* Scoring Criteria */}
                <div className="mt-8 glass rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">📊 How We Score</h3>
                    <div className="grid grid-cols-5 gap-4 text-center text-sm">
                        <div>
                            <div className="text-purple-400 font-bold">25%</div>
                            <div className="text-gray-400">Originality</div>
                        </div>
                        <div>
                            <div className="text-purple-400 font-bold">25%</div>
                            <div className="text-gray-400">Actionability</div>
                        </div>
                        <div>
                            <div className="text-purple-400 font-bold">20%</div>
                            <div className="text-gray-400">Accuracy</div>
                        </div>
                        <div>
                            <div className="text-purple-400 font-bold">15%</div>
                            <div className="text-gray-400">Relevance</div>
                        </div>
                        <div>
                            <div className="text-purple-400 font-bold">15%</div>
                            <div className="text-gray-400">Clarity</div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        Minimum score of 70/100 required for approval
                    </p>
                </div>
            </div>
        </div>
    );
}
