import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle, StyleProp, ActivityIndicator } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Animation, BorderRadius, Spacing, useTheme, useThemeTypography } from '../constants/Theme';

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'cyan' | 'orange' | 'outline' | 'ghost' | 'success';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'cyan',
  style,
  textStyle,
  icon,
  disabled = false,
  isLoading = false
}) => {
  const theme = useTheme();
  const typography = useThemeTypography();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getGradientColors = () => {
    switch (variant) {
      case 'cyan': return theme.colors.gradients.primary;
      case 'orange': return theme.colors.gradients.worker;
      case 'success': return theme.colors.gradients.success;
      default: return ['transparent', 'transparent'];
    }
  };

  const variantColor = variant === 'orange'
    ? theme.colors.brand.worker
    : variant === 'success'
      ? theme.colors.status.success
      : theme.colors.brand.primary;
  const isAlt = variant === 'outline' || variant === 'ghost';
  const textColor = isAlt ? theme.colors.text.primary : theme.colors.button.primaryText;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled || isLoading) return;
    scale.value = withSpring(0.96, Animation.spring);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Animation.spring);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={1}
      style={[
        styles.container,
        {
          shadowColor: variantColor,
          opacity: disabled ? 0.4 : 1,
        },
        variant === 'outline' && {
          borderWidth: 1,
          borderColor: theme.colors.border.default,
          shadowOpacity: 0,
          elevation: 0,
        },
        variant === 'ghost' && {
          shadowOpacity: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        style,
        animatedStyle
      ]}
    >
      <LinearGradient
        colors={getGradientColors() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {isLoading ? (
          <ActivityIndicator color={isAlt ? theme.colors.brand.primary : textColor} />
        ) : (
          <>
            {icon}
            <Text style={[
              typography.body,
              styles.text,
              { color: textColor },
              textStyle
            ]}>
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    borderRadius: BorderRadius.l,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
  },
  text: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
