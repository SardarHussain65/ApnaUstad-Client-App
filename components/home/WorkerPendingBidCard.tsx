import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Banknote, ChevronRight, Clock, Hourglass, MapPin, Radar, X } from 'lucide-react-native';
import { Bid, Job } from '../../hooks/queries/useMessagesAndJobs';
import { Colors, Typography } from '../../constants/Theme';
import { GlassCard } from './GlassCard';

interface WorkerPendingBidCardProps {
  bid: Bid;
  index: number;
  onDetails: (bid: Bid) => void;
  onWithdraw: (bid: Bid) => void;
  isWithdrawing?: boolean;
}

function getJobFromBid(bid: Bid): Job | null {
  return bid.jobPost && typeof bid.jobPost === 'object' ? bid.jobPost : null;
}

function formatJobTime(job: Job | null) {
  if (!job) return 'Waiting for client';
  if (job.urgency === 'instant') return 'Immediate request';

  const dateLabel = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Scheduled request';

  return job.scheduledTime ? `${dateLabel} at ${job.scheduledTime}` : dateLabel;
}

export const WorkerPendingBidCard = React.memo(function WorkerPendingBidCard({
  bid,
  index,
  onDetails,
  onWithdraw,
  isWithdrawing = false,
}: WorkerPendingBidCardProps) {
  const job = useMemo(() => getJobFromBid(bid), [bid]);
  const price = bid.proposedPrice || job?.amount || bid.amount || 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(520)}>
      <GlassCard
        style={styles.card}
        contentStyle={styles.cardContent}
        padding={0}
        intensity={48}
        hasGlow
        glowColor={Colors.worker}
      >
        <LinearGradient
          colors={['rgba(255,140,0,0.17)', 'rgba(0,245,255,0.06)', 'rgba(255,255,255,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topRow}>
          <View style={styles.pendingPill}>
            <Hourglass size={13} color={Colors.worker} />
            <Text style={styles.pendingText}>Awaiting Client</Text>
          </View>
          <View style={styles.signalPill}>
            <Radar size={13} color={Colors.cyan} />
            <Text style={styles.signalText}>Interest Sent</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.category, Typography.threeD]} numberOfLines={1}>
            {job?.category || 'Pending Mission'}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {job?.description || bid.message || 'Your response is waiting for client confirmation.'}
          </Text>
        </View>

        <View style={styles.detailStrip}>
          <View style={styles.stripItem}>
            <Clock size={14} color="rgba(255,255,255,0.58)" />
            <Text style={styles.stripText} numberOfLines={1}>{formatJobTime(job)}</Text>
          </View>
          <View style={styles.stripItem}>
            <MapPin size={14} color="rgba(255,255,255,0.58)" />
            <Text style={styles.stripText} numberOfLines={1}>{job?.address || 'Service location'}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceBadge}>
            <Banknote size={15} color={Colors.green} />
            <Text style={styles.priceText}>Rs. {price.toLocaleString()}</Text>
          </View>
          <Text style={styles.priceLabel}>Your quoted value</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.84} style={styles.detailsButton} onPress={() => onDetails(bid)}>
            <Text style={styles.detailsText}>Details</Text>
            <ChevronRight size={16} color="#001015" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            disabled={isWithdrawing}
            style={[styles.withdrawButton, isWithdrawing && styles.disabledButton]}
            onPress={() => onWithdraw(bid)}
          >
            {isWithdrawing ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <X size={15} color={Colors.error} />
                <Text style={styles.withdrawText}>Withdraw</Text>
              </>
            )}
          </TouchableOpacity>
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
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,140,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.34)',
  },
  pendingText: {
    color: Colors.worker,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,245,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.25)',
    flexShrink: 1,
  },
  signalText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  titleBlock: {
    marginBottom: 13,
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
  detailStrip: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 13,
  },
  stripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripText: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  priceBadge: {
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
  priceText: {
    color: Colors.green,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    flexShrink: 1,
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
  withdrawButton: {
    minHeight: 46,
    minWidth: 122,
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
  withdrawText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
