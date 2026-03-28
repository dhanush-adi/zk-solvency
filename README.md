# ZK-Solvency: Privacy-Preserving Solvency Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![StarkNet](https://img.shields.io/badge/Verified%20on-StarkNet-blueviolet)](https://starkware.co/starknet/)
[![zkTLS](https://img.shields.io/badge/Data%20Attestation-zkTLS-orange)](https://zk.link/)

**ZK-Solvency** is a next-generation, zero-knowledge based solvency verification platform for centralized exchanges (CEX). It continuously proves that total assets exceed total liabilities without exposing any sensitive user-level financial data or exchange internals.

---

## 🚀 Key Value Propositions

- **Eliminate Trust**: Replaces monthly audits with near real-time, cryptographic proof of reserves.
- **Privacy First**: Users and regulators verify health without seeing individual account balances or total asset breakdown.
- **Zero Manipulation**: Integrated **zkTLS** attestation ensures that data fetched from exchange backends is genuine and untampered.
- **Full Inclusion**: **Nullifier Registries** ensure that no user account can be excluded from the liability tree to artificially lower debt.

---

## 🛠️ Core Technology Stack

- **Blockchain Layer**: StarkNet (Cairo 2.0) for high-performance on-chain verification.
- **Data Integrity**: zkTLS for authenticated data fetching.
- **Cryptography**: Merkle Tree structures with zk-STARK proofs (via SP1 Prover Network).
- **Backend**: Node.js/Express with PostgreSQL & Redis for fast indexing and scheduling.
- **Frontend**: Next.js 15, React 19, Tailwind CSS, and Framer Motion for a premium dashboard experience.

---

## 📖 Use Cases

### 1. For Individual Users
Verify that your specific account balance was included in the exchange's latest solvency commitment. 
- *Benefit*: Personal peace of mind without revealing your net worth.

### 2. For Exchanges
Generate periodic proofs that "Assets >= Liabilities" to maintain market confidence.
- *Benefit*: Prove solvency without the overhead of traditional auditing firms or leaking competitive data.

### 3. For Auditors & Regulators
Monitor solvency ratios in real-time through a dedicated dashboard.
- *Benefit*: Detect anomalies (e.g., sudden liability spikes) before they lead to insolvency.

---

## 🏗️ Architecture Deep-Dive

1. **Attestation**: Exchange backend data is fetched via zkTLS. This acts as the "Trust Anchor," ensuring the prover is working with real numbers.
2. **Commitment**: Balances are converted into a Merkle tree. Every user has a unique leaf identified by a nullifier.
3. **On-Chain Registry**: The Merkle root is committed to a StarkNet smart contract.
4. **ZK-Proof**: An SP1-powered zk-STARK proof is generated showing:
   - Sum(User Balances) == Total Liabilities.
   - All balances > 0.
   - Total Assets (verified via zkTLS/On-chain balance) >= Total Liabilities.
5. **Verification**: The Smart Contract Verifier validates the STARK proof. Only valid proofs update the public Registry.

---

## 📍 Deployed Contracts (StarkNet Devnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **Nullifier Registry** | `0x0000000000000000000000000000000000000000000000000000000000000001` | Tracks user account inclusion |
| **Solvency Verifier** | `0x0000000000000000000000000000000000000000000000000000000000000002` | On-chain logic for STARK verification |
| **Proof Registry** | `0x0000000000000000000000000000000000000000000000000000000000000003` | Public ledger of verified solvency proofs |

---

## 🚦 Getting Started

### Prerequisites
- Node.js v20+
- PostgreSQL & Redis
- [StarkNet Devnet](https://github.com/shard-labs/starknet-devnet) (optional for local contract testing)

### Installation
```bash
# Install dependencies for all packages
npm install
cd frontend && npm install
cd ../backend && npm install
cd ../layer3-4 && npm install
```

### Running the Demo
```bash
# 1. Start all services (Backend + Frontend)
./start-all-terminals.sh

# 2. Populate demo data for the exchange
./reset-demo-data.sh

# 3. View the Dashboard
# Open http://localhost:3000
```

---

## 👨‍💻 Contributing
We welcome contributions to the prover logic, Cairo contracts, and frontend dashboard. Please see our [Developer Guide](./CONTRIBUTING.md) (coming soon).

---

## 🌍 Socials & Community
- **Website**: [zk-solvency.io](https://zk-solvency.io)
- **Twitter**: [@ZKSolvency](https://twitter.com/ZKSolvency)
- **Discord**: [Join our Community](https://discord.gg/zksolvency)

*Taskforce Devshouse 2026 Submission*