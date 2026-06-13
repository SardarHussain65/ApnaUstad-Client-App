import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Spacing, BorderRadius, useTheme, useThemeColors, useThemeTypography } from '../constants/Theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  accentColor?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  error, 
  icon, 
  rightIcon,
  containerStyle, 
  accentColor,
  onFocus, 
  onBlur, 
  ...props 
}) => {
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const [focused, setFocused] = useState(false);
  const resolvedAccentColor = accentColor ?? theme.colors.brand.primary;

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? colors.error : (focused ? resolvedAccentColor : theme.colors.input.border)),
    borderWidth: withTiming(focused || error ? 1.5 : 1),
  }));

  const handleFocus = (e: any) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[typography.caption, styles.label, { color: theme.colors.text.muted }]}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.input.background,
          },
          theme.id !== 'current' && {
            shadowColor: theme.colors.shadow.color,
            shadowOpacity: theme.colors.shadow.softOpacity,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          },
          animatedStyle,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, { color: theme.colors.input.text }]}
          placeholderTextColor={theme.colors.input.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={resolvedAccentColor}
          {...props}
        />
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </Animated.View>
      {error && <Text style={[typography.caption, styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.m,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.s,
    fontSize: 11,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.l,
    paddingHorizontal: Spacing.m,
    height: 60,
  },
  iconContainer: {
    marginRight: Spacing.s,
    opacity: 0.8,
  },
  rightIconContainer: {
    marginLeft: Spacing.s,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
  },
});
