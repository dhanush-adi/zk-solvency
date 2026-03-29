import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client.js';
import { getMerkleRoot, getMerkleProof, MerkleTree, MerkleProof } from '../lib/merkle.js';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Pino from 'pino';

const logger = Pino({ name: 'merkle-service' });

export interface AccountData {
  id: string;
  userId: string;
  balance: bigint;
  hashedLeaf: string;
}

let inMemoryTree: MerkleTree | null = null;

function hashData(data: string): string {
  const hash = createHash('sha256');
  hash.update(data.startsWith('0x') ? data.slice(2) : data);
  return '0x' + hash.digest('hex');
}

export async function buildTree(accounts: AccountData[]): Promise<MerkleTree> {
  const leaves = accounts.map(acc => acc.hashedLeaf);
  const tree = getMerkleRoot(leaves, 32);
  const fullTree = {
    depth: 32,
    leaves,
    nodes: buildTreeNodes(leaves),
    root: tree,
  };
  
  inMemoryTree = fullTree;
  
  logger.info({ 
    accountCount: accounts.length, 
    root: fullTree.root 
  }, 'Merkle tree built');
  
  return fullTree;
}

function buildTreeNodes(leaves: string[]): string[][] {
  const depth = 32;
  const nullLeaf = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  let power = 1;
  while (power < leaves.length) power *= 2;
  
  const padded = [...leaves];
  while (padded.length < power) padded.push(nullLeaf);
  
  const nodes: string[][] = [];
  nodes.push(padded);
  
  for (let level = 1; level <= depth; level++) {
    const prev = nodes[level - 1];
    const curr: string[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1] || nullLeaf;
      const combined = left < right ? left + right : right + left;
      curr.push(hashData(combined));
    }
    nodes.push(curr);
  }
  
  return nodes;
}

export async function getRoot(): Promise<string | null> {
  if (!inMemoryTree) {
    return null;
  }
  return inMemoryTree.root;
}

export async function getInclusionProof(userId: string, _roundId: string): Promise<MerkleProof | null> {
  const db = getDb();
  
  // Get all accounts (for now, from any exchange) to build the tree
  // In production, this should be scoped to the specific round's accounts
  const accounts = await db.query.accounts.findMany() as any[];
  
  if (accounts.length === 0) {
    return null;
  }
  
  // Get unique accounts by userId (latest entry for each user)
  const uniqueAccounts = new Map<string, any>();
  for (const acc of accounts) {
    if (!uniqueAccounts.has(acc.userId) || acc.createdAt > uniqueAccounts.get(acc.userId).createdAt) {
      uniqueAccounts.set(acc.userId, acc);
    }
  }
  
  const accountList = Array.from(uniqueAccounts.values());
  const sortedAccounts = accountList.sort((a: any, b: any) => a.userId.localeCompare(b.userId));
  const index = sortedAccounts.findIndex((acc: any) => acc.userId === userId);
  
  if (index === -1) {
    return null;
  }
  
  const leaves = sortedAccounts.map((acc: any) => acc.hashedLeaf);
  return getMerkleProof(leaves, index);
}

export async function saveMerkleNodes(
  roundId: string,
  tree: MerkleTree
): Promise<void> {
  const db = getDb();
  
  const nodesToInsert = [];
  
  for (let level = 0; level < tree.nodes.length; level++) {
    const levelNodes = tree.nodes[level];
    for (let index = 0; index < levelNodes.length; index++) {
      nodesToInsert.push({
        id: uuidv4(),
        roundId,
        index,
        level,
        hash: levelNodes[index],
        isRoot: level === tree.nodes.length - 1 && index === 0 ? '1' : '0',
      });
    }
  }
  
  for (const node of nodesToInsert) {
    await db.insert(schema.merkleNodes).values(node).onConflictDoNothing();
  }
  
  logger.info({ nodeCount: nodesToInsert.length }, 'Merkle nodes saved');
}

export async function getLatestTree(_roundId: string): Promise<MerkleTree | null> {
  if (inMemoryTree) {
    return inMemoryTree;
  }
  return null;
}

export async function verifyUserInTree(
  userId: string,
  leafHash: string,
  _roundId: string
): Promise<boolean> {
  const db = getDb();
  
  const account = await db.query.accounts.findFirst({
    where: eq(schema.accounts.userId, userId),
  }) as any;
  
  if (!account) {
    return false;
  }
  
  return account.hashedLeaf === leafHash;
}