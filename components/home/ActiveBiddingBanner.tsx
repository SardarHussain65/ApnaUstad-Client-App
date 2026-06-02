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
import { Colors, Shadows, Spacing } from '../../constants/Theme';
import { JobPost } from '../../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ActiveBiddingBannerProps {
  job: JobPost;
  activeCount?: number;
  onPress: (jobId: string) => void;
}

export function ActiveBiddingBanner({ job, activeCount = 1, onPress }: ActiveBiddingBannerProps) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);
  const isInstant = job.urgency === 'instant';
  const proposalCount = job.pendingBidCount ?? job.bidCount ?? 0;
  const statusText = proposalCount > 0
    ? `${proposalCount} PROPOSAL${proposalCount === 1 ? '' : 'S'} READY`
    : isInstant
      ? 'LIVE SEARCH'
      : 'SCHEDULED SEARCH';

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.5, { duration: 1500 }), -1, true);
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 1 - (pulse.value - 1) * 2, // Fades out as it expands
  }));

  // Using a bottom position slightly above the tab bar (assumed to be ~80-90px or so).
  // We'll rely on the parent container to place it correctly via absolute positioning,
  // or we can just apply absolute positioning here.
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
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        
        <LinearGradient
          colors={['rgba(0,245,255,0.15)', 'rgba(5,8,20,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.borderGlow, { borderColor: Colors.cyan + '40' }]} />

        <View style={styles.content}>
          <View style={styles.radarBox}>
            <Animated.View style={[styles.pulseRing, ringStyle]} />
            <Shield color={Colors.cyan} size={18} strokeWidth={2.5} />
          </View>

          <View style={styles.textStack}>
            <View style={styles.statusRow}>
              <Radio size={12} color={Colors.cyan} />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {job.category || 'Service request'} - Finding nearby Ustads
            </Text>
            <View style={styles.metaRow}>
              {isInstant ? <Zap size={11} color={Colors.pink} /> : <Calendar size={11} color={Colors.orange} />}
              <Text style={[styles.metaText, { color: isInstant ? Colors.pink : Colors.orange }]}>
                {isInstant ? 'Instant request' : 'Scheduled request'}
              </Text>
              {activeCount > 1 && <Text style={styles.countText}>- {activeCount} searches active</Text>}
            </View>
          </View>

          <View style={styles.actionBtn}>
            <Text style={styles.actionText}>{proposalCount > 0 ? 'REVIEW' : 'RESUME'}</Text>
            <ChevronRight size={14} color="#000" strokeWidth={3} />
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
    ...Shadows.glow,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  radarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cyan,
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
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
