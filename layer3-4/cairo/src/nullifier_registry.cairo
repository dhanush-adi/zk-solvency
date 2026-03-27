/// nullifier_registry.cairo — Layer 4 NullifierRegistry Contract
///
/// Manages per-cycle nullifier (account hash) registration with atomic
/// commit semantics. Each proof cycle fully replaces the previous one.
///
/// Uses OpenZeppelin's OwnableComponent for access control.
/// The owner is the proof orchestrator backend that calls commit_cycle.

#[starknet::contract]
pub mod NullifierRegistry {
    use starknet::ContractAddress;
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        Vec, MutableVecTrait,
    };
    use openzeppelin_access::ownable::OwnableComponent;
    use super::super::interfaces::INullifierRegistry;

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
        merkle_root: felt252,
        cycle_id: u64,
        nullifiers: Vec<felt252>,
        seen: Map<felt252, bool>,
        nullifier_count: u64,
    }

    // ── Events ──────────────────────────────────────────────────────────
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        CycleCommitted: CycleCommitted,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CycleCommitted {
        #[key]
        pub cycle_id: u64,
        pub merkle_root: felt252,
        pub account_count: u64,
    }

    // ── Constructor ─────────────────────────────────────────────────────
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
        self.cycle_id.write(0);
        self.merkle_root.write(0);
        self.nullifier_count.write(0);
    }

    // ── External Interface ──────────────────────────────────────────────
    #[abi(embed_v0)]
    impl NullifierRegistryImpl of INullifierRegistry<ContractState> {
        fn commit_cycle(
            ref self: ContractState,
            nullifiers: Span<felt252>,
            merkle_root: felt252,
        ) {
            // Only owner (proof orchestrator) can commit
            self.ownable.assert_only_owner();

            // Validate non-empty input
            assert(nullifiers.len() > 0, 'Empty nullifier batch');

            // ── Clear previous cycle state ──────────────────────────
            let prev_count = self.nullifier_count.read();
            let mut i: u64 = 0;
            loop {
                if i >= prev_count {
                    break;
                }
                let old_nullifier = self.nullifiers.at(i).read();
                self.seen.write(old_nullifier, false);
                i += 1;
            };

            // Reset the vector length conceptually by tracking count
            // (Cairo Vec doesn't have a clear method, we overwrite)
            let new_count: u64 = nullifiers.len().into();

            // ── Register new nullifiers ─────────────────────────────
            let mut j: u32 = 0;
            loop {
                if j >= nullifiers.len() {
                    break;
                }
                let nullifier = *nullifiers.at(j);

                // Check for duplicates within this batch
                assert(!self.seen.read(nullifier), 'Duplicate nullifier in batch');

                // Store the nullifier
                let idx: u64 = j.into();
                if idx < prev_count {
                    // Overwrite existing slot
                    self.nullifiers.at(idx).write(nullifier);
                } else {
                    // Append new slot
                    self.nullifiers.append().write(nullifier);
                    // Note: append() is deprecated in future versions,
                    // use push() when upgrading Cairo.
                }

                self.seen.write(nullifier, true);
                j += 1;
            };

            // Update state
            self.nullifier_count.write(new_count);
            let new_cycle = self.cycle_id.read() + 1;
            self.cycle_id.write(new_cycle);
            self.merkle_root.write(merkle_root);

            // Emit event
            self.emit(CycleCommitted {
                cycle_id: new_cycle,
                merkle_root,
                account_count: new_count,
            });
        }

        fn is_included(self: @ContractState, nullifier: felt252) -> bool {
            self.seen.read(nullifier)
        }

        fn get_nullifier_count(self: @ContractState) -> u64 {
            self.nullifier_count.read()
        }

        fn get_merkle_root(self: @ContractState) -> felt252 {
            self.merkle_root.read()
        }

        fn get_cycle_id(self: @ContractState) -> u64 {
            self.cycle_id.read()
        }
    }
}
