/// interfaces.cairo — Shared trait definitions for the ZK Solvency pipeline
///
/// These traits define the contract interfaces that all layers consume.
/// IVerifier and IProofRegistry are the published API contracts for Layer 7+.
/// DO NOT change these interfaces after Layer 7 is built.

/// ──────────────────────────────────────────────────────────────────────────
/// INullifierRegistry — Layer 4 interface (existing, unchanged)
/// ──────────────────────────────────────────────────────────────────────────
#[starknet::interface]
pub trait INullifierRegistry<TContractState> {
    /// Commit a new proof cycle. Atomically stores all nullifiers and the
    /// Merkle root. Clears all state from the previous cycle.
    /// Only callable by the contract owner.
    fn commit_cycle(
        ref self: TContractState,
        nullifiers: Span<felt252>,
        merkle_root: felt252,
    );

    /// Check if a nullifier (account hash) was included in the current cycle.
    fn is_included(self: @TContractState, nullifier: felt252) -> bool;

    /// Get the count of nullifiers in the current cycle.
    fn get_nullifier_count(self: @TContractState) -> u64;

    /// Get the current Merkle root.
    fn get_merkle_root(self: @TContractState) -> felt252;

    /// Get the current cycle ID.
    fn get_cycle_id(self: @TContractState) -> u64;
}

/// ──────────────────────────────────────────────────────────────────────────
/// IVerifier — Layer 5/6 verifier interface (swap point)
/// ──────────────────────────────────────────────────────────────────────────
/// This is the swap point for changing verifier backends without touching
/// the ProofRegistry. Deploy a new contract implementing IVerifier and
/// call ProofRegistry.update_verifier() to switch.
#[starknet::interface]
pub trait IVerifier<TContractState> {
    /// Verify a proof against public inputs.
    /// Returns true only if cryptographic verification passes.
    /// Must be a pure view function — no state changes.
    fn verify_proof(
        self: @TContractState,
        proof_data: Span<felt252>,
        merkle_root: felt252,
        total_assets: u256,
        total_liabilities: u256,
        cycle_id: u64,
        nullifier_count: u64,
    ) -> bool;
}

/// ProofRecord struct for Layer 7+ queries.
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct ProofRecord {
    pub cycle_id: u64,
    pub merkle_root: felt252,
    pub total_assets: u256,
    pub total_liabilities: u256,
    pub nullifier_count: u64,
    pub timestamp: u64,
    pub previous_cycle_id: u64,
    pub verified: bool,
}

/// ──────────────────────────────────────────────────────────────────────────
/// IProofRegistry — Layer 6 registry interface (Layer 7+ query API)
/// ──────────────────────────────────────────────────────────────────────────
/// Layer 7 imports this interface to query proof history without coupling
/// to ProofRegistry implementation details.
#[starknet::interface]
pub trait IProofRegistry<TContractState> {
    /// Submit a verified proof for the current cycle.
    /// Validates against NullifierRegistry + IVerifier before storing.
    fn submit_proof(
        ref self: TContractState,
        cycle_id: u64,
        merkle_root: felt252,
        total_assets: u256,
        total_liabilities: u256,
        nullifier_count: u64,
        proof_data: Span<felt252>,
    );

    /// Get proof record for a specific cycle.
    fn get_proof(
        self: @TContractState,
        cycle_id: u64,
    ) -> ProofRecord;

    /// Get the latest submitted cycle ID.
    fn get_latest_cycle_id(self: @TContractState) -> u64;

    /// Get the previous cycle ID linked to a specific cycle.
    fn get_previous_cycle_id(self: @TContractState, cycle_id: u64) -> u64;

    /// Check if the exchange is currently solvent based on latest proof.
    fn is_solvent(self: @TContractState) -> bool;

    /// Update the verifier contract address (swap backends).
    fn update_verifier(ref self: TContractState, new_verifier: starknet::ContractAddress);
}

/// ──────────────────────────────────────────────────────────────────────────
/// IProofChain — Layer 7 interface (placeholder for future)
/// ──────────────────────────────────────────────────────────────────────────
/// Layer 7 links consecutive proofs to create an auditable chain.
/// Missing proofs become detectable anomalies.
#[starknet::interface]
pub trait IProofChain<TContractState> {
    /// Append a new proof to the chain, linking it to the previous root.
    fn append_proof(
        ref self: TContractState,
        previous_root: felt252,
        new_root: felt252,
        proof_hash: felt252,
    );

    /// Get the proof hash for a specific round.
    fn get_round_hash(self: @TContractState, round_number: u64) -> felt252;

    /// Get the latest round info: (round_number, root, timestamp).
    fn get_latest_round(self: @TContractState) -> (u64, felt252, u64);
}
