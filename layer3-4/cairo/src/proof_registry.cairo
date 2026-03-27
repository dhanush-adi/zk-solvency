/// proof_registry.cairo — Layer 6 Proof Storage and Verification Registry
///
/// Stores all verified proofs. This is the public solvency ledger.
/// Cross-contract calls to NullifierRegistry for validation.
/// Cross-contract calls to IVerifier for cryptographic verification.
///
/// ProofRegistry never stores unverified proofs — verify first, store
/// only on success (single atomic function).
///
/// previousCycleId is stored for Layer 7 proof chaining traversal.

#[starknet::contract]
pub mod ProofRegistry {
    use starknet::{ContractAddress, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };
    use openzeppelin_access::ownable::OwnableComponent;
    use super::super::interfaces::{
        IProofRegistry,
        INullifierRegistryDispatcher, INullifierRegistryDispatcherTrait,
        IVerifierDispatcher, IVerifierDispatcherTrait,
    };

    // ── OpenZeppelin Ownable Component ──────────────────────────────────
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ── Storage ─────────────────────────────────────────────────────────
    // ProofRecord fields stored as flat maps keyed by cycle_id since
    // Cairo storage doesn't support custom struct maps directly.
    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        // Contract references
        verifier_address: ContractAddress,
        nullifier_registry_address: ContractAddress,
        // Cycle tracking
        latest_cycle_id: u64,
        previous_cycle_id: u64,
        // ProofRecord fields keyed by cycle_id
        proof_merkle_root: Map<u64, felt252>,
        proof_total_assets_low: Map<u64, u128>,
        proof_total_assets_high: Map<u64, u128>,
        proof_total_liabilities_low: Map<u64, u128>,
        proof_total_liabilities_high: Map<u64, u128>,
        proof_nullifier_count: Map<u64, u64>,
        proof_timestamp: Map<u64, u64>,
        proof_verified: Map<u64, bool>,
    }

    // ── Events ──────────────────────────────────────────────────────────
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        ProofSubmitted: ProofSubmitted,
        VerifierUpdated: VerifierUpdated,
        SolvencyAlert: SolvencyAlert,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ProofSubmitted {
        #[key]
        pub cycle_id: u64,
        pub verified: bool,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VerifierUpdated {
        pub old_verifier: ContractAddress,
        pub new_verifier: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SolvencyAlert {
        #[key]
        pub cycle_id: u64,
        pub total_assets_low: u128,
        pub total_assets_high: u128,
        pub total_liabilities_low: u128,
        pub total_liabilities_high: u128,
    }

    // ── Constructor ─────────────────────────────────────────────────────
    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        verifier: ContractAddress,
        nullifier_registry: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.verifier_address.write(verifier);
        self.nullifier_registry_address.write(nullifier_registry);
        self.latest_cycle_id.write(0);
        self.previous_cycle_id.write(0);
    }

    // ── IProofRegistry Implementation ───────────────────────────────────
    #[abi(embed_v0)]
    impl ProofRegistryImpl of IProofRegistry<ContractState> {
        fn submit_proof(
            ref self: ContractState,
            cycle_id: u64,
            merkle_root: felt252,
            total_assets: u256,
            total_liabilities: u256,
            nullifier_count: u64,
            proof_data: Span<felt252>,
        ) {
            // Only owner (proof orchestrator) can submit
            self.ownable.assert_only_owner();

            // ── Get NullifierRegistry dispatcher ────────────────────
            let nr_address = self.nullifier_registry_address.read();
            let nr = INullifierRegistryDispatcher { contract_address: nr_address };

            // ── Validation a: cycle_id must match on-chain ──────────
            let on_chain_cycle_id = nr.get_cycle_id();
            assert(cycle_id == on_chain_cycle_id, 'CycleId mismatch');

            // ── Validation b: nullifier count must match ────────────
            let on_chain_count = nr.get_nullifier_count();
            assert(nullifier_count == on_chain_count, 'NullifierCount mismatch');

            // ── Validation c: merkle root must match ────────────────
            let on_chain_root = nr.get_merkle_root();
            assert(merkle_root == on_chain_root, 'MerkleRoot mismatch');

            // ── Validation d: cryptographic verification ────────────
            let verifier_addr = self.verifier_address.read();
            let verifier = IVerifierDispatcher { contract_address: verifier_addr };
            let is_valid = verifier.verify_proof(
                proof_data,
                merkle_root,
                total_assets,
                total_liabilities,
                cycle_id,
                nullifier_count,
            );
            assert(is_valid, 'Proof verification failed');

            // ── Validation e: strictly monotonic cycle_id ───────────
            let current_latest = self.latest_cycle_id.read();
            assert(cycle_id > current_latest, 'CycleId not monotonic');

            // ── Store verified proof ────────────────────────────────
            let timestamp = get_block_timestamp();

            self.proof_merkle_root.write(cycle_id, merkle_root);
            self.proof_total_assets_low.write(cycle_id, total_assets.low);
            self.proof_total_assets_high.write(cycle_id, total_assets.high);
            self.proof_total_liabilities_low.write(cycle_id, total_liabilities.low);
            self.proof_total_liabilities_high.write(cycle_id, total_liabilities.high);
            self.proof_nullifier_count.write(cycle_id, nullifier_count);
            self.proof_timestamp.write(cycle_id, timestamp);
            self.proof_verified.write(cycle_id, true);

            // ── Update cycle chain ──────────────────────────────────
            self.previous_cycle_id.write(current_latest);
            self.latest_cycle_id.write(cycle_id);

            // ── Emit events ─────────────────────────────────────────
            self.emit(ProofSubmitted {
                cycle_id,
                verified: true,
                timestamp,
            });

            // Solvency alert if assets <= liabilities
            if total_assets <= total_liabilities {
                self.emit(SolvencyAlert {
                    cycle_id,
                    total_assets_low: total_assets.low,
                    total_assets_high: total_assets.high,
                    total_liabilities_low: total_liabilities.low,
                    total_liabilities_high: total_liabilities.high,
                });
            }
        }

        fn get_proof(
            self: @ContractState,
            cycle_id: u64,
        ) -> (u64, felt252, u256, u256, u64, u64, bool) {
            let merkle_root = self.proof_merkle_root.read(cycle_id);
            let total_assets = u256 {
                low: self.proof_total_assets_low.read(cycle_id),
                high: self.proof_total_assets_high.read(cycle_id),
            };
            let total_liabilities = u256 {
                low: self.proof_total_liabilities_low.read(cycle_id),
                high: self.proof_total_liabilities_high.read(cycle_id),
            };
            let nullifier_count = self.proof_nullifier_count.read(cycle_id);
            let timestamp = self.proof_timestamp.read(cycle_id);
            let verified = self.proof_verified.read(cycle_id);

            (cycle_id, merkle_root, total_assets, total_liabilities,
             nullifier_count, timestamp, verified)
        }

        fn get_latest_cycle_id(self: @ContractState) -> u64 {
            self.latest_cycle_id.read()
        }

        fn get_previous_cycle_id(self: @ContractState) -> u64 {
            self.previous_cycle_id.read()
        }

        fn is_solvent(self: @ContractState) -> bool {
            let latest = self.latest_cycle_id.read();
            if latest == 0 {
                return false;
            }
            let total_assets = u256 {
                low: self.proof_total_assets_low.read(latest),
                high: self.proof_total_assets_high.read(latest),
            };
            let total_liabilities = u256 {
                low: self.proof_total_liabilities_low.read(latest),
                high: self.proof_total_liabilities_high.read(latest),
            };
            total_assets > total_liabilities
        }

        fn update_verifier(
            ref self: ContractState,
            new_verifier: ContractAddress,
        ) {
            self.ownable.assert_only_owner();
            let old_verifier = self.verifier_address.read();
            self.verifier_address.write(new_verifier);
            self.emit(VerifierUpdated {
                old_verifier,
                new_verifier,
            });
        }
    }
}
