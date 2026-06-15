import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../../constants/Theme';

interface AuthHeaderProps {
  title: string;
  onBack: () => void;
  accentColor?: string;
}

export function AuthHeader({ title, onBack, accentColor }: AuthHeaderProps) {
  const theme = useTheme();
  const colors = useThemeColors();
  const resolvedAccentColor = accentColor ?? colors.cyan;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityLabel="Go back"
        activeOpacity={0.75}
        onPress={onBack}
        style={[styles.backButton, {
          backgroundColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.05 : 0.07),
          borderColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.1 : 0.14),
        }]}
      >
        <ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={[styles.titleWrap, {
        backgroundColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.04 : 0.04),
        borderColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.1 : 0.08),
      }]}>
        <View style={[styles.statusDot, { backgroundColor: resolvedAccentColor, shadowColor: resolvedAccentColor }]} />
        <Text style={[styles.title, { color: theme.colors.text.muted }]}>{title}</Text>
      </View>

      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.m,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
    marginRight: 8,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  placeholder: {
    width: 44,
  },
});
