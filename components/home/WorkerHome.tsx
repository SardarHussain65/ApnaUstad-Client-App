import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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
import { WorkerAlertJobCard } from './WorkerAlertJobCard';
import { WorkerQuickInsights } from './WorkerQuickInsights';
import { IncomingJobModal } from './IncomingJobModal';
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
  useMissedJobs,
  Bid,
} from '../../hooks';
import { useWorkerAnalytics } from '../../hooks/useWorkerAnalytics';
import { useIsRTL } from '../../context/LanguageContext';

type WorkerCoordinates = {
  latitude: number;
  longitude: number;
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
    dismissedJobs,
    clearDismissedJob,
    acceptDismissedJob,
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
    data: missedJobs = [],
    isLoading: missedJobsLoading,
    refetch: refetchMissed,
  } = useMissedJobs({ enabled: Boolean(token) });

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
  const [acceptingAlertJobId, setAcceptingAlertJobId] = useState<string | null>(null);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [selectedSignalJob, setSelectedSignalJob] = useState<any | null>(null);
  const [locallyDismissedJobIds, setLocallyDismissedJobIds] = useState<Set<string>>(new Set());
  const [showAllBids, setShowAllBids] = useState(false);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);

  const { mutate: withdrawBid } = useWithdrawBidMutation();

  const insets = useSafeAreaInsets();
  const translateX = useShimmerTranslateX();

  const pendingBids = useMemo(() => {
    return workerBids?.filter((bid) => bid.status === 'pending') || [];
  }, [workerBids]);

  const activeBooking = useMemo(() => {
    return homeSummary?.activeBooking || null;
  }, [homeSummary?.activeBooking]);

  // ─── Merged Recent Signals (deduped) ─────────────────────────────────────────
  const recentSignals = useMemo(() => {
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const job of dismissedJobs) {
      if (!seen.has(job._id) && !locallyDismissedJobIds.has(job._id)) {
        seen.add(job._id);
        merged.push({ ...job, _signalSource: 'dismissed' });
      }
    }
    for (const job of missedJobs) {
      if (!seen.has(job._id) && !locallyDismissedJobIds.has(job._id)) {
        seen.add(job._id);
        merged.push({ ...job, _signalSource: 'missed' });
      }
    }
    return merged;
  }, [dismissedJobs, missedJobs, locallyDismissedJobIds]);

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
      refetchMissed(),
      refetchBids(),
      refetchAnalytics(),
    ]);
    setIsRefreshing(false);
  }, [refetchSummary, refetchMissed, refetchBids, refetchAnalytics, resolveWorkerLocation, syncWorkerLocation]);

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

  // ─── Signal Handlers ──────────────────────────────────────────────────────────
  const handleOpenSignalDetails = useCallback((job: any) => {
    setSelectedSignalJob(job);
  }, []);

  const handleAcceptSignalJob = useCallback(async (job: any) => {
    setAcceptingAlertJobId(job._id);
    try {
      await acceptDismissedJob(job);
      setLocallyDismissedJobIds(prev => new Set([...prev, job._id]));
      setSelectedSignalJob(null);
      refetchMissed();
    } finally {
      setAcceptingAlertJobId(null);
    }
  }, [acceptDismissedJob, refetchMissed]);

  const handleDismissSignalJob = useCallback((jobId: string) => {
    clearDismissedJob(jobId);
    setLocallyDismissedJobIds(prev => new Set([...prev, jobId]));
    setSelectedSignalJob((prev: any | null) => prev?._id === jobId ? null : prev);
  }, [clearDismissedJob]);

  const handleCounterOfferSignalJob = useCallback((job: any) => {
    clearDismissedJob(job._id);
    setLocallyDismissedJobIds(prev => new Set([...prev, job._id]));
    setSelectedSignalJob(null);
    router.push({
      pathname: '/bid-submission' as any,
      params: {
        jobId: job._id,
        title: job.category,
        urgency: job.urgency,
        responseMode: 'counter',
      },
    });
  }, [clearDismissedJob, router]);

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

        {/* ── Dynamic Operational Cockpit (Hero Action Card) ── */}
        {activeBooking ? (
          <View style={styles.heroSection}>
            <GlassCard
              intensity={35}
              padding={18}
              hasGlow
              glowColor={colors.cyan}
              style={[styles.heroCard, { borderColor: alpha(colors.cyan, 0.4) }]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroStatusPill}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.cyan }]} />
                  <Text style={[styles.heroStatusText, { color: colors.cyan }]}>
                    {t('home.worker.activeJobTitle', 'ACTIVE JOB IN PROGRESS')}
                  </Text>
                </View>
                <Text style={[styles.heroTimeText, { color: theme.colors.text.muted }]}>
                  {activeBooking.bookingType === 'instant' ? '⚡ Urgent' : '📅 Scheduled'}
                </Text>
              </View>

              <Text style={[styles.heroJobTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                {activeBooking.category || (activeBooking as any).serviceName || 'Service Request'}
              </Text>

              <View style={styles.heroCustomerRow}>
                <Text style={[styles.heroCustomerName, { color: theme.colors.text.secondary }]}>
                  {t('common.client', 'Customer')}: {activeBooking.customer?.fullName || activeBooking.cardMeta?.counterParty?.fullName || 'Client'}
                </Text>
                {activeBooking.address ? (
                  <View style={styles.heroLocationRow}>
                    <MapPin size={12} color={theme.colors.text.muted} />
                    <Text style={[styles.heroAddressText, { color: theme.colors.text.muted }]} numberOfLines={1}>
                      {activeBooking.address}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.heroCtaBtn, { backgroundColor: colors.cyan }]}
                onPress={() => router.push({ pathname: '/job-tracking' as any, params: { id: activeBooking._id } })}
                activeOpacity={0.8}
              >
                <Text style={styles.heroCtaBtnText}>
                  {t('home.worker.continueJob', 'Track & Continue Job')}
                </Text>
                <ArrowRight size={16} color="#000" strokeWidth={2.5} />
              </TouchableOpacity>
            </GlassCard>
          </View>
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

        {/* ── Section 1: Recent Signals (dismissed + missed-while-offline) ── */}
        {recentSignals.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Radio color={colors.worker} size={22} />
                <Text style={[styles.sectionTitle, typography.threeD, { color: colors.worker }]}>{t('home.worker.missedJobs')}</Text>
              </View>
              {recentSignals.length > 2 ? (
                <TouchableOpacity onPress={() => setShowAllSignals(!showAllSignals)}>
                  <Text style={[styles.seeAll, { color: colors.worker }]}>
                    {showAllSignals ? t('home.client.showLess') : `${t('home.client.viewAll')} (${recentSignals.length})`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.sectionMeta, { color: colors.worker }]}>{recentSignals.length} {t('home.worker.missedJobs').toUpperCase()}</Text>
              )}
            </View>

            <View style={styles.agendaList}>
              {recentSignals.slice(0, showAllSignals ? undefined : 2).map((job, index) => (
                <WorkerAlertJobCard
                  key={job._id}
                  job={job}
                  index={index}
                  onAccept={handleOpenSignalDetails}
                  onDismiss={handleDismissSignalJob}
                  isAccepting={acceptingAlertJobId === job._id}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Section 2: Your Active Bids ── */}
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
      <IncomingJobModal
        visible={Boolean(selectedSignalJob)}
        jobs={selectedSignalJob ? [selectedSignalJob] : []}
        onAccept={handleAcceptSignalJob}
        onCounterOffer={handleCounterOfferSignalJob}
        onReject={handleDismissSignalJob}
        onClose={() => setSelectedSignalJob(null)}
        acceptingJobId={acceptingAlertJobId}
      />
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
  heroJobTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 6,
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
  },
  heroAddressText: {
    fontSize: 12,
    flex: 1,
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
