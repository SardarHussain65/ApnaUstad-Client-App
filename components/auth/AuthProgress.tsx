import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/Theme';

interface AuthProgressProps {
  accentColor?: string;
  currentStep: number;
  labels?: string[];
}

const DEFAULT_LABELS = ['Account', 'Verify', 'Profile'];

export function AuthProgress({
  accentColor = Colors.cyan,
  currentStep,
  labels = DEFAULT_LABELS,
}: AuthProgressProps) {
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
                    backgroundColor: accentColor,
                    opacity: isActive ? 1 : 0.55,
                  },
                ]}
              />
              <Text style={[styles.label, highlighted && { color: accentColor }]}>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
