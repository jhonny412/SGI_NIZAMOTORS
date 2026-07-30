import { ENDPOINTS } from "../config/endpoints";

const API_URL = ENDPOINTS.INVENTORY_API_URL;


/**
 * Fetches all records from a specific Google Sheet.
 * 
 * @param {string} sheetName - The name of the sheet (e.g., 'Productos', 'Proveedores')
 * @returns {Promise<Array>} List of records from the sheet
 */
export async function fetchSheet(sheetName) {
  const response = await fetch(`${API_URL}?sheet=${sheetName}`);
  if (!response.ok) {
    throw new Error(`HTTP error fetching sheet ${sheetName}: ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(`API error fetching sheet ${sheetName}: ${result.message}`);
  }

  return result.data || [];
}

/**
 * Performs a mutation action (create, edit, delete) on a specific Google Sheet.
 * 
 * @param {string} sheetName - The target sheet name
 * @param {string} action - The action type ('create' | 'edit' | 'delete')
 * @param {Object} data - The data payload for the operation
 * @returns {Promise<any>} The result data from the server
 */
export async function postAction(sheetName, action, data = {}) {
  const body = {
    ...data,
    sheet: sheetName,
    action
  };

  // NOTE: No Content-Type header — Google Apps Script's CORS handling
  // works best without triggering CORS preflight (same as original fetch calls).
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(body)
  });
  // Apps Script returns opaque responses on cross-origin; errors surface as
  // network-level exceptions which are caught at the call site.
}
