import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle, StyleProp, ActivityIndicator } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Spacing, Typography, Animation } from '../constants/Theme';

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
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getGradientColors = () => {
    switch (variant) {
      case 'cyan': return Colors.cyanGradient;
      case 'orange': return Colors.orangeGradient;
      case 'success': return (Colors as any).successGradient;
      default: return ['transparent', 'transparent'];
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
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
      disabled={disabled}
      activeOpacity={1}
      style={[
        styles.container,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
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
          <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Colors.cyan : '#000'} />
        ) : (
          <>
            {icon}
            <Text style={[
              styles.text,
              (variant === 'outline' || variant === 'ghost') && styles.textAlt,
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
    borderRadius: BorderRadius.m,
    overflow: 'hidden',
    shadowColor: Colors.cyan,
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
    paddingHorizontal: Spacing.m,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ghost: {
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  text: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  textAlt: {
    color: Colors.text,
  },
  disabled: {
    opacity: 0.4,
  }
});
