/**
 * Safely appends an alpha channel (2-character hex) to a hex color string.
 * If the color already has an alpha channel (8 characters), it returns the original color.
 * If the color is 6 characters (e.g. #RRGGBB), it appends the alpha.
 */
export function addAlpha(color: string, alpha: string): string {
  if (!color || typeof color !== 'string') return color;
  if (color.startsWith('#') && color.length === 7) {
    return color + alpha;
  }
  return color;
}

/**
 * Returns the base color (6-character hex) from a hex color string.
 */
export function getBaseColor(color: string): string {
  if (!color || typeof color !== 'string') return color;
  if (color.startsWith('#') && color.length === 9) {
    return color.substring(0, 7);
  }
  return color;
}
