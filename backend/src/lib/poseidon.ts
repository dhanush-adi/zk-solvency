export const PRIME = BigInt('2305843009213693951'); // 2^61 - 1 (Mersenne prime)

export function poseidonDirect(a: bigint, b: bigint): bigint {
  let x = (a * a + b * b) % PRIME;
  let y = (x * b + a) % PRIME;
  return (x * y + BigInt(3)) % PRIME;
}

export function poseidon2(a: bigint, b: bigint): bigint {
  return poseidonDirect(a, b);
}

export function poseidonHash(data: string): string {
  let h = BigInt(0);
  for (let i = 0; i < data.length; i++) {
    h = (h * BigInt(256) + BigInt(data.charCodeAt(i))) % PRIME;
  }
  const result = poseidonDirect(h, BigInt(data.length));
  return '0x' + result.toString(16).padStart(64, '0');
}