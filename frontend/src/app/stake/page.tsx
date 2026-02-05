"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    stakeKnowledge,
    isProtocolInitialized,
    initializeProtocol,
    getExplorerUrl,
} from "@/lib/solsage-program";

// Categories for knowledge
const CATEGORIES = [
    { id: "defi", label: "DeFi", icon: "💰" },
    { id: "development", label: "Development", icon: "💻" },
    { id: "solana", label: "Solana", icon: "⚡" },
    { id: "crypto", label: "Crypto General", icon: "🔗" },
    { id: "ai", label: "AI/ML", icon: "🤖" },
    { id: "other", label: "Other", icon: "📦" },
];

export default function StakePage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("solana");
    const [isStaking, setIsStaking] = useState(false);
    const [stakeResult, setStakeResult] = useState<{
        success: boolean;
        signature?: string;
        message?: string;
        explorerUrl?: string;
    } | null>(null);
    const [protocolReady, setProtocolReady] = useState<boolean | null>(null);
    const [protocolCheckFailed, setProtocolCheckFailed] = useState(false);

    // Check if protocol is initialized
    useEffect(() => {
        async function checkProtocol() {
            try {
                const initialized = await isProtocolInitialized();
                setProtocolReady(initialized);
                // If not initialized, the protocol may still work 
                // (it might be initialized by the deployer wallet)
                if (!initialized) {
                    console.log("Protocol appears uninitialized. May need initialization from deployer wallet.");
                }
            } catch (error) {
                console.error("Failed to check protocol state:", error);
                setProtocolCheckFailed(true);
                // Allow staking anyway - the check might have failed due to RPC issues
                setProtocolReady(true);
            }
        }
        checkProtocol();
    }, []);

    // Generate hash preview
    const contentHash = content
        ? Array.from(
            new Uint8Array(
                new TextEncoder().encode(content).buffer.slice(0, 8)
            )
        )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase() + "..."
        : "";

    const handleInitializeProtocol = async () => {
        try {
            setIsStaking(true);
            console.log("Initializing protocol...");
            await initializeProtocol(wallet);
            setProtocolReady(true);
            setStakeResult({
                success: true,
                message: "Protocol initialized! You can now stake knowledge.",
            });
        } catch (error: any) {
            console.error("Protocol initialization error:", error);
            // Extract more specific error message
            let errorMsg = error.message || "Unknown error";
            if (error.logs) {
                console.error("Transaction logs:", error.logs);
                errorMsg += " - Check console for logs";
            }
            setStakeResult({
                success: false,
                message: `Failed to initialize protocol: ${errorMsg}`,
            });
        } finally {
            setIsStaking(false);
        }
    };

    const handleStake = async () => {
        if (!connected || !publicKey) {
            alert("Please connect your wallet first");
            return;
        }

        if (!title || !content) {
            alert("Please fill in all fields");
            return;
        }

        setIsStaking(true);
        setStakeResult(null);

        try {
            // Call the real Solana program
            const result = await stakeKnowledge(wallet, content, title, category);

            setStakeResult({
                success: true,
                signature: result.signature,
                message: "Knowledge staked successfully on Solana!",
                explorerUrl: getExplorerUrl(result.signature),
            });

            // Clear form
            setTitle("");
            setContent("");
        } catch (error: any) {
            console.error("Staking error:", error);
            setStakeResult({
                success: false,
                message: error.message || "Failed to stake knowledge. Please try again.",
            });
        } finally {
            setIsStaking(false);
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center glass rounded-2xl p-12 max-w-md">
                    <div className="text-6xl mb-6">🔐</div>
                    <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                    <p className="text-gray-400">
                        Connect your Solana wallet to stake knowledge and earn $SAGE.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="gradient-text">Stake Knowledge</span>
                    </h1>
                    <p className="text-gray-400">
                        Share your expertise and earn $SAGE when it helps others.
                    </p>
                    <div className="mt-2 text-sm text-emerald-400">
                        🔗 Connected to Solana Devnet
                    </div>
                </div>

                {/* Protocol Check */}
                {protocolReady === false && (
                    <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-2xl">⚠️</span>
                            <div className="flex-1">
                                <div className="font-semibold">Protocol May Need Initialization</div>
                                <p className="text-sm text-gray-300">
                                    You can try initializing the protocol, or try staking directly (the protocol may already be initialized by the deployer).
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleInitializeProtocol}
                                    disabled={isStaking}
                                    className="btn-primary text-sm"
                                >
                                    {isStaking ? "..." : "Initialize"}
                                </button>
                                <button
                                    onClick={() => setProtocolReady(true)}
                                    className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
                                >
                                    Skip & Try Staking
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stake Form */}
                <div className="glass rounded-2xl p-8">
                    {/* Title */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., How to swap tokens on Jupiter"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {title.length}/100
                        </div>
                    </div>

                    {/* Category */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Category
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`p-3 rounded-lg transition-all ${category === cat.id
                                        ? "bg-purple-500/30 border-purple-500 border-2"
                                        : "bg-gray-800/50 border-2 border-transparent hover:border-gray-600"
                                        }`}
                                >
                                    <div className="text-xl mb-1">{cat.icon}</div>
                                    <div className="text-xs">{cat.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Knowledge Content
                        </label>
                        <textarea
                            className="textarea"
                            placeholder="Share your expertise... This could be a code snippet, explanation, tutorial, or any valuable knowledge."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={8}
                        />
                    </div>

                    {/* Preview */}
                    {content && (
                        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="text-sm text-gray-400 mb-2">Content Hash Preview</div>
                            <code className="text-emerald-400 font-mono text-sm">
                                0x{contentHash}
                            </code>
                            <p className="text-xs text-gray-500 mt-2">
                                Your content is hashed on-chain using SHA-256. The actual content stays private.
                            </p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleStake}
                        disabled={isStaking || !title || !content}
                        className={`w-full btn-primary text-lg py-4 ${isStaking || !title || !content
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                            }`}
                    >
                        {isStaking ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    className="animate-spin h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Staking on Solana...
                            </span>
                        ) : (
                            "📚 Stake Knowledge"
                        )}
                    </button>
                </div>

                {/* Result */}
                {stakeResult && (
                    <div
                        className={`mt-6 p-6 rounded-xl ${stakeResult.success
                            ? "bg-emerald-500/20 border border-emerald-500/50"
                            : "bg-red-500/20 border border-red-500/50"
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-3xl">
                                {stakeResult.success ? "✅" : "❌"}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">
                                    {stakeResult.success
                                        ? "Knowledge Staked!"
                                        : "Staking Failed"}
                                </h3>
                                <p className="text-gray-300">{stakeResult.message}</p>
                                {stakeResult.signature && (
                                    <div className="mt-3">
                                        <div className="text-sm text-gray-400">Transaction Signature</div>
                                        <code className="text-emerald-400 font-mono text-xs break-all">
                                            {stakeResult.signature}
                                        </code>
                                        {stakeResult.explorerUrl && (
                                            <a
                                                href={stakeResult.explorerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-block text-sm text-purple-400 hover:text-purple-300 underline"
                                            >
                                                View on Solana Explorer →
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tips */}
                <div className="mt-12 grid md:grid-cols-2 gap-6">
                    <div className="card">
                        <div className="text-2xl mb-2">💡</div>
                        <h3 className="font-semibold mb-2">What Makes Good Knowledge?</h3>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• Clear, actionable explanations</li>
                            <li>• Working code snippets with context</li>
                            <li>• Specific domain expertise</li>
                            <li>• Unique insights not easily Googled</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="text-2xl mb-2">💰</div>
                        <h3 className="font-semibold mb-2">How You Earn</h3>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• 1-10 $SAGE per attribution</li>
                            <li>• Higher relevance = higher rewards</li>
                            <li>• Rewards accumulate in your dashboard</li>
                            <li>• Claim anytime to your wallet</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
