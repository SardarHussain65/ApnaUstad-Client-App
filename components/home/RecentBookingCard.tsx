import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  MapPin,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, Spacing, BorderRadius, useTheme, useThemeColors, useThemeTypography, getAccessibleColor } from '../../constants/Theme';
import { Booking } from '../../hooks';
import { useIsRTL } from '../../context/LanguageContext';

type StatusConfig = {
  label: string;
  color: string;
  Icon: React.ComponentType<any>;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: { label: 'Completed', color: 'success', Icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'yellow', Icon: Clock },
  accepted: { label: 'Accepted', color: 'cyan', Icon: Zap },
  ongoing: { label: 'In progress', color: 'purple', Icon: Zap },
  cancelled: { label: 'Cancelled', color: 'error', Icon: XCircle },
};

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
  const isRTL = useIsRTL();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const meta = booking.cardMeta;
  const baseStatus = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const rawStatusColor = (meta?.statusInfo?.accentColor || colors[baseStatus.color as keyof typeof colors] || theme.colors.brand.primary) as string;
  const statusColor = getAccessibleColor(rawStatusColor, theme.isDark);
  const StatusIcon = baseStatus.Icon;
  const isInstant = (meta?.missionKind || booking.bookingType) === 'instant';

  const personName =
    meta?.counterParty?.fullName ||
    booking.worker?.fullName ||
    (booking.worker ? t('common.ustad', 'Ustad') : t('common.client', 'Customer'));

  const avatarUrl =
    meta?.primaryImageUrl ||
    meta?.counterParty?.profileImage ||
    booking.worker?.profileImage ||
    '';

  const title = meta?.title || booking.category;
  const rawDateLabel = meta?.schedule?.dateLabel || fallbackDate(booking.scheduledDate);
  const dateLabel = rawDateLabel === 'Today' ? t('common.today', 'Today') : rawDateLabel;
  const rawTimeLabel = meta?.schedule?.timeLabel || booking.scheduledTime || 'ASAP';
  const timeLabel = rawTimeLabel === 'ASAP' ? t('common.asap', 'Right Away') : rawTimeLabel;

  // Clean location: strip Google plus codes (e.g. "J3VF+58G, ") and show clean readable area/city
  const rawAddress = meta?.location?.address || booking.address || '';
  const cleanLocation = useMemo(() => {
    if (!rawAddress) return t('bookings.openDetailsToViewLocation', 'View in details');
    const cleaned = rawAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '').trim();
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return cleaned || rawAddress;
  }, [rawAddress, t]);

  const amountText =
    meta?.financial?.amountText ||
    `Rs. ${Number(meta?.financial?.amount ?? booking.totalAmount ?? 0).toLocaleString()}`;

  const gradientColors: [string, string, string] = [
    alpha(statusColor, theme.isDark ? 0.16 : 0.05),
    alpha(theme.colors.background.screen, theme.isDark ? 0.92 : 0.98),
    alpha(theme.colors.brand.primary, theme.isDark ? 0.08 : 0.02),
  ];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderColor: theme.isDark ? alpha(statusColor, 0.22) : theme.colors.border.subtle,
          backgroundColor: theme.isDark ? alpha(theme.colors.background.screen, 0.85) : theme.colors.surface.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.accentGlow, { backgroundColor: alpha(statusColor, theme.isDark ? 0.06 : 0.02) }]} />

      {/* Top Header: Service Title + Urgent Tag + Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Text style={[styles.categoryTitle, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {isInstant && (
            <View style={[styles.instantBadge, { backgroundColor: alpha(colors.worker, 0.12), borderColor: alpha(colors.worker, 0.25) }]}>
              <Zap size={10} color={colors.worker} strokeWidth={2.5} />
              <Text style={[styles.instantBadgeText, { color: colors.worker }]}>
                {t('home.worker.instant', 'Urgent')}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: alpha(statusColor, theme.isDark ? 0.1 : 0.08),
              borderColor: alpha(statusColor, theme.isDark ? 0.28 : 0.24),
            },
          ]}
        >
          <StatusIcon size={11} color={statusColor} strokeWidth={2.5} />
          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {t(`bookingStatus.${booking.status}.label`, meta?.statusInfo?.label || baseStatus.label)}
          </Text>
        </View>
      </View>

      {/* Middle Row: Counterparty info + Date & Time */}
      <View style={styles.middleRow}>
        <View style={styles.personContainer}>
          <View style={[styles.avatarShell, { borderColor: theme.isDark ? alpha(statusColor, 0.3) : theme.colors.border.subtle }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[alpha(statusColor, 0.35), alpha(theme.colors.brand.primary, 0.18)]}
                style={styles.avatarFallback}
              >
                <Text style={[styles.avatarText, { color: theme.colors.text.primary }]}>{initialsFor(personName)}</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={[styles.personName, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {personName}
          </Text>
        </View>

        <View style={styles.scheduleRow}>
          <CalendarDays size={12} color={theme.colors.text.muted} strokeWidth={2.2} />
          <Text style={[styles.scheduleText, { color: theme.colors.text.muted }]}>{dateLabel}</Text>
          <View style={styles.scheduleDot} />
          <Clock3 size={12} color={theme.colors.text.muted} strokeWidth={2.2} />
          <Text style={[styles.scheduleText, { color: theme.colors.text.muted }]}>{timeLabel}</Text>
        </View>
      </View>

      {/* Footer: Clean Location on left, Price & Action Arrow on right */}
      <View style={[styles.footerRow, { borderTopColor: alpha(theme.colors.text.primary, 0.06) }]}>
        <View style={styles.locationGroup}>
          <MapPin size={12} color={theme.colors.text.muted} strokeWidth={2} />
          <Text style={[styles.locationText, { color: theme.colors.text.muted }]} numberOfLines={1}>
            {cleanLocation}
          </Text>
        </View>

        <View style={styles.footerRight}>
          <Text style={[styles.amountValue, { color: colors.success }]}>{amountText}</Text>
          <View style={[styles.openIconBtn, { backgroundColor: alpha(statusColor, 0.12), borderColor: alpha(statusColor, 0.25) }]}>
            {isRTL ? (
              <ChevronLeft size={13} color={statusColor} strokeWidth={2.8} />
            ) : (
              <ChevronRight size={13} color={statusColor} strokeWidth={2.8} />
            )}
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
    borderRadius: 18,
    borderWidth: 1.2,
    marginBottom: 12,
    marginHorizontal: Spacing.l,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
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
    justifyContent: 'space-between',
    gap: 10,
  },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  instantBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarShell: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
  },
  personName: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  openIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
