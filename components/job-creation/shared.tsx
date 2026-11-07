import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, useTheme } from '../../constants/Theme';
import { addAlpha } from '../../utils/colorUtils';

// ─── Design Tokens Placeholder (or reuse parent) ──────────────────────────────
export const P = {
  bg: '#060810',
  surface: '#0E1322',
  surfaceRaised: '#141A30',
  surfaceHigh: '#1C233F',
  border: 'rgba(255,255,255,0.18)',
  borderMedium: 'rgba(255,255,255,0.28)',
  cyan: '#00F5FF',
  cyanDim: '#38BDF8',
  cyanMuted: 'rgba(0,245,255,0.14)',
  cyanGlow: 'rgba(0,245,255,0.24)',
  orange: '#FF6B00',
  orangeDim: '#FB923C',
  orangeMuted: 'rgba(255,107,0,0.14)',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  success: '#00E676',
  error: '#FF3B30',
  purple: '#7B61FF',
  purpleMuted: 'rgba(123,97,255,0.14)',
} as const;

export type JobCreationPalette = { [Key in keyof typeof P]: string };

export function useJobCreationPalette(): JobCreationPalette {
  const theme = useTheme();

  if (theme.id === 'current') return P;

  return {
    bg: theme.colors.background.screen,
    surface: theme.colors.surface.card,
    surfaceRaised: theme.colors.surface.raised,
    surfaceHigh: theme.colors.surface.selected,
    border: theme.colors.border.default,
    borderMedium: theme.colors.border.strong,
    cyan: theme.colors.brand.primary,
    cyanDim: theme.id === 'light' ? theme.colors.text.secondary : '#38BDF8',
    cyanMuted: alpha(theme.colors.brand.primary, 0.14),
    cyanGlow: alpha(theme.colors.brand.primary, 0.24),
    orange: theme.colors.brand.worker,
    orangeDim: theme.id === 'light' ? '#C2410C' : '#FDBA74',
    orangeMuted: alpha(theme.colors.brand.worker, 0.14),
    white: theme.colors.text.primary,
    textPrimary: theme.id === 'light' ? theme.colors.text.primary : '#FFFFFF',
    textSecondary: theme.id === 'light' ? theme.colors.text.secondary : '#CBD5E1',
    textMuted: theme.id === 'light' ? theme.colors.text.muted : '#94A3B8',
    success: theme.colors.status.success,
    error: theme.colors.status.error,
    purple: theme.colors.brand.secondary,
    purpleMuted: alpha(theme.colors.brand.secondary, 0.14),
  };
}

// ─── SectionLabel ──────────────────────────────────────────────────────────────
interface SectionLabelProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  color?: string;
  badge?: string;
}

export const SectionLabel = ({ icon: Icon, label, color, badge }: SectionLabelProps) => {
  const palette = useJobCreationPalette();
  const resolvedColor = color ?? palette.cyan;

  return (
    <View style={sectionStyles.row}>
      <View style={[sectionStyles.iconWrap, { backgroundColor: addAlpha(resolvedColor, '18') }]}>
        <Icon size={11} color={resolvedColor} strokeWidth={2.5} />
      </View>
      <Text style={[sectionStyles.label, { color: resolvedColor }]}>{label}</Text>
      <View style={[sectionStyles.line, { backgroundColor: addAlpha(resolvedColor, '22') }]} />
      {!!badge && <Text style={[sectionStyles.badge, { color: resolvedColor }]}>{badge}</Text>}
    </View>
  );
};

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  iconWrap: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.5 },
  line: { flex: 1, height: 1.2 },
  badge: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
});

// ─── GlassInput ────────────────────────────────────────────────────────────────
interface GlassInputProps {
  children: React.ReactNode;
  style?: object;
  glowColor?: string;
}

export const GlassInput = ({ children, style, glowColor }: GlassInputProps) => {
  const palette = useJobCreationPalette();
  const theme = useTheme();

  return (
    <View style={[
      glassStyles.card,
      {
        backgroundColor: palette.surfaceRaised,
        borderColor: palette.border,
      },
      glowColor ? { borderColor: addAlpha(glowColor, '65'), shadowColor: glowColor, shadowOpacity: theme.id === 'current' ? 0.15 : 0.08, shadowRadius: 12 } : {},
      style,
    ]}>
      {children}
    </View>
  );
};

const glassStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.8,
    overflow: 'hidden',
  },
});

// ─── Stat Badge ────────────────────────────────────────────────────────────────
interface StatBadgeProps {
  label: string;
  value: string;
  color: string;
}

export const StatBadge = ({ label, value, color }: StatBadgeProps) => {
  const palette = useJobCreationPalette();

  return (
    <View style={badgeStyles.wrap}>
      <Text style={[badgeStyles.value, { color }]}>{value}</Text>
      <Text style={[badgeStyles.label, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  wrap: {
    flex: 1, paddingVertical: 7, alignItems: 'center', gap: 2,
  },
  value: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
