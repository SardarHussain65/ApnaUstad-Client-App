import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { alpha, BorderRadius, Spacing, useTheme } from '../../constants/Theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
  glowColor?: string;
  borderColor?: string;
  hasGlow?: boolean;
  gradient?: [string, string, ...string[]];
  padding?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  style,
  onPress,
  intensity = 25,
  glowColor,
  borderColor,
  hasGlow = false,
  gradient,
  padding = Spacing.l,
  contentStyle,
}: GlassCardProps) {
  const theme = useTheme();
  const isCosmic = theme.id === 'current';
  const resolvedGlowColor = glowColor ?? theme.colors.brand.primary;
  const cardBackground = theme.colors.surface.card;
  const cardBorder = borderColor ?? (hasGlow ? alpha(resolvedGlowColor, 0.55) : theme.colors.border.default);
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
        style,
        animatedStyle,
      ]}
    >
      {isCosmic && Platform.OS === 'ios' && intensity > 0 && (
        <BlurView intensity={intensity} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
      )}
      {gradient && (
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { opacity: isCosmic ? 0.32 : theme.isDark ? 0.16 : 0.14 },
          ]}
        />
      )}
      <View style={[styles.content, { padding }, contentStyle]}>
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
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.6,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    flexShrink: 1,
  },
});
