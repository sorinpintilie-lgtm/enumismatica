/**
 * Format a number as Euro (EUR) for display.
 * Always shows whole numbers without decimals.
 *
 * NOTE: All prices on the platform are stored and displayed in EUR.
 */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as EUR with thousand separators (display only).
 * Semantics are identical to formatEUR but kept for backwards compatibility.
 */
export function formatEURWithSeparators(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse RON string to number
 * @param ronString - String like "100 RON" or "100.50 RON"
 * @returns Parsed number
 */
/**
 * Format a number as Romanian Leu (RON) for display.
 * Always shows whole numbers without decimals.
 * Uses Romanian locale for proper formatting.
 */
export function formatRON(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse Romanian RON string to number
 * Handles Romanian number format: "1.234,56 Lei" -> 1234.56
 * @param ronString - String like "1.234,56 Lei" or "100.50 RON"
 * @returns Parsed number
 */
export function parseRON(ronString: string): number {
  // Remove "Lei", "RON", and other non-numeric characters except digits, dots, and commas
  let cleaned = ronString.replace(/[^\d.,]/g, '');
  
  // Handle Romanian number format: thousands separated by ".", decimals by ","
  // If there's both a dot and comma, assume dot is thousands separator and comma is decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Remove thousands separators (dots) and replace decimal separator (comma) with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Only dots present - could be either thousands separator or decimal
    // If there are multiple dots, they're thousands separators
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots = thousands separators
      cleaned = cleaned.replace(/\./g, '');
    }
    // If single dot and reasonable decimal position, keep as decimal
  }
  
  return parseFloat(cleaned) || 0;
}
