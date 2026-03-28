import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as starknetLib from '../../lib/starknet.js';
import { verifyChain } from '../../verification/chain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

describe('Chain Verification (Flow B)', () => {
  let callContractStub;
  let existsSyncStub;
  let readFileSyncStub;

  beforeEach(() => {
    callContractStub = sinon.stub(starknetLib, 'callContract');
    existsSyncStub = sinon.stub(fs, 'existsSync');
    readFileSyncStub = sinon.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('✓ intact chain returns chain_intact: true, zero issues', async () => {
    // Current cycle = 2
    callContractStub.onCall(0).resolves(2n);
    
    // Cycle 2 record (prev = 1, root = 0xAA)
    callContractStub.onCall(1).resolves([2n, 0xAAn, 1000n, 1000n, 1n, BigInt(Math.floor(Date.now()/1000)), 1n, true]);
    // Cycle 1 record (prev = 0, root = 0xBB)
    callContractStub.onCall(2).resolves([1n, 0xBBn, 500n, 500n, 1n, BigInt(Math.floor(Date.now()/1000)-100), 0n, true]);
    // Cycle 0 record (prev = 0, root = 0xCC)
    callContractStub.onCall(3).resolves([0n, 0xCCn, 100n, 100n, 1n, BigInt(Math.floor(Date.now()/1000)-200), 0n, true]);

    // fast mode skips artifacts
    const result = await verifyChain({ from_cycle: 0, to_cycle: 2, fast: true });

    expect(result.chain_intact).to.be.true;
    expect(result.cycles_checked).to.equal(3);
    expect(result.issues).to.be.empty;
  });

  it('✓ gap between cycles detected as critical gap issue', async () => {
    callContractStub.onCall(0).resolves(2n);
    
    // Cycle 2 record links to 0 (missing 1)
    callContractStub.onCall(1).resolves([2n, 0xAAn, 1000n, 1000n, 1n, 200n, 0n, true]);
    
    const result = await verifyChain({ from_cycle: 0, to_cycle: 2, fast: true });

    expect(result.chain_intact).to.be.false;
    expect(result.issues.some(i => i.type === 'gap')).to.be.true;
  });

  it('✓ tampered merkle_root vs artifact detected as root_tampered', async () => {
    callContractStub.onCall(0).resolves(1n);
    callContractStub.onCall(1).resolves([1n, 0xAAn, 1000n, 1000n, 1n, 200n, 0n, true]);
    
    // Mock artifact to exist but with different root
    existsSyncStub.returns(true);
    readFileSyncStub.returns(JSON.stringify({ merkleRoot: '0xBAD' }));

    const result = await verifyChain({ from_cycle: 1, to_cycle: 1, fast: false });

    expect(result.chain_intact).to.be.false;
    expect(result.issues.some(i => i.type === 'root_tampered')).to.be.true;
  });

  it('✓ non-monotonic timestamps flagged as timestamp_anomaly', async () => {
    callContractStub.onCall(0).resolves(2n);
    // Cycle 2: timestamp 100
    callContractStub.onCall(1).resolves([2n, 0xAAn, 1000n, 1000n, 1n, 100n, 1n, true]);
    // Cycle 1: timestamp 150 (anomaly! should be less than 100)
    callContractStub.onCall(2).resolves([1n, 0xBBn, 500n, 500n, 1n, 150n, 0n, true]);

    const result = await verifyChain({ from_cycle: 1, to_cycle: 2, fast: true });

    expect(result.issues.some(i => i.type === 'timestamp_anomaly')).to.be.true;
  });
});
