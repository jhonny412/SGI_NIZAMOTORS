/**
 * Pure domain utilities for pricing and calculations.
 * Agnostic of React, storage, and networking.
 */

export interface PricingResult {
  pVenta: number;
  utilidad: number;
}

/**
 * Calculates selling price (pVenta) and utility based on cost price (pCompra) and profit margin percentage.
 * Uses the markup margin on selling price formula: pVenta = pCompra / (1 - margin / 100).
 *
 * @param pCompra - The cost price
 * @param margGanancia - The desired profit margin percentage
 * @returns Calculated values rounded to 2 decimal places
 */
export function calculatePricing(
  pCompra: number | string,
  margGanancia: number | string
): PricingResult {
  const purchasePrice = Number(pCompra) || 0;
  const profitMargin = Number(margGanancia) || 0;

  if (purchasePrice <= 0 || profitMargin >= 100) {
    return { pVenta: 0, utilidad: 0 };
  }

  const pVenta = parseFloat((purchasePrice / (1 - profitMargin / 100)).toFixed(2));
  const utilidad = parseFloat((pVenta - purchasePrice).toFixed(2));

  return { pVenta, utilidad };
}
