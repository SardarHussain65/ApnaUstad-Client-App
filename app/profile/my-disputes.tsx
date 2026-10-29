import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Banknote,
  AlertCircle,
  Briefcase,
  HelpCircle,
  Sparkles,
  Layers,
  User,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { CustomButton } from '../../components/CustomButton';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { useMyDisputes, type DisputeRecord, type DisputeScope } from '../../hooks/queries/useDisputes';
import { useIsRTL } from '../../context/LanguageContext';

const formatPKR = (amount: number) => `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;

const formatCaseDateTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} • ${timeStr}`;
  } catch {
    return '';
  }
};

export default function MyDisputesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const router = useRouter();
  const isRTL = useIsRTL();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const { data: disputes = [], isLoading, isFetching, refetch } = useMyDisputes(activeTab);

  const counts = useMemo(() => {
    return {
      active: disputes.filter((d) => !d.isClosed).length,
      history: disputes.filter((d) => d.isClosed).length,
    };
  }, [disputes]);

  const handleOpenRoom = (disputeId: string) => {
    router.push({
      pathname: '/dispute-room' as any,
      params: { id: disputeId },
    });
  };

  const renderDisputeCard = (dispute: DisputeRecord, index: number) => {
    const booking = typeof dispute.booking === 'object' ? dispute.booking : null;
    const shortCaseId = String(dispute._id).slice(-6).toUpperCase();
    const isClosed = dispute.isClosed || false;

    // Visual attributes
    let statusColor = '#00C6FF';
    let statusLabel = t('disputes.badgeOpen', 'Report Received');
    let StatusIcon = AlertTriangle;

    if (isClosed) {
      statusColor = '#34C759';
      StatusIcon = CheckCircle2;
      if (dispute.outcome === 'customer_favor') {
        statusLabel = t('disputes.verdictCustomerFavored', 'Customer Upheld');
      } else if (dispute.outcome === 'worker_favor') {
        statusLabel = t('disputes.verdictDismissed', 'Ustad Cleared');
      } else if (dispute.outcome === 'settled') {
        statusLabel = t('disputes.verdictSettled', 'Settled');
      } else {
        statusLabel = dispute.outcomeLabel || t('disputes.badgeClosed', 'Closed');
        statusColor = '#8E8E93';
      }
    } else if (dispute.status === 'under_review') {
      statusColor = '#FF9F0A';
      statusLabel = t('disputes.badgeUnderReview', 'Under Investigation');
      StatusIcon = Clock;
    }

    const unreadCount = dispute.unreadCount || 0;
    const filedDate = formatCaseDateTime(dispute.createdAt);

    const reporterLabel = dispute.isRaisedByMe
      ? dispute.raisedByType === 'customer'
        ? t('disputes.filedByYouCustomer', 'You (Customer)')
        : t('disputes.filedByYouWorker', 'You (Ustad)')
      : dispute.raisedByType === 'customer'
      ? t('disputes.customer', 'Customer')
      : t('disputes.ustad', 'Ustad (Worker)');

    return (
      <Animated.View key={dispute._id} entering={FadeInDown.delay(index * 40)}>
        <GlassCard
          style={styles.card}
          hasGlow={!isClosed && dispute.status === 'under_review'}
          glowColor={statusColor}
        >
          {/* Top Row: Case Ref Badge, Date, and Status Badge */}
          <View style={styles.cardTopRow}>
            <View style={styles.caseBadgeWrapper}>
              <View
                style={[
                  styles.caseIdBadge,
                  {
                    backgroundColor: alpha(theme.colors.brand.primary, 0.12),
                    borderColor: alpha(theme.colors.brand.primary, 0.3),
                  },
                ]}
              >
                <Text style={[styles.caseIdText, { color: theme.colors.brand.primary }]}>
                  {`#${shortCaseId}`}
                </Text>
              </View>
              {filedDate ? (
                <Text style={[styles.caseDateText, { color: theme.colors.text.dim }]}>
                  {filedDate}
                </Text>
              ) : null}
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: alpha(statusColor, 0.14),
                  borderColor: alpha(statusColor, 0.35),
                },
              ]}
            >
              <StatusIcon size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Service Header Row */}
          <View style={styles.serviceRow}>
            <View
              style={[
                styles.serviceIconCircle,
                {
                  backgroundColor: alpha(theme.colors.brand.primary, 0.12),
                  borderColor: alpha(theme.colors.brand.primary, 0.25),
                },
              ]}
            >
              <Layers size={14} color={theme.colors.brand.primary} />
            </View>
            <View style={styles.serviceTextCol}>
              <Text
                style={[styles.serviceTitle, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {booking?.category || t('disputes.booking', 'Service Booking')}
              </Text>
              {booking?.status ? (
                <Text style={[styles.serviceSubText, { color: theme.colors.text.dim }]}>
                  {t('disputes.bookingLabel', 'Job')}: {booking.status}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Structured Key Case Details (Required Details) */}
          <View
            style={[
              styles.caseDetailsGrid,
              {
                backgroundColor: alpha(theme.colors.surface.card, 0.45),
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            {/* Issue Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelCol}>
                <AlertCircle size={13} color={statusColor} />
                <Text style={[styles.detailLabel, { color: theme.colors.text.dim }]}>
                  {t('disputes.issue', 'Issue')}:
                </Text>
              </View>
              <Text
                style={[styles.detailValue, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {dispute.reasonLabel || t(`disputes.reasons.${dispute.reason}`, dispute.reason.replace(/_/g, ' '))}
              </Text>
            </View>

            {/* Reporter Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelCol}>
                <User size={13} color={theme.colors.text.muted} />
                <Text style={[styles.detailLabel, { color: theme.colors.text.dim }]}>
                  {t('disputes.reportedBy', 'Reported By')}:
                </Text>
              </View>
              <Text
                style={[styles.detailValue, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {reporterLabel}
              </Text>
            </View>

            {/* Disputed Amount Row */}
            {dispute.amountDisputed > 0 && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <Banknote size={13} color={theme.colors.brand.primary} />
                  <Text style={[styles.detailLabel, { color: theme.colors.text.dim }]}>
                    {t('disputes.disputedAmount', 'Disputed Value')}:
                  </Text>
                </View>
                <Text
                  style={[styles.detailAmountValue, { color: theme.colors.brand.primary }]}
                  numberOfLines={1}
                >
                  {formatPKR(dispute.amountDisputed)}
                </Text>
              </View>
            )}
          </View>

          {/* Formal Ruling Verdict for Closed Cases (Clean banner, NO raw chat messages) */}
          {isClosed && (
            <View
              style={[
                styles.closedVerdictBanner,
                {
                  backgroundColor: alpha(colors.success, 0.08),
                  borderColor: alpha(colors.success, 0.22),
                },
              ]}
            >
              <ShieldCheck size={14} color={colors.success} />
              <Text style={[styles.closedVerdictText, { color: theme.colors.text.secondary }]}>
                {dispute.outcomeLabel
                  ? `${dispute.outcomeLabel} • ${t('disputes.officialClosedNotice', 'Case resolved and finalized by ApnaUstad Team.')}`
                  : t('disputes.officialClosedNotice', 'Case resolved and finalized by ApnaUstad Team.')}
              </Text>
            </View>
          )}

          {/* Unread Activity Alert for Active Cases */}
          {!isClosed && unreadCount > 0 && (
            <View
              style={[
                styles.unreadAlertBanner,
                {
                  backgroundColor: alpha(theme.colors.brand.primary, 0.08),
                  borderColor: alpha(theme.colors.brand.primary, 0.25),
                },
              ]}
            >
              <MessageSquare size={13} color={theme.colors.brand.primary} />
              <Text style={[styles.unreadAlertText, { color: theme.colors.brand.primary }]}>
                {unreadCount === 1
                  ? t('disputes.newResponsesWaiting', '1 new response in Case Room', { count: unreadCount })
                  : t('disputes.newResponsesWaiting_other', `${unreadCount} new responses in Case Room`, { count: unreadCount })}
              </Text>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={() => handleOpenRoom(dispute._id)}
            style={[
              styles.actionButton,
              {
                backgroundColor: alpha(theme.colors.brand.primary, 0.12),
                borderColor: alpha(theme.colors.brand.primary, 0.3),
              },
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.actionBtnLeft}>
              <MessageSquare size={14} color={theme.colors.brand.primary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.brand.primary }]}>
                {isClosed
                  ? t('disputes.viewCaseDetails', 'View Case Record')
                  : t('disputes.openCaseRoom', 'Open Case Room')}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {isRTL ? (
              <ChevronLeft size={15} color={theme.colors.brand.primary} />
            ) : (
              <ChevronRight size={15} color={theme.colors.brand.primary} />
            )}
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>
    );
  };

  return (
    <BackgroundWrapper>
      <View style={styles.headerWrapper}>
        <ProfileHeader title={t('disputes.myTitle', 'My Complaints')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        {/* Top Guarantee Pill */}
        <View style={styles.topInfoBar}>
          <View
            style={[
              styles.trustPill,
              {
                backgroundColor: alpha(colors.success, 0.09),
                borderColor: alpha(colors.success, 0.22),
              },
            ]}
          >
            <ShieldCheck size={13} color={colors.success} />
            <Text style={[styles.trustPillText, { color: colors.success }]}>
              {t('disputes.trustBadge', 'Fair 3-Way Dispute Arbitration')}
            </Text>
          </View>
        </View>

        {/* Clean Tabs: Active vs History */}
        <View
          style={[
            styles.tabContainer,
            {
              backgroundColor: alpha(theme.colors.surface.card, 0.6),
              borderColor: theme.colors.border.subtle,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            style={[
              styles.tabBtn,
              activeTab === 'active' && {
                backgroundColor: theme.colors.brand.primary,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'active' ? '#FFFFFF' : theme.colors.text.secondary,
                  fontWeight: activeTab === 'active' ? '800' : '600',
                },
              ]}
            >
              {t('disputes.tabActive', 'Active Disputes')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[
              styles.tabBtn,
              activeTab === 'history' && {
                backgroundColor: theme.colors.brand.primary,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'history' ? '#FFFFFF' : theme.colors.text.secondary,
                  fontWeight: activeTab === 'history' ? '800' : '600',
                },
              ]}
            >
              {t('disputes.tabHistory', 'Case History (Closed)')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>
              {t('common.loading', 'Loading disputes...')}
            </Text>
          </View>
        ) : disputes.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100)}>
            <GlassCard style={styles.emptyCard}>
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: alpha(colors.primary, 0.12),
                    borderColor: alpha(colors.primary, 0.35),
                  },
                ]}
              >
                <ShieldCheck size={36} color={colors.primary} />
              </View>

              <Text style={[styles.emptyTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                {activeTab === 'active'
                  ? t('disputes.noActiveTitle', 'No Active Disputes')
                  : t('disputes.noHistoryTitle', 'No Past Closed Cases')}
              </Text>

              <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
                {activeTab === 'active'
                  ? t('disputes.noActiveSubtitle', 'Any issues reported on ongoing or completed jobs will appear here.')
                  : t('disputes.noHistorySubtitle', 'Resolved and settled complaints will be preserved in your history.')}
              </Text>

              <View style={styles.emptyActions}>
                <CustomButton
                  title={t('disputes.viewBookings', 'View My Bookings')}
                  onPress={() => router.push('/(tabs)/bookings')}
                  variant="primary"
                  icon={<Briefcase size={16} color="#FFFFFF" />}
                  style={{ width: '100%' }}
                />

                <CustomButton
                  title={t('disputes.contactSupport', 'Need Help? Contact Support')}
                  onPress={() => router.push('/profile/help-center')}
                  variant="outline"
                  icon={<HelpCircle size={16} color={theme.colors.brand.primary} />}
                  style={{ width: '100%' }}
                />
              </View>
            </GlassCard>
          </Animated.View>
        ) : (
          <View style={styles.listContainer}>
            {disputes.map((dispute, index) => renderDisputeCard(dispute, index))}
          </View>
        )}
      </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    paddingHorizontal: Spacing.m,
  },
  scrollContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 40,
  },
  topInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  trustPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12.5,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    padding: Spacing.m,
    borderRadius: BorderRadius.l,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  caseBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  caseIdBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  caseIdText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  caseDateText: {
    fontSize: 11,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  serviceTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  serviceSubText: {
    fontSize: 11,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  caseDetailsGrid: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailAmountValue: {
    fontSize: 12.5,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  closedVerdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  closedVerdictText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
    fontWeight: '600',
  },
  unreadAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  unreadAlertText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9.5,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  unreadCountBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.l,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
});
