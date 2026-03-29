# ZK-Solvency Layer3-4: Smart Contracts & ZK Components

[![StarkNet](https://img.shields.io/badge/StarkNet-Cairo%202.0-blueviolet.svg)](https://starkware.co/starknet/)
[![ZK-STARK](https://img.shields.io/badge/Proofs-zk--STARK-orange.svg)](https://starkware.co/stark/)
[![SP1](https://img.shields.io/badge/Prover-SP1%20Network-green.svg)](https://succinct.xyz/)

The **Layer3-4** component implements the core cryptographic infrastructure for ZK-Solvency, including Merkle tree construction, nullifier registries, and StarkNet smart contract integration.

## Overview

This module provides:
- **Layer 3**: Merkle tree generation and proof verification for user balance commitments
- **Layer 4**: Nullifier registry smart contracts on StarkNet to prevent double-inclusion
- **ZK Integration**: SP1 prover network integration for zk-STARK proof generation
- **Contract Management**: Deployment and interaction scripts for StarkNet contracts

## Quick Start

### Prerequisites
- Node.js 20+
- StarkNet CLI tools
- Access to StarkNet devnet (auto-started by `./start.sh`)

### Setup from Project Root
```bash
# Automatic setup (recommended)
./start.sh  # Automatically deploys contracts and sets up environment
```

### Manual Setup
```bash
cd layer3-4
npm install

# Deploy contracts to local devnet
npm run deploy

# Run tests
npm test
```

## Smart Contracts

### Deployed Contracts (StarkNet Devnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **NullifierRegistry** | `0x071cff...` | Tracks user account inclusion to prevent double-counting |
| **SolvencyVerifier** | `0x04ed56...` | Verifies zk-STARK proofs on-chain |
| **ProofRegistry** | `0x078d22...` | Public registry of verified solvency proofs |

### API Reference

#### Deployment Script
```bash
# Deploy all contracts to devnet
npm run deploy

# Deploy to specific network
npm run deploy -- --network mainnet

# Verify deployment
npm run verify
```

#### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test test/merkle.test.js

# Run tests with coverage
npm run test:coverage
```

## Configuration

### Environment Variables
```bash
# StarkNet Configuration
STARKNET_RPC_URL=http://localhost:5050
STARKNET_PRIVATE_KEY=0x1234...

# SP1 Prover Configuration  
SP1_ENDPOINT=https://prover.succinct.xyz
SP1_CIRCUIT_ID=solvency-v1
SP1_API_KEY=your-api-key

# Contract Addresses (auto-populated after deployment)
NULLIFIER_REGISTRY_ADDRESS=0x071cff...
SOLVENCY_VERIFIER_ADDRESS=0x04ed56...
PROOF_REGISTRY_ADDRESS=0x078d22...
```

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

## Related Documentation

- [Main Project README](../README.md) - Complete system overview  
- [Backend Documentation](../backend/README.md) - API server implementation
- [Frontend Documentation](../frontend/README.md) - User interface

**Built with ❤️ by the ZK-Solvency Team**