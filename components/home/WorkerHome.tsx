import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronRight,
  ShieldCheck,
  Radio,
  Hourglass,
  Compass,
  MapPin,
  Power,
  ArrowRight,
  BarChart3,
  Calendar,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useIncomingJob } from '../../context/IncomingJobContext';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography, useThemeShadows } from '../../constants/Theme';
import { HomeHeader } from './HomeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import { ConfirmModal } from '../ui';
import { GlassCard } from './GlassCard';
import api from '../../services/api';
import { WorkerQuickInsights } from './WorkerQuickInsights';
import { WorkerAvailabilityToggle } from './WorkerAvailabilityToggle';
import { WorkerVerificationBanner } from './WorkerVerificationBanner';
import {
  SkeletonBox,
  useShimmerTranslateX,
} from './HomeSkeletonLoader';
import { Booking } from '../../hooks/queries/useData';
import { socketService } from '../../services/socketService';
import { WorkerPendingBidCard } from './WorkerPendingBidCard';
import {
  useConfirmModal,
  useToast,
  useWorkerBids,
  useWithdrawBidMutation,
  useWorkerHomeSummary,
  Bid,
} from '../../hooks';
import { useWorkerAnalytics } from '../../hooks/useWorkerAnalytics';
import { useIsRTL } from '../../context/LanguageContext';

type WorkerCoordinates = {
  latitude: number;
  longitude: number;
};

const cleanAddressFor = (raw?: string) => {
  if (!raw) return 'Nearby service area';
  const cleaned = raw.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '').trim();
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 2) {
    return `${parts[0]}, ${parts[parts.length - 1]}`;
  }
  return cleaned || raw;
};

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'CL';
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
};

export function WorkerHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { token, user } = useAuth();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();
  const toast = useToast();
  const confirmModal = useConfirmModal();
  const {
    isOnline,
    toggleOnline,
  } = useIncomingJob();

  // ─── React Query Hooks (Each Section Loads Separately & Cached) ───
  const {
    data: homeSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useWorkerHomeSummary({ enabled: Boolean(token) });

  const {
    data: workerBids,
    isLoading: bidsLoading,
    refetch: refetchBids,
  } = useWorkerBids();

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useWorkerAnalytics();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllBids, setShowAllBids] = useState(false);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);

  const { mutate: withdrawBid } = useWithdrawBidMutation();

  const insets = useSafeAreaInsets();
  const translateX = useShimmerTranslateX();

  const pendingBids = useMemo(() => {
    return workerBids?.filter((bid) => bid.status === 'pending') || [];
  }, [workerBids]);

  const activeBookings = useMemo(() => {
    const list: Booking[] = [];
    if (homeSummary?.activeBooking) {
      list.push(homeSummary.activeBooking);
    }
    if (homeSummary?.recentBookings) {
      homeSummary.recentBookings.forEach((b) => {
        if (
          (b.status === 'accepted' || b.status === 'ongoing') &&
          !list.some((item) => item._id === b._id)
        ) {
          list.push(b);
        }
      });
    }
    return list;
  }, [homeSummary?.activeBooking, homeSummary?.recentBookings]);

  const hasActiveJobs = activeBookings.length > 0;
  const activeBooking = activeBookings[0] || null;

  // ─── Location & Background Sync (Non-blocking) ───────────────────────────────
  const getSavedCoordinates = useCallback((): WorkerCoordinates | null => {
    const coordinates = (user as any)?.location?.coordinates;
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
    return null;
  }, [user]);

  const resolveWorkerLocation = useCallback(async (): Promise<WorkerCoordinates | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
      }
    } catch (error) {
      console.warn('Could not read device location, using saved worker location:', error);
    }
    return getSavedCoordinates();
  }, [getSavedCoordinates]);

  const syncWorkerLocation = useCallback(async (coordinates?: WorkerCoordinates | null) => {
    try {
      if (!user?._id) return;
      const payload: any = {};
      if (coordinates) {
        payload.longitude = coordinates.longitude;
        payload.latitude = coordinates.latitude;
      }
      if (Object.keys(payload).length === 0) return;
      await api.patch(`/workers/${user._id}`, payload);
    } catch (error) {
      console.error('❌ Error syncing worker location:', error);
    }
  }, [user?._id]);

  // Background non-blocking location sync
  useEffect(() => {
    if (!token || !user?._id) return;
    resolveWorkerLocation().then((coords) => {
      if (coords) syncWorkerLocation(coords);
    }).catch(() => {});
  }, [token, user?._id, resolveWorkerLocation, syncWorkerLocation]);

  // ─── Refresh Helpers ──────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    resolveWorkerLocation().then((coords) => {
      if (coords) syncWorkerLocation(coords);
    }).catch(() => {});
    await Promise.allSettled([
      refetchSummary(),
      refetchBids(),
      refetchAnalytics(),
    ]);
    setIsRefreshing(false);
  }, [refetchSummary, refetchBids, refetchAnalytics, resolveWorkerLocation, syncWorkerLocation]);

  const refreshWorkerActivity = useCallback(() => {
    refetchSummary();
    refetchBids();
    refetchAnalytics();
  }, [refetchSummary, refetchBids, refetchAnalytics]);

  useEffect(() => {
    if (!token) return;
    const events = [
      'bid:won', 'bid:lost', 'bid:submitted', 'bid:withdrawn',
      'booking:accepted', 'booking:ongoing', 'booking:completed', 'booking:cancelled',
    ];
    const unsubs = events.map((event) => socketService.on(event, refreshWorkerActivity));
    return () => unsubs.forEach((u) => u());
  }, [token, refreshWorkerActivity]);

  // ─── Booking Handlers ─────────────────────────────────────────────────────────
  const handleBookingDetails = useCallback((booking: Booking) => {
    router.push({ pathname: '/transaction-details' as any, params: { id: booking._id } });
  }, [router]);

  // ─── Bid Handlers ────────────────────────────────────────────────────────────
  const handleBidDetails = useCallback((bid: Bid) => {
    router.push({
      pathname: '/pending-bid-details' as any,
      params: {
        id: typeof bid.jobPost === 'object' ? bid.jobPost?._id : bid.jobPost,
        pendingBidId: bid._id,
      },
    });
  }, [router]);

  const handleWithdrawBid = useCallback((bid: Bid) => {
    confirmModal.showConfirm(
      t('home.worker.withdrawBidTitle', 'Withdraw Bid'),
      t('home.worker.withdrawBidConfirm', 'Are you sure you want to withdraw your bid for this job?'),
      () => {
        confirmModal.closeConfirm();
        setWithdrawingBidId(bid._id);
        withdrawBid(
          { bidId: bid._id },
          {
            onSuccess: () => {
              refetchBids();
              setWithdrawingBidId(null);
            },
            onError: (error) => {
              console.error('Error withdrawing bid:', error);
              setWithdrawingBidId(null);
              toast.error(t('common.error', 'Error'), t('home.worker.withdrawBidFailed', 'Failed to withdraw the bid. Please try again.'));
            },
          }
        );
      },
      undefined,
      t('pendingBidDetails.withdraw', 'Withdraw'),
      t('common.cancel', 'Cancel'),
      colors.error
    );
  }, [colors.error, confirmModal, toast, withdrawBid, refetchBids, t]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cyan}
            colors={[colors.cyan]}
          />
        }
      >
        <HomeHeader />

        <WorkerVerificationBanner />

        <View style={styles.toggleSection}>
          <WorkerAvailabilityToggle isOnline={isOnline} onToggle={toggleOnline} />
        </View>

        {/* ── Worker Earnings Snapshot ── */}
        <View style={styles.dashboardSection}>
          {analyticsData?.summary ? (
            <WorkerQuickInsights summary={analyticsData.summary} />
          ) : analyticsLoading ? (
            <View style={styles.insightsSkeletonRow}>
              <SkeletonBox translateX={translateX} width={'31%'} height={110} borderRadius={20} />
              <SkeletonBox translateX={translateX} width={'31%'} height={110} borderRadius={20} />
              <SkeletonBox translateX={translateX} width={'31%'} height={110} borderRadius={20} />
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.walletInsightsLink}
            onPress={() => router.push('/(tabs)/wallet')}
            activeOpacity={0.7}
          >
            <BarChart3 size={14} color={colors.cyan} />
            <Text style={[styles.walletInsightsLinkText, { color: colors.cyan }]}>
              {t('home.worker.viewWalletCharts', 'View weekly analytics & wallet history')}
            </Text>
            <ChevronRight size={13} color={colors.cyan} />
          </TouchableOpacity>
        </View>

        {/* ── Dynamic Operational Cockpit: Ongoing Work (when active) OR Ready For Jobs (when idle) ── */}
        {hasActiveJobs ? (
          <Animated.View entering={FadeInDown.duration(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Zap color={colors.cyan} size={20} />
                <Text style={[styles.sectionTitle, typography.threeD, { color: colors.cyan }]}>
                  {t('home.worker.ongoingWorkTitle', 'Ongoing Work')}
                </Text>
              </View>
              <Text style={[styles.sectionMeta, { color: colors.cyan }]}>
                {activeBookings.length} {t('common.active', 'ACTIVE').toUpperCase()}
              </Text>
            </View>

            <View style={styles.agendaList}>
              {activeBookings.map((booking) => {
                const isOngoing = booking.status === 'ongoing';
                const customerName =
                  booking.customer?.fullName ||
                  booking.cardMeta?.counterParty?.fullName ||
                  t('common.client', 'Customer');
                const customerAvatar =
                  booking.cardMeta?.primaryImageUrl ||
                  booking.customer?.profileImage ||
                  '';
                const bookingCategory =
                  booking.category ||
                  (booking as any).serviceName ||
                  t('transactionDetails.jobDetails', 'Service Request');
                const bookingAddress = cleanAddressFor(
                  booking.address || booking.cardMeta?.location?.address
                );
                const earningAmount = Number(
                  booking.workerEarning ||
                    booking.cardMeta?.financial?.amount ||
                    booking.totalAmount ||
                    0
                );

                return (
                  <GlassCard
                    key={booking._id}
                    intensity={35}
                    padding={16}
                    hasGlow
                    glowColor={isOngoing ? colors.success : colors.cyan}
                    style={[
                      styles.heroCard,
                      {
                        borderColor: alpha(isOngoing ? colors.success : colors.cyan, 0.35),
                        borderLeftWidth: 3.5,
                        borderLeftColor: isOngoing ? colors.success : colors.cyan,
                        marginBottom: 12,
                      },
                    ]}
                  >
                    {/* Top Status & Timing Row */}
                    <View style={styles.heroTopRow}>
                      <View
                        style={[
                          styles.heroStatusPill,
                          {
                            backgroundColor: alpha(
                              isOngoing ? colors.success : colors.cyan,
                              0.12
                            ),
                            borderColor: alpha(
                              isOngoing ? colors.success : colors.cyan,
                              0.3
                            ),
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.pulseDot,
                            { backgroundColor: isOngoing ? colors.success : colors.cyan },
                          ]}
                        />
                        <Text
                          style={[
                            styles.heroStatusText,
                            { color: isOngoing ? colors.success : colors.cyan },
                          ]}
                        >
                          {isOngoing
                            ? t('bookingStatus.ongoing.title', 'WORK IN PROGRESS')
                            : t('bookingStatus.accepted.title', 'BOOKED / ASSIGNED')}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.urgencyPill,
                          {
                            backgroundColor:
                              booking.bookingType === 'instant'
                                ? alpha(colors.worker, 0.12)
                                : alpha(theme.colors.text.primary, 0.06),
                            borderColor:
                              booking.bookingType === 'instant'
                                ? alpha(colors.worker, 0.28)
                                : alpha(theme.colors.text.primary, 0.1),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyPillText,
                            {
                              color:
                                booking.bookingType === 'instant'
                                  ? colors.worker
                                  : theme.colors.text.secondary,
                            },
                          ]}
                        >
                          {booking.bookingType === 'instant' ? '⚡ Urgent' : '📅 Scheduled'}
                        </Text>
                      </View>
                    </View>

                    {/* Job Title & Optional Description */}
                    <Text
                      style={[
                        styles.heroJobTitle,
                        typography.threeD,
                        { color: theme.colors.text.primary },
                      ]}
                      numberOfLines={1}
                    >
                      {bookingCategory}
                    </Text>

                    {Boolean(booking.description) && (
                      <Text
                        style={[styles.heroDescription, { color: theme.colors.text.muted }]}
                        numberOfLines={1}
                      >
                        {booking.description}
                      </Text>
                    )}

                    {/* Customer & Location Row */}
                    <View style={styles.heroCustomerBlock}>
                      <View style={styles.heroCustomerLeft}>
                        <View
                          style={[
                            styles.customerMiniAvatar,
                            {
                              borderColor: alpha(
                                isOngoing ? colors.success : colors.cyan,
                                0.3
                              ),
                            },
                          ]}
                        >
                          {customerAvatar ? (
                            <Image
                              source={{ uri: customerAvatar }}
                              style={styles.customerMiniImg}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.customerMiniText,
                                { color: theme.colors.text.primary },
                              ]}
                            >
                              {initialsFor(customerName)}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.heroCustomerName,
                            { color: theme.colors.text.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {customerName}
                        </Text>
                      </View>

                      <View style={styles.heroLocationRow}>
                        <MapPin
                          size={12}
                          color={theme.colors.text.muted}
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            styles.heroAddressText,
                            { color: theme.colors.text.muted },
                          ]}
                          numberOfLines={1}
                        >
                          {bookingAddress}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Earning & Track CTA */}
                    <View style={styles.heroFooterRow}>
                      <View style={styles.heroEarningBox}>
                        <Text
                          style={[
                            styles.heroEarningLabel,
                            { color: theme.colors.text.muted },
                          ]}
                        >
                          {t('transactionDetails.yourEarning', 'Your Earning')}
                        </Text>
                        <Text
                          style={[styles.heroEarningValue, { color: colors.success }]}
                        >
                          Rs. {earningAmount.toLocaleString()}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.heroCtaBtn,
                          {
                            backgroundColor: isOngoing ? colors.success : colors.cyan,
                          },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/transaction-details' as any,
                            params: { id: booking._id },
                          })
                        }
                        activeOpacity={0.82}
                      >
                        <Text style={styles.heroCtaBtnText}>
                          {t('home.worker.continueJob', 'Track & Continue Job')}
                        </Text>
                        <ArrowRight size={15} color="#001014" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </Animated.View>
        ) : isOnline ? (
          <View style={styles.heroSection}>
            <GlassCard
              intensity={28}
              padding={18}
              hasGlow
              glowColor={colors.cyan}
              style={[styles.heroCard, { borderColor: alpha(colors.cyan, 0.25) }]}
            >
              <View style={styles.radarHeroRow}>
                <View style={[styles.radarIconWrap, { backgroundColor: alpha(colors.cyan, 0.12), borderColor: alpha(colors.cyan, 0.3) }]}>
                  <Compass size={28} color={colors.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.heroStatusPill}>
                    <View style={[styles.pulseDot, { backgroundColor: colors.cyan }]} />
                    <Text style={[styles.heroStatusText, { color: colors.cyan }]}>
                      {t('home.worker.radarActive', 'RADAR IS ACTIVE')}
                    </Text>
                  </View>
                  <Text style={[styles.heroRadarTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                    {t('home.worker.readyForJobs', 'Ready For New Jobs')}
                  </Text>
                  <Text style={[styles.heroRadarSub, { color: theme.colors.text.muted }]}>
                    {t('home.worker.radarDesc', 'Live alerts ring directly on your phone when clients book nearby.')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.heroCtaBtn, { backgroundColor: colors.cyan }]}
                onPress={() => router.push('/(tabs)/jobs' as any)}
                activeOpacity={0.8}
              >
                <Compass size={16} color="#000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={styles.heroCtaBtnText}>
                  {t('home.worker.browseJobsBtn', 'Browse Available Jobs Nearby')}
                </Text>
                <ChevronRight size={16} color="#000" strokeWidth={2.5} />
              </TouchableOpacity>
            </GlassCard>
          </View>
        ) : (
          <View style={styles.heroSection}>
            <GlassCard
              intensity={24}
              padding={18}
              style={[styles.heroCard, { borderColor: alpha(theme.colors.text.muted, 0.2) }]}
            >
              <View style={styles.radarHeroRow}>
                <View style={[styles.radarIconWrap, { backgroundColor: alpha(theme.colors.text.muted, 0.1), borderColor: alpha(theme.colors.text.muted, 0.2) }]}>
                  <Power size={26} color={theme.colors.text.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroRadarTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                    {t('home.worker.youAreOffline', 'You Are Currently Offline')}
                  </Text>
                  <Text style={[styles.heroRadarSub, { color: theme.colors.text.muted }]}>
                    {t('home.worker.offlineDesc', 'Turn on your availability to receive customer booking alerts.')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.heroCtaBtn, { backgroundColor: colors.worker }]}
                onPress={() => toggleOnline(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.heroCtaBtnText, { color: '#000' }]}>
                  {t('home.worker.goOnlineNow', 'Go Online Now')}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* ── Section: Your Active Bids (Sent Offers) ── */}
        {pendingBids.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Hourglass color={colors.worker} size={22} />
                <Text style={[styles.sectionTitle, typography.threeD, { color: colors.worker }]}>{t('home.worker.activeBids')}</Text>
              </View>
              {pendingBids.length > 2 ? (
                <TouchableOpacity onPress={() => setShowAllBids(!showAllBids)}>
                  <Text style={[styles.seeAll, { color: colors.worker }]}>
                    {showAllBids ? t('home.client.showLess') : `${t('home.client.viewAll')} (${pendingBids.length})`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.sectionMeta, { color: colors.worker }]}>{pendingBids.length} {t('common.active').toUpperCase()}</Text>
              )}
            </View>

            <View style={styles.agendaList}>
              {pendingBids.slice(0, showAllBids ? undefined : 2).map((bid, index) => (
                <WorkerPendingBidCard
                  key={bid._id}
                  bid={bid}
                  index={index}
                  onDetails={handleBidDetails}
                  onWithdraw={handleWithdrawBid}
                  isWithdrawing={withdrawingBidId === bid._id}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Section 3: Clean Job History Shortcut ── */}
        <TouchableOpacity
          style={[
            styles.historyLinkCard,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: alpha(theme.colors.surface.card, 0.35),
            },
          ]}
          onPress={() => router.push('/(tabs)/bookings')}
          activeOpacity={0.7}
        >
          <View style={styles.historyLinkRow}>
            <View style={[styles.historyIconWrap, { backgroundColor: alpha(colors.cyan, 0.12) }]}>
              <ShieldCheck size={20} color={colors.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyLinkTitle, { color: theme.colors.text.primary }]}>
                {t('home.worker.viewJobHistory', 'Completed & Past Jobs')}
              </Text>
              <Text style={[styles.historyLinkSub, { color: theme.colors.text.muted }]}>
                {t('home.worker.viewHistoryInBookings', 'Access your completed bookings, client reviews & receipts')}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.muted} />
          </View>
        </TouchableOpacity>


        <View style={{ height: 120 }} />
      </ScrollView>
      <ConfirmModal
        visible={confirmModal.visible}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmColor={confirmModal.confirmColor}
        isLoading={Boolean(withdrawingBidId)}
      />
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  toggleSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.xs,
  },
  dashboardSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.m,
  },
  insightsSkeletonRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 0,
  },
  section: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.l,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionMeta: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0,
  },
  seeAll: {
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontSize: 11,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  agendaList: {
    gap: 12,
  },
  recentBookingList: {
    marginHorizontal: -Spacing.l,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  walletInsightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },
  walletInsightsLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.l,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTimeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urgencyPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroJobTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  heroCustomerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  heroCustomerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  customerMiniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  customerMiniImg: {
    width: '100%',
    height: '100%',
  },
  customerMiniText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroCustomerRow: {
    marginBottom: 14,
    gap: 4,
  },
  heroCustomerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  heroAddressText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  heroEarningBox: {
    justifyContent: 'center',
  },
  heroEarningLabel: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroEarningValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 6,
    marginTop: 6,
  },
  heroCtaBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  radarHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  radarIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroRadarTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 2,
  },
  heroRadarSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  historyLinkCard: {
    marginHorizontal: Spacing.l,
    marginTop: Spacing.xl,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  historyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLinkTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  historyLinkSub: {
    fontSize: 11,
    lineHeight: 15,
  },
});
