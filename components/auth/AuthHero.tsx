import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BorderRadius, Spacing, Typography, alpha, useTheme, useThemeTypography } from '../../constants/Theme';

interface AuthHeroProps {
  accentColor?: string;
  align?: 'left' | 'center';
  description: string;
  eyebrow?: string;
  highlight: string;
  icon?: React.ReactNode;
  title: string;
}

export function AuthHero({
  accentColor,
  align = 'left',
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
      style={[styles.container, centered && styles.centered]}
    >
      {icon && (
        <Animated.View
          entering={FadeInUp.delay(80).springify()}
          style={[
            styles.iconWrap,
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
        <View style={[styles.eyebrow, { borderColor: alpha(resolvedAccentColor, theme.id === 'light' ? 0.3 : 0.45) }]}>
          <View style={[styles.eyebrowDot, { backgroundColor: resolvedAccentColor }]} />
          <Text style={[styles.eyebrowText, { color: resolvedAccentColor }]}>{eyebrow}</Text>
        </View>
      )}

      <Text style={[styles.title, typography.threeD, centered && styles.centeredText, { color: theme.colors.text.primary }]}>
        {title}{'\n'}
        <Text style={{ color: resolvedAccentColor }}>{highlight}</Text>
      </Text>
      <Text style={[styles.description, centered && styles.centeredText, { color: theme.colors.text.secondary }]}>{description}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.l,
    marginBottom: Spacing.xl,
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
  title: {
    fontSize: 39,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 43,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 11,
    maxWidth: 330,
  },
});
