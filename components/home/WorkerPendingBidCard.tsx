import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Hourglass,
  MapPin,
  Zap,
} from 'lucide-react-native';
import { Bid, Job } from '../../hooks/queries/useMessagesAndJobs';
import { alpha, BorderRadius, useTheme, useThemeColors, useThemeTypography, useThemeShadows, getAccessibleColor } from '../../constants/Theme';
import { useIsRTL } from '../../context/LanguageContext';

interface WorkerPendingBidCardProps {
  bid: Bid;
  index: number;
  onDetails: (bid: Bid) => void;
  onWithdraw: (bid: Bid) => void;
  isWithdrawing?: boolean;
}

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
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();

  const job = useMemo(() => getJobFromBid(bid), [bid]);
  const meta = bid.cardMeta;
  const customer = job?.customer && typeof job.customer === 'object' ? job.customer : null;
  const rawAccent = meta?.statusInfo?.accentColor || colors.worker;
  const accentColor = getAccessibleColor(rawAccent, theme.isDark);
  const isInstant = (meta?.missionKind || job?.urgency) === 'instant';

  const clientName = meta?.counterParty?.fullName || customer?.fullName || t('common.client', 'Customer');
  const clientAvatar = meta?.primaryImageUrl || meta?.counterParty?.profileImage || customer?.profileImage || '';
  const completedJobs = Number(meta?.counterParty?.completedJobs || 0);

  const title = meta?.title || job?.category || t('home.worker.pendingJob', 'Open Job');
  const description = meta?.description || job?.description || bid.message || '';

  const rawDateLabel = meta?.schedule?.dateLabel || fallbackDate(job?.scheduledDate);
  const dateLabel = rawDateLabel === 'Today' ? t('common.today', 'Today') : rawDateLabel;
  const rawTimeLabel = meta?.schedule?.timeLabel || job?.scheduledTime || 'ASAP';
  const timeLabel = rawTimeLabel === 'ASAP' ? t('common.asap', 'Right Away') : rawTimeLabel;

  // Clean location by stripping Google plus codes (e.g. "J3VF+58W, Rawalpindi" -> "Rawalpindi")
  const rawAddress = meta?.location?.address || job?.address || '';
  const cleanLocation = useMemo(() => {
    if (!rawAddress) return t('incomingJobModal.serviceLocation', 'Nearby service area');
    const cleaned = rawAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '').trim();
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return cleaned || rawAddress;
  }, [rawAddress, t]);

  const amountText = meta?.financial?.amountText || `Rs. ${Number(bid.proposedPrice || job?.amount || bid.amount || 0).toLocaleString()}`;
  const statusLabel = bid.status === 'pending' || !meta?.statusInfo?.label
    ? t('pendingBidDetails.awaitingClient', 'Waiting for customer')
    : meta.statusInfo.label;

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const gradientColors: [string, string, string] = [
    alpha(accentColor, theme.isDark ? 0.16 : 0.05),
    alpha(theme.colors.background.screen, theme.isDark ? 0.92 : 0.98),
    alpha(theme.colors.brand.primary, theme.isDark ? 0.07 : 0.02),
  ];

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(450)}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => onDetails(bid)}
        style={[
          styles.card,
          {
            borderColor: theme.isDark ? alpha(accentColor, 0.28) : theme.colors.border.subtle,
            borderLeftColor: accentColor,
            borderLeftWidth: 3.5,
            backgroundColor: theme.isDark ? alpha(theme.colors.background.screen, 0.92) : theme.colors.surface.card,
          },
          shadows.bevel,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Row 1: Service Title + Urgent Badge & Status Badge ── */}
        <View style={styles.topRow}>
          <View style={styles.titleArea}>
            <Text
              style={[styles.serviceTitle, typography.threeD, { color: theme.colors.text.primary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {isInstant && (
              <View style={[styles.urgentBadge, { backgroundColor: alpha(colors.worker, 0.12), borderColor: alpha(colors.worker, 0.3) }]}>
                <Zap size={10} color={colors.worker} strokeWidth={2.6} />
                <Text style={[styles.urgentBadgeText, { color: colors.worker }]}>
                  {t('home.worker.instant', 'Urgent')}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                borderColor: alpha(accentColor, 0.35),
                backgroundColor: alpha(accentColor, 0.1),
              },
            ]}
          >
            <Hourglass size={11} color={accentColor} strokeWidth={2.5} />
            <Text style={[styles.statusText, { color: accentColor }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* ── Row 2: Customer Identity & Schedule ── */}
        <View style={styles.middleRow}>
          <View style={styles.customerGroup}>
            <View style={[styles.avatarShell, { borderColor: theme.isDark ? alpha(accentColor, 0.35) : theme.colors.border.subtle }]}>
              {clientAvatar ? (
                <Image source={{ uri: clientAvatar }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={[alpha(accentColor, 0.4), alpha(theme.colors.brand.primary, 0.18)]}
                  style={styles.avatarFallback}
                >
                  <Text style={[styles.avatarText, { color: theme.colors.text.primary }]}>
                    {initialsFor(clientName)}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.customerMeta}>
              <Text style={[styles.customerName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {clientName}
              </Text>
              {completedJobs > 0 && (
                <Text style={[styles.customerHistory, { color: theme.colors.text.muted }]}>
                  {t('incomingJobModal.jobsCompletedCount', '{{count}} completed jobs', { count: completedJobs })}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.scheduleGroup}>
            <CalendarDays size={11} color={theme.colors.text.muted} strokeWidth={2.2} />
            <Text style={[styles.scheduleText, { color: theme.colors.text.muted }]}>{dateLabel}</Text>
            <View style={[styles.scheduleDot, { backgroundColor: alpha(theme.colors.text.muted, 0.45) }]} />
            <Clock3 size={11} color={theme.colors.text.muted} strokeWidth={2.2} />
            <Text style={[styles.scheduleText, { color: theme.colors.text.muted }]}>{timeLabel}</Text>
          </View>
        </View>

        {/* ── Optional Problem Description Preview ── */}
        {Boolean(description && description.trim()) && (
          <Text
            style={[styles.descriptionText, { color: theme.colors.text.muted }]}
            numberOfLines={1}
          >
            {description}
          </Text>
        )}

        {/* ── Row 3 / Footer: Clean Location (left) & Quoted Rate + Action (right) ── */}
        <View style={[styles.footerRow, { borderTopColor: alpha(theme.colors.text.primary, 0.07) }]}>
          <View style={styles.locationGroup}>
            <MapPin size={12} color={theme.colors.text.muted} strokeWidth={2.2} />
            <Text style={[styles.locationText, { color: theme.colors.text.muted }]} numberOfLines={1}>
              {cleanLocation}
            </Text>
          </View>

          <View style={styles.footerRight}>
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: alpha(theme.colors.text.primary, 0.52) }]}>
                {t('pendingBidDetails.yourQuote', 'Your rate')}
              </Text>
              <Text style={[styles.priceValue, { color: colors.success }]}>
                {amountText}
              </Text>
            </View>
            <ChevronIcon size={15} color={alpha(theme.colors.text.primary, 0.36)} strokeWidth={2.4} />
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
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 9,
  },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 7,
  },
  customerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatarShell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: alpha('#fff', 0.05),
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
    fontSize: 11,
    fontWeight: '800',
  },
  customerMeta: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  customerHistory: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  scheduleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '900',
  },
});
