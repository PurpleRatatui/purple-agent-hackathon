"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { stakeKnowledge } from "@/lib/solsage-program";

// Knowledge entries with short titles (under 100 chars) and concise content
const KNOWLEDGE_ENTRIES = [
    // Solana Basics
    {
        title: "Connecting to Solana RPC",
        content: "Use @solana/web3.js with Connection class. Mainnet: api.mainnet-beta.solana.com. Devnet: api.devnet.solana.com. Use Helius or QuickNode for production apps.",
        category: "solana"
    },
    {
        title: "Solana accounts explained",
        content: "Accounts store data and SOL. Each has an owner program. Must be rent-exempt (~0.00089 SOL/byte). Create with SystemProgram.createAccount().",
        category: "solana"
    },
    {
        title: "PDAs Program Derived Addresses",
        content: "PDAs are deterministic addresses from seeds + program ID. No private key, only program can sign. Use Pubkey.findProgramAddress(['seed'], programId).",
        category: "solana"
    },
    // DeFi
    {
        title: "Swapping tokens on Jupiter",
        content: "Jupiter aggregates DEX liquidity. API: quote-api.jup.ag/v6/quote. Pass inputMint, outputMint, amount. Check slippage before swapping.",
        category: "defi"
    },
    {
        title: "Liquidity pools basics",
        content: "LPs hold token pairs like SOL/USDC. Deposit equal value, earn fees. x*y=k formula. Watch for impermanent loss when prices change.",
        category: "defi"
    },
    {
        title: "Staking SOL for rewards",
        content: "Native: StakeProgram.delegate() to validators. Liquid: Marinade mSOL, Jito jitoSOL. Earn ~7% APY while keeping liquidity.",
        category: "defi"
    },
    {
        title: "DeFi lending on Solana",
        content: "Protocols: Kamino, Solend, MarginFi. Deposit collateral, borrow tokens. Health factor below 1.0 = liquidation. 65-80% collateral ratios.",
        category: "defi"
    },
    // Development
    {
        title: "Anchor framework quickstart",
        content: "Rust framework for Solana. anchor init project. Key macros: #[program], #[derive(Accounts)], #[account]. Build: anchor build. Deploy: anchor deploy.",
        category: "dev"
    },
    {
        title: "Transaction structure",
        content: "Contains: blockhash, fee payer, instructions array. Each instruction: program ID, accounts, data. Max 1232 bytes. Use versioned transactions for more.",
        category: "dev"
    },
    {
        title: "Testing Solana programs",
        content: "Use anchor test for integration. solana-program-test for units. Run solana-test-validator locally. Debug with msg! macro. View with solana logs.",
        category: "dev"
    },
    // AI Agents
    {
        title: "AI agents on Solana",
        content: "Agents hold Keypairs for autonomous transactions. Use @solana/web3.js. Simulate before sending. Implement retry with exponential backoff.",
        category: "ai"
    },
    {
        title: "Agent wallet security",
        content: "Keypair.generate() for new wallets. Store keys in env vars or Vault. Never log keys. Use HD wallets. Implement spending limits.",
        category: "ai"
    },
    {
        title: "MCP for AI blockchain integration",
        content: "Model Context Protocol connects AI to blockchains. Create tools for balances, transfers, swaps. Return structured JSON. Handle RPC limits.",
        category: "ai"
    },
    // Security
    {
        title: "Solana security checklist",
        content: "Validate account ownership. Check PDAs. Use checked_add. Verify signers. Prevent reentrancy. Validate data length. Never trust unverified accounts.",
        category: "security"
    },
    {
        title: "Compute unit optimization",
        content: "CUs determine priority. setComputeUnitLimit() and setComputeUnitPrice(). Reduce CUs: fewer accounts, smaller data. ~5000 CUs = 0.000005 SOL.",
        category: "dev"
    },
];

export default function BulkStakePage() {
    const wallet = useWallet();
    const [progress, setProgress] = useState(0);
    const [isStaking, setIsStaking] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [results, setResults] = useState<{ title: string; success: boolean; error?: string }[]>([]);
    const [currentEntry, setCurrentEntry] = useState("");

    const handleBulkStake = async () => {
        if (!wallet.connected) {
            alert("Please connect your wallet first!");
            return;
        }

        setIsStaking(true);
        setIsComplete(false);
        setProgress(0);
        setResults([]);

        for (let i = 0; i < KNOWLEDGE_ENTRIES.length; i++) {
            const entry = KNOWLEDGE_ENTRIES[i];
            setCurrentEntry(entry.title);
            setProgress(Math.round((i / KNOWLEDGE_ENTRIES.length) * 100));

            try {
                await stakeKnowledge(wallet, entry.content, entry.title, entry.category);
                setResults(prev => [...prev, { title: entry.title, success: true }]);
                await new Promise(r => setTimeout(r, 1000));
            } catch (error: any) {
                const errorMsg = error.message || "Unknown error";
                if (errorMsg.includes("already") || errorMsg.includes("0x0")) {
                    setResults(prev => [...prev, { title: entry.title, success: true, error: "Already staked" }]);
                } else {
                    setResults(prev => [...prev, { title: entry.title, success: false, error: errorMsg.slice(0, 50) }]);
                }
            }
        }

        setProgress(100);
        setIsStaking(false);
        setIsComplete(true);
        setCurrentEntry("");
    };

    const successCount = results.filter(r => r.success).length;

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6">
                    <span className="gradient-text">🚀 Bulk Knowledge Staking</span>
                </h1>

                <div className="glass rounded-xl p-6 mb-6">
                    <p className="text-gray-300 mb-4">
                        Stake <strong>{KNOWLEDGE_ENTRIES.length} knowledge entries</strong>:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="badge badge-sage">Solana</span>
                        <span className="badge badge-sage">DeFi</span>
                        <span className="badge badge-sage">Development</span>
                        <span className="badge badge-sage">AI Agents</span>
                        <span className="badge badge-sage">Security</span>
                    </div>

                    {!wallet.connected ? (
                        <p className="text-yellow-400">⚠️ Connect your wallet to continue</p>
                    ) : isComplete ? (
                        <div className="text-center py-4">
                            <div className="text-4xl mb-2">🎉</div>
                            <p className="text-emerald-400 text-xl font-bold mb-2">Staking Complete!</p>
                            <p className="text-gray-400">{successCount} / {KNOWLEDGE_ENTRIES.length} entries staked successfully</p>
                            <p className="text-sm text-gray-500 mt-2">Refresh the page to stake again (if needed)</p>
                        </div>
                    ) : (
                        <button
                            onClick={handleBulkStake}
                            disabled={isStaking}
                            className={`btn-primary w-full py-3 ${isStaking ? 'opacity-50' : ''}`}
                        >
                            {isStaking ? `Staking... ${progress}%` : "🌭 Stake All Knowledge"}
                        </button>
                    )}
                </div>

                {isStaking && (
                    <div className="glass rounded-xl p-6 mb-6">
                        <div className="mb-2 text-sm text-gray-400">Current: {currentEntry}</div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div
                                className="gradient-sage h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="glass rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Results</h2>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {results.map((r, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700">
                                    <span className="text-sm">{r.title}</span>
                                    <span className={r.success ? 'text-emerald-400' : 'text-red-400'}>
                                        {r.success ? (r.error || '✅') : `❌ ${r.error}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-emerald-400">
                                ✅ {results.filter(r => r.success).length} / {results.length} staked
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
