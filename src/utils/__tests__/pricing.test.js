import { describe, it, expect } from 'vitest';
import { calculatePricing, formatMoney } from '../pricing';

describe('Pricing Utility (calculatePricing)', () => {
  it('calculates selling price and profit correctly for standard inputs', () => {
    const result = calculatePricing(80, 20); // 80 / (1 - 0.2) = 100
    expect(result.pVenta).toBe(100);
    expect(result.utilidad).toBe(20);
  });

  it('handles string numeric inputs gracefully', () => {
    const result = calculatePricing('100', '25'); // 100 / 0.75 = 133.33
    expect(result.pVenta).toBe(133.33);
    expect(result.utilidad).toBe(33.33);
  });

  it('returns 0 for zero or negative purchase price', () => {
    expect(calculatePricing(0, 20)).toEqual({ pVenta: 0, utilidad: 0 });
    expect(calculatePricing(-50, 20)).toEqual({ pVenta: 0, utilidad: 0 });
  });

  it('returns 0 when margin is 100% or greater', () => {
    expect(calculatePricing(100, 100)).toEqual({ pVenta: 0, utilidad: 0 });
    expect(calculatePricing(100, 120)).toEqual({ pVenta: 0, utilidad: 0 });
  });

  it('handles invalid or non-numeric inputs by falling back to 0', () => {
    expect(calculatePricing('abc', null)).toEqual({ pVenta: 0, utilidad: 0 });
  });

  describe('formatMoney', () => {
    it('formats numbers with standard decimal places and commas', () => {
      expect(formatMoney(2500)).toBe('2,500.00');
      expect(formatMoney('1234567.89')).toBe('1,234,567.89');
    });

    it('handles custom decimal places', () => {
      expect(formatMoney(10.5, 0)).toBe('11');
      expect(formatMoney(10.555, 3)).toBe('10.555');
    });

    it('handles fallback for invalid values', () => {
      expect(formatMoney(null)).toBe('0.00');
      expect(formatMoney('abc')).toBe('0.00');
    });
  });
});
