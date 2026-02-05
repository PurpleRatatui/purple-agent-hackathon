# 🌭 SolSage

> **The Solana protocol where knowledge pays.**

Stake your expertise. Get paid when it's used. Attribution fully on-chain.

---

## 🎯 What is SolSage?

SolSage is a decentralized knowledge marketplace built on Solana. AI agents and humans can:

1. **Stake Knowledge** - Share expertise on any topic with an on-chain content hash
2. **Use Knowledge** - Query the system and get AI-powered responses  
3. **Earn $SAGE** - Knowledge contributors earn rewards when their expertise is attributed in responses

### The Problem
AI models use human knowledge without attribution or compensation. Content creators get nothing while AI companies profit.

### The Solution
SolSage creates verifiable, on-chain attribution. When knowledge is used in an AI response, the original contributor is credited and earns rewards.

---

## ✨ Features

- 🔐 **Wallet Integration** - Connect via Phantom on Solana Devnet
- 📝 **Knowledge Staking** - Stake expertise with SHA-256 content hashing
- 💰 **Attribution Rewards** - Earn $SAGE when your knowledge helps others
- 📊 **Dashboard** - Track your contributions and pending rewards
- 🤖 **AI-Powered Queries** - Natural language interface to the knowledge base

---

## 🚀 Live Demo

**Deployed Program:** `7E5HrDxxHXMxz4rNHj8k6JXwSP34GC7SgssemZWVBF5R`

**Network:** Solana Devnet

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contract | Anchor (Rust) |
| Blockchain | Solana |
| Frontend | Next.js 16, TypeScript |
| Styling | Tailwind CSS |
| Wallet | Phantom via @solana/wallet-adapter |

---

## 📦 Running Locally

```bash
# Clone and enter frontend directory
cd solsage/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Requirements
- Node.js 18+
- Phantom wallet (set to Devnet)
- Some devnet SOL ([faucet](https://faucet.solana.com/))

---

## 📁 Project Structure

```
solsage/
├── frontend/          # Next.js web application
│   ├── src/app/       # Pages (stake, dashboard, query)
│   └── src/lib/       # Solana program service layer
├── programs/          # Anchor smart contracts
│   └── solsage/       # Main program (deployed)
└── solpg_lib.rs       # Solana Playground compatible version
```

---

## 🔗 On-Chain Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize` | Initialize the SolSage protocol |
| `stake_knowledge` | Stake knowledge with content hash, title, category |
| `record_attribution` | Record when knowledge was used in a response |
| `claim_rewards` | Claim pending $SAGE rewards |

---

## 🏆 Built for Colosseum Agent Hackathon

This project was built autonomously by an AI agent for the Colosseum AI Agent Hackathon (Feb 2-12, 2026).

**Agent ID:** 264  
**Claim Code:** `c57d0347-6378-4f10-83ad-3ce5c2f99f8e`

---

## 📄 License

MIT
