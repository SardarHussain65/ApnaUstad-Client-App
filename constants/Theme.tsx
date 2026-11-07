import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeId = 'light' | 'dark' | 'current';

export const THEME_STORAGE_KEY = 'app-theme';

export type AppGradient = [string, string, ...string[]];

export interface CategoryTilePalette {
  cardBg: string;
  cardBorder: string;
  iconBoxBg: string;
  iconColor: string;
  titleColor: string;
  subtitleColor?: string;
}

export interface BookingCardPalette {
  cardBg: string;
  cardBorder: string;
  dividerColor: string;
  statusPillBg: string;
  statusPillText: string;
  urgentPillBg: string;
  urgentPillText: string;
  avatarBg: string;
  avatarText: string;
}

export interface LegacyColors {
  background: string;
  card: string;
  cardSelected: string;
  text: string;
  textMuted: string;
  textDim: string;
  primary: string;
  secondary: string;
  worker: string;
  success: string;
  error: string;
  cyan: string;
  orange: string;
  green: string;
  pink: string;
  purple: string;
  deepBlue: string;
  yellow: string;
  border: string;
  inputBackground: string;
  surface: string;
  surfaceLight: string;
  surfaceHighlight: string;
  cyanGradient: AppGradient;
  orangeGradient: AppGradient;
  purpleGradient: AppGradient;
  successGradient: AppGradient;
  cosmicGradient: AppGradient;
  glowingGradient: AppGradient;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  isDark: boolean;
  useImageBackground: boolean;
  categoryCardStyle: 'multi' | 'monotone';
  blurTint: 'dark' | 'light' | 'default';
  colors: {
    background: {
      app: string;
      screen: string;
      elevated: string;
      imageOverlay: string;
    };
    surface: {
      card: string;
      cardMuted: string;
      raised: string;
      selected: string;
      highlight: string;
      subtle: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      dim: string;
      inverse: string;
      onBrand: string;
    };
    border: {
      default: string;
      strong: string;
      focus: string;
      subtle: string;
    };
    brand: {
      primary: string;
      secondary: string;
      worker: string;
      accent: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    input: {
      background: string;
      border: string;
      focusedBorder: string;
      placeholder: string;
      text: string;
    };
    button: {
      primaryBackground: AppGradient;
      primaryText: string;
      secondaryBackground: AppGradient;
      secondaryText: string;
      workerBackground: AppGradient;
      workerText: string;
      outlineText: string;
      outlineBorder: string;
      disabledOpacity: number;
    };
    tabBar: {
      background: string;
      border: string;
      activeBackground: string;
      activeBorder: string;
      activeIcon: string;
      inactiveIcon: string;
      shadow: string;
    };
    modal: {
      backdrop: string;
      card: string;
      border: string;
      closeBackground: string;
    };
    toast: {
      background: string;
      border: string;
      title: string;
      message: string;
    };
    skeleton: {
      base: string;
      shimmer: string;
    };
    overlay: {
      subtle: string;
      medium: string;
      strong: string;
    };
    shadow: {
      color: string;
      softOpacity: number;
      cardOpacity: number;
      glowOpacity: number;
    };
    gradients: {
      primary: AppGradient;
      worker: AppGradient;
      secondary: AppGradient;
      success: AppGradient;
      page: AppGradient;
      card: AppGradient;
      glow: AppGradient;
    };
  };
  legacy: LegacyColors;
}

const normalizeOpacity = (opacity: number | string) => {
  if (typeof opacity === 'string') {
    const trimmed = opacity.trim();
    if (/^[0-9a-fA-F]{2}$/.test(trimmed)) return trimmed.toUpperCase();
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return Math.round(Math.max(0, Math.min(1, numeric)) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    }
    return 'FF';
  }

  return Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
};

export function alpha(color: string, opacity: number | string): string {
  if (!color || typeof color !== 'string') return color;
  const opacityHex = normalizeOpacity(opacity);
  const numericOpacity = parseInt(opacityHex, 16) / 255;

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${opacityHex}`;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return `${color}${opacityHex}`;
  }

  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    const existingAlpha = parseInt(color.slice(7, 9), 16) / 255;
    const finalAlpha = Math.round(existingAlpha * numericOpacity * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
    return `${color.slice(0, 7)}${finalAlpha}`;
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(part => part.trim());
    if (parts.length === 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${numericOpacity.toFixed(3)})`;
    }
    if (parts.length >= 4) {
      const existingAlpha = Number(parts[3]);
      const safeExisting = Number.isFinite(existingAlpha) ? existingAlpha : 1;
      const finalAlpha = Math.max(0, Math.min(1, safeExisting * numericOpacity));
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${finalAlpha.toFixed(3)})`;
    }
  }

  return color;
}

/**
 * Determines whether a color is visually light (brightness >= 155).
 * Useful for deciding whether text on top of this color should be dark or white.
 */
export function isLightColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  const c = color.trim().toLowerCase();
  let r = 0, g = 0, b = 0;

  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else {
    const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      r = Number(rgbMatch[1]);
      g = Number(rgbMatch[2]);
      b = Number(rgbMatch[3]);
    } else {
      return false;
    }
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 155;
}

/**
 * Returns a high-contrast text color ('#0A0A1F' for light backgrounds, '#FFFFFF' for dark).
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#0A0A1F' : '#FFFFFF';
}

/**
 * Ensures any color (e.g. backend accent colors or neon legacy colors)
 * is fully legible on the active theme's background.
 */
export function getAccessibleColor(color: string, isDark: boolean = true): string {
  if (isDark || !color || typeof color !== 'string') return color;
  const normalized = color.trim().toLowerCase();

  if (
    normalized === '#00f5ff' ||
    normalized === '#00ffff' ||
    normalized === '#00e5ff' ||
    normalized === '#22d3ee' ||
    normalized === '#06b6d4' ||
    normalized === '#38bdf8' ||
    normalized === '#67e8f9' ||
    normalized === '#a5f3fc' ||
    normalized === '#cffafe' ||
    normalized === '#60a5fa' ||
    normalized === 'cyan' ||
    normalized === 'aqua'
  ) {
    return '#1D4ED8';
  }

  if (
    normalized === '#00ff7f' ||
    normalized === '#39ff14' ||
    normalized === '#00e887' ||
    normalized === '#00e5a0' ||
    normalized === '#4ade80' ||
    normalized === '#86efac' ||
    normalized === '#22c55e'
  ) {
    return '#15803D';
  }

  if (
    normalized === '#ffd700' ||
    normalized === '#ffe600' ||
    normalized === '#ffcc00' ||
    normalized === '#facc15' ||
    normalized === '#fde047' ||
    normalized === '#fbbf24' ||
    normalized === '#f59e0b' ||
    normalized === '#eab308' ||
    normalized === '#fef08a' ||
    normalized === 'yellow' ||
    normalized === 'gold'
  ) {
    return '#B45309';
  }

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    let r = 0, g = 0, b = 0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    if (r > 190 && g > 150 && b < 120) {
      return '#B45309';
    }
    if (b > 180 && g > 160 && r < 120) {
      return '#1D4ED8';
    }
    if (g > 180 && r < 160 && b < 160) {
      return '#15803D';
    }
  }

  return color;
}

/**
 * Returns the calibrated Category Tile palette (background, border, iconBox, iconColor, titleColor)
 * with strong borders and rich semantic tints for Light, Dark, and Cosmic themes.
 */
export function getCategoryTilePalette(
  theme: AppTheme,
  categoryName: string = '',
  index: number = 0,
  isViewAll: boolean = false,
): CategoryTilePalette {
  const isCosmic = theme.id === 'current';

  if (isViewAll) {
    if (isCosmic) {
      return {
        cardBg: 'rgba(12, 60, 82, 0.84)',
        cardBorder: '#00F5FF',
        iconBoxBg: 'rgba(0, 245, 255, 0.24)',
        iconColor: '#00F5FF',
        titleColor: '#00F5FF',
        subtitleColor: '#CBD5E1',
      };
    }
    return theme.isDark
      ? {
          cardBg: '#13284C',
          cardBorder: '#3B82F6',
          iconBoxBg: '#1E3F75',
          iconColor: '#60A5FA',
          titleColor: '#93C5FD',
          subtitleColor: '#60A5FA',
        }
      : {
          cardBg: '#D6E8FF',
          cardBorder: '#3B82F6',
          iconBoxBg: '#ADCFF8',
          iconColor: '#1E40AF',
          titleColor: '#1E3A8A',
          subtitleColor: '#1E40AF',
        };
  }

  const lower = categoryName.toLowerCase();
  type SemanticSlot = 'teal' | 'purple' | 'amber' | 'green' | 'rose' | 'blue';
  let slot: SemanticSlot;

  if (lower.includes('ac') || lower.includes('appliance') || lower.includes('cool') || lower.includes('hvac')) {
    slot = 'teal';
  } else if (lower.includes('plumb') || lower.includes('water') || lower.includes('pipe') || lower.includes('gas')) {
    slot = 'purple';
  } else if (lower.includes('electr') || lower.includes('solar') || lower.includes('wiring') || lower.includes('power')) {
    slot = 'amber';
  } else if (lower.includes('clean') || lower.includes('pest') || lower.includes('garden') || lower.includes('wash')) {
    slot = 'green';
  } else if (lower.includes('paint') || lower.includes('renov') || lower.includes('construct') || lower.includes('wood') || lower.includes('carpent')) {
    slot = 'rose';
  } else {
    const order: SemanticSlot[] = ['teal', 'purple', 'amber', 'green', 'rose', 'blue'];
    slot = order[index % order.length];
  }

  if (isCosmic) {
    switch (slot) {
      case 'teal':
        return {
          cardBg: 'rgba(12, 62, 72, 0.84)',
          cardBorder: '#14B8A6',
          iconBoxBg: 'rgba(20, 184, 166, 0.30)',
          iconColor: '#5EEAD4',
          titleColor: '#FFFFFF',
        };
      case 'purple':
        return {
          cardBg: 'rgba(48, 28, 84, 0.84)',
          cardBorder: '#A855F7',
          iconBoxBg: 'rgba(168, 85, 247, 0.30)',
          iconColor: '#E9D5FF',
          titleColor: '#FFFFFF',
        };
      case 'amber':
        return {
          cardBg: 'rgba(72, 44, 14, 0.84)',
          cardBorder: '#F59E0B',
          iconBoxBg: 'rgba(245, 158, 11, 0.30)',
          iconColor: '#FDE68A',
          titleColor: '#FFFFFF',
        };
      case 'green':
        return {
          cardBg: 'rgba(14, 58, 36, 0.84)',
          cardBorder: '#22C55E',
          iconBoxBg: 'rgba(34, 197, 94, 0.30)',
          iconColor: '#86EFAC',
          titleColor: '#FFFFFF',
        };
      case 'rose':
        return {
          cardBg: 'rgba(72, 24, 30, 0.84)',
          cardBorder: '#F87171',
          iconBoxBg: 'rgba(248, 113, 113, 0.30)',
          iconColor: '#FECACA',
          titleColor: '#FFFFFF',
        };
      case 'blue':
      default:
        return {
          cardBg: 'rgba(18, 42, 80, 0.84)',
          cardBorder: '#3B82F6',
          iconBoxBg: 'rgba(59, 130, 246, 0.30)',
          iconColor: '#93C5FD',
          titleColor: '#FFFFFF',
        };
    }
  }

  if (theme.isDark) {
    switch (slot) {
      case 'teal':
        return {
          cardBg: '#0D3137',
          cardBorder: '#14B8A6',
          iconBoxBg: '#154E56',
          iconColor: '#5EEAD4',
          titleColor: '#FFFFFF',
        };
      case 'purple':
        return {
          cardBg: '#251B4A',
          cardBorder: '#8B5CF6',
          iconBoxBg: '#3B2B73',
          iconColor: '#C4B5FD',
          titleColor: '#FFFFFF',
        };
      case 'amber':
        return {
          cardBg: '#3B250A',
          cardBorder: '#F59E0B',
          iconBoxBg: '#5C3A10',
          iconColor: '#FCD34D',
          titleColor: '#FFFFFF',
        };
      case 'green':
        return {
          cardBg: '#0E3121',
          cardBorder: '#22C55E',
          iconBoxBg: '#164E35',
          iconColor: '#4ADE80',
          titleColor: '#FFFFFF',
        };
      case 'rose':
        return {
          cardBg: '#3D181B',
          cardBorder: '#EF4444',
          iconBoxBg: '#61252A',
          iconColor: '#FCA5A5',
          titleColor: '#FFFFFF',
        };
      case 'blue':
      default:
        return {
          cardBg: '#13284C',
          cardBorder: '#3B82F6',
          iconBoxBg: '#1E3F75',
          iconColor: '#60A5FA',
          titleColor: '#FFFFFF',
        };
    }
  } else {
    switch (slot) {
      case 'teal':
        return {
          cardBg: '#CCFBF1',
          cardBorder: '#14B8A6',
          iconBoxBg: '#99F6E4',
          iconColor: '#0F766E',
          titleColor: '#0F172A',
        };
      case 'purple':
        return {
          cardBg: '#E4D9FF',
          cardBorder: '#8B5CF6',
          iconBoxBg: '#C4B5FD',
          iconColor: '#4C1D95',
          titleColor: '#0F172A',
        };
      case 'amber':
        return {
          cardBg: '#FDE8C8',
          cardBorder: '#F59E0B',
          iconBoxBg: '#FCD38D',
          iconColor: '#78350F',
          titleColor: '#0F172A',
        };
      case 'green':
        return {
          cardBg: '#D1FAE5',
          cardBorder: '#22C55E',
          iconBoxBg: '#A7F3D0',
          iconColor: '#14532D',
          titleColor: '#0F172A',
        };
      case 'rose':
        return {
          cardBg: '#FADCD9',
          cardBorder: '#F87171',
          iconBoxBg: '#FCA5A5',
          iconColor: '#7F1D1D',
          titleColor: '#0F172A',
        };
      case 'blue':
      default:
        return {
          cardBg: '#D6E8FF',
          cardBorder: '#3B82F6',
          iconBoxBg: '#ADCFF8',
          iconColor: '#1E40AF',
          titleColor: '#0F172A',
        };
    }
  }
}

/**
 * Returns the calibrated Recent Booking Card palette for the active theme and booking status.
 */
export function getBookingCardPalette(
  theme: AppTheme,
  status: string,
  isPaymentPending: boolean = false,
): BookingCardPalette {
  const effectiveStatus = isPaymentPending ? 'payment_due' : status;

  // 1. Cosmic Space Theme ('current')
  if (theme.id === 'current') {
    if (effectiveStatus === 'completed' || effectiveStatus === 'closed') {
      return {
        cardBg: 'rgba(8, 38, 28, 0.86)',
        cardBorder: '#22C55E',
        dividerColor: 'rgba(34, 197, 94, 0.30)',
        statusPillBg: 'rgba(34, 197, 94, 0.22)',
        statusPillText: '#4ADE80',
        urgentPillBg: 'rgba(245, 158, 11, 0.24)',
        urgentPillText: '#FBBF24',
        avatarBg: 'rgba(34, 197, 94, 0.25)',
        avatarText: '#FFFFFF',
      };
    }
    if (
      effectiveStatus === 'accepted' ||
      effectiveStatus === 'ongoing' ||
      effectiveStatus === 'in-progress' ||
      effectiveStatus === 'assigned'
    ) {
      return {
        cardBg: 'rgba(12, 32, 62, 0.86)',
        cardBorder: '#00F5FF',
        dividerColor: 'rgba(0, 245, 255, 0.28)',
        statusPillBg: 'rgba(0, 245, 255, 0.22)',
        statusPillText: '#00F5FF',
        urgentPillBg: 'rgba(245, 158, 11, 0.24)',
        urgentPillText: '#FBBF24',
        avatarBg: 'rgba(0, 245, 255, 0.22)',
        avatarText: '#FFFFFF',
      };
    }
    if (effectiveStatus === 'cancelled') {
      return {
        cardBg: 'rgba(46, 16, 22, 0.86)',
        cardBorder: '#EF4444',
        dividerColor: 'rgba(239, 68, 68, 0.28)',
        statusPillBg: 'rgba(239, 68, 68, 0.24)',
        statusPillText: '#FCA5A5',
        urgentPillBg: 'rgba(245, 158, 11, 0.24)',
        urgentPillText: '#FBBF24',
        avatarBg: 'rgba(239, 68, 68, 0.25)',
        avatarText: '#FFFFFF',
      };
    }
    return {
      cardBg: 'rgba(44, 30, 12, 0.86)',
      cardBorder: '#F59E0B',
      dividerColor: 'rgba(245, 158, 11, 0.28)',
      statusPillBg: 'rgba(245, 158, 11, 0.24)',
      statusPillText: '#FBBF24',
      urgentPillBg: 'rgba(245, 158, 11, 0.24)',
      urgentPillText: '#FBBF24',
      avatarBg: 'rgba(245, 158, 11, 0.25)',
      avatarText: '#FFFFFF',
    };
  }

  // 2. Professional Dark ('dark')
  if (theme.isDark) {
    if (effectiveStatus === 'completed' || effectiveStatus === 'closed') {
      return {
        cardBg: '#0B2B1E',
        cardBorder: '#22C55E',
        dividerColor: '#1E563B',
        statusPillBg: '#22C55E',
        statusPillText: '#052E16',
        urgentPillBg: '#F59E0B',
        urgentPillText: '#1C1917',
        avatarBg: '#164E35',
        avatarText: '#FFFFFF',
      };
    }
    if (
      effectiveStatus === 'accepted' ||
      effectiveStatus === 'ongoing' ||
      effectiveStatus === 'in-progress' ||
      effectiveStatus === 'assigned'
    ) {
      return {
        cardBg: '#102342',
        cardBorder: '#3B82F6',
        dividerColor: '#254782',
        statusPillBg: '#60A5FA',
        statusPillText: '#081426',
        urgentPillBg: '#F59E0B',
        urgentPillText: '#1C1917',
        avatarBg: '#1E3F75',
        avatarText: '#FFFFFF',
      };
    }
    if (effectiveStatus === 'cancelled') {
      return {
        cardBg: '#301518',
        cardBorder: '#EF4444',
        dividerColor: '#69262C',
        statusPillBg: '#F87171',
        statusPillText: '#2A080A',
        urgentPillBg: '#F59E0B',
        urgentPillText: '#1C1917',
        avatarBg: '#542126',
        avatarText: '#FFFFFF',
      };
    }
    // pending / open / reviewing / payment_due
    return {
      cardBg: '#2E220D',
      cardBorder: '#F59E0B',
      dividerColor: '#664B1C',
      statusPillBg: '#F59E0B',
      statusPillText: '#1C1917',
      urgentPillBg: '#F59E0B',
      urgentPillText: '#1C1917',
      avatarBg: '#4D3815',
      avatarText: '#FFFFFF',
    };
  }

  // 3. Professional Light ('light')
  if (effectiveStatus === 'completed' || effectiveStatus === 'closed') {
    return {
      cardBg: '#DCFCE7',
      cardBorder: '#22C55E',
      dividerColor: '#86EFAC',
      statusPillBg: '#A7F3D0',
      statusPillText: '#064E3B',
      urgentPillBg: '#FDE68A',
      urgentPillText: '#78350F',
      avatarBg: '#FFFFFF',
      avatarText: '#0F172A',
    };
  }
  if (
    effectiveStatus === 'accepted' ||
    effectiveStatus === 'ongoing' ||
    effectiveStatus === 'in-progress' ||
    effectiveStatus === 'assigned'
  ) {
    return {
      cardBg: '#DBEAFE',
      cardBorder: '#3B82F6',
      dividerColor: '#93C5FD',
      statusPillBg: '#1D4ED8',
      statusPillText: '#FFFFFF',
      urgentPillBg: '#FDE68A',
      urgentPillText: '#78350F',
      avatarBg: '#FFFFFF',
      avatarText: '#0F172A',
    };
  }
  if (effectiveStatus === 'cancelled') {
    return {
      cardBg: '#FEE2E2',
      cardBorder: '#EF4444',
      dividerColor: '#FCA5A5',
      statusPillBg: '#FECACA',
      statusPillText: '#7F1D1D',
      urgentPillBg: '#FDE68A',
      urgentPillText: '#78350F',
      avatarBg: '#FFFFFF',
      avatarText: '#0F172A',
    };
  }
  return {
    cardBg: '#FEF3C7',
    cardBorder: '#F59E0B',
    dividerColor: '#FCD34D',
    statusPillBg: '#FDE68A',
    statusPillText: '#78350F',
    urgentPillBg: '#FDE68A',
    urgentPillText: '#78350F',
    avatarBg: '#FFFFFF',
    avatarText: '#0F172A',
  };
}

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  s: 8,
  m: 12,
  l: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 999,
  round: 999,
};

export const Animation = {
  duration: 300,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};

// ─── 1. Professional Light ('light') ─────────────────────────────────────────
const lightLegacy: LegacyColors = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardSelected: '#DBEAFE',
  text: '#0F172A',
  textMuted: '#334155',
  textDim: '#475569',
  primary: '#1D4ED8',
  secondary: '#0F766E',
  worker: '#D97706',
  success: '#15803D',
  error: '#DC2626',
  cyan: '#1D4ED8',
  orange: '#D97706',
  green: '#15803D',
  pink: '#DB2777',
  purple: '#5B21B6',
  deepBlue: '#DBEAFE',
  yellow: '#B45309',
  border: '#94A3B8',
  inputBackground: '#FFFFFF',
  surface: '#F1F5F9',
  surfaceLight: '#FFFFFF',
  surfaceHighlight: '#DBEAFE',
  cyanGradient: ['#1D4ED8', '#1E40AF'],
  orangeGradient: ['#F59E0B', '#D97706'],
  purpleGradient: ['#6D28D9', '#1D4ED8'],
  successGradient: ['#16A34A', '#0F766E'],
  cosmicGradient: ['#FFFFFF', '#F8FAFC', '#FFFFFF'],
  glowingGradient: ['rgba(29, 78, 216, 0.08)', 'rgba(15, 118, 110, 0.08)'],
};

// ─── 2. Professional Dark ('dark') ───────────────────────────────────────────
const darkLegacy: LegacyColors = {
  background: '#080C14',
  card: '#111822',
  cardSelected: '#1C283B',
  text: '#FFFFFF',
  textMuted: '#CBD5E1',
  textDim: '#94A3B8',
  primary: '#60A5FA',
  secondary: '#2DD4BF',
  worker: '#F59E0B',
  success: '#22C55E',
  error: '#F87171',
  cyan: '#60A5FA',
  orange: '#F59E0B',
  green: '#22C55E',
  pink: '#F472B6',
  purple: '#A78BFA',
  deepBlue: '#111A2B',
  yellow: '#FBBF24',
  border: '#334155',
  inputBackground: '#111822',
  surface: '#0F1620',
  surfaceLight: '#1A2436',
  surfaceHighlight: '#233858',
  cyanGradient: ['#3B82F6', '#2563EB'],
  orangeGradient: ['#F59E0B', '#D97706'],
  purpleGradient: ['#8B5CF6', '#3B82F6'],
  successGradient: ['#22C55E', '#10B981'],
  cosmicGradient: ['#080C14', '#0F1620', '#080C14'],
  glowingGradient: ['rgba(96, 165, 250, 0.12)', 'rgba(45, 212, 191, 0.10)'],
};

// ─── 3. Cosmic Space ('current') ─────────────────────────────────────────────
const cosmicLegacy: LegacyColors = {
  background: '#060914',
  card: 'rgba(14, 20, 36, 0.84)',
  cardSelected: 'rgba(24, 36, 64, 0.90)',
  text: '#FFFFFF',
  textMuted: '#CBD5E1',
  textDim: '#94A3B8',
  primary: '#00F5FF',
  secondary: '#BF5AF2',
  worker: '#FF9F0A',
  success: '#22C55E',
  error: '#FF453A',
  cyan: '#00F5FF',
  orange: '#FF9F0A',
  green: '#22C55E',
  pink: '#FF375F',
  purple: '#BF5AF2',
  deepBlue: '#0D1528',
  yellow: '#FFD60A',
  border: 'rgba(148, 163, 184, 0.35)',
  inputBackground: 'rgba(12, 18, 34, 0.86)',
  surface: 'rgba(12, 18, 34, 0.84)',
  surfaceLight: 'rgba(24, 34, 58, 0.88)',
  surfaceHighlight: 'rgba(0, 245, 255, 0.16)',
  cyanGradient: ['#00F5FF', '#0088FF'],
  orangeGradient: ['#FF9F0A', '#FF375F'],
  purpleGradient: ['#BF5AF2', '#00F5FF'],
  successGradient: ['#22C55E', '#00F5FF'],
  cosmicGradient: ['#060914', '#0D1326', '#060914'],
  glowingGradient: ['rgba(0, 245, 255, 0.16)', 'rgba(191, 90, 242, 0.14)'],
};

const buildTheme = (
  id: ThemeId,
  name: string,
  legacy: LegacyColors,
  isDark: boolean,
  useImageBackground: boolean,
): AppTheme => {
  const isCosmic = id === 'current';

  return {
    id,
    name,
    isDark,
    useImageBackground,
    categoryCardStyle: 'multi',
    blurTint: isDark ? 'dark' : 'light',
    colors: {
      background: {
        app: legacy.background,
        screen: legacy.background,
        elevated: !isDark ? '#FFFFFF' : legacy.surface,
        imageOverlay: isCosmic ? 'rgba(6, 9, 20, 0.56)' : alpha(legacy.background, 0.94),
      },
      surface: {
        card: legacy.card,
        cardMuted: !isDark ? legacy.surface : alpha(legacy.cardSelected, 0.85),
        raised: !isDark ? '#FFFFFF' : legacy.surfaceLight,
        selected: legacy.cardSelected,
        highlight: legacy.surfaceHighlight,
        subtle: !isDark ? legacy.surface : legacy.card,
      },
      text: {
        primary: legacy.text,
        secondary: !isDark ? '#1E293B' : '#E2E8F0',
        muted: legacy.textMuted,
        dim: legacy.textDim,
        inverse: !isDark ? '#FFFFFF' : '#0F172A',
        onBrand: !isDark ? '#FFFFFF' : '#080C14',
      },
      border: {
        default: legacy.border,
        strong: !isDark ? '#64748B' : '#475569',
        focus: legacy.primary,
        subtle: !isDark ? '#CBD5E1' : legacy.border,
      },
      brand: {
        primary: legacy.primary,
        secondary: legacy.secondary,
        worker: legacy.worker,
        accent: legacy.secondary,
      },
      status: {
        success: legacy.success,
        warning: !isDark ? '#D97706' : '#FBBF24',
        error: legacy.error,
        info: legacy.primary,
      },
      input: {
        background: legacy.inputBackground,
        border: !isDark ? '#1D4ED8' : isCosmic ? 'rgba(0, 245, 255, 0.45)' : '#3B82F6',
        focusedBorder: legacy.primary,
        placeholder: !isDark ? '#475569' : '#94A3B8',
        text: legacy.text,
      },
      button: {
        primaryBackground: legacy.cyanGradient,
        primaryText: !isDark ? '#FFFFFF' : '#080C14',
        secondaryBackground: !isDark ? ['#E2E8F0', '#CBD5E1'] : [legacy.card, legacy.cardSelected],
        secondaryText: legacy.text,
        workerBackground: legacy.orangeGradient,
        workerText: '#FFFFFF',
        outlineText: legacy.text,
        outlineBorder: legacy.border,
        disabledOpacity: 0.5,
      },
      tabBar: {
        background: !isDark ? '#FFFFFF' : isCosmic ? 'rgba(10, 15, 28, 0.92)' : legacy.surface,
        border: !isDark ? '#94A3B8' : isCosmic ? 'rgba(0, 245, 255, 0.28)' : legacy.border,
        activeBackground: !isDark
          ? '#C7D9F8'
          : isCosmic
            ? 'rgba(0, 245, 255, 0.16)'
            : '#233858',
        activeBorder: isCosmic ? 'rgba(0, 245, 255, 0.40)' : 'transparent',
        activeIcon: !isDark
          ? '#1D4ED8'
          : isCosmic
            ? '#00F5FF'
            : '#60A5FA',
        inactiveIcon: !isDark ? '#1E293B' : '#CBD5E1',
        shadow: 'transparent',
      },
      modal: {
        backdrop: !isDark ? 'rgba(15, 23, 42, 0.50)' : 'rgba(0, 0, 0, 0.74)',
        card: !isDark ? '#FFFFFF' : '#111822',
        border: !isDark ? '#94A3B8' : legacy.border,
        closeBackground: !isDark ? '#E2E8F0' : legacy.surfaceLight,
      },
      toast: {
        background: !isDark ? '#FFFFFF' : '#111822',
        border: !isDark ? '#94A3B8' : legacy.border,
        title: legacy.text,
        message: !isDark ? '#334155' : '#CBD5E1',
      },
      skeleton: {
        base: !isDark ? '#CBD5E1' : '#1A2436',
        shimmer: !isDark ? '#F1F5F9' : '#26344D',
      },
      overlay: {
        subtle: !isDark ? alpha('#0F172A', 0.04) : alpha('#FFFFFF', 0.05),
        medium: !isDark ? alpha('#0F172A', 0.08) : alpha('#FFFFFF', 0.10),
        strong: !isDark ? alpha('#0F172A', 0.18) : alpha('#000000', 0.55),
      },
      shadow: {
        color: '#000000',
        softOpacity: 0,
        cardOpacity: 0,
        glowOpacity: 0,
      },
      gradients: {
        primary: legacy.cyanGradient,
        worker: legacy.orangeGradient,
        secondary: legacy.purpleGradient,
        success: legacy.successGradient,
        page: legacy.cosmicGradient,
        card: !isDark ? ['#FFFFFF', '#FFFFFF'] : [legacy.card, legacy.card],
        glow: legacy.glowingGradient,
      },
    },
    legacy,
  };
};

export const themes: Record<ThemeId, AppTheme> = {
  light: buildTheme('light', 'Professional Light', lightLegacy, false, false),
  dark: buildTheme('dark', 'Professional Dark', darkLegacy, true, false),
  current: buildTheme('current', 'Cosmic Space', cosmicLegacy, true, true),
};

const isThemeId = (value: string | null): value is ThemeId => {
  return value === 'light' || value === 'dark' || value === 'current';
};

interface ThemeContextValue {
  themeId: ThemeId;
  theme: AppTheme;
  isHydrated: boolean;
  setThemeId: (themeId: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

let memoryCachedThemeId: ThemeId | null = null;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(memoryCachedThemeId || 'dark');
  const [isHydrated, setIsHydrated] = useState(Boolean(memoryCachedThemeId));

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedThemeId) => {
        if (!isMounted) return;
        if (isThemeId(storedThemeId)) {
          memoryCachedThemeId = storedThemeId;
          setThemeIdState(storedThemeId);
        } else if (storedThemeId === 'emerald_light') {
          memoryCachedThemeId = 'light';
          setThemeIdState('light');
          void AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
        } else if (storedThemeId === 'emerald_dark') {
          memoryCachedThemeId = 'dark';
          setThemeIdState('dark');
          void AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        }
      })
      .catch((error) => {
        console.warn('Failed to load app theme:', error);
      })
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeId = useCallback(async (nextThemeId: ThemeId) => {
    const resolvedId: ThemeId = isThemeId(nextThemeId) ? nextThemeId : 'dark';
    memoryCachedThemeId = resolvedId;
    setThemeIdState(resolvedId);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, resolvedId);
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      theme: themes[themeId] || themes.dark,
      isHydrated,
      setThemeId,
    }),
    [isHydrated, setThemeId, themeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used inside ThemeProvider');
  }
  return context;
}

export function useTheme() {
  return useThemeMode().theme;
}

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}

export function createTypography(theme: AppTheme) {
  return {
    h1: {
      fontSize: 36,
      fontWeight: '800' as const,
      color: theme.colors.text.primary,
      letterSpacing: -0.6,
    },
    h2: {
      fontSize: 26,
      fontWeight: '800' as const,
      color: theme.colors.text.primary,
      letterSpacing: -0.4,
    },
    h3: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: theme.colors.text.primary,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text.primary,
    },
    caption: {
      fontSize: 14,
      color: theme.colors.text.muted,
      fontWeight: '500' as const,
    },
    threeD: {
      textShadowColor: 'transparent',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0,
    },
    threeDLight: {
      textShadowColor: 'transparent',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0,
    },
  };
}

export function createShadows(_theme: AppTheme) {
  return {
    glow: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    neonPurple: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    card: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    depth: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    bevel: {},
  };
}

export function useThemeTypography() {
  const theme = useTheme();
  return useMemo(() => createTypography(theme), [theme]);
}

export function useThemeShadows() {
  const theme = useTheme();
  return useMemo(() => createShadows(theme), [theme]);
}

export function useThemeColors() {
  return useTheme().legacy;
}

export const Colors = themes.dark.legacy;
export const Typography = createTypography(themes.dark);
export const Shadows = createShadows(themes.dark);
