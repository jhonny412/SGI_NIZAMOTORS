import { describe, it, expect } from 'vitest';
import { normalizeString, matchSearch } from '../search';

describe('Search Utility', () => {
  describe('normalizeString', () => {
    it('lowercases and removes accents/diacritics', () => {
      expect(normalizeString('Frenos BOSHó')).toBe('frenos bosho');
      expect(normalizeString('Cigüeñal')).toBe('ciguenal');
    });

    it('returns empty string for null, undefined or empty input', () => {
      expect(normalizeString('')).toBe('');
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
    });
  });

  describe('matchSearch', () => {
    const targets = ['Freno Delantero', 'COD-1234', 'Toyota Yaris', 'OEM-9988'];

    it('returns true when query is empty', () => {
      expect(matchSearch(targets, '')).toBe(true);
      expect(matchSearch(targets, '   ')).toBe(true);
    });

    it('matches single term case and accent insensitively', () => {
      expect(matchSearch(targets, 'delantero')).toBe(true);
      expect(matchSearch(targets, 'FRENO')).toBe(true);
      expect(matchSearch(targets, 'toyota')).toBe(true);
    });

    it('matches multi-word queries (AND logic across targets)', () => {
      expect(matchSearch(targets, 'freno toyota')).toBe(true);
      expect(matchSearch(targets, 'cod 9988')).toBe(true);
    });

    it('returns false if any search term is missing', () => {
      expect(matchSearch(targets, 'freno nissan')).toBe(false);
    });
  });
});
