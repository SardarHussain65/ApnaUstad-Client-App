import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '../services/socketService';
import { queryKeys } from '../lib/queryKeyFactory';

/**
 * useRealtimeSync
 * Centralized Real-Time Event Bridge that maps incoming Socket.IO events
 * directly to TanStack Query cache invalidations.
 *
 * Ensures only the specific affected parts of the screen re-render smoothly
 * without requiring page reloads or pull-to-refresh.
 */
export function useRealtimeSync(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // ─── 1. BOOKING EVENTS ───────────────────────────────────────────────────
    const handleBookingUpdate = (data: any) => {
      const bookingId = (data?.bookingId || data?._id || data?.booking?._id)?.toString();
      console.log('🔄 [RealtimeSync] Surgical booking update for:', bookingId, data?.status || data?.eventType);

      if (bookingId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
      }

      // Invalidate relevant aggregate collections
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.workerHomeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.earningsAnalytics() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });

      // If completed or paid, refresh wallet queries
      if (['completed', 'cancelled', 'paid'].includes(data?.status || data?.eventType)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      }
    };

    // ─── 2. JOB EVENTS ───────────────────────────────────────────────────────
    const handleJobUpdate = (data: any) => {
      const jobId = (data?.jobId || data?._id || data?.jobPost?._id)?.toString();
      console.log('🔄 [RealtimeSync] Surgical job update for:', jobId, data?.status);

      if (jobId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(jobId) });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.workerHomeSummary() });
    };

    // ─── 3. BID EVENTS ───────────────────────────────────────────────────────
    const handleBidUpdate = (data: any) => {
      const jobId = (data?.jobId || data?.jobPost?._id || data?.jobPost)?.toString();
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(jobId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    };

    // ─── 4. WORKER PROFILE & VERIFICATION EVENTS ────────────────────────────
    const handleWorkerUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.workerHomeSummary() });
    };

    // ─── 5. RECONNECTION RE-SYNCHRONIZATION (DEBOUNCED & RATE-LIMITED) ──────
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let lastReconnectSyncTime = 0;
    const handleReconnected = () => {
      const now = Date.now();
      // Rate limit full active query sync to at most once every 15 seconds
      if (now - lastReconnectSyncTime < 15000) {
        return;
      }
      lastReconnectSyncTime = now;
      console.log('🔄 [RealtimeSync] Socket reconnected — scheduling silent background sync of active queries');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        queryClient.invalidateQueries({ type: 'active' });
      }, 1500);
    };

    // Subscriptions
    const unsubs = [
      // Booking updates
      socketService.on('booking:status', handleBookingUpdate),
      socketService.on('booking:new', handleBookingUpdate),
      socketService.on('booking:accepted', handleBookingUpdate),
      socketService.on('booking:ongoing', handleBookingUpdate),
      socketService.on('booking:completed', handleBookingUpdate),
      socketService.on('booking:cancelled', handleBookingUpdate),
      socketService.on('booking:paid', handleBookingUpdate),

      // Job updates
      socketService.on('job:new', handleJobUpdate),
      socketService.on('job:cancelled', handleJobUpdate),
      socketService.on('job:status', handleJobUpdate),
      socketService.on('job:created', handleJobUpdate),
      socketService.on('job:assigned', handleJobUpdate),
      socketService.on('job:auto_assigned', handleJobUpdate),

      // Bid updates
      socketService.on('bid:new', handleBidUpdate),
      socketService.on('bid:submitted', handleBidUpdate),
      socketService.on('bid:withdrawn', handleBidUpdate),
      socketService.on('bid:won', (data) => {
        handleBidUpdate(data);
        handleBookingUpdate(data);
      }),
      socketService.on('bid:lost', handleBidUpdate),

      // Worker profile updates
      socketService.on('worker:verified', handleWorkerUpdate),
      socketService.on('worker:updated', handleWorkerUpdate),

      // Reconnect
      socketService.on('socket:reconnected', handleReconnected),
    ];

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      unsubs.forEach((unsub) => unsub());
    };
  }, [enabled, queryClient]);
}

