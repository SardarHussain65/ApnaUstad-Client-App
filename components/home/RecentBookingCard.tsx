import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  const getLocalizedRole = (role: string) => {
    if (role === 'Ustad') return t('common.ustad', 'Ustad');
    if (role === 'Client') return t('common.client', 'Client');
    return role;
  };
  const personRole = getLocalizedRole(meta?.counterParty?.roleLabel || (booking.worker ? 'Ustad' : 'Client'));
  const avatarUrl =
    meta?.primaryImageUrl ||
    meta?.counterParty?.profileImage ||
    booking.worker?.profileImage ||
    '';

  const title = meta?.title || booking.category;
  const description = meta?.description || booking.description;
  const dateLabel = meta?.schedule?.dateLabel || fallbackDate(booking.scheduledDate);
  const timeLabel = meta?.schedule?.timeLabel || booking.scheduledTime || 'ASAP';
  const locationLabel = meta?.location?.address || booking.address || t('bookings.openDetailsToViewLocation', 'Service location');
  const missionKindLabel = meta?.missionKindLabel || (isInstant ? t('transactionDetails.instantVisit', 'Instant visit') : t('transactionDetails.scheduledVisit', 'Scheduled visit'));
  
  const getLocalizedAmountLabel = (label: string) => {
    if (label === 'Total') return t('bookings.totalLabel', 'Total');
    if (label === 'Earning') return t('bookings.earningLabel', 'Earning');
    if (label === 'Budget') return t('bookings.budgetLabel', 'Budget');
    return label;
  };
  const amountLabel = getLocalizedAmountLabel(meta?.financial?.label || 'Total');
  const amountText =
    meta?.financial?.amountText ||
    `Rs. ${Number(meta?.financial?.amount ?? booking.totalAmount ?? 0).toLocaleString()}`;
  
  const getLocalizedActionLabel = (label: string) => {
    if (label === 'View details' || label === 'View Details') return t('bookings.actionViewDetails', 'View Details');
    if (label === 'View Receipt') return t('bookings.actionViewReceipt', 'View Receipt');
    if (label === 'Track Live Job') return t('bookings.actionTrackLiveJob', 'Track Live Job');
    if (label === 'Track Job') return t('bookings.actionTrackJob', 'Track Job');
    return label;
  };
  const actionLabel = getLocalizedActionLabel(meta?.actionLabel || meta?.statusInfo?.actionLabel || 'View details');

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
          borderColor: withAlpha(statusColor, '30'),
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
      <View style={[styles.accentGlow, { backgroundColor: withAlpha(statusColor, '12') }]} />

      <View style={styles.topRow}>
        <View style={[styles.avatarShell, { borderColor: withAlpha(statusColor, '42') }]}>
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
              backgroundColor: withAlpha(statusColor, '12'),
              borderColor: withAlpha(statusColor, '38'),
            },
          ]}
        >
          <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {meta?.statusInfo?.label || t(`bookingStatus.${booking.status}.label`, baseStatus.label)}
          </Text>
        </View>
      </View>

      <View style={styles.serviceSection}>
        <Text style={[styles.category, Typography.threeD]} numberOfLines={1}>
          {title}
        </Text>
        {!!description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaPill}>
          <MissionIcon size={12} color={isInstant ? Colors.orange : Colors.cyan} strokeWidth={2.4} />
          <Text style={styles.metaText} numberOfLines={1}>{missionKindLabel}</Text>
        </View>
        <View style={styles.metaPill}>
          <CalendarDays size={12} color={Colors.cyan} strokeWidth={2.4} />
          <Text style={styles.metaText} numberOfLines={1}>{dateLabel}</Text>
        </View>
        <View style={styles.metaPill}>
          <Clock3 size={12} color={Colors.orange} strokeWidth={2.4} />
          <Text style={styles.metaText} numberOfLines={1}>{timeLabel}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={13} color={Colors.textMuted} strokeWidth={2.2} />
        <Text style={styles.locationText} numberOfLines={1}>
          {locationLabel}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.amountLabel}>{amountLabel}</Text>
          <Text style={styles.amountValue}>{amountText}</Text>
        </View>

        <View style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
          <View style={[styles.actionIconCircle, { backgroundColor: statusColor }]}>
            <ChevronRight size={13} color="#001014" strokeWidth={3} />
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
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 16,
    marginHorizontal: Spacing.l,
    padding: 16,
    backgroundColor: 'rgba(8,10,30,0.82)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  accentGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -50,
    top: -50,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarShell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1.4,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  identityBlock: {
    flex: 1,
    minWidth: 0,
  },
  personRole: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  personName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  serviceSection: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  category: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },
  description: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metaPill: {
    flex: 1,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metaText: {
    color: '#d8d9e4',
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  locationText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  amountLabel: {
    color: Colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {
    color: Colors.green,
    fontSize: 18,
    fontWeight: '900',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.m,
    backgroundColor: 'rgba(0, 245, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.14)',
  },
  actionBtnText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionIconCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
