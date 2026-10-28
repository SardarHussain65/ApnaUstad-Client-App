import React from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../../constants/Theme';

interface AuthProgressProps {
  accentColor?: string;
  currentStep: number;
  labels?: string[];
}

export function AuthProgress({
  accentColor,
  currentStep,
  labels,
}: AuthProgressProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const resolvedAccentColor = accentColor ?? colors.cyan;
  const trackColor = theme.id === 'light' ? alpha('#0F172A', 0.1) : alpha('#FFFFFF', 0.1);

  const defaultLabels = [
    t('auth.stepAccount', 'Account'),
    t('auth.stepVerify', 'Verify'),
    t('auth.stepProfile', 'Profile'),
  ];
  const stepLabels = labels || defaultLabels;

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {stepLabels.map((label, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          const highlighted = isActive || isComplete;

          return (
            <View key={`${step}-${label}`} style={styles.step}>
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
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: theme.colors.text.muted },
                  highlighted && { color: resolvedAccentColor },
                ]}
              >
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
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
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
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
