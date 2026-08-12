import { ENDPOINTS } from "../config/endpoints";
import { getActiveToken } from "../utils/security";

const API_URL = ENDPOINTS.INVENTORY_API_URL;

function getAuthHeaders() {
  const token = getActiveToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetches all records from a specific collection/table.
 * 
 * @param {string} sheetName - The name of the collection (e.g., 'Productos', 'Proveedores')
 * @returns {Promise<Array>} List of records
 */
export async function fetchSheet(sheetName) {
  const response = await fetch(`${API_URL}?sheet=${sheetName}`, {
    headers: getAuthHeaders()
  });
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
 * Performs a mutation action (create, edit, delete, procesarVenta) on a specific collection.
 * 
 * @param {string} sheetName - The target collection name
 * @param {string} action - The action type ('create' | 'edit' | 'delete' | 'procesarVenta')
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
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });

  let result;
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
