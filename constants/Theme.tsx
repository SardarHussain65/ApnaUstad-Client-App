import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeId = 'current' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'app-theme';

export type AppGradient = [string, string, ...string[]];

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
    return `${color.slice(0, 7)}${opacityHex}`;
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(part => part.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${numericOpacity.toFixed(3)})`;
    }
  }

  return color;
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

const currentLegacy: LegacyColors = {
  background: '#050510',
  card: '#0F0F1A',
  cardSelected: '#1A1A2E',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textDim: '#5B5B5E',
  primary: '#00F5FF',
  secondary: '#BF5AF2',
  worker: '#FF8C00',
  success: '#34C759',
  error: '#FF3B30',
  cyan: '#00F5FF',
  orange: '#FF8C00',
  green: '#00FF7F',
  pink: '#FF1493',
  purple: '#BF5AF2',
  deepBlue: '#121225',
  yellow: '#FFD700',
  border: '#1C1C2E',
  inputBackground: '#0F0F1A',
  surface: '#0A0A1F',
  surfaceLight: '#1C1C2E',
  surfaceHighlight: '#2C2C4E',
  cyanGradient: ['#00F5FF', '#007AFF'],
  orangeGradient: ['#FF8C00', '#FF5E00'],
  purpleGradient: ['#BF5AF2', '#FF2D55'],
  successGradient: ['#34C759', '#11998e'],
  cosmicGradient: ['#050510', '#121225', '#050510'],
  glowingGradient: ['rgba(0, 245, 255, 0.15)', 'rgba(191, 90, 242, 0.15)'],
};

const lightLegacy: LegacyColors = {
  background: '#F7F8FA',
  card: '#FFFFFF',
  cardSelected: '#EAF2FF',
  text: '#111827',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  primary: '#2563EB',
  secondary: '#0F766E',
  worker: '#F97316',
  success: '#16A34A',
  error: '#DC2626',
  cyan: '#2563EB',
  orange: '#F97316',
  green: '#16A34A',
  pink: '#DB2777',
  purple: '#7C3AED',
  deepBlue: '#EAF2FF',
  yellow: '#D97706',
  border: '#E2E8F0',
  inputBackground: '#FFFFFF',
  surface: '#F1F5F9',
  surfaceLight: '#FFFFFF',
  surfaceHighlight: '#EAF2FF',
  cyanGradient: ['#2563EB', '#0F766E'],
  orangeGradient: ['#F97316', '#EA580C'],
  purpleGradient: ['#7C3AED', '#2563EB'],
  successGradient: ['#16A34A', '#0F766E'],
  cosmicGradient: ['#F7F8FA', '#EEF2F7', '#F7F8FA'],
  glowingGradient: ['rgba(37, 99, 235, 0.08)', 'rgba(15, 118, 110, 0.08)'],
};

const darkLegacy: LegacyColors = {
  background: '#101114',
  card: '#191C22',
  cardSelected: '#222731',
  text: '#F8FAFC',
  textMuted: '#A7B0C0',
  textDim: '#64748B',
  primary: '#60A5FA',
  secondary: '#2DD4BF',
  worker: '#FB923C',
  success: '#22C55E',
  error: '#F87171',
  cyan: '#60A5FA',
  orange: '#FB923C',
  green: '#22C55E',
  pink: '#F472B6',
  purple: '#A78BFA',
  deepBlue: '#16181D',
  yellow: '#FBBF24',
  border: '#2A303A',
  inputBackground: '#171A20',
  surface: '#15171C',
  surfaceLight: '#222731',
  surfaceHighlight: '#2B3340',
  cyanGradient: ['#60A5FA', '#2DD4BF'],
  orangeGradient: ['#FB923C', '#F97316'],
  purpleGradient: ['#A78BFA', '#60A5FA'],
  successGradient: ['#22C55E', '#14B8A6'],
  cosmicGradient: ['#101114', '#15171C', '#101114'],
  glowingGradient: ['rgba(96, 165, 250, 0.12)', 'rgba(45, 212, 191, 0.1)'],
};

const buildTheme = (
  id: ThemeId,
  name: string,
  legacy: LegacyColors,
  isDark: boolean,
  useImageBackground: boolean,
): AppTheme => ({
  id,
  name,
  isDark,
  useImageBackground,
  blurTint: isDark ? 'dark' : 'light',
  colors: {
    background: {
      app: legacy.background,
      screen: legacy.background,
      elevated: id === 'light' ? '#FFFFFF' : legacy.surface,
      imageOverlay: id === 'current' ? 'rgba(5, 5, 16, 0.7)' : alpha(legacy.background, 0.94),
    },
    surface: {
      card: legacy.card,
      cardMuted: id === 'light' ? '#F8FAFC' : alpha(legacy.cardSelected, 0.82),
      raised: id === 'light' ? '#FFFFFF' : legacy.surfaceLight,
      selected: legacy.cardSelected,
      highlight: legacy.surfaceHighlight,
      subtle: id === 'light' ? '#EEF2F7' : alpha('#FFFFFF', isDark ? 0.045 : 0.08),
    },
    text: {
      primary: legacy.text,
      secondary: id === 'current' ? '#E8EAED' : (id === 'light' ? '#334155' : '#CBD5E1'),
      muted: legacy.textMuted,
      dim: legacy.textDim,
      inverse: id === 'light' ? '#FFFFFF' : '#111827',
      onBrand: id === 'light' ? '#FFFFFF' : '#001014',
    },
    border: {
      default: legacy.border,
      strong: id === 'light' ? '#CBD5E1' : alpha('#FFFFFF', isDark ? 0.13 : 0.18),
      focus: legacy.primary,
      subtle: id === 'light' ? '#EDF2F7' : alpha('#FFFFFF', 0.07),
    },
    brand: {
      primary: legacy.primary,
      secondary: legacy.secondary,
      worker: legacy.worker,
      accent: id === 'current' ? legacy.purple : legacy.secondary,
    },
    status: {
      success: legacy.success,
      warning: id === 'light' ? '#D97706' : '#FBBF24',
      error: legacy.error,
      info: legacy.primary,
    },
    input: {
      background: legacy.inputBackground,
      border: id === 'light' ? '#CBD5E1' : alpha('#FFFFFF', 0.11),
      focusedBorder: legacy.primary,
      placeholder: legacy.textDim,
      text: legacy.text,
    },
    button: {
      primaryBackground: legacy.cyanGradient,
      primaryText: id === 'light' ? '#FFFFFF' : '#001014',
      secondaryBackground: id === 'light' ? ['#F1F5F9', '#E2E8F0'] : [legacy.card, legacy.cardSelected],
      secondaryText: legacy.text,
      workerBackground: legacy.orangeGradient,
      outlineText: legacy.text,
      outlineBorder: legacy.border,
      disabledOpacity: 0.5,
    },
    tabBar: {
      background: id === 'light' ? alpha('#FFFFFF', 0.94) : alpha(legacy.surface, id === 'current' ? 0.72 : 0.94),
      border: id === 'light' ? '#E2E8F0' : alpha('#FFFFFF', 0.08),
      activeBackground: alpha(legacy.primary, id === 'current' ? 0.08 : 0.12),
      activeBorder: alpha(legacy.primary, id === 'current' ? 0.15 : 0.25),
      activeIcon: legacy.primary,
      inactiveIcon: legacy.textDim,
      shadow: legacy.primary,
    },
    modal: {
      backdrop: id === 'light' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0, 0, 0, 0.72)',
      card: id === 'light' ? '#FFFFFF' : alpha(legacy.card, 0.96),
      border: id === 'light' ? '#E2E8F0' : alpha('#FFFFFF', 0.15),
      closeBackground: id === 'light' ? '#F1F5F9' : alpha('#FFFFFF', 0.06),
    },
    toast: {
      background: id === 'light' ? '#FFFFFF' : alpha(legacy.card, 0.96),
      border: id === 'light' ? '#E2E8F0' : alpha('#FFFFFF', 0.12),
      title: legacy.text,
      message: id === 'light' ? '#475569' : '#D1D5DB',
    },
    skeleton: {
      base: id === 'light' ? '#E2E8F0' : alpha('#FFFFFF', 0.08),
      shimmer: id === 'light' ? '#F8FAFC' : alpha('#FFFFFF', 0.16),
    },
    overlay: {
      subtle: id === 'light' ? alpha('#FFFFFF', 0.6) : alpha('#FFFFFF', 0.045),
      medium: id === 'light' ? alpha('#0F172A', 0.08) : alpha('#FFFFFF', 0.08),
      strong: id === 'light' ? alpha('#0F172A', 0.18) : alpha('#000000', 0.5),
    },
    shadow: {
      color: id === 'light' ? '#0F172A' : '#000000',
      softOpacity: id === 'light' ? 0.08 : 0.2,
      cardOpacity: id === 'light' ? 0.12 : 0.5,
      glowOpacity: id === 'current' ? 0.6 : 0.18,
    },
    gradients: {
      primary: legacy.cyanGradient,
      worker: legacy.orangeGradient,
      secondary: legacy.purpleGradient,
      success: legacy.successGradient,
      page: legacy.cosmicGradient,
      card: id === 'light' ? ['#FFFFFF', '#F8FAFC'] : [legacy.card, legacy.surface],
      glow: legacy.glowingGradient,
    },
  },
  legacy,
});

export const themes: Record<ThemeId, AppTheme> = {
  current: buildTheme('current', 'Current Theme', currentLegacy, true, true),
  light: buildTheme('light', 'Light Theme', lightLegacy, false, false),
  dark: buildTheme('dark', 'Dark Theme', darkLegacy, true, false),
};

const isThemeId = (value: string | null): value is ThemeId => {
  return value === 'current' || value === 'light' || value === 'dark';
};

interface ThemeContextValue {
  themeId: ThemeId;
  theme: AppTheme;
  isHydrated: boolean;
  setThemeId: (themeId: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('current');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedThemeId) => {
        if (isMounted && isThemeId(storedThemeId)) {
          setThemeIdState(storedThemeId);
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
    setThemeIdState(nextThemeId);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextThemeId);
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      theme: themes[themeId],
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
      fontSize: 40,
      fontWeight: '900' as const,
      color: theme.colors.text.primary,
      letterSpacing: -1,
    },
    h2: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: theme.colors.text.primary,
      letterSpacing: -0.5,
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
    threeD: theme.id === 'current'
      ? {
          textShadowColor: 'rgba(0, 0, 0, 0.75)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        }
      : {
          textShadowColor: 'transparent',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 0,
        },
    threeDLight: theme.id === 'current'
      ? {
          textShadowColor: 'rgba(255, 255, 255, 0.3)',
          textShadowOffset: { width: 0, height: -1 },
          textShadowRadius: 1,
        }
      : {
          textShadowColor: 'transparent',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 0,
        },
  };
}

export function createShadows(theme: AppTheme) {
  return {
    glow: {
      shadowColor: theme.colors.brand.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: theme.colors.shadow.glowOpacity,
      shadowRadius: theme.id === 'current' ? 20 : 12,
      elevation: theme.id === 'current' ? 15 : 4,
    },
    neonPurple: {
      shadowColor: theme.colors.brand.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: theme.id === 'current' ? 0.8 : 0.18,
      shadowRadius: theme.id === 'current' ? 15 : 10,
      elevation: theme.id === 'current' ? 12 : 4,
    },
    card: {
      shadowColor: theme.colors.shadow.color,
      shadowOffset: { width: 0, height: theme.id === 'light' ? 8 : 10 },
      shadowOpacity: theme.colors.shadow.cardOpacity,
      shadowRadius: theme.id === 'light' ? 18 : 30,
      elevation: theme.id === 'light' ? 5 : 8,
    },
    depth: {
      shadowColor: theme.colors.shadow.color,
      shadowOffset: { width: 0, height: theme.id === 'light' ? 10 : 15 },
      shadowOpacity: theme.id === 'light' ? 0.14 : 0.6,
      shadowRadius: theme.id === 'light' ? 18 : 25,
      elevation: theme.id === 'light' ? 8 : 20,
    },
    bevel: {
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderTopColor: theme.id === 'light' ? alpha('#FFFFFF', 0.9) : alpha('#FFFFFF', 0.2),
      borderLeftColor: theme.id === 'light' ? alpha('#FFFFFF', 0.8) : alpha('#FFFFFF', 0.1),
      borderBottomWidth: 1,
      borderRightWidth: 1,
      borderBottomColor: theme.id === 'light' ? alpha('#0F172A', 0.08) : alpha('#000000', 0.4),
      borderRightColor: theme.id === 'light' ? alpha('#0F172A', 0.06) : alpha('#000000', 0.3),
    },
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

// Backward-compatible static exports. New or migrated components should prefer
// useTheme(), useThemeColors(), useThemeTypography(), and useThemeShadows().
export const Colors = themes.current.legacy;
export const Typography = createTypography(themes.current);
export const Shadows = createShadows(themes.current);
