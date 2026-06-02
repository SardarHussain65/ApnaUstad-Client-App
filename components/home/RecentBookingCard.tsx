import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  MapPin,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/Theme';
import { Booking } from '../../hooks';

type StatusConfig = {
  label: string;
  color: string;
  Icon: React.ComponentType<any>;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: { label: 'Completed', color: Colors.success, Icon: CheckCircle2 },
  pending: { label: 'Pending', color: Colors.yellow, Icon: Clock },
  accepted: { label: 'Accepted', color: Colors.cyan, Icon: Zap },
  ongoing: { label: 'In progress', color: Colors.purple, Icon: Zap },
  cancelled: { label: 'Cancelled', color: Colors.error, Icon: XCircle },
};

const withAlpha = (color: string, alpha: string) =>
  color.startsWith('#') && color.length === 7 ? `${color}${alpha}` : color;

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
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

interface RecentBookingCardProps {
  booking: Booking;
  onPress: () => void;
}

export const RecentBookingCard = React.memo(function RecentBookingCard({
  booking,
  onPress,
}: RecentBookingCardProps) {
  const meta = booking.cardMeta;
  const baseStatus = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const statusColor = meta?.statusInfo?.accentColor || baseStatus.color;
  const statusLabel = meta?.statusInfo?.label || baseStatus.label;
  const StatusIcon = baseStatus.Icon;
  const isInstant = (meta?.missionKind || booking.bookingType) === 'instant';
  const MissionIcon = isInstant ? Zap : CalendarDays;

  const personName =
    meta?.counterParty?.fullName ||
    booking.worker?.fullName ||
    'Assigned Ustad';
  const personRole = meta?.counterParty?.roleLabel || 'Ustad';
  const avatarUrl =
    meta?.primaryImageUrl ||
    meta?.counterParty?.profileImage ||
    booking.worker?.profileImage ||
    '';

  const title = meta?.title || booking.category;
  const description = meta?.description || booking.description;
  const dateLabel = meta?.schedule?.dateLabel || fallbackDate(booking.scheduledDate);
  const timeLabel = meta?.schedule?.timeLabel || booking.scheduledTime || 'ASAP';
  const locationLabel = meta?.location?.address || booking.address || 'Service location';
  const missionKindLabel = meta?.missionKindLabel || (isInstant ? 'Instant visit' : 'Scheduled visit');
  const amountLabel = meta?.financial?.label || 'Total';
  const amountText =
    meta?.financial?.amountText ||
    `Rs. ${Number(meta?.financial?.amount ?? booking.totalAmount ?? 0).toLocaleString()}`;
  const actionLabel = meta?.actionLabel || meta?.statusInfo?.actionLabel || 'View details';

  const gradientColors: [string, string, string] = [
    withAlpha(statusColor, '2E'),
    'rgba(8, 10, 30, 0.96)',
    'rgba(0, 245, 255, 0.10)',
  ];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderColor: withAlpha(statusColor, '50'),
          borderTopColor: withAlpha(statusColor, '55'),
          borderLeftColor: withAlpha(statusColor, '40'),
          borderRightColor: withAlpha(statusColor, '22'),
          borderBottomColor: 'rgba(0,0,0,0.45)',
          shadowColor: statusColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.accentGlow, { backgroundColor: withAlpha(statusColor, '22') }]} />
      <View style={[styles.accentLine, { backgroundColor: statusColor }]} />

      <View style={styles.topRow}>
        <View style={[styles.avatarShell, { borderColor: withAlpha(statusColor, '66') }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={[withAlpha(statusColor, '66'), 'rgba(0,245,255,0.28)']}
              style={styles.avatarFallback}
            >
              <Text style={styles.avatarText}>{initialsFor(personName)}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.identityBlock}>
          <Text style={styles.personRole}>{personRole}</Text>
          <Text style={[styles.personName, Typography.threeD]} numberOfLines={1}>
            {personName}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: withAlpha(statusColor, '18'),
              borderColor: withAlpha(statusColor, '55'),
            },
          ]}
        >
          <StatusIcon size={11} color={statusColor} strokeWidth={2.5} />
          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.serviceRow}>
        <View style={[styles.serviceIcon, { borderColor: withAlpha(statusColor, '30') }]}>
          <BriefcaseBusiness size={18} color={Colors.cyan} strokeWidth={2.4} />
        </View>
        <View style={styles.serviceCopy}>
          <Text style={[styles.category, Typography.threeD]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaPill}>
          <MissionIcon size={13} color={isInstant ? Colors.orange : Colors.cyan} strokeWidth={2.4} />
          <Text style={styles.metaText} numberOfLines={1}>{missionKindLabel}</Text>
        </View>
        <View style={styles.metaPill}>
          <CalendarDays size={13} color={Colors.cyan} strokeWidth={2.4} />
          <Text style={styles.metaText} numberOfLines={1}>{dateLabel}</Text>
        </View>
        <View style={styles.metaPill}>
          <Clock3 size={13} color={Colors.orange} strokeWidth={2.4} />
          <Text style={styles.metaText} numberOfLines={1}>{timeLabel}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={14} color={Colors.textMuted} strokeWidth={2.2} />
        <Text style={styles.locationText} numberOfLines={1}>
          {locationLabel}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.amountBox}>
          <Banknote size={14} color={Colors.green} strokeWidth={2.4} />
          <View>
            <Text style={styles.amountLabel}>{amountLabel}</Text>
            <Text style={styles.amountValue}>{amountText}</Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <View style={styles.actionIcon}>
            <ChevronRight size={14} color="#001014" strokeWidth={3} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: 14,
    marginHorizontal: Spacing.l,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -42,
    top: -50,
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
    width: 48,
    height: 48,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 116,
  },
  statusText: {
    fontSize: 10,
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
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaText: {
    color: '#d8d9e4',
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 11,
  },
  locationText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.22)',
  },
  amountLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  amountValue: {
    color: Colors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  actionGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionText: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
