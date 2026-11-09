import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import {
  Spacing,
  BorderRadius,
  useTheme,
  getBookingCardPalette,
} from '../../constants/Theme';
import { Booking, cleanAddressString } from '../../hooks';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  pending: 'Pending',
  accepted: 'Confirmed',
  ongoing: 'Ongoing',
  cancelled: 'Cancelled',
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
  const theme = useTheme();
  const meta = booking.cardMeta;

  const isPaymentPending =
    (booking.status === 'completed' && booking.paymentStatus !== 'paid') ||
    Boolean((meta as any)?.isPaymentPending);

  const palette = useMemo(
    () => getBookingCardPalette(theme, booking.status, isPaymentPending),
    [theme, booking.status, isPaymentPending]
  );

  const isInstant = (meta?.missionKind || booking.bookingType) === 'instant';

  const personName =
    meta?.counterParty?.fullName ||
    booking.customer?.fullName ||
    booking.worker?.fullName ||
    (booking.worker ? t('common.ustad', 'Ustad') : t('common.client', 'Customer'));

  const avatarUrl =
    meta?.primaryImageUrl ||
    meta?.counterParty?.profileImage ||
    booking.customer?.profileImage ||
    booking.worker?.profileImage ||
    '';

  const title = meta?.title || booking.category;
  const rawDateLabel = meta?.schedule?.dateLabel || fallbackDate(booking.scheduledDate);
  const dateLabel = rawDateLabel === 'Today' ? t('common.today', 'Today') : rawDateLabel;
  const rawTimeLabel = meta?.schedule?.timeLabel || booking.scheduledTime || 'ASAP';
  const timeLabel = rawTimeLabel === 'ASAP' ? t('common.asap', 'Right Away') : rawTimeLabel;

  const rawAddress = meta?.location?.address || booking.address || '';
  const cleanLocation = useMemo(() => {
    if (!rawAddress) return t('bookings.openDetailsToViewLocation', 'View in details');
    const cleaned = cleanAddressString(rawAddress);
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return cleaned || t('bookings.openDetailsToViewLocation', 'View in details');
  }, [rawAddress, t]);

  const numericAmount = Number(
    meta?.financial?.amount ?? booking.workerEarning ?? booking.totalAmount ?? 0
  );
  const amountText =
    meta?.financial?.amountText ||
    (numericAmount > 0 ? `Rs. ${numericAmount.toLocaleString()}` : '');

  const statusText = isPaymentPending
    ? t('bookingStatus.paymentDue.label', meta?.statusInfo?.label || 'Payment Due')
    : t(
        `bookingStatus.${booking.status}.label`,
        meta?.statusInfo?.label || STATUS_LABELS[booking.status] || 'Pending'
      );

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top Row: Service Title on left, Badges on right */}
      <View style={styles.topRow}>
        <Text
          style={[styles.categoryTitle, { color: theme.colors.text.primary }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.badgesGroup}>
          {isInstant && (
            <View
              style={[
                styles.pillBadge,
                { backgroundColor: palette.urgentPillBg },
              ]}
            >
              <Text
                style={[styles.pillBadgeText, { color: palette.urgentPillText }]}
              >
                {t('home.worker.instant', 'Urgent')}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.pillBadge,
              { backgroundColor: palette.statusPillBg },
            ]}
          >
            <Text
              style={[styles.pillBadgeText, { color: palette.statusPillText }]}
              numberOfLines={1}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </View>

      {/* Middle Row: Counterparty Avatar + Name on left, Date · Time on right */}
      <View style={styles.middleRow}>
        <View style={styles.personContainer}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: palette.avatarBg },
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            ) : (
              <Text style={[styles.avatarText, { color: palette.avatarText }]}>
                {initialsFor(personName)}
              </Text>
            )}
          </View>
          <Text
            style={[styles.personName, { color: theme.colors.text.primary }]}
            numberOfLines={1}
          >
            {personName}
          </Text>
        </View>

        <Text style={[styles.scheduleText, { color: theme.colors.text.secondary }]}>
          {`${dateLabel} · ${timeLabel}`}
        </Text>
      </View>

      {/* Footer Row: Location on left, Price on right */}
      <View
        style={[
          styles.footerRow,
          { borderTopColor: palette.dividerColor },
        ]}
      >
        <Text
          style={[styles.locationText, { color: theme.colors.text.secondary }]}
          numberOfLines={1}
        >
          {cleanLocation}
        </Text>

        {amountText ? (
          <Text style={[styles.amountValue, { color: theme.colors.text.primary }]}>
            {amountText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.8,
    marginBottom: 14,
    marginHorizontal: Spacing.l,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.3,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  personName: {
    fontSize: 15.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  scheduleText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1.2,
    gap: 10,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  amountValue: {
    fontSize: 16.5,
    fontWeight: '800',
  },
});
