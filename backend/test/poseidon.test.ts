import { describe, it, expect } from 'vitest';
import {
  poseidon,
  poseidon2,
  poseidonHash,
  PRIME,
} from '../src/lib/poseidon.js';

describe('Poseidon Hash', () => {
  describe('poseidon', () => {
    it('should hash two inputs', () => {
      const result = poseidon2(BigInt(1), BigInt(2));
      expect(result).toBeDefined();
      expect(typeof result).toBe('bigint');
    });

    it('should return a value less than PRIME', () => {
      const result = poseidon2(BigInt(100), BigInt(200));
      expect(result).toBeGreaterThan(BigInt(0));
      expect(result).toBeLessThan(PRIME);
    });

    it('should produce same output for same inputs', () => {
      const result1 = poseidon2(BigInt(42), BigInt(99));
      const result2 = poseidon2(BigInt(42), BigInt(99));
      expect(result1).toBe(result2);
    });

    it('should produce different outputs for different inputs', () => {
      const result1 = poseidon2(BigInt(1), BigInt(2));
      const result2 = poseidon2(BigInt(2), BigInt(1));
      expect(result1).not.toBe(result2);
    });
  });

  describe('poseidon hash', () => {
    it('should return a string', () => {
      const result = poseidonHash('test input');
      expect(typeof result).toBe('string');
    });

    it('should return 0x prefixed hex string', () => {
      const result = poseidonHash('hello world');
      expect(result.startsWith('0x')).toBe(true);
      expect(result.length).toBe(66);
    });

    it('should produce same output for same string', () => {
      const result1 = poseidonHash('consistent');
      const result2 = poseidonHash('consistent');
      expect(result1).toBe(result2);
    });

    it('should produce different output for different strings', () => {
      const result1 = poseidonHash('string1');
      const result2 = poseidonHash('string2');
      expect(result1).not.toBe(result2);
    });
  });

  describe('PRIME constant', () => {
    it('should be a valid prime number', () => {
      expect(PRIME).toBeGreaterThan(BigInt(0));
    });

    it('should be greater than 2^30', () => {
      expect(PRIME).toBeGreaterThan(BigInt(1 << 30));
    });
  });
});
