"use client";

import { useState, useEffect } from "react";
import { fetchAllKnowledgeEntries, KnowledgeEntryData } from "@/lib/solsage-program";

interface Attribution {
    staker: string;
    title: string;
    relevance: number;
    reward: number;
}

interface Message {
    role: "user" | "sage";
    content: string;
    attributions?: Attribution[];
}

export default function QueryPage() {
    const [query, setQuery] = useState("");
    const [isQuerying, setIsQuerying] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntryData[]>([]);
    const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
    const [knowledgeCount, setKnowledgeCount] = useState(0);

    // Fetch all knowledge entries on page load
    useEffect(() => {
        async function loadKnowledgeBase() {
            setIsLoadingKnowledge(true);
            try {
                const entries = await fetchAllKnowledgeEntries();
                setKnowledgeBase(entries);
                setKnowledgeCount(entries.length);
                console.log(`Loaded ${entries.length} knowledge entries from chain`);
            } catch (error) {
                console.error("Failed to load knowledge base:", error);
            } finally {
                setIsLoadingKnowledge(false);
            }
        }
        loadKnowledgeBase();
    }, []);

    const handleQuery = async () => {
        if (!query.trim()) return;

        const userMessage = query;
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setQuery("");
        setIsQuerying(true);

        try {
            // Convert knowledge entries to the format expected by the API
            const knowledgeForApi = knowledgeBase.map(entry => ({
                staker: entry.staker.toBase58().slice(0, 4) + "..." + entry.staker.toBase58().slice(-4),
                title: entry.title,
                content: entry.title + " - " + entry.category, // Use title + category as content
                category: entry.category,
            }));

            // Call the RAG API
            const response = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: userMessage,
                    knowledgeEntries: knowledgeForApi,
                }),
            });

            if (!response.ok) {
                throw new Error("Query failed");
            }

            const result = await response.json();

            setMessages((prev) => [
                ...prev,
                {
                    role: "sage",
                    content: result.answer,
                    attributions: result.attributions,
                },
            ]);
        } catch (error) {
            console.error("Query error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "sage",
                    content: "Sorry, I encountered an error. Please try again.",
                },
            ]);
        } finally {
            setIsQuerying(false);
        }
    };

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="gradient-text">Ask the Sage</span> 🔮
                    </h1>
                    <p className="text-gray-400">
                        Query the collective knowledge. Contributors get attributed and paid.
                    </p>

                    {/* Knowledge Base Status */}
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-full text-sm">
                        {isLoadingKnowledge ? (
                            <>
                                <span className="animate-pulse">⏳</span>
                                <span className="text-gray-400">Loading knowledge base...</span>
                            </>
                        ) : (
                            <>
                                <span className="text-emerald-400">✓</span>
                                <span className="text-gray-400">{knowledgeCount} knowledge entries on-chain</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Chat Container */}
                <div className="glass rounded-2xl overflow-hidden">
                    {/* Messages */}
                    <div className="h-[500px] overflow-y-auto p-6 space-y-6">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 py-12">
                                <div className="text-5xl mb-4">🌭</div>
                                <p>Ask me anything about Solana, DeFi, or crypto development!</p>
                                <p className="text-sm mt-2 text-gray-600">
                                    Responses are sourced from knowledge staked by the community
                                </p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    {[
                                        "What knowledge is available?",
                                        "Tell me about crypto",
                                        "How does staking work?",
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setQuery(suggestion)}
                                            className="px-3 py-2 bg-gray-800/50 rounded-lg text-sm hover:bg-gray-700/50 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] ${message.role === "user"
                                        ? "bg-purple-500/20 border border-purple-500/30 rounded-2xl rounded-tr-sm"
                                        : "bg-gray-800/50 border border-gray-700 rounded-2xl rounded-tl-sm"
                                        } p-4`}
                                >
                                    {message.role === "sage" && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">🌭</span>
                                            <span className="font-semibold text-emerald-400">SolSage</span>
                                        </div>
                                    )}
                                    <p className="text-gray-200 whitespace-pre-wrap">
                                        {message.content}
                                    </p>

                                    {/* Attributions */}
                                    {message.attributions && message.attributions.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-700">
                                            <div className="text-xs text-gray-400 mb-2">
                                                📚 Knowledge Sources (Contributors Earned $SAGE)
                                            </div>
                                            <div className="space-y-2">
                                                {message.attributions.map((attr, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full flex items-center justify-center text-xs">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium">
                                                                    {attr.title}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    by {attr.staker}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="badge badge-sage">
                                                                +{attr.reward} $SAGE
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {attr.relevance}% match
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isQuerying && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl rounded-tl-sm p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg animate-pulse">🌭</span>
                                        <span className="text-gray-400">Searching knowledge base...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-700 p-4">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                className="input flex-1"
                                placeholder="Ask anything about Solana..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isQuerying) {
                                        handleQuery();
                                    }
                                }}
                                disabled={isQuerying || isLoadingKnowledge}
                            />
                            <button
                                onClick={handleQuery}
                                disabled={isQuerying || !query.trim() || isLoadingKnowledge}
                                className={`btn-primary px-6 ${isQuerying || !query.trim() || isLoadingKnowledge
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                    }`}
                            >
                                {isQuerying ? "..." : "Ask"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>
                        Every query attributes knowledge sources on-chain and distributes
                        $SAGE tokens to contributors.
                    </p>
                </div>
            </div>
        </div>
    );
}
