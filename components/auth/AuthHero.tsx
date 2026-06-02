import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Theme';

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
  accentColor = Colors.cyan,
  align = 'left',
  description,
  eyebrow,
  highlight,
  icon,
  title,
}: AuthHeroProps) {
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
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}45`,
              shadowColor: accentColor,
            },
          ]}
        >
          {icon}
        </Animated.View>
      )}

      {eyebrow && (
        <View style={[styles.eyebrow, { borderColor: `${accentColor}45` }]}>
          <View style={[styles.eyebrowDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.eyebrowText, { color: accentColor }]}>{eyebrow}</Text>
        </View>
      )}

      <Text style={[styles.title, Typography.threeD, centered && styles.centeredText]}>
        {title}{'\n'}
        <Text style={{ color: accentColor }}>{highlight}</Text>
      </Text>
      <Text style={[styles.description, centered && styles.centeredText]}>{description}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    color: '#fff',
    fontSize: 39,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 43,
  },
  description: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 11,
    maxWidth: 330,
  },
});
