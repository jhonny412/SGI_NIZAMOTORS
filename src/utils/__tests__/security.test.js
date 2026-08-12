import { describe, it, expect } from 'vitest';
import { hashPin, generateSessionToken } from '../security';

describe('Security Utility (security.js)', () => {
  describe('hashPin', () => {
    it('returns empty string for empty inputs', () => {
      expect(hashPin('')).toBe('');
      expect(hashPin(null)).toBe('');
      expect(hashPin(undefined)).toBe('');
    });

    it('returns 64-character SHA-256 hex string for numeric PIN', () => {
      const hash1 = hashPin('1234');
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces deterministic output for the same PIN', () => {
      expect(hashPin('1234')).toBe(hashPin('1234'));
      expect(hashPin('9999')).toBe(hashPin('9999'));
    });

    it('returns original string if input is already a 64-char hex hash', () => {
      const existingHash = 'a'.repeat(64);
      expect(hashPin(existingHash)).toBe(existingHash);
    });
  });

  describe('generateSessionToken', () => {
    it('returns empty string for null user', () => {
      expect(generateSessionToken(null)).toBe('');
    });

    it('generates structured bearer token starting with sgi.', () => {
      const token = generateSessionToken({ id: 1, nombre: 'Jhon', rol: 'Admin' });
      expect(token).toMatch(/^sgi\..+\.[a-f0-9]{16}$/);
    });
  });
});
