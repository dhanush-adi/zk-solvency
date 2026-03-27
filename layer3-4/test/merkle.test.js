import { describe, it } from 'mocha';
import { expect } from 'chai';
import { buildMerkleTree, verifyProof } from '../lib/merkle.js';
import { hashLeaf } from '../lib/hashLeaf.js';

const SAMPLE_BALANCES = [
  { user_id: 'alice', balance: '1000000000000000000' },
  { user_id: 'bob', balance: '2500000000000000000' },
  { user_id: 'carol', balance: '500000000000000000' },
  { user_id: 'dave', balance: '7500000000000000000' },
];

describe('Layer 3 — Merkle Tree Construction', function () {
  // ─── Determinism ────────────────────────────────────────────────
  it('same input always produces the same root (determinism)', function () {
    const result1 = buildMerkleTree(SAMPLE_BALANCES);
    const result2 = buildMerkleTree(SAMPLE_BALANCES);
    expect(result1.merkleRoot).to.equal(result2.merkleRoot);
    expect(result1.merkleRoot).to.match(/^0x[0-9a-f]{64}$/);
  });

  // ─── Valid proof verification ───────────────────────────────────
  it('verifyProof returns true for a valid user', function () {
    const result = buildMerkleTree(SAMPLE_BALANCES);

    for (const entry of SAMPLE_BALANCES) {
      const leaf = hashLeaf(entry.user_id, entry.balance);
      const proof = result.proofs[entry.user_id];
      const valid = verifyProof(leaf, proof, result.merkleRoot);
      expect(valid).to.be.true;
    }
  });

  // ─── Tampered leaf rejection ────────────────────────────────────
  it('verifyProof returns false for a tampered leaf', function () {
    const result = buildMerkleTree(SAMPLE_BALANCES);
    const tampered = hashLeaf('alice', '9999999999999999999');
    const proof = result.proofs['alice'];
    const valid = verifyProof(tampered, proof, result.merkleRoot);
    expect(valid).to.be.false;
  });

  // ─── Empty input rejection ─────────────────────────────────────
  it('throws on empty input', function () {
    expect(() => buildMerkleTree([])).to.throw('non-empty array');
  });

  // ─── Duplicate user_id rejection ────────────────────────────────
  it('throws on duplicate user_id', function () {
    const duped = [
      { user_id: 'alice', balance: '100' },
      { user_id: 'alice', balance: '200' },
    ];
    expect(() => buildMerkleTree(duped)).to.throw('Duplicate user_id');
  });

  // ─── Negative balance rejection ─────────────────────────────────
  it('throws on negative balance', function () {
    const neg = [{ user_id: 'alice', balance: '-100' }];
    expect(() => buildMerkleTree(neg)).to.throw('Negative balance');
  });

  // ─── Total liabilities ──────────────────────────────────────────
  it('correctly sums totalLiabilities', function () {
    const result = buildMerkleTree(SAMPLE_BALANCES);
    const expected =
      1000000000000000000n +
      2500000000000000000n +
      500000000000000000n +
      7500000000000000000n;
    expect(result.totalLiabilities).to.equal(expected);
  });

  // ─── Proofs map ─────────────────────────────────────────────────
  it('generates a proof entry for every user_id', function () {
    const result = buildMerkleTree(SAMPLE_BALANCES);
    for (const entry of SAMPLE_BALANCES) {
      expect(result.proofs).to.have.property(entry.user_id);
      expect(result.proofs[entry.user_id]).to.be.an('array');
    }
  });
});
