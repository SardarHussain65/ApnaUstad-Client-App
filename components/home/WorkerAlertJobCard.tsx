import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap,
  Calendar,
  MapPin,
  X,
  Check,
  Banknote,
  Radio,
} from 'lucide-react-native';
import { Colors } from '../../constants/Theme';

interface WorkerAlertJobCardProps {
  job: any;
  index: number;
  onAccept: (job: any) => void;
  onDismiss: (jobId: string) => void;
  isAccepting?: boolean;
}

export const WorkerAlertJobCard = React.memo(
  ({ job, index, onAccept, onDismiss, isAccepting }: WorkerAlertJobCardProps) => {
    const isInstant = job.urgency === 'instant';
    const accentColor = isInstant ? '#00F0FF' : '#FF8C00';
    const accentDim = isInstant ? 'rgba(0,240,255,0.12)' : 'rgba(255,140,0,0.12)';

    const gradientColors: [string, string, ...string[]] = isInstant
      ? ['#001A1A', '#001030', '#000A20']
      : ['#1A0A00', '#200D00', '#0F0700'];

    const borderColor = isInstant ? 'rgba(0,240,255,0.35)' : 'rgba(255,140,0,0.35)';

    const timeAgo = useMemo(() => {
      if (!job.createdAt) return 'Recent';
      const diff = Date.now() - new Date(job.createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins / 60)}h ago`;
    }, [job.createdAt]);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 80).duration(500).springify()}
        exiting={FadeOutLeft.duration(300)}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          {/* Top row: badge + time */}
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: accentDim, borderColor: accentColor + '40' }]}>
              <View style={[styles.pulseDot, { backgroundColor: accentColor }]} />
              {isInstant ? (
                <Zap size={11} color={accentColor} fill={accentColor} />
              ) : (
                <Calendar size={11} color={accentColor} />
              )}
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {isInstant ? 'INSTANT' : 'SCHEDULED'}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Radio size={10} color={accentColor + '99'} />
              <Text style={[styles.timeText, { color: accentColor + 'AA' }]}>{timeAgo}</Text>
            </View>
          </View>

          {/* Category + description + budget */}
          <View style={styles.body}>
            <View style={styles.infoCol}>
              <Text style={styles.category} numberOfLines={1}>
                {job.category || 'New Mission'}
              </Text>
              {job.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {job.description}
                </Text>
              ) : null}
            </View>

            <View style={[styles.budgetBadge, { backgroundColor: 'rgba(0,255,127,0.1)', borderColor: 'rgba(0,255,127,0.25)' }]}>
              <Banknote size={13} color={Colors.green} />
              <Text style={styles.budgetText}>
                {isInstant ? `Rs. ${job.hourlyRate || job.amount || 0}` : 'Open Bid'}
              </Text>
            </View>
          </View>

          {/* Location */}
          {job.address ? (
            <View style={styles.locationRow}>
              <MapPin size={11} color="rgba(255,255,255,0.4)" />
              <Text style={styles.locationText} numberOfLines={1}>{job.address}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: accentColor + '20' }]} />

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.dismissBtn, { borderColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => onDismiss(job._id)}
              disabled={isAccepting}
              activeOpacity={0.7}
            >
              <X size={16} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptWrapper}
              onPress={() => onAccept(job)}
              disabled={isAccepting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isInstant
                    ? ['#00F0FF', '#008FFF', '#0055FF']
                    : ['#FF8C00', '#FF5E00', '#FF3D00']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptBtn}
              >
                {isAccepting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Check size={15} color="#000" strokeWidth={3} />
                    <Text style={styles.acceptText}>
                      {isInstant ? 'ACCEPT MISSION' : 'SUBMIT BID'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  infoCol: {
    flex: 1,
  },
  category: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
    fontWeight: '500',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetText: {
    color: Colors.green,
    fontWeight: '900',
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  locationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  dismissBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  acceptWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});
