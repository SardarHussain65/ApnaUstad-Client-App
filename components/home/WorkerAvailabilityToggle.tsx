import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { GlassCard } from './GlassCard';
import { alpha, useTheme, useThemeColors, useThemeTypography, Spacing } from '../../constants/Theme';
import { useTranslation } from 'react-i18next';

interface WorkerAvailabilityToggleProps {
  isOnline: boolean;
  onToggle: (val: boolean) => void;
  isLoading?: boolean;
}

export const WorkerAvailabilityToggle = React.memo(({
  isOnline,
  onToggle,
  isLoading = false
}: WorkerAvailabilityToggleProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (isOnline) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000 }),
          withTiming(1.0, { duration: 1000 })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0.3;
    }
  }, [isOnline]);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseOpacity.value,
      transform: [{ scale: pulseScale.value }],
    };
  });

  const glowColor = isOnline ? colors.success : colors.error;

  return (
    <GlassCard
      hasGlow
      intensity={32}
      glowColor={glowColor}
      style={styles.card}
      contentStyle={styles.cardContent}
    >
      <View style={styles.leftSection}>
        <View style={styles.titleRow}>
          <View style={styles.indicatorContainer}>
            <View style={[styles.staticDot, { backgroundColor: isOnline ? colors.success : colors.error }]} />
            {isOnline && (
              <Animated.View style={[styles.pulseCircle, { backgroundColor: colors.success }, pulseStyle]} />
            )}
          </View>
          <Text style={[styles.statusTitle, typography.threeD, { color: theme.colors.text.primary }]}>
            {isOnline
              ? t('home.worker.online', 'ONLINE / ACTIVE').toUpperCase()
              : t('home.worker.offline', 'OFFLINE / INACTIVE').toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.statusSub, { color: theme.colors.text.muted }]}>
          {isOnline
            ? t('home.worker.availableSubtitle', 'Available for Jobs • کام کے لیے دستیاب')
            : t('home.worker.offlineSubtitle', 'Not receiving new bookings • نئے آرڈر بند ہیں')}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {isLoading ? (
          <ActivityIndicator size="small" color={isOnline ? colors.success : theme.colors.text.primary} />
        ) : (
          <Switch
            value={isOnline}
            onValueChange={onToggle}
            trackColor={{ false: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.15 : 0.08), true: alpha(colors.success, 0.4) }}
            thumbColor={isOnline ? colors.success : theme.colors.text.primary}
            style={styles.switch}
          />
        )}
      </View>
    </GlassCard>
  );
});

WorkerAvailabilityToggle.displayName = 'WorkerAvailabilityToggle';

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    marginBottom: Spacing.m,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  leftSection: {
    flex: 1,
    paddingRight: Spacing.m,
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indicatorContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  staticDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  pulseCircle: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  switch: {
    transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  }
});
