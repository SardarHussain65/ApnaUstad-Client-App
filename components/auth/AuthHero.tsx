import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BorderRadius, Spacing, Typography, alpha, useTheme, useThemeTypography } from '../../constants/Theme';

interface AuthHeroProps {
  accentColor?: string;
  align?: 'left' | 'center';
  compact?: boolean;
  description: string;
  eyebrow?: string;
  highlight: string;
  icon?: React.ReactNode;
  title: string;
}

export function AuthHero({
  accentColor,
  align = 'left',
  compact = false,
  description,
  eyebrow,
  highlight,
  icon,
  title,
}: AuthHeroProps) {
  const theme = useTheme();
  const typography = useThemeTypography();
  const colors = theme.legacy;
  const resolvedAccentColor = accentColor ?? colors.cyan;
  const centered = align === 'center';

  return (
    <Animated.View
      entering={FadeInDown.duration(450)}
      style={[styles.container, compact && styles.containerCompact, centered && styles.centered]}
    >
      {icon && (
        <Animated.View
          entering={FadeInUp.delay(80).springify()}
          style={[
            styles.iconWrap,
            compact && styles.iconWrapCompact,
            {
              backgroundColor: alpha(resolvedAccentColor, theme.id === 'light' ? 0.08 : 0.18),
              borderColor: alpha(resolvedAccentColor, theme.id === 'light' ? 0.3 : 0.45),
              shadowColor: resolvedAccentColor,
            },
          ]}
        >
          {icon}
        </Animated.View>
      )}

      {eyebrow && (
        <View style={[styles.eyebrow, compact && styles.eyebrowCompact, { borderColor: alpha(resolvedAccentColor, theme.id === 'light' ? 0.3 : 0.45) }]}>
          <View style={[styles.eyebrowDot, { backgroundColor: resolvedAccentColor }]} />
          <Text style={[styles.eyebrowText, compact && styles.eyebrowTextCompact, { color: resolvedAccentColor }]}>{eyebrow}</Text>
        </View>
      )}

      <Text style={[styles.title, compact ? styles.titleCompact : typography.threeD, centered && styles.centeredText, { color: theme.colors.text.primary }]}>
        {title}{compact ? ' ' : '\n'}
        <Text style={{ color: resolvedAccentColor }}>{highlight}</Text>
      </Text>
      <Text style={[styles.description, compact && styles.descriptionCompact, centered && styles.centeredText, { color: theme.colors.text.secondary }]}>{description}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.l,
    marginBottom: Spacing.xl,
  },
  containerCompact: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.s,
  },
  centered: {
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.m,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  iconWrapCompact: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 14,
  },
  eyebrowCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    marginRight: 7,
  },
  eyebrowText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  eyebrowTextCompact: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 39,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 43,
  },
  titleCompact: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 11,
    maxWidth: 330,
  },
  descriptionCompact: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 340,
  },
});
