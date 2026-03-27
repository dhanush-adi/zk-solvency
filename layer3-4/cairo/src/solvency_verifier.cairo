/// solvency_verifier.cairo — Layer 5/6 Stateless Proof Verifier
///
/// Implements IVerifier. This contract is stateless — it only verifies
/// proofs and returns bool. No storage, no events.
///
/// The verification logic uses a hash-commitment scheme:
///   proof_data[0] must equal poseidon_hash(merkle_root, total_assets,
///                                          total_liabilities, cycle_id,
///                                          nullifier_count)
///
/// For production, swap this contract with a real STARK verifier
/// (e.g., Herodotus, Garaga Groth16, or native verify_stark_proof).
/// ProofRegistry.update_verifier() handles the swap — zero code changes.

#[starknet::contract]
pub mod SolvencyVerifier {
    use starknet::ContractAddress;
    use openzeppelin_access::ownable::OwnableComponent;
    use core::poseidon::PoseidonTrait;
    use core::hash::HashStateTrait;
    use super::super::interfaces::IVerifier;

    // ── OpenZeppelin Ownable Component ──────────────────────────────────
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ── Storage ─────────────────────────────────────────────────────────
    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    // ── Events ──────────────────────────────────────────────────────────
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    // ── Constructor ─────────────────────────────────────────────────────
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
    }

    // ── IVerifier Implementation ────────────────────────────────────────
    #[abi(embed_v0)]
    impl SolvencyVerifierImpl of IVerifier<ContractState> {
        fn verify_proof(
            self: @ContractState,
            proof_data: Span<felt252>,
            merkle_root: felt252,
            total_assets: u256,
            total_liabilities: u256,
            cycle_id: u64,
            nullifier_count: u64,
        ) -> bool {
            // Proof must contain at least one element (the commitment hash)
            if proof_data.len() == 0 {
                return false;
            }

            // Compute expected commitment from public inputs using Poseidon
            let mut hasher = PoseidonTrait::new();
            hasher = hasher.update(merkle_root);
            hasher = hasher.update(total_assets.low.into());
            hasher = hasher.update(total_assets.high.into());
            hasher = hasher.update(total_liabilities.low.into());
            hasher = hasher.update(total_liabilities.high.into());
            hasher = hasher.update(cycle_id.into());
            hasher = hasher.update(nullifier_count.into());
            let expected_commitment = hasher.finalize();

            // Proof is valid if first element matches the commitment
            let proof_commitment = *proof_data.at(0);
            proof_commitment == expected_commitment
        }
    }
}
