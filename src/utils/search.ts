/**
 * Normalizes a string by converting it to lowercase and removing accents/diacritics.
 *
 * @param str - The string to normalize
 * @returns Normalized lowercase string without diacritics
 */
export const normalizeString = (str: string | null | undefined): string => {
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
 *
 * @param targets - Array of string fields to search in (e.g. [description, code, oem])
 * @param query - The search query typed by the user
 * @returns true if all query words are found in any of the target strings
 */
export const matchSearch = (targets: string[], query: string): boolean => {
  if (!query) return true;

  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  if (queryWords.length === 0) return true;

  const normalizedTargets = targets.map(normalizeString).join(" ");

  // Every word in the query must be found in the combined target strings
  return queryWords.every((word) => normalizedTargets.includes(word));
};
