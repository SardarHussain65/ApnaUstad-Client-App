import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, useTheme } from '../../constants/Theme';
import { addAlpha } from '../../utils/colorUtils';

// ─── Design Tokens Placeholder (or reuse parent) ──────────────────────────────
export const P = {
  bg: '#060810',
  surface: '#0C0F1A',
  surfaceRaised: '#111527',
  surfaceHigh: '#161B30',
  border: 'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.10)',
  cyan: '#00F5FF',
  cyanDim: '#00B8C0',
  cyanMuted: 'rgba(0,245,255,0.10)',
  cyanGlow: 'rgba(0,245,255,0.20)',
  orange: '#FF6B00',
  orangeDim: '#CC5500',
  orangeMuted: 'rgba(255,107,0,0.10)',
  white: '#FFFFFF',
  textPrimary: '#E8EAED',
  textSecondary: '#8892A4',
  textMuted: '#3D4455',
  success: '#00E676',
  error: '#FF3B30',
  purple: '#7B61FF',
  purpleMuted: 'rgba(123,97,255,0.12)',
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
    border: theme.colors.border.subtle,
    borderMedium: theme.colors.border.default,
    cyan: theme.colors.brand.primary,
    cyanDim: theme.colors.text.secondary,
    cyanMuted: alpha(theme.colors.brand.primary, 0.1),
    cyanGlow: alpha(theme.colors.brand.primary, 0.18),
    orange: theme.colors.brand.worker,
    orangeDim: theme.id === 'light' ? '#C2410C' : '#FDBA74',
    orangeMuted: alpha(theme.colors.brand.worker, 0.1),
    white: theme.colors.text.primary,
    textPrimary: theme.colors.text.primary,
    textSecondary: theme.colors.text.secondary,
    textMuted: theme.colors.text.muted,
    success: theme.colors.status.success,
    error: theme.colors.status.error,
    purple: theme.colors.brand.secondary,
    purpleMuted: alpha(theme.colors.brand.secondary, 0.12),
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
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  line: { flex: 1, height: 1 },
  badge: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
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
      glowColor ? { borderColor: addAlpha(glowColor, '30'), shadowColor: glowColor, shadowOpacity: theme.id === 'current' ? 0.15 : 0.08, shadowRadius: 12 } : {},
      style,
    ]}>
      {children}
    </View>
  );
};

const glassStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
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
