"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <span className="text-8xl animate-float">🌭</span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-purple-500/30 rounded-full blur-xl" />
              </div>
            </div>

            {/* Tagline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">SolSage</span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-4">
              The Solana protocol where{" "}
              <span className="text-emerald-400 font-semibold">knowledge pays</span>.
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Stake your expertise. Get paid when it's used. Attribution fully on-chain.
              <br />
              Finally, fair compensation for AI-generated content.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/stake" className="btn-primary text-lg px-8 py-4">
                📚 Stake Knowledge
              </Link>
              <Link href="/query" className="btn-secondary text-lg px-8 py-4">
                🔮 Ask the Sage
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <Stat value="∞" label="Knowledge Staked" />
              <Stat value="∞" label="Attributions" />
              <Stat value="∞" label="$SAGE Distributed" />
              <Stat value="∞" label="Contributors" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How <span className="gradient-text">SolSage</span> Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon="📝"
              title="Stake Your Knowledge"
              description="Connect your wallet and stake expertise, code snippets, or domain knowledge. Each contribution gets a unique on-chain hash."
            />
            <StepCard
              step={2}
              icon="🔍"
              title="AI Uses Your Knowledge"
              description="When someone queries SolSage, our AI finds relevant contributions and generates responses with proper attribution."
            />
            <StepCard
              step={3}
              icon="💰"
              title="Get Paid in $SAGE"
              description="Every time your knowledge is attributed, you earn $SAGE tokens. Claim rewards directly to your wallet."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why <span className="gradient-text">SolSage</span>?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="⛓️"
              title="On-Chain Attribution"
              description="Every knowledge use is recorded on Solana. Transparent, verifiable, immutable."
            />
            <FeatureCard
              icon="⚡"
              title="Instant Micropayments"
              description="Thanks to Solana's speed, rewards are distributed in milliseconds with negligible fees."
            />
            <FeatureCard
              icon="🤖"
              title="AI-Native"
              description="Built for the AI economy. Both humans and agents can stake and earn."
            />
            <FeatureCard
              icon="🔓"
              title="Fully Open"
              description="Open protocol with public APIs. Integrate SolSage into any AI application."
            />
            <FeatureCard
              icon="🛡️"
              title="Secure"
              description="Your knowledge is hashed, not stored. Prove ownership without exposing content."
            />
            <FeatureCard
              icon="🌭"
              title="Deliciously Memorable"
              description="Let's be honest - you'll never forget the sausage knowledge protocol."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-sage rounded-2xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Make Your Knowledge Pay?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Join the decentralized knowledge economy. Stake your expertise today.
            </p>
            {connected ? (
              <Link href="/stake" className="btn-primary text-lg px-8 py-4 inline-block">
                Get Started →
              </Link>
            ) : (
              <p className="text-gray-400">
                Connect your wallet to get started
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>
            Built with 🌭 for the{" "}
            <a
              href="https://colosseum.com/agent-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Colosseum Agent Hackathon
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold gradient-text">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card relative">
      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full gradient-sage flex items-center justify-center text-white font-bold">
        {step}
      </div>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
