/// test_nullifier.cairo — snforge tests for NullifierRegistry
///
/// Covers all 7 required test cases.

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zk_solvency_layer4::interfaces::{INullifierRegistryDispatcher, INullifierRegistryDispatcherTrait};

fn OWNER() -> ContractAddress {
    0x1.try_into().unwrap()
}

fn NON_OWNER() -> ContractAddress {
    0x2.try_into().unwrap()
}

fn deploy_registry() -> INullifierRegistryDispatcher {
    let contract = declare("NullifierRegistry").unwrap().contract_class();
    let mut calldata = array![];
    OWNER().serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    INullifierRegistryDispatcher { contract_address: address }
}

fn sample_nullifiers() -> Span<felt252> {
    array![0x111, 0x222, 0x333].span()
}

// ─── Test 1: commitCycle stores correct count ───────────────────────────
#[test]
fn test_commit_cycle_stores_correct_count() {
    let registry = deploy_registry();
    let nullifiers = sample_nullifiers();

    start_cheat_caller_address(registry.contract_address, OWNER());
    registry.commit_cycle(nullifiers, 0xABC);
    stop_cheat_caller_address(registry.contract_address);

    assert(registry.get_nullifier_count() == 3, 'count should be 3');
}

// ─── Test 2: isIncluded returns true for registered hash ─────────────────
#[test]
fn test_is_included_returns_true() {
    let registry = deploy_registry();
    let nullifiers = sample_nullifiers();

    start_cheat_caller_address(registry.contract_address, OWNER());
    registry.commit_cycle(nullifiers, 0xABC);
    stop_cheat_caller_address(registry.contract_address);

    assert(registry.is_included(0x111), 'should include 0x111');
    assert(registry.is_included(0x222), 'should include 0x222');
    assert(registry.is_included(0x333), 'should include 0x333');
}

// ─── Test 3: isIncluded returns false for unregistered hash ──────────────
#[test]
fn test_is_included_returns_false() {
    let registry = deploy_registry();
    let nullifiers = sample_nullifiers();

    start_cheat_caller_address(registry.contract_address, OWNER());
    registry.commit_cycle(nullifiers, 0xABC);
    stop_cheat_caller_address(registry.contract_address);

    assert(!registry.is_included(0x999), 'should not include 0x999');
}

// ─── Test 4: commitCycle reverts on duplicate nullifier ───────────────────
#[test]
#[should_panic(expected: 'Duplicate nullifier in batch')]
fn test_commit_cycle_reverts_on_duplicate() {
    let registry = deploy_registry();
    let duped = array![0x111, 0x222, 0x111].span();

    start_cheat_caller_address(registry.contract_address, OWNER());
    registry.commit_cycle(duped, 0xABC);
}

// ─── Test 5: cycleId increments on each commit ───────────────────────────
#[test]
fn test_cycle_id_increments() {
    let registry = deploy_registry();

    start_cheat_caller_address(registry.contract_address, OWNER());

    assert(registry.get_cycle_id() == 0, 'initial cycle should be 0');

    registry.commit_cycle(array![0x111].span(), 0xAAA);
    assert(registry.get_cycle_id() == 1, 'cycle should be 1');

    registry.commit_cycle(array![0x222].span(), 0xBBB);
    assert(registry.get_cycle_id() == 2, 'cycle should be 2');

    stop_cheat_caller_address(registry.contract_address);
}

// ─── Test 6: Previous cycle state is fully cleared ───────────────────────
#[test]
fn test_previous_cycle_cleared() {
    let registry = deploy_registry();

    start_cheat_caller_address(registry.contract_address, OWNER());

    registry.commit_cycle(array![0x111, 0x222].span(), 0xAAA);
    assert(registry.is_included(0x111), 'c1: should include 0x111');
    assert(registry.is_included(0x222), 'c1: should include 0x222');

    registry.commit_cycle(array![0x333].span(), 0xBBB);

    assert(!registry.is_included(0x111), 'c2: 0x111 should be cleared');
    assert(!registry.is_included(0x222), 'c2: 0x222 should be cleared');
    assert(registry.is_included(0x333), 'c2: should include 0x333');
    assert(registry.get_nullifier_count() == 1, 'count should be 1');
    assert(registry.get_merkle_root() == 0xBBB, 'root should be 0xBBB');

    stop_cheat_caller_address(registry.contract_address);
}

// ─── Test 7: Non-owner cannot call commitCycle ───────────────────────────
#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_commit() {
    let registry = deploy_registry();

    start_cheat_caller_address(registry.contract_address, NON_OWNER());
    registry.commit_cycle(sample_nullifiers(), 0xABC);
}
