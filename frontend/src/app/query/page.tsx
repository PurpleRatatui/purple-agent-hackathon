"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAllKnowledgeEntries, KnowledgeEntryData } from "@/lib/solsage-program";

interface Attribution {
    staker: string;
    title: string;
    relevance: number;
    reward: number;
}

interface Message {
    id: string;
    role: "user" | "sage";
    content: string;
    attributions?: Attribution[];
    feedback?: "up" | "down" | null;
}

// Get unique categories from knowledge entries
function getCategories(entries: KnowledgeEntryData[]): string[] {
    const cats = new Set(entries.map(e => e.category));
    return Array.from(cats).sort();
}

// Generate dynamic suggestions based on knowledge
function generateSuggestions(entries: KnowledgeEntryData[]): string[] {
    if (entries.length === 0) return ["What knowledge is available?"];

    const suggestions: string[] = [];
    const categories = getCategories(entries);

    // Add a category-based suggestion
    if (categories.length > 0) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        suggestions.push(`Tell me about ${cat}`);
    }

    // Add title-based suggestions (pick random 2)
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 2).forEach(entry => {
        if (entry.title.length < 50) {
            suggestions.push(`What is ${entry.title.toLowerCase()}?`);
        }
    });

    // Add generic suggestions
    suggestions.push("How do I get started with Solana?");

    return suggestions.slice(0, 4);
}

// Typing animation hook
function useTypingAnimation(text: string, speed: number = 20) {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayedText("");
        setIsComplete(false);

        if (!text) return;

        let index = 0;
        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return { displayedText, isComplete };
}

// Animated message component
function AnimatedMessage({
    message,
    onFeedback,
    onCopy,
    isLatest
}: {
    message: Message;
    onFeedback: (id: string, feedback: "up" | "down") => void;
    onCopy: (content: string) => void;
    isLatest: boolean;
}) {
    const { displayedText, isComplete } = useTypingAnimation(
        isLatest && message.role === "sage" ? message.content : message.content,
        isLatest && message.role === "sage" ? 15 : 0
    );

    const showText = isLatest && message.role === "sage" ? displayedText : message.content;
    const showControls = message.role === "sage" && (isComplete || !isLatest);

    return (
        <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
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
                    {showText}
                    {isLatest && message.role === "sage" && !isComplete && (
                        <span className="animate-pulse">▋</span>
                    )}
                </p>

                {/* Control buttons */}
                {showControls && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
                        <button
                            onClick={() => onCopy(message.content)}
                            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                            title="Copy response"
                        >
                            📋
                        </button>
                        <button
                            onClick={() => onFeedback(message.id, "up")}
                            className={`p-1.5 rounded transition-colors ${message.feedback === "up"
                                    ? "text-emerald-400 bg-emerald-500/20"
                                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
                                }`}
                            title="Good response"
                        >
                            👍
                        </button>
                        <button
                            onClick={() => onFeedback(message.id, "down")}
                            className={`p-1.5 rounded transition-colors ${message.feedback === "down"
                                    ? "text-red-400 bg-red-500/20"
                                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
                                }`}
                            title="Poor response"
                        >
                            👎
                        </button>
                    </div>
                )}

                {/* Attributions */}
                {message.attributions && message.attributions.length > 0 && (isComplete || !isLatest) && (
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
                                            <div className="text-sm font-medium">{attr.title}</div>
                                            <div className="text-xs text-gray-500">by {attr.staker}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="badge badge-sage">+{attr.reward} $SAGE</div>
                                        <div className="text-xs text-gray-500">{attr.relevance}% match</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Follow-up suggestions component
function FollowUpSuggestions({
    query,
    entries,
    onSelect
}: {
    query: string;
    entries: KnowledgeEntryData[];
    onSelect: (q: string) => void;
}) {
    // Generate related follow-up questions
    const suggestions = [
        `Tell me more about this topic`,
        `What are the best practices?`,
        `Can you give me an example?`,
    ];

    // Add a related entry suggestion if available
    const relatedEntry = entries.find(e =>
        !query.toLowerCase().includes(e.title.toLowerCase().split(' ')[0])
    );
    if (relatedEntry) {
        suggestions.unshift(`How does this relate to ${relatedEntry.title.toLowerCase()}?`);
    }

    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.slice(0, 3).map((s, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(s)}
                    className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-sm text-purple-300 hover:bg-purple-500/20 transition-colors"
                >
                    {s}
                </button>
            ))}
        </div>
    );
}

// Category filter pills
function CategoryFilter({
    categories,
    selected,
    onSelect,
}: {
    categories: string[];
    selected: string | null;
    onSelect: (cat: string | null) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <button
                onClick={() => onSelect(null)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${selected === null
                        ? "bg-purple-500/30 text-white"
                        : "bg-gray-800/50 text-gray-400 hover:text-white"
                    }`}
            >
                All
            </button>
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${selected === cat
                            ? "bg-purple-500/30 text-white"
                            : "bg-gray-800/50 text-gray-400 hover:text-white"
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}

// Empty state with category cards
function EmptyState({
    categories,
    suggestions,
    onCategoryClick,
    onSuggestionClick,
}: {
    categories: string[];
    suggestions: string[];
    onCategoryClick: (cat: string) => void;
    onSuggestionClick: (q: string) => void;
}) {
    const categoryEmojis: Record<string, string> = {
        solana: "☀️",
        defi: "💰",
        dev: "🛠️",
        ai: "🤖",
        security: "🔒",
    };

    return (
        <div className="text-center py-8">
            {/* Animated mascot */}
            <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-5xl animate-bounce">🌭</span>
                </div>
            </div>

            <h2 className="text-xl font-bold mb-2">Ask me anything!</h2>
            <p className="text-gray-400 mb-6">
                I search the community&apos;s staked knowledge to find answers
            </p>

            {/* Category cards */}
            {categories.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    {categories.slice(0, 5).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onCategoryClick(cat)}
                            className="p-3 bg-gray-800/50 rounded-xl hover:bg-gray-700/50 transition-colors group"
                        >
                            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                {categoryEmojis[cat.toLowerCase()] || "📚"}
                            </div>
                            <div className="text-sm capitalize">{cat}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion, i) => (
                    <button
                        key={i}
                        onClick={() => onSuggestionClick(suggestion)}
                        className="px-4 py-2 bg-gray-800/50 rounded-lg text-sm hover:bg-gray-700/50 transition-colors border border-gray-700/50"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Loading animation
function ThinkingAnimation() {
    return (
        <div className="flex justify-start">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl rounded-tl-sm p-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="text-lg">🌭</span>
                        <div className="absolute -top-1 -right-1 w-3 h-3">
                            <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute inset-0 bg-purple-400 rounded-full"></div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <span className="text-gray-400">Searching knowledge</span>
                        <span className="animate-bounce delay-0">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                    </div>
                </div>
                <div className="mt-2 flex gap-2">
                    <div className="h-1 w-16 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 animate-progress"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QueryPage() {
    const [query, setQuery] = useState("");
    const [isQuerying, setIsQuerying] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntryData[]>([]);
    const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Fetch knowledge entries
    useEffect(() => {
        async function loadKnowledgeBase() {
            setIsLoadingKnowledge(true);
            try {
                const entries = await fetchAllKnowledgeEntries();
                setKnowledgeBase(entries);
                console.log(`Loaded ${entries.length} knowledge entries from chain`);
            } catch (error) {
                console.error("Failed to load knowledge base:", error);
            } finally {
                setIsLoadingKnowledge(false);
            }
        }
        loadKnowledgeBase();
    }, []);

    const categories = getCategories(knowledgeBase);
    const suggestions = generateSuggestions(knowledgeBase);

    // Filter entries by category
    const filteredEntries = selectedCategory
        ? knowledgeBase.filter(e => e.category === selectedCategory)
        : knowledgeBase;

    // Handle query submission
    const handleQuery = async (queryText?: string) => {
        const q = queryText || query;
        if (!q.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: q
        };
        setMessages((prev) => [...prev, userMessage]);
        setQuery("");
        setIsQuerying(true);

        try {
            const knowledgeForApi = filteredEntries.map(entry => ({
                staker: entry.staker.toBase58().slice(0, 4) + "..." + entry.staker.toBase58().slice(-4),
                title: entry.title,
                content: entry.title + " - " + entry.category,
                category: entry.category,
            }));

            const response = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: q,
                    knowledgeEntries: knowledgeForApi,
                }),
            });

            if (!response.ok) throw new Error("Query failed");

            const result = await response.json();

            const sageMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "sage",
                content: result.answer,
                attributions: result.attributions,
                feedback: null,
            };
            setMessages((prev) => [...prev, sageMessage]);
        } catch (error) {
            console.error("Query error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "sage",
                    content: "Sorry, I encountered an error. Please try again.",
                    feedback: null,
                },
            ]);
        } finally {
            setIsQuerying(false);
        }
    };

    // Handle feedback
    const handleFeedback = (messageId: string, feedback: "up" | "down") => {
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, feedback: m.feedback === feedback ? null : feedback }
                : m
        ));
    };

    // Handle copy
    const handleCopy = async (content: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Handle voice input
    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Voice input is not supported in your browser");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
        };

        recognition.start();
    };

    // Clear chat
    const clearChat = () => {
        setMessages([]);
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
                                <span className="text-gray-400">{knowledgeBase.length} knowledge entries on-chain</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Category Filter */}
                {categories.length > 0 && messages.length === 0 && (
                    <CategoryFilter
                        categories={categories}
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                    />
                )}

                {/* Chat Container */}
                <div className="glass rounded-2xl overflow-hidden">
                    {/* Header with clear button */}
                    {messages.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50">
                            <span className="text-sm text-gray-400">{messages.length} messages</span>
                            <button
                                onClick={clearChat}
                                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Clear chat
                            </button>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="h-[500px] overflow-y-auto p-6 space-y-6">
                        {messages.length === 0 && (
                            <EmptyState
                                categories={categories}
                                suggestions={suggestions}
                                onCategoryClick={(cat) => {
                                    setSelectedCategory(cat);
                                    setQuery(`Tell me about ${cat}`);
                                }}
                                onSuggestionClick={(q) => handleQuery(q)}
                            />
                        )}

                        {messages.map((message, index) => (
                            <div key={message.id}>
                                <AnimatedMessage
                                    message={message}
                                    onFeedback={handleFeedback}
                                    onCopy={handleCopy}
                                    isLatest={index === messages.length - 1}
                                />

                                {/* Follow-up suggestions after sage response */}
                                {message.role === "sage" &&
                                    index === messages.length - 1 &&
                                    !isQuerying && (
                                        <FollowUpSuggestions
                                            query={messages[index - 1]?.content || ""}
                                            entries={knowledgeBase}
                                            onSelect={(q) => handleQuery(q)}
                                        />
                                    )}
                            </div>
                        ))}

                        {isQuerying && <ThinkingAnimation />}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-700 p-4">
                        <div className="flex gap-3">
                            {/* Voice input */}
                            <button
                                onClick={handleVoiceInput}
                                disabled={isQuerying || isLoadingKnowledge}
                                className={`p-3 rounded-lg transition-all ${isListening
                                        ? "bg-red-500/20 text-red-400 animate-pulse"
                                        : "bg-gray-800/50 text-gray-400 hover:text-white"
                                    }`}
                                title="Voice input"
                            >
                                🎤
                            </button>

                            <input
                                type="text"
                                className="input flex-1"
                                placeholder={isListening ? "Listening..." : "Ask anything about Solana..."}
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
                                onClick={() => handleQuery()}
                                disabled={isQuerying || !query.trim() || isLoadingKnowledge}
                                className={`btn-primary px-6 ${isQuerying || !query.trim() || isLoadingKnowledge
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                            >
                                {isQuerying ? "..." : "Ask"}
                            </button>
                        </div>

                        {/* Copied toast */}
                        {copied && (
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                                ✓ Copied to clipboard
                            </div>
                        )}
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
