import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Hourglass,
  MapPin,
  Radar,
  Zap,
} from 'lucide-react-native';
import { Bid, Job } from '../../hooks/queries/useMessagesAndJobs';
import { BorderRadius, Colors, Shadows, Typography } from '../../constants/Theme';

interface WorkerPendingBidCardProps {
  bid: Bid;
  index: number;
  onDetails: (bid: Bid) => void;
  onWithdraw: (bid: Bid) => void;
  isWithdrawing?: boolean;
}

const withAlpha = (color: string, alpha: string) =>
  color.startsWith('#') && color.length === 7 ? `${color}${alpha}` : color;

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'CL';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const fallbackDate = (date?: string) => {
  const parsed = date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return 'Today';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function getJobFromBid(bid: Bid): Job | null {
  return bid.jobPost && typeof bid.jobPost === 'object' ? bid.jobPost : null;
}

export const WorkerPendingBidCard = React.memo(function WorkerPendingBidCard({
  bid,
  index,
  onDetails,
  onWithdraw,
  isWithdrawing = false,
}: WorkerPendingBidCardProps) {
  const job = useMemo(() => getJobFromBid(bid), [bid]);
  const meta = bid.cardMeta;
  const workerPerson = bid.worker && typeof bid.worker === 'object' ? bid.worker : null;
  const customer = job?.customer && typeof job.customer === 'object' ? job.customer : null;
  const accentColor = meta?.statusInfo?.accentColor || Colors.worker;
  const isInstant = (meta?.missionKind || job?.urgency) === 'instant';
  const MissionIcon = isInstant ? Zap : CalendarDays;
  const clientName = meta?.counterParty?.fullName || customer?.fullName || 'Client';
  const clientRole = meta?.counterParty?.roleLabel || 'Client';
  const clientAvatar = meta?.primaryImageUrl || meta?.counterParty?.profileImage || customer?.profileImage || '';
  const completedJobs = Number(meta?.counterParty?.completedJobs || 0);
  const title = meta?.title || job?.category || 'Pending job';
  const description = meta?.description || job?.description || bid.message || 'Your proposal is waiting for client review.';
  const missionKindLabel = meta?.missionKindLabel || (isInstant ? 'Instant visit' : 'Scheduled visit');
  const dateLabel = meta?.schedule?.dateLabel || fallbackDate(job?.scheduledDate);
  const timeLabel = meta?.schedule?.timeLabel || job?.scheduledTime || 'ASAP';
  const locationLabel = meta?.location?.address || job?.address || 'Service location';
  const amountText = meta?.financial?.amountText || `Rs. ${Number(bid.proposedPrice || job?.amount || bid.amount || 0).toLocaleString()}`;
  const statusLabel = meta?.statusInfo?.label || 'Awaiting client';

  const gradientColors: [string, string, string] = [
    withAlpha(accentColor, '32'),
    'rgba(8, 10, 30, 0.96)',
    'rgba(0, 245, 255, 0.09)',
  ];

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(520)}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onDetails(bid)}
        style={[
          styles.card,
          {
            borderColor: withAlpha(accentColor, '50'),
            borderTopColor: withAlpha(accentColor, '60'),
            borderLeftColor: withAlpha(accentColor, '48'),
            shadowColor: accentColor,
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.accentGlow, { backgroundColor: withAlpha(accentColor, '22') }]} />
        <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

        <View style={styles.topRow}>
          <View style={[styles.avatarShell, { borderColor: withAlpha(accentColor, '72') }]}>
            {clientAvatar ? (
              <Image source={{ uri: clientAvatar }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[withAlpha(accentColor, '72'), 'rgba(0,245,255,0.24)']}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarText}>{initialsFor(clientName)}</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.identityBlock}>
            <Text style={styles.personRole}>{clientRole}</Text>
            <Text style={[styles.personName, Typography.threeD]} numberOfLines={1}>{clientName}</Text>
            <Text style={styles.clientHistory} numberOfLines={1}>
              {completedJobs > 0 ? `${completedJobs} completed job${completedJobs === 1 ? '' : 's'}` : 'Proposal submitted'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { borderColor: withAlpha(accentColor, '60'), backgroundColor: withAlpha(accentColor, '18') }]}>
            <Hourglass size={11} color={accentColor} strokeWidth={2.6} />
            <Text style={[styles.statusText, { color: accentColor }]} numberOfLines={1}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.serviceRow}>
          <View style={[styles.serviceIcon, { borderColor: withAlpha(accentColor, '38') }]}>
            <BriefcaseBusiness size={18} color={Colors.cyan} strokeWidth={2.4} />
          </View>
          <View style={styles.serviceCopy}>
            <Text style={[styles.category, Typography.threeD]} numberOfLines={1}>{title}</Text>
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaPill}>
            <MissionIcon size={13} color={isInstant ? Colors.worker : Colors.cyan} strokeWidth={2.4} />
            <Text style={styles.metaText} numberOfLines={1}>{missionKindLabel}</Text>
          </View>
          <View style={styles.metaPill}>
            <CalendarDays size={13} color={Colors.cyan} strokeWidth={2.4} />
            <Text style={styles.metaText} numberOfLines={1}>{dateLabel}</Text>
          </View>
          <View style={styles.metaPill}>
            <Clock3 size={13} color={Colors.worker} strokeWidth={2.4} />
            <Text style={styles.metaText} numberOfLines={1}>{timeLabel}</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color={Colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
        </View>

        <View style={styles.offerRow}>
          <View style={styles.amountBox}>
            <Banknote size={14} color={Colors.green} strokeWidth={2.4} />
            <View>
              <Text style={styles.amountLabel}>Your quote</Text>
              <Text style={styles.amountValue}>{amountText}</Text>
            </View>
          </View>
          <View style={styles.sentState}>
            <Radar size={14} color={Colors.cyan} strokeWidth={2.4} />
            <Text style={styles.sentText}>Interest sent</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
    backgroundColor: 'rgba(8,10,30,0.9)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
    ...Shadows.bevel,
  },
  accentGlow: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    right: -45,
    top: -54,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },
  avatarShell: {
    width: 50,
    height: 50,
    borderRadius: 18,
    borderWidth: 1.4,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  identityBlock: {
    flex: 1,
    minWidth: 0,
  },
  personRole: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  personName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  clientHistory: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 126,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  category: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  description: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 3,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 9,
  },
  metaPill: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  metaText: {
    flexShrink: 1,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
  },
  locationRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  locationText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.24)',
    backgroundColor: 'rgba(0,255,127,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  amountValue: {
    color: Colors.green,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  sentState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.20)',
    backgroundColor: 'rgba(0,245,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sentText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
