"use client";

import { useState } from "react";

interface Attribution {
    staker: string;
    title: string;
    relevance: number;
    reward: number;
}

interface QueryResult {
    answer: string;
    attributions: Attribution[];
}

// Mock knowledge database for demo
const MOCK_KNOWLEDGE = [
    {
        staker: "8xDf...3Kp2",
        title: "How to swap tokens on Jupiter",
        content: "Jupiter aggregates liquidity across Solana DEXs. Use the SDK: import { Jupiter } from '@jup-ag/core'; const jupiter = Jupiter.load({...})",
    },
    {
        staker: "4mNz...9Wq5",
        title: "Understanding Solana PDAs",
        content: "PDAs (Program Derived Addresses) are keyless accounts controlled by programs. Use Pubkey.findProgramAddress() to derive them.",
    },
    {
        staker: "7pRt...1Xy8",
        title: "SPL Token basics",
        content: "SPL tokens are Solana's token standard. Each token has a mint address and token accounts hold balances.",
    },
];

export default function QueryPage() {
    const [query, setQuery] = useState("");
    const [isQuerying, setIsQuerying] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [messages, setMessages] = useState<
        { role: "user" | "sage"; content: string; attributions?: Attribution[] }[]
    >([]);

    const handleQuery = async () => {
        if (!query.trim()) return;

        const userMessage = query;
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setQuery("");
        setIsQuerying(true);

        try {
            // Simulate AI query with attributions
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Find relevant knowledge (mock matching)
            const relevantKnowledge = MOCK_KNOWLEDGE.filter(
                (k) =>
                    userMessage.toLowerCase().includes("swap") ||
                    userMessage.toLowerCase().includes("jupiter") ||
                    userMessage.toLowerCase().includes("pda") ||
                    userMessage.toLowerCase().includes("token")
            );

            // Generate mock response with attributions
            const attributions: Attribution[] = relevantKnowledge.slice(0, 2).map((k, i) => ({
                staker: k.staker,
                title: k.title,
                relevance: 85 - i * 15,
                reward: Math.floor((85 - i * 15) / 10),
            }));

            const answer = generateMockAnswer(userMessage, relevantKnowledge);

            setMessages((prev) => [
                ...prev,
                { role: "sage", content: answer, attributions },
            ]);
        } catch (error) {
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
                </div>

                {/* Chat Container */}
                <div className="glass rounded-2xl overflow-hidden">
                    {/* Messages */}
                    <div className="h-[500px] overflow-y-auto p-6 space-y-6">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 py-12">
                                <div className="text-5xl mb-4">🌭</div>
                                <p>Ask me anything about Solana, DeFi, or crypto development!</p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    {[
                                        "How do I swap tokens on Jupiter?",
                                        "Explain Solana PDAs",
                                        "What are SPL tokens?",
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
                                        <span className="text-gray-400">Thinking...</span>
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
                                disabled={isQuerying}
                            />
                            <button
                                onClick={handleQuery}
                                disabled={isQuerying || !query.trim()}
                                className={`btn-primary px-6 ${isQuerying || !query.trim()
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

function generateMockAnswer(query: string, knowledge: typeof MOCK_KNOWLEDGE): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("swap") || lowerQuery.includes("jupiter")) {
        return `To swap tokens on Jupiter:

1. **Connect your wallet** to Jupiter (jup.ag)
2. **Select tokens** - Choose the token you want to swap from/to
3. **Enter amount** - Jupiter will show you the best route
4. **Review the route** - It aggregates across multiple DEXs for best price
5. **Confirm the swap** - Approve the transaction in your wallet

For programmatic swaps, use the Jupiter SDK:
\`\`\`typescript
import { Jupiter } from '@jup-ag/core';
const jupiter = await Jupiter.load({
  connection,
  cluster: 'mainnet-beta',
  user: wallet.publicKey,
});
const routes = await jupiter.computeRoutes({
  inputMint,
  outputMint,
  amount,
});
\`\`\``;
    }

    if (lowerQuery.includes("pda")) {
        return `**Program Derived Addresses (PDAs)** are special Solana accounts:

✅ **What are PDAs?**
- Accounts controlled by programs, not private keys
- Derived deterministically from seeds + program ID
- Used for storing program state securely

✅ **How to derive a PDA:**
\`\`\`typescript
const [pda, bump] = await PublicKey.findProgramAddress(
  [Buffer.from("seed"), user.toBuffer()],
  programId
);
\`\`\`

✅ **Common uses:**
- User-specific data storage
- Protocol treasuries
- Escrow accounts`;
    }

    if (lowerQuery.includes("token") || lowerQuery.includes("spl")) {
        return `**SPL Tokens** are Solana's token standard:

🪙 **Key Concepts:**
- **Mint** - The token's unique identifier (like a contract address)
- **Token Account** - Holds a user's balance of a specific token
- **Associated Token Account (ATA)** - Deterministic address per user/mint pair

📝 **Creating tokens:**
\`\`\`bash
spl-token create-token  # Creates new mint
spl-token create-account <MINT>  # Creates token account
spl-token mint <MINT> <AMOUNT>  # Mints tokens
\`\`\``;
    }

    return `Great question! Here's what I know based on the collective wisdom of SolSage contributors:

The Solana ecosystem offers powerful tools for building decentralized applications. Key concepts include:

• **Programs** - Smart contracts on Solana
• **Accounts** - Storage units for data
• **Transactions** - Atomic operations with instructions

Would you like me to elaborate on any specific aspect?`;
}
