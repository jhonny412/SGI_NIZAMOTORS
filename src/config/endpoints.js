/**
 * Central configuration file for all API Endpoints.
 * Adheres to the Dependency Inversion Principle (DIP).
 */

export const ENDPOINTS = {
  // Main database API
  INVENTORY_API_URL: import.meta.env.VITE_GOOGLE_API_KEY || "/.netlify/functions/api",
  
  // Auditing / Logging API
  LOGGER_API_URL: import.meta.env.VITE_GOOGLE_LOGGER_KEY || "/.netlify/functions/api",
  
  // Image search API
  IMAGE_SEARCH_API_URL: "https://script.google.com/macros/s/AKfycbxEL6F6W-TtiadTLzyUXFvGqZYuEopNE1Eq6wtnixTVXcEwbrUo1pw-AGV3n4ktrPU/exec"
};
