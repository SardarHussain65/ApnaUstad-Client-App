import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { BorderRadius, Spacing, useTheme, useThemeShadows, useThemeTypography } from '../constants/Theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'worker' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const CustomButton: React.FC<CustomButtonProps> = ({ 
  title, 
  onPress, 
  loading, 
  disabled, 
  variant = 'primary', 
  style, 
  textStyle,
  icon 
}) => {
  const theme = useTheme();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();

  const getGradientColors = () => {
    switch (variant) {
      case 'primary': return theme.colors.button.primaryBackground;
      case 'worker': return theme.colors.button.workerBackground;
      case 'secondary': return theme.colors.button.secondaryBackground;
      case 'outline': return ['transparent', 'transparent'];
      default: return theme.colors.button.primaryBackground;
    }
  };

  const textColor = variant === 'primary' || variant === 'worker'
    ? theme.colors.button.primaryText
    : theme.colors.button.outlineText;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 }]
  }));

  const handlePressIn = () => {
    // Basic interaction feedback
  };

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={handlePressIn}
      style={[
        styles.container, 
        {
          shadowColor: theme.colors.brand.primary,
          opacity: disabled ? theme.colors.button.disabledOpacity : 1,
        },
        variant !== 'outline' && shadows.glow,
        variant === 'outline' && {
          borderWidth: 2,
          borderColor: theme.colors.button.outlineBorder,
          shadowOpacity: 0,
          elevation: 0,
        },
        style,
        animatedStyle
      ]}
    >
      <LinearGradient
        colors={getGradientColors() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' ? theme.colors.text.primary : textColor} />
        ) : (
          <React.Fragment>
            {icon}
            <Text style={[
              typography.body,
              styles.text,
              { color: textColor },
              textStyle
            ]}>
              {title}
            </Text>
          </React.Fragment>
        )}
      </LinearGradient>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 64,
    borderRadius: BorderRadius.m,
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
    paddingHorizontal: Spacing.m,
  },
  text: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
