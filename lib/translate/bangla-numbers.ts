/**
 * Bangla Number Utilities
 *
 * Handles conversion between Western (0-9) and Bengali (০-৯) numerals.
 * Configurable per-user preference.
 */

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Convert a number or numeric string to Bengali numerals.
 * 123 → "১২৩"
 */
export function toBanglaDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => BANGLA_DIGITS[parseInt(d, 10)]);
}

/**
 * Convert Bengali numerals to Western numerals.
 * "১২৩" → "123"
 */
export function toWesternDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

/**
 * Format a number for display based on the user's numeral preference.
 */
export function formatNumber(
  value: number,
  system: 'bengali' | 'western' = 'bengali',
): string {
  if (system === 'western') return String(value);
  return toBanglaDigits(value);
}

/**
 * Format a decimal number with Bangla digits.
 * 3.14 → "৩.১৪"
 */
export function formatDecimal(
  value: number,
  decimalPlaces: number,
  system: 'bengali' | 'western' = 'bengali',
): string {
  const formatted = value.toFixed(decimalPlaces);
  if (system === 'western') return formatted;
  return toBanglaDigits(formatted);
}

/**
 * Format a percentage.
 * 85.5 → "৮৫.৫%"
 */
export function formatPercent(
  value: number,
  system: 'bengali' | 'western' = 'bengali',
): string {
  const formatted = `${value.toFixed(1)}%`;
  if (system === 'western') return formatted;
  return toBanglaDigits(formatted);
}

/**
 * Convert all digits in a text block to the specified numeral system.
 * Useful for converting entire translated passages.
 */
export function convertDigitsInText(
  text: string,
  system: 'bengali' | 'western',
): string {
  if (system === 'bengali') {
    return text.replace(/[0-9]/g, (d) => BANGLA_DIGITS[parseInt(d, 10)]);
  }
  return text.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}
