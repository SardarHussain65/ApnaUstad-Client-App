import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/Theme';

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
  accentColor = Colors.cyan,
  onFocus, 
  onBlur, 
  ...props 
}) => {
  const [focused, setFocused] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? Colors.error : (focused ? accentColor : 'rgba(255,255,255,0.11)')),
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
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputWrapper, animatedStyle]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textDim}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={accentColor}
          {...props}
        />
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </Animated.View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.m,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.s,
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
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
    color: Colors.text,
    fontWeight: '600',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 6,
    fontSize: 12,
  },
});
