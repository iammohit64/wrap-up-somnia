# ⚡ Wrap-Up: Study Differently
**A Decentralized Web3 AI Research & News Curation Platform, Powered by Somnia Reactivity**

[![Live Demo](https://img.shields.io/badge/Live%20App-wrap--up--somnia.vercel.app-10b981?style=for-the-badge&logo=vercel)](https://wrap-up-somnia.vercel.app/)
[![Demo Video](https://img.shields.io/badge/Watch-Demo%20Video-FF0000?style=for-the-badge&logo=youtube)](https://canva.link/0l7o8xk4xkcwwp6)
[![Somnia](https://img.shields.io/badge/Chain-Somnia%20Testnet-6366f1?style=for-the-badge)](https://somnia.network)
[![Hackathon](https://img.shields.io/badge/Hackathon-Somnia%20Reactivity%20Mini-f59e0b?style=for-the-badge)](https://dorahacks.io/hackathon/somnia-reactivity/detail)
[![Repo](https://img.shields.io/badge/GitHub-wrap--up--somnia-181717?style=for-the-badge&logo=github)](https://github.com/iammohit64/wrap-up-somnia.git)

---

## ⚡ The Somnia Reactivity Integration

> **This is not a standard deployment.** Wrap-Up was fundamentally re-architected from the ground up to leverage **Somnia Native On-Chain Reactivity**. We threw out the old "manual claim" paradigm entirely and replaced it with a frictionless, autonomous **Zero-Click Auto-Airdrop** system something only possible on Somnia.

Here is exactly how we utilised the Somnia Reactivity ecosystem across three layers of the stack:

---

### 1. 🔁 Bi-Directional WebSocket Reactivity: Technical Excellence

We built a custom Node.js **Reactivity Engine** (`somniaReactivity.js`) that runs 24/7 and maintains a **persistent WebSocket connection** directly to Somnia's ultra-fast RPC:

```
wss://dream-rpc.somnia.network/ws
```

The engine listens in real-time to the `WrapUp` smart contract for the `PointsAwarded` event. The **millisecond** a content curator crosses the **100-point threshold** via community upvotes, the engine autonomously signs and fires an execution transaction to our `ReactiveAutoClaimer` smart contract no API call, no cron job, no human intervention. Pure on-chain reactivity.

---

### 2. 🙅 Zero-Gas, Zero-Click UX Real-Time User Experience

We **completely eliminated the "Claim Rewards" button** from our frontend. On legacy platforms, users must:
1. Notice they've earned rewards
2. Click a claim button
3. Pay gas fees
4. Wait for confirmation

On Wrap-Up (Somnia), users do **nothing**. The protocol pays the gas. The tokens arrive automatically. The only thing users see is a live notification telling them their rewards just landed.

The claim button has been replaced with a static **"⚡ Auto-Airdrops Active"** badge, a deliberate UX choice that communicates the paradigm shift at a glance.

---

### 3. ⚡ Instant Frontend State Updates, Zero Polling

Using `viem` WebSockets, our React frontend is **directly subscribed to Somnia's live state**. No polling. No page refresh. No delay.

The exact millisecond the Reactivity Engine processes the auto-airdrop on-chain, the frontend catches the `ReactiveAirdropExecuted` event and pushes a **live green Toast notification** to the user's screen tokens confirmed, wallet updated, in real time.

```
On-chain event fires
      │
      ▼
somniaReactivity.js catches PointsAwarded via WebSocket
      │
      ▼
ReactiveAutoClaimer.executeAutoClaim() called autonomously
      │
      ▼
ReactiveAirdropExecuted event emitted on Somnia
      │
      ▼
viem WebSocket listener in App.jsx catches the event
      │
      ▼
Toast notification fires on user's screen zero clicks
```

---

## ✅ Deployed Contracts: Somnia Testnet

| Contract | Address |
|---|---|
| **WrapUp Core** | `0xd51BE7C7DE763eA4355D7092e8B9ab3401DC6124` |
| **WUP Token** | `0x9Efc86871f6100f87d4aA5f1f38F7d6721034259` |
| **ReactiveAutoClaimer** | `0x5D03F14c26AE3857bb0A84418Cbdb2225636E9b2` |

---

## 📖 Full Project Description

### What is Wrap-Up?

Wrap-Up is a fully-fledged decentralized social platform engineered for the modern Web3 researcher. We position it as a tool to **"Study Differently."** Instead of drowning in noisy Twitter feeds, scattered Discord servers, or financially motivated shilling, Wrap-Up delivers a **gamified, decentralized ecosystem** where high-quality articles and AI-generated research reports are curated, discussed, and permanently recorded on-chain via **Somnia Testnet**.

The platform merges the speed and intelligence of AI with the trust and transparency of blockchain, creating a new category of tool: a **verifiable, community-driven knowledge layer for Web3** now made truly real-time by Somnia's native reactivity infrastructure.

---

### 🚨 The Problem

The Web3 information landscape is broken in three critical ways:

| Problem | Impact |
|---|---|
| **Information Overload** | Hundreds of articles, threads, and posts published daily with no quality filter |
| **Financial Bias & Shilling** | Content is routinely published to pump tokens, mislead investors, or spread FUD |
| **No Verifiable Source of Truth** | There is no on-chain, cryptographically backed record of what content is accurate |

And the old-school Web3 reward model has a fourth problem: **friction.** Making users click buttons, pay gas, and manually claim what they already earned is a broken UX. Wrap-Up solves all four.

---

### ✅ The Solution

Wrap-Up is the platform where:
- **AI writes research** so you don't have to chase sources
- **Communities curate** and rank what actually matters
- **The blockchain records** what has been verified, forever
- **Somnia Reactivity pays you automatically** — no clicks, no gas, no waiting

---

## 🏗️ Smart Contract Re-Architecture for Somnia

The Somnia version of Wrap-Up is not a port — it is a re-architecture. Here is what changed at the contract level:

### What We Deleted

**`WUPClaimer.sol`** — The original user-triggered reward contract was removed entirely. It represented the old paradigm: user notices reward → user clicks button → user pays gas → user receives token. This UX is hostile and belongs in the past.

### What We Built

**`ReactiveAutoClaimer.sol`** — A new contract purpose-built for autonomous execution. Key properties:

- Contains an `executeAutoClaim(address recipient, uint256 amount)` function
- This function can **only be called by a trusted backend Relayer address** — not by any arbitrary user
- This architecture ensures the automated system is cryptographically secured against abuse
- Every execution emits a `ReactiveAirdropExecuted` event, which the frontend WebSocket listener catches in real time

**`WUPToken.sol` (Upgraded)** — We added a `reactiveMint` function to the token contract:

- Only the `ReactiveAutoClaimer` contract address is whitelisted to call `reactiveMint`
- This means the automated pipeline is the **only** path for new token emissions
- No admin key, no backdoor, no centralised minting authority — the Reactivity Engine is the sole authorized minter

---

## 🛰️ The Somnia Reactivity Engine — `somniaReactivity.js`

This file is the heart of our Somnia submission. It is a standalone Node.js service that runs permanently alongside the backend:

```javascript
// Persistent WebSocket connection to Somnia
const ws = new WebSocket('wss://dream-rpc.somnia.network/ws');

// Subscribe to PointsAwarded events from WrapUp contract
// On event: parse recipient + points total
// If points >= 100: sign and broadcast executeAutoClaim transaction
// Protocol pays gas. User receives tokens. Zero friction.
```

**Reactive flow in plain English:**

1. A user submits an article that the community loves
2. Community members upvote — each upvote triggers a `PointsAwarded` event on-chain
3. `somniaReactivity.js` catches the event via WebSocket within milliseconds
4. The engine checks: has this address crossed 100 points?
5. If yes: the engine autonomously calls `ReactiveAutoClaimer.executeAutoClaim()`
6. `ReactiveAutoClaimer` calls `WUPToken.reactiveMint()` — tokens land in the user's wallet
7. `ReactiveAirdropExecuted` event fires — frontend catches it, toast notification appears

The user never opened a transactions panel. They never paid gas. They were just reading articles.

---

## 🌟 Core Platform Features

### 1. 🤖 AI Research Report Generator

Users enter any research topic or question, and Wrap-Up's backend AI engine autonomously:

- **Scours the live web** for the most relevant and recent sources
- **Synthesizes a structured, high-quality research report** — complete with key findings, summaries, and source citations
- **Uploads the compiled report to IPFS** via Pinata, producing a permanent, tamper-proof content hash
- **Commits the IPFS hash on-chain** to the WrapUp smart contract on Somnia Testnet, creating an immutable publication record

> **Use Case:** A user wants to understand the current state of a DeFi protocol. Instead of spending hours reading, they submit the prompt to Wrap-Up and receive a synthesized, sourced report in seconds — permanently stored, community-ranked, and eligible for Reactive rewards.

---

### 2. 📰 Article Curation & Leaderboard

Any user can submit external article links to the platform. Wrap-Up's curation engine then:

- **Fetches and extracts the full article content** for clean, distraction-free in-app reading
- **Records the submission on-chain**, anchoring it to the submitter's wallet address and timestamp
- **Tracks community engagement** — upvotes, comments, and saves — aggregated into a **live curation leaderboard**

#### 🏆 The Reactive WUP Token Reward System

Users who consistently submit high-quality articles that rise to the top of the leaderboard **automatically receive WUP tokens** via the Somnia Reactivity Engine. No button. No gas. No delay.

```
Submit quality content → Community upvotes → PointsAwarded event fires
      → somniaReactivity.js catches event → ReactiveAutoClaimer executes
      → WUP tokens land in wallet → Toast notification appears
```

---

### 3. ⚖️ Article Comparator Tool

A built-in **side-by-side reading and analysis tool** that allows users to:

- **Load any two articles or AI research reports** into a split-screen view simultaneously
- **Highlight and compare** key claims, data points, and conclusions across sources
- **Identify contradictions** between sources on the same topic
- **Copy, annotate, and export** comparison sessions

> **Use Case:** A researcher compares a bullish vs. bearish analysis on a DeFi protocol side-by-side and immediately spots where the arguments diverge — without switching tabs or losing context.

---

### 4. 💬 Decentralized Social Hub

Every article and research report is a living social object with:

- **Threaded comments** — full Reddit-style nested discussions
- **Upvote and downvote** with scores reflecting genuine community sentiment
- **On-chain record** of all interactions — discussion history owned by the community, not any company

---

### 5. 🔒 On-Chain Content Provenance

Every piece of content on Wrap-Up has a **cryptographic proof of existence** on Somnia Testnet:

- **Who published it** — wallet address
- **When it was published** — block timestamp
- **What the content is** — IPFS hash (immutable reference to the full text)

---

## 🛠️ Full Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contracts** | Solidity, Foundry |
| **Blockchain** | Somnia Testnet |
| **Reactivity Engine** | Node.js, `viem` WebSocket, Somnia WSS RPC |
| **Frontend** | React, Vite, TailwindCSS |
| **State Management** | Zustand |
| **Blockchain Interaction** | Wagmi, Viem |
| **Decentralized Storage** | IPFS via Pinata |
| **Backend** | Node.js, Express |
| **AI Engine** | Web-scraping + LLM synthesis pipeline |
| **Wallet Support** | MetaMask, WalletConnect (EVM-compatible) |

---

## 🗂️ Repository Structure

```
wrap-up-somnia/
├── contracts/
│   ├── src/
│   │   ├── WrapUp.sol                # Core content registry & upvote logic
│   │   ├── WUPToken.sol              # ERC-20 token with reactiveMint
│   │   └── ReactiveAutoClaimer.sol   # Somnia-native autonomous reward contract
│   └── foundry.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ArticleCard.jsx       # Displays on-chain article data
│   │   │   ├── ResearchReport.jsx    # AI report viewer
│   │   │   ├── Comparator.jsx        # Side-by-side article tool
│   │   │   ├── DiscussionThread.jsx  # Reddit-style comments
│   │   │   └── Navbar.jsx            # ⚡ Auto-Airdrops Active badge (no claim button)
│   │   ├── App.jsx                   # ReactivityToaster — viem WebSocket listener
│   │   ├── pages/
│   │   └── store/                    # Zustand state management
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/
│   ├── routes/
│   │   ├── research.js               # AI report generation endpoint
│   │   └── articles.js               # Article fetch & extraction endpoint
│   ├── somniaReactivity.js           # ⚡ The Somnia Reactivity Engine
│   └── server.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Foundry (for contract compilation & deployment)
- A Web3 wallet (MetaMask recommended) connected to **Somnia Testnet**
- Pinata API key (for IPFS uploads)

### 1. Clone the Repository
```bash
git clone https://github.com/iammohit64/wrap-up-somnia.git
cd wrap-up-somnia
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables
```bash
# frontend/.env
VITE_WRAPUP_CONTRACT=0xd51BE7C7DE763eA4355D7092e8B9ab3401DC6124
VITE_WUP_TOKEN=0x9Efc86871f6100f87d4aA5f1f38F7d6721034259
VITE_REACTIVE_CLAIMER=0x5D03F14c26AE3857bb0A84418Cbdb2225636E9b2
VITE_CHAIN_ID=<Somnia Testnet Chain ID>

# backend/.env
PINATA_API_KEY=your_pinata_key
PINATA_SECRET=your_pinata_secret
AI_API_KEY=your_ai_key
RELAYER_PRIVATE_KEY=your_relayer_wallet_key   # Signs ReactiveAutoClaimer transactions
SOMNIA_WSS_RPC=wss://dream-rpc.somnia.network/ws
```

### 4. Run the Backend + Reactivity Engine
```bash
cd backend
npm install
npm run dev                    # Starts Express server
node somniaReactivity.js       # Starts the Reactivity Engine (persistent WebSocket listener)
```

### 5. Run the Frontend
```bash
cd frontend
npm run dev
```

### 6. Compile & Deploy Contracts (Optional)
```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url <somnia_testnet_rpc> --broadcast
```

---

## 🎯 Judging Criteria — How We Hit Every Mark

| Criteria | How Wrap-Up Delivers |
|---|---|
| **Technical Excellence** | `ReactiveAutoClaimer.sol` + `somniaReactivity.js` form a complete, production-grade bi-directional reactive pipeline. Secure relayer architecture, whitelisted minting, event-driven execution. |
| **Real-Time UX** | The "Claim" button is gone. Replaced by live toast notifications fired by `viem` WebSocket subscriptions. Users experience autonomous, instant token delivery — the exact promise of Somnia Reactivity. |
| **Somnia Integration** | All three contracts deployed and verified on Somnia Testnet. Reactivity Engine connected to `wss://dream-rpc.somnia.network/ws`. No external oracle, no cron job — pure Somnia-native reactivity. |
| **Potential Impact** | Reactive reward systems are applicable to any Web3 social, DeFi, or gaming platform. This architecture is a reusable reference implementation for zero-click, zero-gas incentive layers on Somnia. |

---

## 🔮 Roadmap

- [ ] **Governance Module** — WUP holders vote on curation policies and platform parameters
- [ ] **Reactive Governance Alerts** — Somnia WebSocket notifies holders the instant a new proposal is live
- [ ] **Mobile App** — React Native client with push notifications powered by Somnia events
- [ ] **Reputation System** — NFT-based reputation badges auto-minted reactively when milestone scores are hit
- [ ] **DAO Treasury** — Protocol fees fund community grants for high-quality research
- [ ] **Cross-Chain Expansion** — Leverage Somnia's performance to sync content state across EVM chains

---

## 👥 Team

Built with ❤️ for the Somnia Reactivity Mini Hackathon.

> *"We didn't just deploy on Somnia. We rebuilt the reward layer around Somnia's core primitive — and in doing so, made friction-free Web3 a reality for everyday users."*
