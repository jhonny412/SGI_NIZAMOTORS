/**
 * Extracts the date-only portion of an ISO datetime string.
 * If the string contains a 'T', splits and returns the date part.
 *
 * @param fecha - ISO datetime or date string
 * @returns Date string in 'YYYY-MM-DD' format, or empty string if falsy
 */
export function getDateOnly(fecha: string | null | undefined): string {
  if (!fecha) return "";
  return fecha.includes("T") ? fecha.split("T")[0] : fecha;
}

/**
 * Filters an array of items by an inclusive date range.
 *
 * @param items - Array of objects containing a date field
 * @param fechaDesde - Start date string in 'YYYY-MM-DD' format (inclusive)
 * @param fechaHasta - End date string in 'YYYY-MM-DD' format (inclusive)
 * @param dateField - The field name on each item that holds the date value
 * @returns Filtered array of items within the specified date range
 */
export function filterByDateRange<T extends Record<string, unknown>>(
  items: T[],
  fechaDesde: string,
  fechaHasta: string,
  dateField: keyof T = "fecha" as keyof T
): T[] {
  return items.filter((item) => {
    const dateOnly = getDateOnly(item[dateField] as string);
    if (!dateOnly) return false;
    if (fechaDesde && dateOnly < fechaDesde) return false;
    if (fechaHasta && dateOnly > fechaHasta) return false;
    return true;
  });
}

export interface DateRange {
  desde: string;
  hasta: string;
}

/**
 * Returns the default date range for report filters:
 * from the first day of the current month to today.
 *
 * @returns Object with 'desde' and 'hasta' in 'YYYY-MM-DD' format
 */
export function getDefaultDateRange(): DateRange {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const toInput = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { desde: toInput(firstDay), hasta: toInput(today) };
}
