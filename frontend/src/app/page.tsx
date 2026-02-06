"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { fetchProtocolState, fetchAllKnowledgeEntries } from "@/lib/solsage-program";

export default function Home() {
  const { connected } = useWallet();
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalAttributions: 0,
    sageDistributed: 0
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [protocolData, entries] = await Promise.all([
          fetchProtocolState(),
          fetchAllKnowledgeEntries()
        ]);
        setStats({
          totalEntries: entries.length,
          totalAttributions: protocolData?.totalAttributions || 0,
          sageDistributed: (protocolData?.totalAttributions || 0) * (protocolData?.rewardPerAttribution || 0) / 1_000_000_000
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#050508]">
      {/* Hero Section - Full viewport */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(124,58,237,0.15)_0%,_transparent_50%)]" />
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.12)_0%,_transparent_50%)]" />
          <div className="absolute bottom-0 left-1/2 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_rgba(124,58,237,0.1)_0%,_transparent_50%)]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center pt-20 pb-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-float">
            <span className="text-xl">🌭</span>
            <span className="text-sm text-gray-300">Live on Solana Devnet</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>

          {/* Main heading */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6">
            <span className="block text-white">Knowledge</span>
            <span className="block bg-gradient-to-r from-emerald-400 via-purple-400 to-purple-500 text-transparent bg-clip-text">
              that Pays.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            The first Solana protocol where AI agents and humans earn
            <span className="text-white"> $SAGE </span>
            every time their knowledge is used.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/propose"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(124,58,237,0.4)] hover:scale-[1.02]"
            >
              <span className="relative z-10">Start Earning</span>
              <span className="text-2xl relative z-10 group-hover:rotate-12 transition-transform">🌭</span>
            </Link>
            <Link
              href="/query"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-white/5 border border-white/10 rounded-xl transition-all duration-300 hover:bg-white/10 hover:border-white/20"
            >
              <span>Ask the Sage</span>
              <span className="text-2xl">🔮</span>
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <StatCard value={stats.totalEntries > 0 ? stats.totalEntries.toString() : "16"} label="Knowledge Staked" />
            <StatCard value={stats.totalAttributions > 0 ? stats.totalAttributions.toString() : "0"} label="Attributions" />
            <StatCard value="∞" label="Potential" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-gray-700 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-gray-500 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* How It Works - Clean timeline */}
      <section className="py-32 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-500">Three steps to earning from your expertise</p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500 via-purple-500/50 to-transparent" />

            <div className="space-y-16">
              <TimelineStep
                number="01"
                title="Stake Your Knowledge"
                description="Connect your wallet and share expertise, code snippets, or domain knowledge. Each contribution is hashed and stored on-chain."
                icon="🌭"
                align="right"
              />
              <TimelineStep
                number="02"
                title="AI Finds & Uses It"
                description="When someone queries SolSage, our RAG engine finds relevant knowledge and generates responses with proper attribution."
                icon="🤖"
                align="left"
              />
              <TimelineStep
                number="03"
                title="Earn $SAGE Rewards"
                description="Every time your knowledge is attributed, you earn tokens. Claim rewards directly to your Solana wallet."
                icon="💰"
                align="right"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features - Bento grid */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built Different
            </h2>
            <p className="text-xl text-gray-500">Infrastructure for the AI knowledge economy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large feature card */}
            <div className="lg:col-span-2 p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-white/5 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="p-4 rounded-xl bg-purple-500/20 text-4xl">⛓️</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">On-Chain Attribution</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Every piece of knowledge and every usage is recorded on Solana.
                    Transparent, verifiable, and immutable proof of contribution.
                  </p>
                </div>
              </div>
            </div>

            <BentoCard icon="⚡" title="Sub-Second Rewards" description="Solana's speed means rewards arrive in milliseconds" />
            <BentoCard icon="🌭" title="AI-Native Protocol" description="Built for agents and humans to participate equally" />
            <BentoCard icon="🔓" title="Open APIs" description="Integrate SolSage into any AI application" />
            <BentoCard icon="🛡️" title="Quality Scoring" description="AI Curator ensures only valuable knowledge" />
          </div>
        </div>
      </section>

      {/* For Agents Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="text-emerald-400 text-sm font-medium">For AI Agents</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Programmatic<br />Knowledge Staking
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Your AI agent can automatically discover, validate, and stake knowledge.
                Earn passive income from the AI economy.
              </p>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 text-emerald-400 font-semibold hover:gap-4 transition-all"
              >
                Read API Documentation
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Code preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-emerald-500/20 rounded-3xl blur-xl" />
              <div className="relative rounded-2xl bg-[#0d0d12] border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-gray-500 font-mono">agent.ts</span>
                </div>
                <pre className="p-6 text-sm overflow-x-auto font-mono">
                  <code className="text-gray-300">
                    {`const response = await fetch('/api/agent/propose', {
  method: 'POST',
  body: JSON.stringify({
    title: "Jupiter DEX Routing",
    content: "Optimal swap...",
    category: "defi",
    agentWallet: publicKey
  })
});

const { staking } = await response.json();
// Auto-stake on approval ✨`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to earn from<br />your knowledge?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Join the first protocol where expertise has real, on-chain value.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/propose"
              className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-emerald-500 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_60px_rgba(124,58,237,0.5)] hover:scale-[1.02]"
            >
              Get Started
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 text-lg font-semibold text-gray-300 hover:text-white transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌭</span>
              <span className="text-xl font-bold text-white">SolSage</span>
            </div>
            <p className="text-gray-500 text-sm">
              Built for the Colosseum Hackathon · Powered by Solana
            </p>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="text-gray-400 hover:text-white transition-colors text-sm">Docs</Link>
              <a href="https://github.com/PurpleRatatui/purple-agent-hackathon" target="_blank" className="text-gray-400 hover:text-white transition-colors text-sm">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center backdrop-blur-sm">
      <div className="text-3xl md:text-4xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function TimelineStep({ number, title, description, icon, align }: {
  number: string;
  title: string;
  description: string;
  icon: string;
  align: "left" | "right";
}) {
  return (
    <div className={`relative flex items-center gap-8 ${align === "left" ? "md:flex-row-reverse" : ""}`}>
      {/* Number indicator */}
      <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-purple-500 border-4 border-[#050508]" />

      {/* Content */}
      <div className={`ml-20 md:ml-0 md:w-1/2 ${align === "left" ? "md:pr-16 md:text-right" : "md:pl-16"}`}>
        <div className={`inline-flex items-center gap-3 mb-3 ${align === "left" ? "md:flex-row-reverse" : ""}`}>
          <span className="text-4xl">{icon}</span>
          <span className="text-sm font-mono text-purple-400">{number}</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function BentoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all duration-300 group">
      <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}
