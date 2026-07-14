/**
 * Normalizes a string by converting it to lowercase and removing accents/diacritics.
 * @param {string} str 
 * @returns {string}
 */
export const normalizeString = (str) => {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Checks if a search query matches a list of target strings.
 * The query is split by spaces, and ALL search terms must match (AND search).
 * Comparison is case-insensitive and accent-insensitive.
 * @param {string[]} targets - Array of string fields to search in (e.g. [description, code, oem])
 * @param {string} query - The search query typed by the user
 * @returns {boolean}
 */
export const matchSearch = (targets, query) => {
  if (!query) return true;
  
  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  
  if (queryWords.length === 0) return true;
  
  const normalizedTargets = targets.map(normalizeString).join(" ");
  
  // Every word in the query must be found in the combined target strings
  return queryWords.every((word) => normalizedTargets.includes(word));
};
