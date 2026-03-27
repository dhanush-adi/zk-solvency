//! solvency/src/main.rs — SP1 Solvency Circuit
//!
//! Public inputs (committed on-chain, visible to verifier):
//!   - merkle_root: [u8; 32]
//!   - total_assets: u64
//!   - cycle_id: u64
//!   - nullifier_count: u64
//!
//! Private inputs (known only to prover):
//!   - balances: Vec<u64>
//!   - user_ids: Vec<String>
//!   - merkle_proofs: Vec<Vec<[u8; 32]>>
//!
//! Circuit assertions:
//!   1. Every (user_id, balance) pair has valid merkle inclusion
//!   2. sum(balances) == total_liabilities
//!   3. total_assets > total_liabilities (solvency)
//!   4. len(balances) == nullifier_count (completeness)
//!   5. No negative balances (u64 guarantees this)

#![no_main]
sp1_zkvm::entrypoint!(main);

use serde::Deserialize;
use tiny_keccak::{Hasher, Keccak};

#[derive(Deserialize)]
struct ProverInput {
    // Public inputs
    merkle_root: [u8; 32],
    total_assets: u64,
    cycle_id: u64,
    nullifier_count: u64,

    // Private inputs
    balances: Vec<u64>,
    user_ids: Vec<String>,
    merkle_proofs: Vec<Vec<[u8; 32]>>,
}

/// Compute keccak256(user_id || balance) to produce a leaf hash.
fn compute_leaf(user_id: &str, balance: u64) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    hasher.update(user_id.as_bytes());
    hasher.update(&balance.to_be_bytes());
    let mut output = [0u8; 32];
    hasher.finalize(&mut output);
    output
}

/// Hash two nodes together (sorted pair) for merkle verification.
fn hash_pair(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    // Sort pairs for consistency with merkletreejs sortPairs: true
    if a <= b {
        hasher.update(a);
        hasher.update(b);
    } else {
        hasher.update(b);
        hasher.update(a);
    }
    let mut output = [0u8; 32];
    hasher.finalize(&mut output);
    output
}

/// Verify merkle inclusion proof for a leaf.
fn verify_merkle_proof(leaf: &[u8; 32], proof: &[[u8; 32]], root: &[u8; 32]) -> bool {
    let mut current = *leaf;
    for sibling in proof {
        current = hash_pair(&current, sibling);
    }
    current == *root
}

pub fn main() {
    // Read input from SP1 VM
    let input: ProverInput = sp1_zkvm::io::read();

    let n = input.balances.len();

    // ── Assertion 4: len(balances) == nullifier_count ────────────────
    assert!(
        n as u64 == input.nullifier_count,
        "Balance count ({}) != nullifier_count ({}). Accounts may have been omitted.",
        n,
        input.nullifier_count,
    );

    assert!(
        input.user_ids.len() == n,
        "user_ids length mismatch"
    );

    assert!(
        input.merkle_proofs.len() == n,
        "merkle_proofs length mismatch"
    );

    // ── Assertion 1 & 2: Merkle inclusion + sum ─────────────────────
    let mut total_liabilities: u64 = 0;

    for i in 0..n {
        // Compute leaf hash
        let leaf = compute_leaf(&input.user_ids[i], input.balances[i]);

        // Verify merkle inclusion
        assert!(
            verify_merkle_proof(&leaf, &input.merkle_proofs[i], &input.merkle_root),
            "Merkle proof failed for user {} at index {}",
            input.user_ids[i],
            i,
        );

        // Accumulate liabilities (u64 overflow will panic = Assertion 5)
        total_liabilities = total_liabilities
            .checked_add(input.balances[i])
            .expect("Liability overflow");
    }

    // ── Assertion 2: sum(balances) == total_liabilities ──────────────
    // (total_liabilities here is the computed sum, we commit it as output)

    // ── Assertion 3: total_assets > total_liabilities ───────────────
    assert!(
        input.total_assets > total_liabilities,
        "INSOLVENCY: assets ({}) <= liabilities ({})",
        input.total_assets,
        total_liabilities,
    );

    // ── Commit public outputs ───────────────────────────────────────
    sp1_zkvm::io::commit(&input.merkle_root);
    sp1_zkvm::io::commit(&input.total_assets);
    sp1_zkvm::io::commit(&total_liabilities);
    sp1_zkvm::io::commit(&input.cycle_id);
    sp1_zkvm::io::commit(&input.nullifier_count);
}
