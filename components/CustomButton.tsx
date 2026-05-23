import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing, Typography, Animation } from '../constants/Theme';

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

  const getGradientColors = () => {
    switch (variant) {
      case 'primary': return Colors.cyanGradient;
      case 'worker': return Colors.orangeGradient;
      case 'secondary': return [Colors.card, Colors.cardSelected];
      case 'outline': return ['transparent', 'transparent'];
      default: return Colors.cyanGradient;
    }
  };

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
        variant === 'outline' && styles.outlineContainer,
        disabled && styles.disabled,
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
          <ActivityIndicator color={variant === 'secondary' ? Colors.text : Colors.background} />
        ) : (
          <React.Fragment>
            {icon}
            <Text style={[
              styles.text, 
              variant === 'secondary' && styles.secondaryText, 
              variant === 'outline' && styles.outlineText,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  outlineContainer: {
    borderWidth: 2,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.m,
  },
  text: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  secondaryText: {
    color: Colors.text,
  },
  outlineText: {
    color: Colors.text,
  },
  disabled: {
    opacity: 0.5,
  },
});
