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

/**
 * Parses a hex or rgb(a) color string into { r, g, b } components [0-255].
 * Returns null if parsing fails.
 */
export function parseRgb(color: string): { r: number; g: number; b: number } | null {
  if (!color || typeof color !== 'string') return null;
  const c = color.trim().toLowerCase();

  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
  }

  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  return null;
}

/**
 * Returns perceived brightness (0 - 255) using standard ITU-R BT.601 formula.
 */
export function getPerceivedBrightness(color: string): number {
  const rgb = parseRgb(color);
  if (!rgb) return 128;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

/**
 * Determines whether a color is visually light (brightness >= 155).
 * Useful for deciding whether text on top of this color should be dark or white.
 */
export function isLightColor(color: string): boolean {
  return getPerceivedBrightness(color) >= 155;
}

/**
 * Returns a high-contrast text color ('#0A0A1F' for light backgrounds, '#FFFFFF' for dark).
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#0A0A1F' : '#FFFFFF';
}
