import { describe, it, expect } from 'vitest';
import { getDateOnly, filterByDateRange, getDefaultDateRange, getLocalDateTimeString } from '../dateFilter';

describe('Date Filter Utility', () => {
  describe('getLocalDateTimeString', () => {
    it('formats a date to YYYY-MM-DD HH:mm:ss format', () => {
      const date = new Date(2026, 7, 14, 14, 28, 10);
      expect(getLocalDateTimeString(date)).toBe('2026-08-14 14:28:10');
    });

    it('returns empty string for invalid date', () => {
      expect(getLocalDateTimeString('invalid-date')).toBe('');
    });
  });

  describe('getDateOnly', () => {
    it('extracts date part from ISO string', () => {
      expect(getDateOnly('2026-08-12T10:30:00.000Z')).toBe('2026-08-12');
    });

    it('extracts date part from space separated datetime string', () => {
      expect(getDateOnly('2026-08-14 14:28:10')).toBe('2026-08-14');
    });

    it('returns original string if no time part', () => {
      expect(getDateOnly('2026-08-12')).toBe('2026-08-12');
    });

    it('returns empty string for empty input', () => {
      expect(getDateOnly(null)).toBe('');
      expect(getDateOnly(undefined)).toBe('');
    });
  });

  describe('filterByDateRange', () => {
    const items = [
      { id: 1, fecha: '2026-01-05T00:00:00' },
      { id: 2, fecha: '2026-02-15T00:00:00' },
      { id: 3, fecha: '2026-03-20T00:00:00' }
    ];

    it('filters items within date range inclusively', () => {
      const filtered = filterByDateRange(items, '2026-01-01', '2026-02-28');
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id)).toEqual([1, 2]);
    });

    it('returns all items if no dates provided', () => {
      const filtered = filterByDateRange(items, '', '');
      expect(filtered).toHaveLength(3);
    });

    it('filters correctly with custom date field', () => {
      const customItems = [
        { id: 10, fechaPrestamo: '2026-05-10T12:00:00' }
      ];
      const filtered = filterByDateRange(customItems, '2026-05-01', '2026-05-31', 'fechaPrestamo');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('getDefaultDateRange', () => {
    it('returns current month date range object with desde and hasta keys', () => {
      const range = getDefaultDateRange();
      expect(range).toHaveProperty('desde');
      expect(range).toHaveProperty('hasta');
      expect(range.desde).toMatch(/^\d{4}-\d{2}-01$/);
      expect(range.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
