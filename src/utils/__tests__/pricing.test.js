import { describe, it, expect } from 'vitest';
import { calculatePricing } from '../pricing';

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
});
