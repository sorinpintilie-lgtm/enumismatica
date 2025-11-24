/**
 * Format a number as Romanian Lei (RON)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with RON currency
 */
export function formatRON(amount: number, decimals: number = 2): string {
  return `${amount.toFixed(decimals)} RON`;
}

/**
 * Format a number as Romanian Lei with thousand separators
 * @param amount - The amount to format
 * @returns Formatted string with RON currency
 */
export function formatRONWithSeparators(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse RON string to number
 * @param ronString - String like "100 RON" or "100.50 RON"
 * @returns Parsed number
 */
export function parseRON(ronString: string): number {
  return parseFloat(ronString.replace(/[^\d.]/g, ''));
}
