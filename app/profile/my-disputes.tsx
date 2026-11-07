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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Banknote,
  AlertCircle,
  Briefcase,
  HelpCircle,
  Layers,
  User,
  Sparkles,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { useMyDisputes, type DisputeRecord } from '../../hooks/queries/useDisputes';
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
  const { data: allDisputes = [] } = useMyDisputes('all');

  const counts = useMemo(() => {
    if (allDisputes && allDisputes.length > 0) {
      return {
        active: allDisputes.filter((d) => !d.isClosed).length,
        history: allDisputes.filter((d) => d.isClosed).length,
      };
    }
    return {
      active: activeTab === 'active' ? disputes.length : 0,
      history: activeTab === 'history' ? disputes.length : 0,
    };
  }, [allDisputes, disputes, activeTab]);

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

    // Visual status indicators
    let statusColor = '#00C6FF';
    let statusLabel = t('disputes.badgeOpen', 'Report Received');
    let StatusIcon = AlertTriangle;

    if (isClosed) {
      statusColor = '#10B981';
      StatusIcon = CheckCircle2;
      if (dispute.outcome === 'customer_favor') {
        statusLabel = t('disputes.verdictCustomerFavored', 'Customer Upheld');
      } else if (dispute.outcome === 'worker_favor') {
        statusLabel = t('disputes.verdictDismissed', 'Ustad Cleared');
      } else if (dispute.outcome === 'settled') {
        statusLabel = t('disputes.verdictSettled', 'Settled');
      } else {
        statusLabel = dispute.outcomeLabel || t('disputes.badgeClosed', 'Closed');
        statusColor = '#94A3B8';
      }
    } else if (dispute.status === 'under_review') {
      statusColor = '#F59E0B';
      statusLabel = t('disputes.badgeUnderReview', 'Under Review');
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
      <Animated.View key={dispute._id} entering={FadeInDown.delay(index * 50).duration(260)}>
        <View
          style={[
            styles.disputeCard,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: isClosed
                ? theme.colors.border.default
                : alpha(statusColor, theme.isDark ? 0.45 : 0.65),
            },
          ]}
        >
          {/* Subtle gradient sheen at the top of the card */}
          <LinearGradient
            colors={
              isClosed
                ? [theme.isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)', 'transparent']
                : [theme.isDark ? alpha(statusColor, 0.09) : alpha(statusColor, 0.05), 'transparent']
            }
            style={styles.cardSheen}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Header Row: Service Icon & Title + Status Pill */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.serviceIconTile,
                  {
                    backgroundColor: isClosed
                      ? (theme.isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)')
                      : alpha(theme.colors.brand.primary, 0.12),
                    borderColor: isClosed
                      ? 'rgba(16, 185, 129, 0.25)'
                      : alpha(theme.colors.brand.primary, 0.25),
                  },
                ]}
              >
                <Layers
                  size={18}
                  color={isClosed ? '#10B981' : theme.colors.brand.primary}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.serviceMeta}>
                <Text style={[styles.serviceTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {booking?.category || t('disputes.booking', 'Service Booking')}
                </Text>
                <View style={styles.caseIdRow}>
                  <Text style={[styles.caseIdText, { color: theme.colors.brand.primary }]}>
                    #{shortCaseId}
                  </Text>
                  {filedDate ? (
                    <>
                      <Text style={[styles.dotSeparator, { color: theme.colors.text.dim }]}>•</Text>
                      <Text style={[styles.caseDateText, { color: theme.colors.text.dim }]}>
                        {filedDate}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Status Pill Badge */}
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: alpha(statusColor, 0.12),
                  borderColor: alpha(statusColor, 0.28),
                },
              ]}
            >
              <StatusIcon size={12} color={statusColor} strokeWidth={2.4} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Clean Case Specs Container */}
          <View
            style={[
              styles.specsContainer,
              {
                backgroundColor: theme.colors.surface.subtle,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            {/* Issue Row */}
            <View style={styles.specRow}>
              <View style={styles.specLabelWrap}>
                <AlertCircle size={13} color={theme.colors.text.dim} strokeWidth={2} />
                <Text style={[styles.specLabel, { color: theme.colors.text.dim }]}>
                  {t('disputes.issue', 'Issue')}
                </Text>
              </View>
              <Text style={[styles.specValue, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {dispute.reasonLabel || t(`disputes.reasons.${dispute.reason}`, dispute.reason?.replace(/_/g, ' ') || 'Reported Issue')}
              </Text>
            </View>

            <View style={[styles.specDivider, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]} />

            {/* Reported By Row */}
            <View style={styles.specRow}>
              <View style={styles.specLabelWrap}>
                <User size={13} color={theme.colors.text.dim} strokeWidth={2} />
                <Text style={[styles.specLabel, { color: theme.colors.text.dim }]}>
                  {t('disputes.reportedBy', 'Reported By')}
                </Text>
              </View>
              <Text style={[styles.specValue, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {reporterLabel}
              </Text>
            </View>

            {/* Disputed Amount (Only if > 0) */}
            {dispute.amountDisputed > 0 && (
              <>
                <View style={[styles.specDivider, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]} />
                <View style={styles.specRow}>
                  <View style={styles.specLabelWrap}>
                    <Banknote size={13} color={theme.colors.text.dim} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: theme.colors.text.dim }]}>
                      {t('disputes.disputedAmount', 'Disputed Value')}
                    </Text>
                  </View>
                  <Text style={[styles.specAmountValue, { color: theme.colors.brand.primary }]}>
                    {formatPKR(dispute.amountDisputed)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Official Verdict Banner for Closed Cases */}
          {isClosed && (
            <View
              style={[
                styles.verdictBanner,
                {
                  backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                  borderColor: 'rgba(16, 185, 129, 0.22)',
                },
              ]}
            >
              <ShieldCheck size={16} color="#10B981" strokeWidth={2.4} />
              <View style={styles.verdictTextCol}>
                <Text style={[styles.verdictTitle, { color: '#10B981' }]}>
                  {dispute.outcomeLabel || t('disputes.verdictSettled', 'Settled by both sides')}
                </Text>
                <Text style={[styles.verdictDesc, { color: theme.colors.text.secondary }]}>
                  {t('disputes.officialClosedNotice', 'Case resolved and finalized by ApnaUstad Team.')}
                </Text>
              </View>
            </View>
          )}

          {/* Unread Activity Alert for Active Cases */}
          {!isClosed && unreadCount > 0 && (
            <View
              style={[
                styles.unreadBanner,
                {
                  backgroundColor: alpha(theme.colors.brand.primary, 0.09),
                  borderColor: alpha(theme.colors.brand.primary, 0.25),
                },
              ]}
            >
              <MessageSquare size={14} color={theme.colors.brand.primary} strokeWidth={2.4} />
              <Text style={[styles.unreadBannerText, { color: theme.colors.brand.primary }]}>
                {unreadCount === 1
                  ? t('disputes.newResponsesWaiting', '1 new response in Case Room', { count: unreadCount })
                  : t('disputes.newResponsesWaiting_other', `${unreadCount} new responses in Case Room`, { count: unreadCount })}
              </Text>
            </View>
          )}

          {/* Full-width Case Action Button */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleOpenRoom(dispute._id);
            }}
            style={[
              styles.actionCardButton,
              {
                backgroundColor: theme.colors.surface.subtle,
                borderColor: theme.colors.border.default,
              },
            ]}
          >
            <View style={styles.actionCardLeft}>
              <MessageSquare size={15} color={theme.colors.brand.primary} strokeWidth={2.2} />
              <Text style={[styles.actionCardLabel, { color: theme.colors.brand.primary }]}>
                {isClosed
                  ? t('disputes.viewCaseDetails', 'View Case Record')
                  : t('disputes.openCaseRoom', 'Open Case Room')}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadgePill}>
                  <Text style={styles.unreadBadgePillText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {isRTL ? (
              <ChevronLeft size={16} color={theme.colors.brand.primary} strokeWidth={2.4} />
            ) : (
              <ChevronRight size={16} color={theme.colors.brand.primary} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </View>
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
        {/* ── Hero Trust Card (Replaces the raw floating pill) ── */}
        <Animated.View entering={FadeInDown.duration(240)}>
          <View
            style={[
              styles.heroTrustCard,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.default,
              },
            ]}
          >
            <LinearGradient
              colors={
                theme.isDark
                  ? ['rgba(16, 185, 129, 0.14)', 'rgba(6, 182, 212, 0.05)', 'transparent']
                  : ['rgba(16, 185, 129, 0.09)', 'rgba(6, 182, 212, 0.03)', 'transparent']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTrustIconWrap}>
              <ShieldCheck size={22} color="#10B981" strokeWidth={2.4} />
            </View>
            <View style={styles.heroTrustContent}>
              <View style={styles.heroTrustTitleRow}>
                <Text style={[styles.heroTrustTitle, { color: theme.colors.text.primary }]}>
                  {t('disputes.trustBadge', '100% Fair Resolution Guarantee')}
                </Text>
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={11} color="#10B981" strokeWidth={2.4} />
                  <Text style={styles.verifiedBadgeText}>
                    {t('disputes.protected', 'Protected')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.heroTrustDesc, { color: theme.colors.text.secondary }]}>
                {t(
                  'disputes.trustSubtitle',
                  'Independent arbitration by ApnaUstad. Funds stay protected until both sides reach a fair solution.'
                )}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Segmented Tab Bar ── */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.colors.surface.subtle,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          {/* Active Tab */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('active');
            }}
            style={[
              styles.tabItem,
              activeTab === 'active' && [
                styles.tabItemActive,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.default,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === 'active' ? theme.colors.text.primary : theme.colors.text.secondary,
                  fontWeight: activeTab === 'active' ? '800' : '600',
                },
              ]}
            >
              {t('disputes.tabActive', 'Active Complaints')}
            </Text>
            {counts.active > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'active'
                        ? theme.colors.brand.primary
                        : theme.isDark
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color: activeTab === 'active' ? '#FFFFFF' : theme.colors.text.secondary,
                    },
                  ]}
                >
                  {counts.active}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* History Tab */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('history');
            }}
            style={[
              styles.tabItem,
              activeTab === 'history' && [
                styles.tabItemActive,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.default,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === 'history' ? theme.colors.text.primary : theme.colors.text.secondary,
                  fontWeight: activeTab === 'history' ? '800' : '600',
                },
              ]}
            >
              {t('disputes.tabHistory', 'History (Closed)')}
            </Text>
            {counts.history > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'history'
                        ? theme.colors.brand.primary
                        : theme.isDark
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color: activeTab === 'history' ? '#FFFFFF' : theme.colors.text.secondary,
                    },
                  ]}
                >
                  {counts.history}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Content View ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>
              {t('common.loading', 'Loading disputes...')}
            </Text>
          </View>
        ) : disputes.length === 0 ? (
          /* ── Premium Empty State (Clean & Spacious, No Giant Clunky Outer Box) ── */
          <Animated.View entering={FadeInDown.delay(80).duration(280)} style={styles.emptyContainer}>
            {/* Layered glowing concentric rings */}
            <View style={styles.emptyHeroRings}>
              <View
                style={[
                  styles.emptyOuterRing,
                  {
                    backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.04)' : 'rgba(0, 168, 107, 0.04)',
                    borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.14)' : 'rgba(0, 168, 107, 0.14)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyInnerRing,
                    {
                      backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.11)' : 'rgba(0, 168, 107, 0.10)',
                      borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.28)' : 'rgba(0, 168, 107, 0.24)',
                    },
                  ]}
                >
                  <ShieldCheck size={34} color={colors.success || '#10B981'} strokeWidth={2.4} />
                </View>
              </View>
            </View>

            <Text style={[styles.emptyHeadline, { color: theme.colors.text.primary }]}>
              {activeTab === 'active'
                ? t('disputes.noActiveTitle', 'No Active Disputes')
                : t('disputes.noHistoryTitle', 'No Past Closed Cases')}
            </Text>

            <Text style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
              {activeTab === 'active'
                ? t('disputes.noActiveSubtitle', 'Any ongoing issues reported on jobs will appear here.')
                : t('disputes.noHistorySubtitle', 'Resolved and settled complaints will be preserved in your history.')}
            </Text>

            {/* Quick Assurance Strip */}
            {activeTab === 'active' && (
              <View
                style={[
                  styles.assuranceBox,
                  {
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <View style={styles.assuranceItem}>
                  <Scale size={16} color={theme.colors.brand.primary} strokeWidth={2.2} />
                  <Text style={[styles.assuranceText, { color: theme.colors.text.secondary }]}>
                    {t('disputes.arbitrationAssurance', 'Fair 3-way arbitration between Customer, Ustad & Mediator')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.assuranceDivider,
                    { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
                  ]}
                />
                <View style={styles.assuranceItem}>
                  <Banknote size={16} color="#10B981" strokeWidth={2.2} />
                  <Text style={[styles.assuranceText, { color: theme.colors.text.secondary }]}>
                    {t('disputes.paymentFreezeAssurance', 'Payments are safely protected until the issue is resolved')}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.emptyActionButtons}>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/bookings');
                }}
                style={styles.primaryActionButton}
              >
                <LinearGradient
                  colors={theme.isDark ? ['#00C6FF', '#0072FF'] : ['#0072FF', '#00C6FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryActionGradient}
                >
                  <Briefcase size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.primaryActionText}>
                    {t('disputes.viewBookings', 'View My Bookings')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/profile/help-center');
                }}
                style={[
                  styles.secondaryActionButton,
                  {
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <HelpCircle size={16} color={theme.colors.text.secondary} strokeWidth={2.2} />
                <Text style={[styles.secondaryActionText, { color: theme.colors.text.primary }]}>
                  {t('disputes.contactSupport', 'Need Help? Contact Support')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          /* ── Dispute Cards List ── */
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
    paddingBottom: 48,
  },

  /* Hero Trust Card */
  heroTrustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 18,
    borderWidth: 1.6,
    marginBottom: 16,
    overflow: 'hidden',
    gap: 12,
  },
  heroTrustIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroTrustContent: {
    flex: 1,
    gap: 3,
  },
  heroTrustTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroTrustTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.2,
  },
  heroTrustDesc: {
    fontSize: 12.5,
    lineHeight: 17,
  },

  /* Segmented Tab Bar */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.6,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabItemActive: {
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Loading State */
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  /* Cards List */
  listContainer: {
    gap: 14,
  },
  disputeCard: {
    borderRadius: 22,
    borderWidth: 1.8,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  serviceIconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  serviceMeta: {
    flex: 1,
    gap: 2,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  caseIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  caseIdText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  dotSeparator: {
    fontSize: 10,
  },
  caseDateText: {
    fontSize: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* Specs Container */
  specsContainer: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  specLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  specValue: {
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  specAmountValue: {
    fontSize: 13.5,
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'right',
  },
  specDivider: {
    height: 1,
    width: '100%',
  },

  /* Verdict Banner */
  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  verdictTextCol: {
    flex: 1,
    gap: 2,
  },
  verdictTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  verdictDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  /* Unread Alert */
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  unreadBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },

  /* Action Card Button */
  actionCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCardLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  unreadBadgePill: {
    backgroundColor: '#EF4444',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadBadgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  /* Premium Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 24,
  },
  emptyHeroRings: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyOuterRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInnerRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeadline: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 20,
  },
  assuranceBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 22,
  },
  assuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assuranceText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  assuranceDivider: {
    height: 1,
    width: '100%',
  },
  emptyActionButtons: {
    width: '100%',
    gap: 10,
  },
  primaryActionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryActionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
