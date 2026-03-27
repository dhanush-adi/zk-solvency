/// ZK Solvency — Cairo Contracts
///
/// Layer 4: NullifierRegistry — on-chain nullifier registry
/// Layer 5/6: SolvencyVerifier — stateless proof verifier (IVerifier)
/// Layer 6: ProofRegistry — verified proof storage + solvency ledger

pub mod interfaces;
pub mod nullifier_registry;
pub mod solvency_verifier;
pub mod proof_registry;
