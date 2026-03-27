# SP1 Solvency Circuit

## Overview

This is the SP1 zero-knowledge circuit that proves solvency without revealing individual balances.

## Prerequisites

Install the SP1 toolchain:
```bash
curl -L https://sp1up.succinct.xyz | bash
sp1up
```

## Build

```bash
cd circuits/solvency
cargo prove build
```

This compiles the circuit to an ELF binary at `target/elf/`.

## Run (Local Prover)

```bash
# From the repo root
MOCK_PROVER=false node scripts/prove.js
```

Or directly:
```bash
cd circuits/solvency
cargo prove --input input.json --output output.json
```

## Circuit Assertions

1. **Merkle Inclusion** — every (user_id, balance) leaf is in the committed tree
2. **Sum Check** — sum(balances) == total_liabilities
3. **Solvency** — total_assets > total_liabilities
4. **Completeness** — len(balances) == nullifier_count (no omitted accounts)
5. **Non-negative** — u64 type guarantees no negative balances

## Public Inputs

| Field | Type | Source |
|-------|------|--------|
| merkle_root | [u8; 32] | Layer 3 merkle.js |
| total_assets | u64 | Exchange backend |
| cycle_id | u64 | NullifierRegistry |
| nullifier_count | u64 | NullifierRegistry |

## Output

SP1 proof blob (Groth16/PLONK) compatible with on-chain verification.
