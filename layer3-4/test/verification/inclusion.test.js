import { expect } from 'chai';
import sinon from 'sinon';
import * as starknetLib from '../../lib/starknet.js';
import { verifyInclusion } from '../../verification/inclusion.js';
import { buildMerkleTree } from '../../lib/merkle.js';
import { hashLeaf } from '../../lib/hashLeaf.js';

describe('Inclusion Verification (Flow A)', () => {
  let callContractStub;

  beforeEach(() => {
    callContractStub = sinon.stub(starknetLib, 'callContract');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('✓ valid (user_id, balance) verifies correctly against known root', async () => {
    const users = [
      { user_id: 'alice', balance: '1000' },
      { user_id: 'bob', balance: '2000' }
    ];
    const treeData = buildMerkleTree(users);
    const aliceLeaf = hashLeaf('alice', '1000');
    const aliceProof = treeData.proofs['alice'];

    // Mock ProofRegistry.get_latest_cycle_id
    callContractStub.onCall(0).resolves(1n);
    // Mock ProofRegistry.get_proof(1)
    // Returns (cycle_id, merkle_root, assets, liabilities, nullifier_count, timestamp, verified)
    callContractStub.onCall(1).resolves([
      1n, 
      BigInt(treeData.merkleRoot), 
      10000n, 8000n, 
      2n, 123456789n, true
    ]);
    // Mock NullifierRegistry.is_included(leaf)
    callContractStub.onCall(2).resolves(true);

    const result = await verifyInclusion({
      user_id: 'alice',
      balance: '1000',
      cycle_id: 1,
      merkle_proof: aliceProof
    });

    expect(result.included).to.be.true;
    expect(result.merkle_root).to.equal(treeData.merkleRoot);
    expect(result.leaf).to.equal(aliceLeaf);
  });

  it('✓ tampered balance fails root_mismatch', async () => {
    const users = [
      { user_id: 'alice', balance: '1000' }
    ];
    const treeData = buildMerkleTree(users);
    const aliceProof = treeData.proofs['alice'];

    callContractStub.onCall(0).resolves(1n);
    callContractStub.onCall(1).resolves([
      1n, BigInt(treeData.merkleRoot), 1000n, 1000n, 1n, 123n, true
    ]);
    // Should fail before nullifier check

    const result = await verifyInclusion({
      user_id: 'alice',
      balance: '1001', // wrong balance
      cycle_id: 1,
      merkle_proof: aliceProof
    });

    expect(result.included).to.be.false;
    expect(result.reason).to.equal('root_mismatch');
  });

  it('✓ valid inputs but user not nullified returns not_nullified', async () => {
    const users = [{ user_id: 'alice', balance: '1000' }];
    const treeData = buildMerkleTree(users);
    const aliceProof = treeData.proofs['alice'];

    callContractStub.onCall(0).resolves(1n);
    callContractStub.onCall(1).resolves([
        1n, BigInt(treeData.merkleRoot), 1000n, 1000n, 1n, 123n, true
    ]);
    // Mock is_included -> false
    callContractStub.onCall(2).resolves(false);

    const result = await verifyInclusion({
      user_id: 'alice',
      balance: '1000',
      cycle_id: 1,
      merkle_proof: aliceProof
    });

    expect(result.included).to.be.false;
    expect(result.reason).to.equal('not_nullified');
  });

  it('✓ unknown cycle_id returns structured 404 error (InclusionError)', async () => {
    callContractStub.throws(new Error('Contract call failed'));

    try {
      await verifyInclusion({ user_id: 'alice', balance: '1000', cycle_id: 999 });
      expect.fail('Should have thrown InclusionError');
    } catch (err) {
      expect(err.name).to.equal('InclusionError');
      expect(err.message).to.contain('cycle_record_missing');
    }
  });
});
