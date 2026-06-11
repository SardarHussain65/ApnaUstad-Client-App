import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import * as Location from 'expo-location';
import { ChevronRight, ShieldCheck, Radio, Hourglass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useIncomingJob } from '../../context/IncomingJobContext';
import { Colors, Spacing, Typography } from '../../constants/Theme';
import { HomeHeader } from './HomeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import api from '../../services/api';
import { WorkerStatusCard } from './WorkerStatusCard';
import { WorkerStatsCard } from './WorkerStatsCard';
import { WorkerAlertJobCard } from './WorkerAlertJobCard';
import { IncomingJobModal } from './IncomingJobModal';
import {
  SkeletonBox,
  useShimmerTranslateX,
  BookingCardSkeleton,
  WorkerStatsCardSkeleton,
  WorkerAlertJobCardSkeleton,
  WorkerPendingBidCardSkeleton,
} from './HomeSkeletonLoader';
import { RecentBookingCard } from './RecentBookingCard';
import { Booking } from '../../hooks/queries/useData';
import { socketService } from '../../services/socketService';
import { WorkerPendingBidCard } from './WorkerPendingBidCard';
import { useWorkerBids, useWithdrawBidMutation, Bid } from '../../hooks';

type WorkerCoordinates = {
  latitude: number;
  longitude: number;
};

export function WorkerHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const {
    isInstantOnline,
    setIsInstantOnline,
    isScheduledOnline,
    setIsScheduledOnline,
    dismissedJobs,
    clearDismissedJob,
    acceptDismissedJob,
  } = useIncomingJob();

  // ─── State ───────────────────────────────────────────────────────────────────
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [missedJobs, setMissedJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    rating: 0,
    missions: 0,
    completed: 0,
    successRate: 0,
    activeCount: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [missedJobsLoading, setMissedJobsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingAlertJobId, setAcceptingAlertJobId] = useState<string | null>(null);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [selectedSignalJob, setSelectedSignalJob] = useState<any | null>(null);
  const [showAllBids, setShowAllBids] = useState(false);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);

  const { data: workerBids, isLoading: bidsLoading, refetch: refetchBids } = useWorkerBids();
  const { mutate: withdrawBid } = useWithdrawBidMutation();

  const pendingBids = useMemo(() => {
    return workerBids?.filter((bid) => bid.status === 'pending') || [];
  }, [workerBids]);

  const insets = useSafeAreaInsets();
  const translateX = useShimmerTranslateX();

  // ─── Location ────────────────────────────────────────────────────────────────
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

  // ─── Sync Location ───────────────────────────────────────────────────────────
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

  // ─── Data Fetchers ────────────────────────────────────────────────────────────

  /** Worker dashboard stats and the single recent-bookings work surface. */
  const fetchWorkerSummary = useCallback(async (showLoading = true) => {
    if (showLoading) setSummaryLoading(true);
    try {
      const response = await api.get('/bookings/worker-home-summary', { params: { recentLimit: 3 } });
      const summary = response.data.data || {};
      const recent: Booking[] = summary.recentBookings || [];

      setRecentBookings(recent);
      setStats({
        revenue: Number(summary.stats?.revenue || (user as any)?.totalEarnings || 0),
        missions: Number(summary.stats?.missions || 0),
        completed: Number(summary.stats?.completed || 0),
        rating: Number(summary.stats?.rating || (user as any)?.rating || 0),
        successRate: Number(summary.stats?.successRate || 0),
        activeCount: Number(summary.stats?.activeCount || 0),
      });
    } catch (error) {
      console.error('Error fetching worker home summary:', error);
    } finally {
      if (showLoading) setSummaryLoading(false);
    }
  }, [user]);

  /** Section 2: Recent Signals — jobs posted while offline (API), merged with dismissed (context) */
  const fetchMissedJobs = useCallback(async (showLoading = true) => {
    if (showLoading) setMissedJobsLoading(true);
    try {
      const response = await api.get('/jobs/missed');
      if (response.data.success) {
        setMissedJobs(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching missed jobs:', error);
    } finally {
      if (showLoading) setMissedJobsLoading(false);
    }
  }, []);

  // ─── Merged Recent Signals (deduped) ─────────────────────────────────────────
  // dismissed = in-memory (survived current session), missedJobs = from API (persisted via lastOnlineAt)
  const recentSignals = useMemo(() => {
    const seen = new Set<string>();
    const merged: any[] = [];
    // Dismissed first (worker already saw these in modal — highest priority)
    for (const job of dismissedJobs) {
      if (job.urgency === 'instant' ? !isInstantOnline : !isScheduledOnline) continue;
      if (!seen.has(job._id)) { seen.add(job._id); merged.push({ ...job, _signalSource: 'dismissed' }); }
    }
    // Missed while offline (API)
    for (const job of missedJobs) {
      if (job.urgency === 'instant' ? !isInstantOnline : !isScheduledOnline) continue;
      if (!seen.has(job._id)) { seen.add(job._id); merged.push({ ...job, _signalSource: 'missed' }); }
    }
    return merged;
  }, [dismissedJobs, isInstantOnline, isScheduledOnline, missedJobs]);

  // ─── Refresh Helpers ──────────────────────────────────────────────────────────
  const refreshWorkerHome = useCallback(async () => {
    setSummaryLoading(true);
    setMissedJobsLoading(true);
    const coordinates = await resolveWorkerLocation();
    syncWorkerLocation(coordinates);
    await Promise.all([
      fetchWorkerSummary(true),
      fetchMissedJobs(true),
      refetchBids(),
    ]);
  }, [resolveWorkerLocation, syncWorkerLocation, fetchWorkerSummary, fetchMissedJobs, refetchBids]);

  const refreshWorkerActivity = useCallback(async () => {
    await Promise.all([
      fetchWorkerSummary(false),
      fetchMissedJobs(false),
      refetchBids(),
    ]);
  }, [fetchWorkerSummary, fetchMissedJobs, refetchBids]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const coordinates = await resolveWorkerLocation();
    await Promise.all([
      syncWorkerLocation(coordinates),
      fetchWorkerSummary(false),
      fetchMissedJobs(false),
      refetchBids(),
    ]);
    setIsRefreshing(false);
  }, [resolveWorkerLocation, syncWorkerLocation, fetchWorkerSummary, fetchMissedJobs, refetchBids]);

  // ─── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) refreshWorkerHome();
  }, [token, refreshWorkerHome]);

  useEffect(() => {
    if (!token) return;
    const events = [
      'bid:won', 'bid:lost', 'bid:submitted', 'bid:withdrawn',
      'booking:accepted', 'booking:ongoing', 'booking:completed', 'booking:cancelled',
    ];
    const unsubs = events.map((event) => socketService.on(event, refreshWorkerActivity));
    return () => unsubs.forEach((u) => u());
  }, [token, refreshWorkerActivity]);

  useEffect(() => {
    if (!selectedSignalJob) return;
    const isEnabled = selectedSignalJob.urgency === 'instant'
      ? isInstantOnline
      : isScheduledOnline;
    if (!isEnabled) setSelectedSignalJob(null);
  }, [isInstantOnline, isScheduledOnline, selectedSignalJob]);

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
      // Also remove from missedJobs list if it was from API
      setMissedJobs(prev => prev.filter(j => j._id !== job._id));
      setSelectedSignalJob(null);
    } finally {
      setAcceptingAlertJobId(null);
    }
  }, [acceptDismissedJob]);

  const handleDismissSignalJob = useCallback((jobId: string) => {
    clearDismissedJob(jobId);
    setMissedJobs(prev => prev.filter(j => j._id !== jobId));
    setSelectedSignalJob((prev: any | null) => prev?._id === jobId ? null : prev);
  }, [clearDismissedJob]);

  const handleCounterOfferSignalJob = useCallback((job: any) => {
    clearDismissedJob(job._id);
    setMissedJobs(prev => prev.filter(item => item._id !== job._id));
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
    Alert.alert(
      'Withdraw Bid',
      'Are you sure you want to withdraw your bid for this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => {
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
                  Alert.alert('Error', 'Failed to withdraw the bid. Please try again.');
                },
              }
            );
          },
        },
      ]
    );
  }, [withdrawBid, refetchBids]);

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
            tintColor={Colors.cyan}
            colors={[Colors.cyan]}
          />
        }
      >
        <HomeHeader />

        {/* ── Stats Dashboard ── */}
        <View style={styles.dashboardSection}>
          <WorkerStatusCard
            isInstantOnline={isInstantOnline}
            onToggleInstant={setIsInstantOnline}
            isScheduledOnline={isScheduledOnline}
            onToggleScheduled={setIsScheduledOnline}
          />
          {summaryLoading && !isRefreshing ? (
            <WorkerStatsCardSkeleton translateX={translateX} />
          ) : (
            <WorkerStatsCard stats={stats} />
          )}
        </View>

        {/* ── Section 1: Recent Signals (dismissed + missed-while-offline) ── */}
        {missedJobsLoading && !isRefreshing ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Radio color="#FF8C00" size={22} />
                <Text style={[styles.sectionTitle, Typography.threeD, { color: '#FF8C00' }]}>{t('home.worker.missedJobs')}</Text>
              </View>
            </View>
            <View style={styles.agendaList}>
              <WorkerAlertJobCardSkeleton translateX={translateX} />
            </View>
          </View>
        ) : (
          recentSignals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Radio color="#FF8C00" size={22} />
                  <Text style={[styles.sectionTitle, Typography.threeD, { color: '#FF8C00' }]}>{t('home.worker.missedJobs')}</Text>
                </View>
                {recentSignals.length > 3 ? (
                  <TouchableOpacity onPress={() => setShowAllSignals(!showAllSignals)}>
                    <Text style={[styles.seeAll, { color: '#FF8C00' }]}>
                      {showAllSignals ? t('home.client.showLess') : `${t('home.client.viewAll')} (${recentSignals.length})`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.sectionMeta, { color: '#FF8C00' }]}>{recentSignals.length} {t('home.worker.missedJobs').toUpperCase()}</Text>
                )}
              </View>

              <View style={styles.agendaList}>
                {recentSignals.slice(0, showAllSignals ? undefined : 3).map((job, index) => (
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
            </View>
          )
        )}


        {/* ── Section 2: Recent Bookings ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.sectionTitleRow}>
                <ShieldCheck color={Colors.cyan} size={24} />
                <Text style={[styles.sectionTitle, Typography.threeD]}>{t('home.worker.recentBookings')}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{t('home.worker.latestActivity')}</Text>
            </View>
            {stats.missions > 3 ? (
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')} style={styles.seeAllRow}>
                <Text style={styles.seeAll}>{t('home.client.seeAll')}</Text>
                <ChevronRight size={13} color={Colors.cyan} strokeWidth={2.6} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleRefresh}>
                <Text style={styles.seeAll}>REFRESH</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.recentBookingList}>
            {summaryLoading && !isRefreshing ? (
              <>
                <BookingCardSkeleton translateX={translateX} />
                <BookingCardSkeleton translateX={translateX} />
              </>
            ) : recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <RecentBookingCard
                  key={booking._id}
                  booking={booking}
                  onPress={() => handleBookingDetails(booking)}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No bookings yet.{'\n'}Accepted bookings will appear here.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Section: Your Active Bids ── */}
        {bidsLoading && !isRefreshing ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Hourglass color={Colors.worker} size={22} />
                <Text style={[styles.sectionTitle, Typography.threeD, { color: Colors.worker }]}>{t('home.worker.activeBids')}</Text>
              </View>
            </View>
            <View style={styles.agendaList}>
              <WorkerPendingBidCardSkeleton translateX={translateX} />
            </View>
          </View>
        ) : (
          pendingBids.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Hourglass color={Colors.worker} size={22} />
                  <Text style={[styles.sectionTitle, Typography.threeD, { color: Colors.worker }]}>{t('home.worker.activeBids')}</Text>
                </View>
                {pendingBids.length > 3 ? (
                  <TouchableOpacity onPress={() => setShowAllBids(!showAllBids)}>
                    <Text style={[styles.seeAll, { color: Colors.worker }]}>
                      {showAllBids ? t('home.client.showLess') : `${t('home.client.viewAll')} (${pendingBids.length})`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.sectionMeta, { color: Colors.worker }]}>{pendingBids.length} {t('common.active').toUpperCase()}</Text>
                )}
              </View>

              <View style={styles.agendaList}>
                {pendingBids.slice(0, showAllBids ? undefined : 3).map((bid, index) => (
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
            </View>
          )
        )}


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
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  dashboardSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.m,
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
    color: '#fff',
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionMeta: {
    color: Colors.green,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0,
  },
  seeAll: {
    color: Colors.primary,
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
    color: Colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
});
