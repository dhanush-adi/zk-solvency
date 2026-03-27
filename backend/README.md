# ZK-Solvency Backend

Privacy-preserving proof-of-reserves system for centralized crypto exchanges.

## Overview

ZK-Solvency is a continuous, privacy-preserving proof-of-reserves system that enables crypto exchanges to prove solvency without revealing individual user balances. The system uses zk-STARK proofs, Merkle trees, and nullifier registrations to ensure complete auditability while maintaining user privacy.

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript (strict mode)
- **Framework**: Express.js with express-async-errors
- **Database**: PostgreSQL via Drizzle ORM
- **Caching**: Redis (ioredis)
- **Queue**: BullMQ for proof job scheduling
- **Blockchain**: ethers.js v6
- **Validation**: Zod
- **Logging**: Pino

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance

### Installation

```bash
cd backend
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `CHAIN_RPC_URL` - Ethereum Sepolia RPC URL
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `X402_GATEWAY_SECRET` - Secret for payment verification
- `PROOF_INTERVAL_MS` - Proof generation interval (default: 600000 = 10 min)
- `PORT` - Server port (default: 3001)

### Database Setup

```bash
# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly
npm run db:push
```

### Running

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Health Check

**GET** `/api/health`

Returns the health status of all system components.

```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "redis": { "status": "healthy", "latency": 5 },
    "database": { "status": "healthy", "latency": 12 },
    "server": { "status": "healthy" },
    "environment": { "status": "development" }
  }
}
```

### Solvency Proofs

**GET** `/api/solvency/latest-proof`

Returns the latest verified proof round with complete proof data.

```bash
curl http://localhost:3001/api/solvency/latest-proof
```

**Response:**
```json
{
  "roundId": "uuid-here",
  "roundNumber": 1,
  "merkleRoot": "0xabc123...",
  "totalAssets": "1000000",
  "totalLiabilities": "1000000",
  "previousRoundHash": "0xdef456...",
  "starkProofCid": "Qm...",
  "chainTxHash": "0x789...",
  "status": "verified",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "verifiedAt": "2024-01-01T00:00:05.000Z",
  "onChain": {
    "merkleRoot": "0xabc123...",
    "totalAssets": "1000000",
    "totalLiabilities": "1000000",
    "timestamp": 1704067200000
  }
}
```

**GET** `/api/solvency/history`

Returns paginated history of proof rounds.

```bash
curl "http://localhost:3001/api/solvency/history?limit=10&offset=0"
```

**Response:**
```json
{
  "rounds": [
    {
      "roundId": "uuid-here",
      "roundNumber": 1,
      "merkleRoot": "0xabc123...",
      "totalAssets": "1000000",
      "totalLiabilities": "1000000",
      "status": "verified",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "chainTxHash": "0x789..."
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

**POST** `/api/solvency/simulate`

Creates a simulated proof round with mock accounts (for testing).

```bash
curl -X POST http://localhost:3001/api/solvency/simulate \
  -H "Content-Type: application/json" \
  -d '{"accountCount": 100}'
```

**Response:**
```json
{
  "success": true,
  "roundId": "uuid-here",
  "roundNumber": 1,
  "merkleRoot": "0xabc123...",
  "totalAssets": "500000",
  "totalLiabilities": "500000",
  "accountCount": 100,
  "message": "Simulated proof round created with mock accounts"
}
```

### User Inclusion Proof

**POST** `/api/inclusion/prove`

Generates a Merkle inclusion proof for a specific user.

*Requires authentication header with JWT token.*

```bash
curl -X POST http://localhost:3001/api/inclusion/prove \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"userId": "user_1", "signature": "0xabc..."}'
```

**Response:**
```json
{
  "userId": "user_1",
  "merkleProof": {
    "leaf": "0xleaf...",
    "siblings": ["0xsib1...", "0xsib2..."],
    "pathIndices": [1, 0, 1]
  },
  "roundId": "uuid-here",
  "roundNumber": 1,
  "merkleRoot": "0xroot...",
  "verified": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Auditor Endpoints

*Requires x402 payment header.*

**GET** `/api/auditor/verify`

Performs full solvency verification including chain integrity check.

```bash
curl http://localhost:3001/api/auditor/verify \
  -H "x402-payment: {\"paymentId\":\"pay_1\",\"amount\":1000000000,\"token\":\"ETH\",\"signature\":\"...\",\"timestamp\":1704067200000}"
```

**Response:**
```json
{
  "verified": true,
  "totalRounds": 10,
  "latestRound": {
    "roundId": "uuid-here",
    "roundNumber": 10,
    "merkleRoot": "0xabc...",
    "totalAssets": "1000000",
    "totalLiabilities": "1000000",
    "chainTxHash": "0x789...",
    "verifiedAt": "2024-01-01T00:00:00.000Z"
  },
  "chainIntegrity": {
    "verified": true,
    "firstRound": 1,
    "lastRound": 10
  },
  "auditPack": {
    "accountCount": 1000,
    "totalBalance": "1000000",
    "merkleRoot": "0xabc..."
  }
}
```

**GET** `/api/auditor/circuit-registry`

Returns signed circuit registry and audit attestations.

```bash
curl http://localhost:3001/api/auditor/circuit-registry \
  -H "x402-payment: {\"paymentId\":\"pay_1\",\"amount\":1000000000,\"token\":\"ETH\",\"signature\":\"...\",\"timestamp\":1704067200000}"
```

**Response:**
```json
{
  "circuit": {
    "name": "solvency-circuit",
    "version": "1.0.0",
    "circuitHash": "0x...",
    "verificationKeyHash": "0x..."
  },
  "attestations": [
    {
      "type": "circuit_registry",
      "circuitHash": "0x...",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "signature": "0x..."
    }
  ],
  "auditEndpoints": [
    {
      "name": "full_verify",
      "path": "/auditor/verify",
      "requiresPayment": true
    }
  ]
}
```

### Attestation

**POST** `/api/attest/balances`

Submit balance data for attestation (exchange webhook endpoint).

```bash
curl -X POST http://localhost:3001/api/attest/balances \
  -H "Content-Type: application/json" \
  -d '{
    "exchangeId": "my-exchange",
    "signature": "0xabc123...",
    "balances": [
      {"userId": "user_1", "balance": "1000"},
      {"userId": "user_2", "balance": "2000"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "exchangeId": "my-exchange",
  "accountCount": 2,
  "blockTimestamp": 1704067200000,
  "message": "Successfully attested 2 accounts"
}
```

**GET** `/api/attest/status/:exchangeId`

Get attestation status for an exchange.

```bash
curl http://localhost:3001/api/attest/status/my-exchange
```

**Response:**
```json
{
  "exchangeId": "my-exchange",
  "accountCount": 1000,
  "totalBalance": "1000000",
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "status": "active"
}
```

## Authentication

### JWT Token

Endpoints requiring authentication expect a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

Token payload:
```json
{
  "sub": "user-id",
  "role": "user|auditor|regulator|admin",
  "iat": 1704067200,
  "exp": 1704153600
}
```

### x402 Payment

Auditor endpoints require an x402 payment header:

```json
{
  "paymentId": "pay_abc123",
  "amount": 1000000000,
  "token": "ETH",
  "signature": "signed(payload + secret)",
  "timestamp": 1704067200000
}
```

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  Health  │ │ Solvency │ │Inclusion │ │     Auditor       │  │
│  └──────────┘ └──────────┘ └──────────┘ │  (x402 payment)   │  │
│  ┌──────────┐ ┌──────────┐              │                   │  │
│  │Attestation│ │ Circuit  │              └───────────────────┘  │
│  └──────────┘ └──────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                                │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │MerkleService │ │ NullifierSvc │ │     ProverService      │  │
│  └──────────────┘ └──────────────┘ └────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │AttestationSvc│ │  ChainSvc    │ │   ProofScheduler       │  │
│  └──────────────┘ └──────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │  PostgreSQL  │ │    Redis     │ │    Blockchain          │  │
│  │   (Drizzle)  │ │  (BullMQ)    │ │  (ethers.js v6)        │  │
│  └──────────────┘ └──────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## License

MIT
