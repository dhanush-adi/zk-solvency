import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildMerkleTree,
  getMerkleRoot,
  getMerkleProof,
  verifyMerkleProof,
  createLeafHash,
  MerkleTree,
  MerkleProof,
} from '../src/lib/merkle.js';

describe('Merkle Tree', () => {
  describe('buildMerkleTree', () => {
    it('should build a merkle tree from empty leaves', () => {
      const tree = buildMerkleTree([]);
      
      expect(tree.root).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
      expect(tree.leaves).toHaveLength(0);
      expect(tree.nodes).toHaveLength(0);
    });

    it('should build a merkle tree from single leaf', () => {
      const leaves = ['0xabc123'];
      const tree = buildMerkleTree(leaves);
      
      expect(tree.leaves).toHaveLength(1);
      expect(tree.root).toBeDefined();
      expect(tree.root).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('should build a merkle tree from two leaves', () => {
      const leaves = ['0xabc123', '0xdef456'];
      const tree = buildMerkleTree(leaves);
      
      expect(tree.leaves).toHaveLength(2);
      expect(tree.root).toBeDefined();
      expect(tree.nodes.length).toBeGreaterThan(1);
    });

    it('should pad odd number of leaves to power of 2', () => {
      const leaves = ['0xabc', '0xdef', '0xghi'];
      const tree = buildMerkleTree(leaves);
      
      expect(tree.leaves).toHaveLength(4);
      expect(tree.nodes[0]).toHaveLength(4);
    });
  });

  describe('getMerkleRoot', () => {
    it('should return null root for empty leaves', () => {
      const root = getMerkleRoot([]);
      expect(root).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('should return consistent root for same inputs', () => {
      const leaves = ['0x111', '0x222', '0x333'];
      const root1 = getMerkleRoot(leaves);
      const root2 = getMerkleRoot(leaves);
      
      expect(root1).toBe(root2);
    });
  });

  describe('getMerkleProof', () => {
    it('should generate valid proof for first leaf', () => {
      const leaves = ['0xaaa', '0xbbb', '0xccc', '0xddd'];
      const proof = getMerkleProof(leaves, 0);
      
      expect(proof.leaf).toBe('0xaaa');
      expect(proof.siblings.length).toBeGreaterThan(0);
      expect(proof.pathIndices.length).toBeGreaterThan(0);
    });

    it('should generate valid proof for middle leaf', () => {
      const leaves = ['0xaaa', '0xbbb', '0xccc', '0xddd', '0xeee', '0xfff', '0xggg', '0xhhh'];
      const proof = getMerkleProof(leaves, 3);
      
      expect(proof.leaf).toBe('0xddd');
      expect(proof.siblings.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid leaf index', () => {
      const leaves = ['0xaaa', '0xbbb'];
      
      expect(() => getMerkleProof(leaves, 5)).toThrow();
      expect(() => getMerkleProof(leaves, -1)).toThrow();
    });
  });

  describe('verifyMerkleProof', () => {
    it('should verify a valid proof', () => {
      const leaves = ['0xaaa', '0xbbb', '0xccc', '0xddd'];
      const tree = buildMerkleTree(leaves);
      const proof = getMerkleProof(leaves, 1);
      
      const isValid = verifyMerkleProof(proof, tree.root);
      expect(isValid).toBe(true);
    });

    it('should reject invalid proof with wrong root', () => {
      const leaves = ['0xaaa', '0xbbb', '0xccc', '0xddd'];
      const proof = getMerkleProof(leaves, 0);
      const wrongRoot = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      
      const isValid = verifyMerkleProof(proof, wrongRoot);
      expect(isValid).toBe(false);
    });
  });

  describe('createLeafHash', () => {
    it('should create consistent hash for same userId and balance', () => {
      const hash1 = createLeafHash('user1', BigInt(1000));
      const hash2 = createLeafHash('user1', BigInt(1000));
      
      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different balances', () => {
      const hash1 = createLeafHash('user1', BigInt(1000));
      const hash2 = createLeafHash('user1', BigInt(2000));
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes for different users', () => {
      const hash1 = createLeafHash('user1', BigInt(1000));
      const hash2 = createLeafHash('user2', BigInt(1000));
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
