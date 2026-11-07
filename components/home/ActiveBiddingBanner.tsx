import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Shield, Radio, ChevronRight, Calendar, Zap } from 'lucide-react-native';
import { alpha, Spacing, useTheme, useThemeColors, useThemeShadows } from '../../constants/Theme';
import { JobPost } from '../../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface ActiveBiddingBannerProps {
  job: JobPost;
  activeCount?: number;
  onPress: (jobId: string) => void;
}

export function ActiveBiddingBanner({ job, activeCount = 1, onPress }: ActiveBiddingBannerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();
  const isInstant = job.urgency === 'instant';
  const proposalCount = job.pendingBidCount ?? job.bidCount ?? 0;
  const statusText = proposalCount > 0
    ? t('activeBiddingBanner.offersReady', { count: proposalCount })
    : isInstant
      ? t('activeBiddingBanner.liveSearch')
      : t('activeBiddingBanner.scheduledSearch');

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.5, { duration: 1500 }), -1, true);
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 1 - (pulse.value - 1) * 2,
  }));

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(15)}
      exiting={FadeOutDown.springify().damping(15)}
      style={[styles.container, { bottom: insets.bottom + 90 }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(job._id)}
        style={styles.touchable}
      >
        <BlurView intensity={60} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
        
        <LinearGradient
          colors={[alpha(colors.cyan, theme.isDark ? 0.18 : 0.12), alpha(theme.colors.surface.card, 0.94)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.borderGlow, { borderColor: alpha(colors.cyan, theme.isDark ? 0.55 : 0.7) }]} />

        <View style={styles.content}>
          <View style={[styles.radarBox, {
            backgroundColor: alpha(colors.cyan, 0.12),
            borderColor: alpha(colors.cyan, 0.4),
          }]}>
            <Animated.View style={[styles.pulseRing, { borderColor: colors.cyan }, ringStyle]} />
            <Shield color={colors.cyan} size={19} strokeWidth={2.5} />
          </View>

          <View style={styles.textStack}>
            <View style={styles.statusRow}>
              <Radio size={13} color={colors.cyan} />
              <Text style={[styles.statusText, { color: colors.cyan }]}>{statusText}</Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {t('activeBiddingBanner.findingNearby', { category: job.category || t('jobDetails.defaultTitle') })}
            </Text>
            <View style={styles.metaRow}>
              {isInstant ? <Zap size={12} color={colors.pink} /> : <Calendar size={12} color={colors.orange} />}
              <Text style={[styles.metaText, { color: isInstant ? colors.pink : colors.orange }]}>
                {isInstant ? t('activeBiddingBanner.instantRequest') : t('activeBiddingBanner.scheduledRequest')}
              </Text>
              {activeCount > 1 && <Text style={[styles.countText, { color: theme.colors.text.secondary }]}>{t('activeBiddingBanner.activeSearches', { count: activeCount })}</Text>}
            </View>
          </View>

          <View style={[styles.actionBtn, { backgroundColor: colors.cyan }]}>
            <Text style={[styles.actionText, { color: theme.colors.button.primaryText }]}>{proposalCount > 0 ? t('activeBiddingBanner.review') : t('activeBiddingBanner.resume')}</Text>
            <ChevronRight size={15} color={theme.colors.button.primaryText} strokeWidth={3} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.l,
    right: Spacing.l,
    zIndex: 100,
  },
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.8,
    borderRadius: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  radarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
  },
  textStack: {
    flex: 1,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  countText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});