import crypto from 'crypto';

export interface MerkleTree {
  depth: number;
  leaves: string[];
  nodes: string[][];
  root: string;
}

export interface MerkleProof {
  leaf: string;
  siblings: string[];
  pathIndices: number[];
}

function getNextPowerOfTwo(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

function simpleHash(data: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return '0x' + hash.digest('hex');
}

function hashPair(left: string, right: string): string {
  const combined = left < right ? left + right : right + left;
  return simpleHash(combined);
}

export function buildMerkleTree(leaves: string[], depth: number = 32): MerkleTree {
  if (leaves.length === 0) {
    return {
      depth,
      leaves: [],
      nodes: [],
      root: '0x0000000000000000000000000000000000000000000000000000000000000000',
    };
  }

  const paddedLeaves = [...leaves];
  const treeSize = getNextPowerOfTwo(leaves.length);
  const neededPadding = treeSize - leaves.length;
  
  const nullLeaf = '0x0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < neededPadding; i++) {
    paddedLeaves.push(nullLeaf);
  }

  const nodes: string[][] = [];
  nodes.push(paddedLeaves);

  let currentLevel = paddedLeaves;
  for (let level = 1; level <= depth; level++) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || nullLeaf;
      nextLevel.push(hashPair(left, right));
    }
    nodes.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    depth,
    leaves: paddedLeaves,
    nodes,
    root: nodes[nodes.length - 1][0],
  };
}

export function getMerkleRoot(leaves: string[], depth: number = 32): string {
  const tree = buildMerkleTree(leaves, depth);
  return tree.root;
}

export function getMerkleProof(leaves: string[], leafIndex: number, depth: number = 32): MerkleProof {
  const tree = buildMerkleTree(leaves, depth);
  
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error(`Invalid leaf index: ${leafIndex}`);
  }

  const siblings: string[] = [];
  const pathIndices: number[] = [];
  let currentIndex = leafIndex;

  for (let level = 0; level < depth; level++) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    
    if (siblingIndex < tree.nodes[level].length) {
      siblings.push(tree.nodes[level][siblingIndex]);
    } else {
      siblings.push('0x0000000000000000000000000000000000000000000000000000000000000000');
    }
    
    pathIndices.push(currentIndex % 2);
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leaf: tree.leaves[leafIndex],
    siblings,
    pathIndices,
  };
}

export function verifyMerkleProof(proof: MerkleProof, root: string): boolean {
  let currentHash = proof.leaf;
  
  for (let i = 0; i < proof.siblings.length; i++) {
    currentHash = hashPair(currentHash, proof.siblings[i]);
  }
  
  return currentHash === root;
}

export function createLeafHash(userId: string, balance: bigint): string {
  const combined = `${userId}:${balance}`;
  return simpleHash(combined);
}