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

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  let result = {};
  const responseText = await response.text().catch(() => "");
  try {
    result = JSON.parse(responseText);
  } catch {
    result = {};
  }

  if (!response.ok) {
    const errorMsg = result.message || `HTTP ${response.status} en ${sheetName}/${action}`;
    throw new Error(errorMsg);
  }

  if (result.status === "error") {
    throw new Error(result.message || `Error en ${sheetName}/${action}`);
  }

  return result.data || result;
}
