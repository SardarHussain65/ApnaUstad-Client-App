import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Banknote, Briefcase, Calendar, ChevronRight, Clock, MapPin, ShieldCheck, User, X } from 'lucide-react-native';
import { Booking } from '../../hooks/queries/useData';
import { Colors, Typography } from '../../constants/Theme';
import { GlassCard } from './GlassCard';

interface WorkerActiveMissionCardProps {
  booking: Booking;
  index: number;
  onDetails: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  isCancelling?: boolean;
}

const STATUS_META = {
  accepted: {
    label: 'Confirmed',
    accent: Colors.cyan,
    wash: 'rgba(0,245,255,0.16)',
  },
  ongoing: {
    label: 'In Progress',
    accent: Colors.green,
    wash: 'rgba(0,255,127,0.14)',
  },
  pending: {
    label: 'Pending',
    accent: Colors.worker,
    wash: 'rgba(255,140,0,0.14)',
  },
  completed: {
    label: 'Completed',
    accent: Colors.green,
    wash: 'rgba(0,255,127,0.12)',
  },
  cancelled: {
    label: 'Cancelled',
    accent: Colors.error,
    wash: 'rgba(255,59,48,0.12)',
  },
};

function formatMissionTime(booking: Booking) {
  if (booking.bookingType === 'instant') return 'Immediate mission';

  const dateLabel = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Scheduled';

  return booking.scheduledTime ? `${dateLabel} at ${booking.scheduledTime}` : dateLabel;
}

export const WorkerActiveMissionCard = React.memo(function WorkerActiveMissionCard({
  booking,
  index,
  onDetails,
  onCancel,
  isCancelling = false,
}: WorkerActiveMissionCardProps) {
  const meta = STATUS_META[booking.status] || STATUS_META.accepted;
  const amount = booking.workerEarning || booking.totalAmount || 0;
  const customerName = booking.customer?.fullName || 'Client';
  const missionTime = useMemo(() => formatMissionTime(booking), [booking]);
  const canCancel = booking.status === 'accepted' || booking.status === 'ongoing' || booking.status === 'pending';

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(520)}>
      <GlassCard
        style={styles.card}
        contentStyle={styles.cardContent}
        padding={0}
        intensity={48}
        hasGlow
        glowColor={meta.accent}
      >
        <LinearGradient
          colors={[meta.wash, 'rgba(5,8,20,0.10)', 'rgba(255,255,255,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topRow}>
          <View style={[styles.statusPill, { borderColor: meta.accent + '55', backgroundColor: meta.accent + '18' }]}>
            <ShieldCheck size={13} color={meta.accent} />
            <Text style={[styles.statusText, { color: meta.accent }]}>{meta.label}</Text>
          </View>
          <View style={styles.amountPill}>
            <Banknote size={14} color={Colors.green} />
            <Text style={styles.amountText}>Rs. {amount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.iconHalo}>
            <Briefcase size={22} color={meta.accent} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={[styles.category, Typography.threeD]} numberOfLines={1}>
              {booking.category || 'Active Mission'}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {booking.description || 'Mission details are ready.'}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <User size={14} color="rgba(255,255,255,0.58)" />
            <Text style={styles.metaText} numberOfLines={1}>{customerName}</Text>
          </View>
          <View style={styles.metaItem}>
            {booking.bookingType === 'instant'
              ? <Clock size={14} color="rgba(255,255,255,0.58)" />
              : <Calendar size={14} color="rgba(255,255,255,0.58)" />}
            <Text style={styles.metaText} numberOfLines={1}>{missionTime}</Text>
          </View>
          <View style={[styles.metaItem, styles.locationItem]}>
            <MapPin size={14} color="rgba(255,255,255,0.58)" />
            <Text style={styles.metaText} numberOfLines={1}>{booking.address || 'Service location'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.84} style={styles.detailsButton} onPress={() => onDetails(booking)}>
            <Text style={styles.detailsText}>Details</Text>
            <ChevronRight size={16} color="#001015" />
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={isCancelling}
              style={[styles.cancelButton, isCancelling && styles.disabledButton]}
              onPress={() => onCancel(booking)}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <X size={15} color={Colors.error} />
                  <Text style={styles.cancelText}>Cancel</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    marginBottom: 14,
  },
  cardContent: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  amountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.22)',
  },
  amountText: {
    color: Colors.green,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  iconHalo: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  category: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
  },
  description: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0,
  },
  metaGrid: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationItem: {
    paddingRight: 4,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  detailsText: {
    color: '#001015',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  cancelButton: {
    minHeight: 46,
    minWidth: 112,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
  },
  disabledButton: {
    opacity: 0.7,
  },
  cancelText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
