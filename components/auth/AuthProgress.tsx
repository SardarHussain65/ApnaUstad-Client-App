import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../../constants/Theme';

interface AuthProgressProps {
  accentColor?: string;
  currentStep: number;
  labels?: string[];
}

const DEFAULT_LABELS = ['Account', 'Verify', 'Profile'];

export function AuthProgress({
  accentColor,
  currentStep,
  labels = DEFAULT_LABELS,
}: AuthProgressProps) {
  const theme = useTheme();
  const colors = useThemeColors();
  const resolvedAccentColor = accentColor ?? colors.cyan;
  const trackColor = theme.id === 'light' ? alpha('#0F172A', 0.1) : alpha('#FFFFFF', 0.1);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {labels.map((label, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          const highlighted = isActive || isComplete;

          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.bar,
                  highlighted && {
                    backgroundColor: resolvedAccentColor,
                    opacity: isActive ? 1 : 0.55,
                  },
                  !highlighted && { backgroundColor: trackColor },
                ]}
              />
              <Text style={[styles.label, { color: theme.colors.text.muted }, highlighted && { color: resolvedAccentColor }]}>
                0{step} {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.s,
    marginBottom: Spacing.s,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: Spacing.s,
  },
  step: {
    flex: 1,
  },
  bar: {
    height: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
