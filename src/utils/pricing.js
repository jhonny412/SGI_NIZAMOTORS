/**
 * Pure domain utilities for pricing and calculations.
 * Agnostic of React, storage, and networking.
 */

/**
 * Calculates selling price (pVenta) and utility based on cost price (pCompra) and profit margin percentage.
 * Uses the markup margin on selling price formula: pVenta = pCompra / (1 - margin / 100).
 * 
 * @param {number|string} pCompra - The cost price
 * @param {number|string} margGanancia - The desired profit margin percentage
 * @returns {{ pVenta: number, utilidad: number }} Calculated values rounded to 2 decimal places
 */
export function calculatePricing(pCompra, margGanancia) {
  const purchasePrice = Number(pCompra) || 0;
  const profitMargin = Number(margGanancia) || 0;

  if (purchasePrice <= 0 || profitMargin >= 100) {
    return { pVenta: 0, utilidad: 0 };
  }

  const pVenta = parseFloat((purchasePrice / (1 - profitMargin / 100)).toFixed(2));
  const utilidad = parseFloat((pVenta - purchasePrice).toFixed(2));

  return { pVenta, utilidad };
}

/**
 * Formats a number using en-US locale: commas for thousands and dot for decimals (e.g. 2,500.00).
 * 
 * @param {number|string} val - Value to format
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted number string
 */
export function formatMoney(val, decimals = 2) {
  const num = Number(val) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
