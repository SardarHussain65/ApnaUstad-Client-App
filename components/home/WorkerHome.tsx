import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { Briefcase, ShieldCheck, Radio } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useIncomingJob } from '../../context/IncomingJobContext';
import { Colors, Spacing, Typography } from '../../constants/Theme';
import { HomeHeader } from './HomeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import api from '../../services/api';
import { WorkerStatusCard } from './WorkerStatusCard';
import { WorkerStatsCard } from './WorkerStatsCard';
import { WorkerAlertJobCard } from './WorkerAlertJobCard';
import { WorkerSkeletonLoader } from './WorkerSkeletonLoader';
import { WorkerActiveMissionCard } from './WorkerActiveMissionCard';
import { WorkerPendingBidCard } from './WorkerPendingBidCard';
import { Booking } from '../../hooks/queries/useData';
import { Bid } from '../../hooks/queries/useMessagesAndJobs';
import { useUpdateBookingStatusMutation, useWithdrawBidMutation } from '../../hooks/mutations/useMutations';
import { socketService } from '../../services/socketService';

type WorkerCoordinates = {
  latitude: number;
  longitude: number;
};

export function WorkerHome() {
  const router = useRouter();
  const { token, user } = useAuth();
  const {
    isInstantOnline,
    setIsInstantOnline,
    isScheduledOnline,
    setIsScheduledOnline,
    isOnline,
    dismissedJobs,
    clearDismissedJob,
    acceptDismissedJob,
  } = useIncomingJob();

  // ─── State ───────────────────────────────────────────────────────────────────
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [pendingBids, setPendingBids] = useState<Bid[]>([]);
  const [missedJobs, setMissedJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, rating: 0, missions: 0, successRate: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workerCoordinates, setWorkerCoordinates] = useState<WorkerCoordinates | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);
  const [acceptingAlertJobId, setAcceptingAlertJobId] = useState<string | null>(null);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [showAllPendingBids, setShowAllPendingBids] = useState(false);

  const insets = useSafeAreaInsets();
  const { mutate: updateBookingStatus } = useUpdateBookingStatusMutation();
  const { mutate: withdrawBid } = useWithdrawBidMutation();

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

  // ─── Sync Status ─────────────────────────────────────────────────────────────
  const syncStatus = useCallback(async (online: boolean, coordinates?: WorkerCoordinates | null) => {
    try {
      if (!user?._id) return;
      const payload: any = { isAvailable: online };
      if (coordinates) {
        payload.longitude = coordinates.longitude;
        payload.latitude = coordinates.latitude;
      }
      await api.patch(`/workers/${user._id}`, payload);
    } catch (error) {
      console.error('❌ Error syncing status:', error);
    }
  }, [user?._id]);

  // ─── Data Fetchers ────────────────────────────────────────────────────────────

  /** Section 1: Active Missions — accepted/ongoing bookings only */
  const fetchActiveBookings = useCallback(async () => {
    try {
      const response = await api.get('/bookings/worker-bookings', { params: { limit: 50 } });
      const allBookings: Booking[] = response.data.data || [];
      const completed = allBookings.filter((b: any) => b.status === 'completed');
      const active = allBookings
        .filter((b) => ['accepted', 'ongoing'].includes(b.status))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

      const totalRevenue = completed.reduce((sum: number, b: any) => sum + (b.workerEarning || 0), 0);
      const successRate = allBookings.length > 0 ? completed.length / allBookings.length : 1;

      setActiveBookings(active);
      setStats({
        revenue: (user as any)?.totalEarnings || totalRevenue,
        missions: (user as any)?.totalJobs || allBookings.length,
        rating: (user as any)?.rating || 0,
        successRate,
      });
    } catch (error) {
      console.error('Error fetching active bookings:', error);
    }
  }, [user]);

  /** Section 2: Recent Signals — jobs posted while offline (API), merged with dismissed (context) */
  const fetchMissedJobs = useCallback(async () => {
    try {
      const response = await api.get('/jobs/missed');
      if (response.data.success) {
        setMissedJobs(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching missed jobs:', error);
    }
  }, []);

  /** Section 3: Open Missions — pending bids the worker has submitted */
  const fetchPendingBids = useCallback(async () => {
    try {
      const response = await api.get('/jobs/my-bids', { params: { status: 'pending', limit: 20 } });
      if (response.data.success) {
        setPendingBids((response.data.data || []).filter((bid: Bid) => bid.jobPost));
      }
    } catch (error) {
      console.error('Error fetching pending bids:', error);
    }
  }, []);

  // ─── Merged Recent Signals (deduped) ─────────────────────────────────────────
  // dismissed = in-memory (survived current session), missedJobs = from API (persisted via lastOnlineAt)
  const recentSignals = useMemo(() => {
    const seen = new Set<string>();
    const merged: any[] = [];
    // Dismissed first (worker already saw these in modal — highest priority)
    for (const job of dismissedJobs) {
      if (!seen.has(job._id)) { seen.add(job._id); merged.push({ ...job, _signalSource: 'dismissed' }); }
    }
    // Missed while offline (API)
    for (const job of missedJobs) {
      if (!seen.has(job._id)) { seen.add(job._id); merged.push({ ...job, _signalSource: 'missed' }); }
    }
    return merged;
  }, [dismissedJobs, missedJobs]);

  // ─── Refresh Helpers ──────────────────────────────────────────────────────────
  const refreshWorkerHome = useCallback(async () => {
    setIsLoading(true);
    const coordinates = await resolveWorkerLocation();
    setWorkerCoordinates(coordinates);
    await Promise.all([
      syncStatus(isOnline, coordinates),
      fetchActiveBookings(),
      fetchMissedJobs(),
      fetchPendingBids(),
    ]);
    setIsLoading(false);
  }, [isOnline, resolveWorkerLocation, syncStatus, fetchActiveBookings, fetchMissedJobs, fetchPendingBids]);

  const refreshWorkerActivity = useCallback(async () => {
    await Promise.all([fetchActiveBookings(), fetchMissedJobs(), fetchPendingBids()]);
  }, [fetchActiveBookings, fetchMissedJobs, fetchPendingBids]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshWorkerHome();
    setIsRefreshing(false);
  }, [refreshWorkerHome]);

  // ─── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) refreshWorkerHome();
  }, [token, isInstantOnline, isScheduledOnline, user?._id]);

  useEffect(() => {
    if (!token) return;
    const events = [
      'bid:won', 'bid:lost', 'bid:submitted', 'bid:withdrawn',
      'booking:accepted', 'booking:ongoing', 'booking:completed', 'booking:cancelled',
    ];
    const unsubs = events.map((event) => socketService.on(event, refreshWorkerActivity));
    return () => unsubs.forEach((u) => u());
  }, [token, refreshWorkerActivity]);

  // ─── Section 1 Handlers ───────────────────────────────────────────────────────
  const handleBookingDetails = useCallback((booking: Booking) => {
    router.push({ pathname: '/transaction-details' as any, params: { id: booking._id } });
  }, [router]);

  const handleCancelBooking = useCallback((booking: Booking) => {
    Alert.alert(
      'Cancel this mission?',
      'The client will be notified and this mission will leave your active list.',
      [
        { text: 'Keep Mission', style: 'cancel' },
        {
          text: 'Cancel Mission',
          style: 'destructive',
          onPress: () => {
            setCancellingBookingId(booking._id);
            updateBookingStatus(
              { bookingId: booking._id, status: 'cancelled', cancelReason: 'Cancelled by worker from home screen' },
              { onSuccess: refreshWorkerActivity, onSettled: () => setCancellingBookingId(null) }
            );
          },
        },
      ]
    );
  }, [refreshWorkerActivity, updateBookingStatus]);

  // ─── Section 2 Handlers ───────────────────────────────────────────────────────
  const handleAcceptSignalJob = useCallback(async (job: any) => {
    setAcceptingAlertJobId(job._id);
    try {
      await acceptDismissedJob(job);
      // Also remove from missedJobs list if it was from API
      setMissedJobs(prev => prev.filter(j => j._id !== job._id));
    } finally {
      setAcceptingAlertJobId(null);
    }
  }, [acceptDismissedJob]);

  const handleDismissSignalJob = useCallback((jobId: string) => {
    clearDismissedJob(jobId);
    setMissedJobs(prev => prev.filter(j => j._id !== jobId));
  }, [clearDismissedJob]);

  // ─── Section 3 Handlers ───────────────────────────────────────────────────────
  const handlePendingBidDetails = useCallback((bid: Bid) => {
    const jobId = typeof bid.jobPost === 'string' ? bid.jobPost : bid.jobPost?._id;
    if (!jobId) {
      Alert.alert('Details unavailable', 'This mission request is no longer available.');
      return;
    }
    router.push({ pathname: '/pending-bid-details' as any, params: { id: jobId, pendingBidId: bid._id } });
  }, [router]);

  const handleWithdrawBid = useCallback((bid: Bid) => {
    Alert.alert(
      'Withdraw mission interest?',
      'The client will no longer see your response for this job.',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => {
            setWithdrawingBidId(bid._id);
            withdrawBid(
              { bidId: bid._id },
              { onSuccess: refreshWorkerActivity, onSettled: () => setWithdrawingBidId(null) }
            );
          },
        },
      ]
    );
  }, [refreshWorkerActivity, withdrawBid]);

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

        {isLoading && !isRefreshing ? (
          <WorkerSkeletonLoader />
        ) : (
          <>
            {/* ── Stats Dashboard ── */}
            <View style={styles.dashboardSection}>
              <WorkerStatusCard
                isInstantOnline={isInstantOnline}
                onToggleInstant={setIsInstantOnline}
                isScheduledOnline={isScheduledOnline}
                onToggleScheduled={setIsScheduledOnline}
              />
              <WorkerStatsCard stats={stats} />
            </View>

            {/* ── Section 1: Active Missions (accepted/ongoing bookings) ── */}
            {activeBookings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <ShieldCheck color={Colors.green} size={24} />
                    <Text style={[styles.sectionTitle, Typography.threeD]}>Active Missions</Text>
                  </View>
                  {activeBookings.length > 3 ? (
                    <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                      <Text style={styles.seeAll}>VIEW ALL ({activeBookings.length})</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.sectionMeta}>{activeBookings.length} LIVE</Text>
                  )}
                </View>

                <View style={styles.agendaList}>
                  {activeBookings.slice(0, 3).map((booking, index) => (
                    <WorkerActiveMissionCard
                      key={booking._id}
                      booking={booking}
                      index={index}
                      onDetails={handleBookingDetails}
                      onCancel={handleCancelBooking}
                      isCancelling={cancellingBookingId === booking._id}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ── Section 2: Recent Signals (dismissed + missed-while-offline) ── */}
            {recentSignals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Radio color="#FF8C00" size={22} />
                    <Text style={[styles.sectionTitle, Typography.threeD, { color: '#FF8C00' }]}>Recent Signals</Text>
                  </View>
                  {recentSignals.length > 3 ? (
                    <TouchableOpacity onPress={() => setShowAllSignals(!showAllSignals)}>
                      <Text style={[styles.seeAll, { color: '#FF8C00' }]}>
                        {showAllSignals ? 'SHOW LESS' : `VIEW ALL (${recentSignals.length})`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.sectionMeta, { color: '#FF8C00' }]}>{recentSignals.length} MISSED</Text>
                  )}
                </View>

                <View style={styles.agendaList}>
                  {recentSignals.slice(0, showAllSignals ? undefined : 3).map((job, index) => (
                    <WorkerAlertJobCard
                      key={job._id}
                      job={job}
                      index={index}
                      onAccept={handleAcceptSignalJob}
                      onDismiss={handleDismissSignalJob}
                      isAccepting={acceptingAlertJobId === job._id}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ── Section 3: Open Missions (pending bids submitted by worker) ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Briefcase color={Colors.cyan} size={24} />
                    <Text style={[styles.sectionTitle, Typography.threeD]}>Open Missions</Text>
                  </View>
                  {pendingBids.length > 3 ? (
                    <TouchableOpacity onPress={() => setShowAllPendingBids(!showAllPendingBids)}>
                      <Text style={styles.seeAll}>
                        {showAllPendingBids ? 'SHOW LESS' : `VIEW ALL (${pendingBids.length})`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleRefresh}>
                      <Text style={styles.seeAll}>REFRESH</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.agendaList}>
                  {pendingBids.slice(0, showAllPendingBids ? undefined : 3).map((bid, index) => (
                    <WorkerPendingBidCard
                    key={bid._id}
                    bid={bid}
                    index={index}
                    onDetails={handlePendingBidDetails}
                    onWithdraw={handleWithdrawBid}
                    isWithdrawing={withdrawingBidId === bid._id}
                  />
                ))}

                {pendingBids.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No bids submitted yet.{'\n'}Browse nearby jobs and submit a bid to start!</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
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
  agendaList: {
    gap: 12,
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
