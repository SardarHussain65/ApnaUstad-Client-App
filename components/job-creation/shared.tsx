import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

// ─── SectionLabel ──────────────────────────────────────────────────────────────
interface SectionLabelProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  color?: string;
  badge?: string;
}

export const SectionLabel = ({ icon: Icon, label, color = P.cyan, badge }: SectionLabelProps) => (
  <View style={sectionStyles.row}>
    <View style={[sectionStyles.iconWrap, { backgroundColor: addAlpha(color, '18') }]}>
      <Icon size={11} color={color} strokeWidth={2.5} />
    </View>
    <Text style={[sectionStyles.label, { color }]}>{label}</Text>
    <View style={[sectionStyles.line, { backgroundColor: addAlpha(color, '22') }]} />
    {!!badge && <Text style={[sectionStyles.badge, { color }]}>{badge}</Text>}
  </View>
);

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

export const GlassInput = ({ children, style, glowColor }: GlassInputProps) => (
  <View style={[
    glassStyles.card,
    glowColor ? { borderColor: addAlpha(glowColor, '30'), shadowColor: glowColor, shadowOpacity: 0.15, shadowRadius: 12 } : {},
    style,
  ]}>
    {children}
  </View>
);

const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: P.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
});

// ─── Stat Badge ────────────────────────────────────────────────────────────────
interface StatBadgeProps {
  label: string;
  value: string;
  color: string;
}

export const StatBadge = ({ label, value, color }: StatBadgeProps) => (
  <View style={badgeStyles.wrap}>
    <Text style={[badgeStyles.value, { color }]}>{value}</Text>
    <Text style={badgeStyles.label}>{label}</Text>
  </View>
);

const badgeStyles = StyleSheet.create({
  wrap: {
    flex: 1, paddingVertical: 7, alignItems: 'center', gap: 2,
  },
  value: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 9, color: P.textMuted, fontWeight: '700', letterSpacing: 1 },
});
