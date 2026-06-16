import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
} from 'react-native-reanimated';
import { alpha, BorderRadius, Spacing, useTheme, useThemeShadows } from '../../constants/Theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
  glowColor?: string;
  hasGlow?: boolean;
  gradient?: [string, string, ...string[]];
  padding?: number; // Added padding prop
  contentStyle?: StyleProp<ViewStyle>; // Added contentStyle prop
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({ 
  children, 
  style, 
  onPress, 
  intensity = 40,
  glowColor,
  hasGlow = false,
  gradient,
  padding = Spacing.l, // Default to standard padding
  contentStyle
}: GlassCardProps) {
  const theme = useTheme();
  const shadows = useThemeShadows();
  const resolvedGlowColor = glowColor ?? theme.colors.brand.primary;
  const cardBackground = theme.id === 'current'
    ? alpha('#FFFFFF', 0.03)
    : theme.colors.surface.card;
  const cardBorder = theme.id === 'current'
    ? alpha('#FFFFFF', 0.12)
    : theme.colors.border.default;
  const fallbackBackground = theme.id === 'current'
    ? alpha(theme.legacy.surface, 0.6)
    : theme.colors.surface.card;
  const gradientOpacity = theme.id === 'current' ? 0.35 : (theme.id === 'light' ? 0.20 : 0.16);
  const androidGradientOpacity = theme.id === 'current' ? 0.4 : (theme.id === 'light' ? 0.22 : 0.18);
  const highlightColor = theme.id === 'current'
    ? alpha('#FFFFFF', 0.2)
    : alpha(theme.colors.text.primary, 0.06);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const CardContent = (
    <Animated.View 
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: cardBorder,
        },
        shadows.card,
        theme.id === 'current' && shadows.bevel,
        hasGlow && { 
          borderColor: alpha(resolvedGlowColor, theme.id === 'current' ? 0.38 : 0.22),
          shadowColor: resolvedGlowColor.length === 9 ? resolvedGlowColor.substring(0, 7) : resolvedGlowColor,
          shadowOpacity: theme.id === 'current' ? 0.4 : 0.14,
          shadowRadius: theme.id === 'current' ? 20 : 10,
          elevation: theme.id === 'current' ? 15 : 5
        },
        style,
        animatedStyle
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={theme.id === 'current' ? intensity : Math.min(intensity, 20)} tint={theme.blurTint} style={StyleSheet.absoluteFill}>
          {gradient && (
            <LinearGradient
              colors={gradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { opacity: gradientOpacity }]}
            />
          )}
          <View style={[styles.highlight, { backgroundColor: highlightColor }]} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackBackground }]}>
           {gradient && (
            <LinearGradient
              colors={gradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { opacity: androidGradientOpacity }]}
            />
          )}
          <View style={[styles.highlight, { backgroundColor: highlightColor }]} />
        </View>
      )}
      <View style={[styles.content, { padding: padding }, contentStyle]}>
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {CardContent}
      </AnimatedPressable>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    zIndex: 1,
    flexShrink: 1, // Ensure it doesn't push out
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  }
});
