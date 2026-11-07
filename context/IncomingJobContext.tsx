import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { IncomingJobModal } from '../components/home/IncomingJobModal';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { PaymentReceivedModal } from '../components/home/PaymentReceivedModal';
import { JobAssignedSuccessModal } from '../components/home/JobAssignedSuccessModal';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeyFactory';
import { useWorkerHomeSummary } from '../hooks';
import i18n from '../i18n';

interface IncomingJobContextType {
  isInstantOnline: boolean;
  setIsInstantOnline: (val: boolean) => void;
  isScheduledOnline: boolean;
  setIsScheduledOnline: (val: boolean) => void;
  availabilityHydrated: boolean;
  /** Legacy support or computed master state */
  isOnline: boolean;
  toggleOnline: (enabled: boolean) => Promise<void>;
  /** Jobs that arrived via socket but were dismissed from the modal without accepting */
  dismissedJobs: any[];
  /** Remove a single job from the dismissed list */
  clearDismissedJob: (jobId: string) => void;
  /** Accept a dismissed job directly from the home screen card */
  acceptDismissedJob: (job: any) => void;
  /** Open any incoming or nearby job directly in the modal */
  openIncomingJobModal: (job: any) => Promise<void>;
}

const IncomingJobContext = createContext<IncomingJobContextType | undefined>(undefined);

export function IncomingJobProvider({ children }: { children: React.ReactNode }) {
  const { role, user, token, updateUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isInstantOnline, setInstantOnlineState] = useState(false);
  const [isScheduledOnline, setScheduledOnlineState] = useState(false);
  const [availabilityHydrated, setAvailabilityHydrated] = useState(false);
  const instantOnlineRef = React.useRef(false);
  const scheduledOnlineRef = React.useRef(false);

  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

  // Modal state - Managed as a queue
  const [incomingJobsQueue, setIncomingJobsQueue] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Keep a ref so callbacks can always read the current queue without stale closures
  const incomingJobsQueueRef = React.useRef<any[]>([]);

  // Jobs closed from modal without accepting — still shown as cards on home screen
  const [dismissedJobs, setDismissedJobs] = useState<any[]>([]);

  // Payment notification state
  const [paidBooking, setPaidBooking] = useState<any>(null);
  const [showPaidModal, setShowPaidModal] = useState(false);

  // Job assignment success modal state
  const [assignedBooking, setAssignedBooking] = useState<any>(null);
  const [showAssignedModal, setShowAssignedModal] = useState(false);

  const workerId = user?._id;
  const savedMasterAvailability = (user as any)?.isAvailable;
  const savedInstantAvailability = (user as any)?.isInstantAvailable;
  const savedScheduledAvailability = (user as any)?.isScheduledAvailable;

  const { data: workerSummary } = useWorkerHomeSummary({ enabled: Boolean(token && role === 'worker') });

  // Determine if worker is currently engaged in an active or ongoing job
  const isWorkerBusy = useMemo(() => {
    if (role !== 'worker') return false;
    const active = workerSummary?.activeBooking;
    if (active && ['accepted', 'ongoing'].includes(active.status)) {
      return true;
    }
    const recents = workerSummary?.recentBookings;
    if (Array.isArray(recents) && recents.some(b => ['accepted', 'ongoing'].includes(b.status))) {
      return true;
    }
    return false;
  }, [role, workerSummary]);

  const isWorkerBusyRef = useRef(false);
  useEffect(() => {
    isWorkerBusyRef.current = isWorkerBusy;
  }, [isWorkerBusy]);

  const isJobTypeEnabled = useCallback((job: any) =>
    job?.urgency === 'instant' ? instantOnlineRef.current : scheduledOnlineRef.current, []);

  // Flush all active job queues, dismissed lists, and modals when switching or logging out accounts
  useEffect(() => {
    setIncomingJobsQueue([]);
    incomingJobsQueueRef.current = [];
    setDismissedJobs([]);
    setShowModal(false);
    setPaidBooking(null);
    setShowPaidModal(false);
    setAssignedBooking(null);
    setShowAssignedModal(false);
  }, [user?._id]);

  useEffect(() => {
    if (role !== 'worker' || !workerId) {
      instantOnlineRef.current = false;
      scheduledOnlineRef.current = false;
      setInstantOnlineState(false);
      setScheduledOnlineState(false);
      setAvailabilityHydrated(false);
      return;
    }

    const masterAvailability = savedMasterAvailability !== false;
    const instantAvailability = savedInstantAvailability !== undefined
      ? Boolean(savedInstantAvailability)
      : masterAvailability;
    const scheduledAvailability = savedScheduledAvailability !== undefined
      ? Boolean(savedScheduledAvailability)
      : masterAvailability;

    instantOnlineRef.current = instantAvailability;
    scheduledOnlineRef.current = scheduledAvailability;
    setInstantOnlineState(instantAvailability);
    setScheduledOnlineState(scheduledAvailability);
    setAvailabilityHydrated(true);
  }, [
    role,
    savedInstantAvailability,
    savedMasterAvailability,
    savedScheduledAvailability,
    workerId,
  ]);

  const updateJobAvailability = useCallback(async (jobType: 'instant' | 'scheduled', enabled: boolean) => {
    if (role !== 'worker' || !user?._id) return;

    const previousInstant = instantOnlineRef.current;
    const previousScheduled = scheduledOnlineRef.current;
    const nextInstant = jobType === 'instant' ? enabled : previousInstant;
    const nextScheduled = jobType === 'scheduled' ? enabled : previousScheduled;

    instantOnlineRef.current = nextInstant;
    scheduledOnlineRef.current = nextScheduled;
    setInstantOnlineState(nextInstant);
    setScheduledOnlineState(nextScheduled);

    try {
      const response = await api.patch(`/workers/${user._id}`, {
        isInstantAvailable: nextInstant,
        isScheduledAvailable: nextScheduled,
      });
      await updateUser({ ...user, ...(response.data.data || {}) });
    } catch (error: any) {
      instantOnlineRef.current = previousInstant;
      scheduledOnlineRef.current = previousScheduled;
      setInstantOnlineState(previousInstant);
      setScheduledOnlineState(previousScheduled);
      Toast.show({
        type: 'error',
        text1: i18n.t('realtimeAlerts.availabilityNotUpdated'),
        text2: error.response?.data?.message || i18n.t('realtimeAlerts.checkConnection'),
      });
    }
  }, [role, updateUser, user]);

  const setIsInstantOnline = useCallback((enabled: boolean) => {
    void updateJobAvailability('instant', enabled);
  }, [updateJobAvailability]);

  const setIsScheduledOnline = useCallback((enabled: boolean) => {
    void updateJobAvailability('scheduled', enabled);
  }, [updateJobAvailability]);

  useEffect(() => {
    if (!availabilityHydrated) return;
    const keepEnabledJobs = (job: any) =>
      job?.urgency === 'instant' ? isInstantOnline : isScheduledOnline;

    setIncomingJobsQueue(prevQueue => {
      const nextQueue = prevQueue.filter(keepEnabledJobs);
      incomingJobsQueueRef.current = nextQueue;
      if (nextQueue.length === 0) setShowModal(false);
      return nextQueue;
    });
    setDismissedJobs(prev => prev.filter(keepEnabledJobs));
  }, [availabilityHydrated, isInstantOnline, isScheduledOnline]);

  // Only subscribe when the logged-in user is authenticated
  useEffect(() => {
    if (!token) return;

    const removeJobIdFromQueues = (targetJobId: any) => {
      if (!targetJobId) return;
      const tid = String(targetJobId);
      setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== tid));
      setIncomingJobsQueue(prev => {
        const next = prev.filter(j => String(j._id || j.id) !== tid);
        incomingJobsQueueRef.current = next;
        if (next.length === 0) setShowModal(false);
        return next;
      });
    };

    // --- WORKER ONLY: New Job Notifications ---
    let unsubscribeNewJob = () => { };
    if (role === 'worker') {
      unsubscribeNewJob = socketService.on('job:new', async (newJob: any) => {
        console.log('📩 [IncomingJobContext] Real-time Job Received:', newJob);

        let jobSignal = newJob;
        if (newJob?._id && !newJob?.signalMeta) {
          try {
            const response = await api.get(`/jobs/${newJob._id}`);
            jobSignal = response.data.data || newJob;
          } catch (error) {
            console.warn('Could not hydrate expanded job signal:', error);
          }
        }

        // Validate that job is open and not stale/assigned/cancelled
        if (jobSignal.status && jobSignal.status !== 'open') {
          return;
        }

        // Check if the job has already expired
        const expiresAt = jobSignal.expiresAt || jobSignal.signalMeta?.expiresAt;
        if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
          return;
        }
        if (jobSignal.urgency === 'instant' && jobSignal.createdAt) {
          if (Date.now() - new Date(jobSignal.createdAt).getTime() > 15 * 60 * 1000) {
            return;
          }
        }

        // Must have minimal category information
        if (!jobSignal.category) {
          return;
        }

        // Invalidate jobs queries across the app so Find Jobs tab has fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });

        // During an ongoing or active job, do not receive or pop up new instant jobs
        if (jobSignal.urgency === 'instant' && isWorkerBusyRef.current) {
          console.log('🚫 [IncomingJobContext] Ignoring instant job because worker has an ongoing/active job');
          return;
        }

        // Filter by preference
        const isEnabled = availabilityHydrated && isJobTypeEnabled(jobSignal);

        if (isEnabled) {
          setIncomingJobsQueue(prevQueue => {
            // Avoid adding duplicates
            if (prevQueue.some(job => String(job._id || job.id) === String(jobSignal._id || jobSignal.id))) {
              return prevQueue;
            }
            const next = [...prevQueue, jobSignal];
            incomingJobsQueueRef.current = next;
            return next;
          });
          setShowModal(true);
        }
      });
    }

    const unsubscribeWon = socketService.on('bid:won', (data: any) => {
      console.log('🏆 [IncomingJobContext] Mission Secured:', data);

      const targetJobId = data?.jobPost?._id || data?.jobPost || data?.booking?.jobPost;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }

      // Close the incoming job modal and clear the queue
      setShowModal(false);
      setIncomingJobsQueue([]);
      incomingJobsQueueRef.current = [];

      // Set booking details and display the custom success modal
      setAssignedBooking(data.booking);
      setShowAssignedModal(true);
    });

    const unsubscribeLost = socketService.on('bid:lost', (data: any) => {
      console.log('📉 [IncomingJobContext] Mission Lost:', data);
      const targetJobId = data?.jobPost?._id || data?.jobPost;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }
      Toast.show({
        type: 'info',
        text1: i18n.t('realtimeAlerts.jobTakenTitle'),
        text2: i18n.t('realtimeAlerts.jobTakenDesc'),
      });
    });

    // --- GENERIC: Booking Status Updates ---
    const unsubscribeAccepted = socketService.on('booking:accepted', (data: any) => {
      const category = data?.category || i18n.t('jobDetails.defaultTitle');
      const targetJobId = data?.jobPost?._id || data?.jobPost;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }
      if (role === 'worker') {
        isWorkerBusyRef.current = true;
        setShowModal(false);
        setIncomingJobsQueue([]);
        incomingJobsQueueRef.current = [];
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
      Toast.show({
        type: 'success',
        text1: i18n.t('realtimeAlerts.bookingConfirmedTitle'),
        text2: role === 'worker'
          ? i18n.t('realtimeAlerts.workerAcceptedDesc', { category })
          : i18n.t('realtimeAlerts.clientAcceptedDesc', { category }),
      });
    });

    // --- JOB LIFECYCLE: Job assigned or closed elsewhere ---
    const unsubscribeJobAssigned = socketService.on('job:assigned', (data: any) => {
      const targetJobId = data?.jobId || data?._id;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }
    });

    const unsubscribeJobAutoAssigned = socketService.on('job:auto_assigned', (data: any) => {
      const targetJobId = data?.jobPost?._id || data?.jobPost || data?.booking?.jobPost || data?._id;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }
    });

    const unsubscribeJobStatus = socketService.on('job:status', (data: any) => {
      const targetJobId = data?.jobId || data?._id;
      const status = data?.status;
      if (targetJobId && ['assigned', 'closed', 'cancelled'].includes(status)) {
        removeJobIdFromQueues(targetJobId);
      }
    });

    const unsubscribeJobCancelled = socketService.on('job:cancelled', (data: any) => {
      const targetJobId = data?.jobId || data?._id;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }
    });

    const unsubscribeOngoing = socketService.on('booking:ongoing', (data: any) => {
      const category = data?.category || i18n.t('jobDetails.defaultTitle');
      if (role === 'worker') {
        isWorkerBusyRef.current = true;
        setShowModal(false);
        setIncomingJobsQueue([]);
        incomingJobsQueueRef.current = [];
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
      }
      Toast.show({
        type: 'info',
        text1: i18n.t('realtimeAlerts.jobStartedTitle'),
        text2: role === 'worker'
          ? i18n.t('realtimeAlerts.workerStartedDesc', { category })
          : i18n.t('realtimeAlerts.clientStartedDesc', { category }),
      });
    });

    const unsubscribeCompleted = socketService.on('booking:completed', (data: any) => {
      const category = data?.category || i18n.t('jobDetails.defaultTitle');
      const targetJobId = data?.jobPost?._id || data?.jobPost;
      if (targetJobId) {
        removeJobIdFromQueues(targetJobId);
      }
      if (role === 'worker') {
        isWorkerBusyRef.current = false;
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
        const earning = Number(data?.workerEarning || data?.agreement?.workerNetIncome || 0);
        const earningText = earning > 0 ? i18n.t('realtimeAlerts.workerEarnedSuffix', { amount: earning.toLocaleString() }) : '';
        Toast.show({
          type: 'success',
          text1: i18n.t('realtimeAlerts.jobCompletedTitle'),
          text2: `${i18n.t('realtimeAlerts.workerCompletedDesc', { category })}${earningText}`,
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: i18n.t('realtimeAlerts.jobCompletedTitle'),
          text2: i18n.t('realtimeAlerts.clientCompletedDesc', { category }),
        });
      }
    });

    const unsubscribeCancelled = socketService.on('booking:cancelled', (data: any) => {
      const category = data?.category || i18n.t('jobDetails.defaultTitle');
      if (role === 'worker') {
        isWorkerBusyRef.current = false;
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
      }
      Toast.show({
        type: 'error',
        text1: i18n.t('realtimeAlerts.bookingCancelledTitle'),
        text2: i18n.t('realtimeAlerts.bookingCancelledDesc', { category }),
      });
    });

    const unsubscribePaid = socketService.on('booking:paid', (data: any) => {
      console.log('💰 [IncomingJobContext] Payment Received Event:', data);

      if (role === 'worker') {
        setPaidBooking(data);
        setShowPaidModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const category = data.category || i18n.t('jobDetails.defaultTitle');
        Toast.show({
          type: 'success',
          text1: i18n.t('realtimeAlerts.paymentConfirmedTitle'),
          text2: i18n.t('realtimeAlerts.paymentConfirmedDesc', { category }),
        });
      }
    });

    return () => {
      unsubscribeNewJob();
      unsubscribeWon();
      unsubscribeLost();
      unsubscribeAccepted();
      unsubscribeJobAssigned();
      unsubscribeJobAutoAssigned();
      unsubscribeJobStatus();
      unsubscribeJobCancelled();
      unsubscribeOngoing();
      unsubscribeCompleted();
      unsubscribeCancelled();
      unsubscribePaid();
    };
  }, [availabilityHydrated, isJobTypeEnabled, role, router, token]);

  const addToDismissed = useCallback((jobs: any[]) => {
    if (jobs.length === 0) return;
    setDismissedJobs(prev => {
      const existingIds = new Set(prev.map(j => j._id));
      const newJobs = jobs.filter(j => !existingIds.has(j._id));
      if (newJobs.length === 0) return prev;
      return [...newJobs, ...prev]; // newest first
    });
  }, []);

  const removeJobFromQueue = useCallback((jobId: string) => {
    setIncomingJobsQueue(prevQueue => {
      const rejected = prevQueue.find(j => j._id === jobId);
      const nextQueue = prevQueue.filter(j => j._id !== jobId);
      incomingJobsQueueRef.current = nextQueue;
      // Add the rejected job to dismissed so it still appears on the home screen
      if (rejected) {
        setDismissedJobs(prev => {
          if (prev.some(j => j._id === jobId)) return prev;
          return [rejected, ...prev];
        });
      }
      if (nextQueue.length === 0) {
        setShowModal(false);
      }
      return nextQueue;
    });
  }, []);

  const handleAcceptJob = useCallback(async (job: any) => {
    if (!job) return;

    if (job.urgency === 'instant') {
      try {
        setAcceptingJobId(job._id);
        const response = await api.post(`/jobs/${job._id}/accept-instant`);

        if (response.data.success) {
          clearDismissedJob(job._id);
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
          Toast.show({
            type: 'success',
            text1: i18n.t('realtimeAlerts.jobAcceptedTitle'),
            text2: i18n.t('realtimeAlerts.jobAcceptedDesc'),
          });
          // Close modal cleanly - remaining jobs (not the accepted one) go to dismissed
          const remaining = incomingJobsQueueRef.current.filter(j => (j._id || j.id) !== (job._id || job.id));
          addToDismissed(remaining);
          incomingJobsQueueRef.current = [];
          setIncomingJobsQueue([]);
          setShowModal(false);
        }
      } catch (error: any) {
        if (error.response?.status === 402) {
          const required = Number(error.response?.data?.requiredBalance || 500);
          Toast.show({
            type: 'error',
            text1: i18n.t('bidSubmission.topUpRequired', 'Top-Up Required'),
            text2: i18n.t('bidSubmission.keepRequiredBalance', 'Keep at least {{amount}} in your wallet to continue.', {
              amount: `Rs. ${required}`,
            }),
          });
          const allJobsToPreserve = incomingJobsQueueRef.current.some(j => (j._id || j.id) === (job._id || job.id))
            ? incomingJobsQueueRef.current
            : [job, ...incomingJobsQueueRef.current];
          addToDismissed(allJobsToPreserve);
          incomingJobsQueueRef.current = [];
          setIncomingJobsQueue([]);
          setShowModal(false);
          router.push('/(tabs)/wallet' as any);
          return;
        }
        Toast.show({
          type: 'error',
          text1: i18n.t('realtimeAlerts.couldNotAcceptTitle'),
          text2: error.response?.data?.message || i18n.t('realtimeAlerts.couldNotAcceptDesc'),
        });
        removeJobFromQueue(job._id);
      } finally {
        setAcceptingJobId(null);
      }
    } else {
      // For scheduled jobs, navigate to bid submission; remaining jobs go to dismissed
      const remaining = incomingJobsQueueRef.current.filter(j => j._id !== job._id);
      addToDismissed(remaining);
      incomingJobsQueueRef.current = [];
      setIncomingJobsQueue([]);
      setShowModal(false);
      router.push({
        pathname: '/bid-submission' as any,
        params: {
          jobId: job._id,
          title: job.category,
          urgency: job.urgency,
        },
      });
    }
  }, [router, removeJobFromQueue, addToDismissed]);

  const handleRejectJob = useCallback((jobId: string) => {
    // removeJobFromQueue now also adds the rejected job to dismissed
    removeJobFromQueue(jobId);
  }, [removeJobFromQueue]);

  const handleCloseModal = useCallback(() => {
    // Read current queue from ref (no stale closure) and move all to dismissed
    const currentQueue = incomingJobsQueueRef.current;
    addToDismissed(currentQueue);
    incomingJobsQueueRef.current = [];
    setIncomingJobsQueue([]);
    setShowModal(false);
  }, [addToDismissed]);

  const clearDismissedJob = useCallback((jobId: string) => {
    setDismissedJobs(prev => prev.filter(j => j._id !== jobId));
  }, []);

  const handleCounterOfferJob = useCallback((job: any) => {
    if (!job) return;

    const remaining = incomingJobsQueueRef.current.filter(item => item._id !== job._id);
    addToDismissed(remaining);
    clearDismissedJob(job._id);
    incomingJobsQueueRef.current = [];
    setIncomingJobsQueue([]);
    setShowModal(false);
    router.push({
      pathname: '/bid-submission' as any,
      params: {
        jobId: job._id,
        title: job.category,
        urgency: job.urgency,
        responseMode: 'counter',
      },
    });
  }, [addToDismissed, clearDismissedJob, router]);

  const handleBidSubmitted = useCallback((job: any) => {
    if (!job?._id) return;
    const targetId = String(job._id);
    const nextQueue = incomingJobsQueueRef.current.filter(item => String(item._id) !== targetId);
    incomingJobsQueueRef.current = nextQueue;
    setIncomingJobsQueue(nextQueue);
    if (nextQueue.length === 0) setShowModal(false);

    // Ensure it is completely cleared from dismissed list so it will not appear in Urgent Job Waiting
    clearDismissedJob(targetId);

    // Invalidate queries so Sent Offers updates immediately
    queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
  }, [clearDismissedJob, queryClient]);

  const acceptDismissedJob = useCallback(async (job: any) => {
    if (!job) return;

    if (job.urgency === 'instant') {
      try {
        setAcceptingJobId(job._id);
        const response = await api.post(`/jobs/${job._id}/accept-instant`);
        if (response.data.success) {
          clearDismissedJob(job._id);
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
          Toast.show({
            type: 'success',
            text1: i18n.t('realtimeAlerts.jobAcceptedTitle'),
            text2: i18n.t('realtimeAlerts.jobAcceptedDesc'),
          });
        }
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: i18n.t('realtimeAlerts.couldNotAcceptTitle'),
          text2: error.response?.data?.message || i18n.t('realtimeAlerts.couldNotAcceptDesc'),
        });
      } finally {
        setAcceptingJobId(null);
      }
    } else {
      clearDismissedJob(job._id);
      router.push({
        pathname: '/bid-submission' as any,
        params: {
          jobId: job._id,
          title: job.category,
          urgency: job.urgency,
        },
      });
    }
  }, [router, clearDismissedJob, queryClient]);

  const toggleOnline = useCallback(async (enabled: boolean) => {
    if (role !== 'worker' || !user?._id) return;

    const previousInstant = instantOnlineRef.current;
    const previousScheduled = scheduledOnlineRef.current;

    instantOnlineRef.current = enabled;
    scheduledOnlineRef.current = enabled;
    setInstantOnlineState(enabled);
    setScheduledOnlineState(enabled);

    try {
      const response = await api.patch(`/workers/${user._id}`, {
        isInstantAvailable: enabled,
        isScheduledAvailable: enabled,
      });
      await updateUser({ ...user, ...(response.data.data || {}) });
    } catch (error: any) {
      instantOnlineRef.current = previousInstant;
      scheduledOnlineRef.current = previousScheduled;
      setInstantOnlineState(previousInstant);
      setScheduledOnlineState(previousScheduled);
      Toast.show({
        type: 'error',
        text1: i18n.t('realtimeAlerts.availabilityNotUpdated'),
        text2: error.response?.data?.message || i18n.t('realtimeAlerts.checkConnection'),
      });
    }
  }, [role, updateUser, user]);

  const openIncomingJobModal = useCallback(async (job: any) => {
    if (!job) return;

    const targetId = String(job._id || job.id || '');
    if (!targetId) return;

    let jobSignal = { ...job };

    // 0. If worker currently has an ongoing or active job, do not allow opening instant job modal
    if (jobSignal.urgency === 'instant' && isWorkerBusyRef.current) {
      Toast.show({
        type: 'info',
        text1: i18n.t('realtimeAlerts.busyTitle', 'Job in Progress'),
        text2: i18n.t('realtimeAlerts.busyDesc', 'You have an active ongoing job. Complete it before accepting new instant jobs.'),
      });
      return;
    }

    // 1. If job is already known to be non-open, clean up and do not open modal
    if (jobSignal.status && jobSignal.status !== 'open') {
      setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== targetId));
      setIncomingJobsQueue(prev => {
        const next = prev.filter(j => String(j._id || j.id) !== targetId);
        incomingJobsQueueRef.current = next;
        if (next.length === 0) setShowModal(false);
        return next;
      });
      Toast.show({
        type: 'info',
        text1: i18n.t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
        text2: i18n.t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
      });
      return;
    }

    // 2. If the job is already expired, clean up and do not open modal
    const expiresAt = jobSignal.expiresAt || jobSignal.signalMeta?.expiresAt;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== targetId));
      setIncomingJobsQueue(prev => {
        const next = prev.filter(j => String(j._id || j.id) !== targetId);
        incomingJobsQueueRef.current = next;
        if (next.length === 0) setShowModal(false);
        return next;
      });
      Toast.show({
        type: 'info',
        text1: i18n.t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
        text2: i18n.t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
      });
      return;
    }

    // 3. If job lacks core information (e.g. only passed as { _id } from a link), fetch it first before opening modal
    const hasCoreDetails = Boolean(jobSignal.category && (jobSignal.createdAt || jobSignal.expiresAt));
    if (!hasCoreDetails) {
      try {
        const response = await api.get(`/jobs/${targetId}`);
        if (response.data?.data) {
          const hydrated = response.data.data;
          if (hydrated.status && hydrated.status !== 'open') {
            setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== targetId));
            setIncomingJobsQueue(prev => {
              const next = prev.filter(j => String(j._id || j.id) !== targetId);
              incomingJobsQueueRef.current = next;
              if (next.length === 0) setShowModal(false);
              return next;
            });
            Toast.show({
              type: 'info',
              text1: i18n.t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
              text2: i18n.t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
            });
            return;
          }
          const hydratedExpiresAt = hydrated.expiresAt || hydrated.signalMeta?.expiresAt;
          if (hydratedExpiresAt && new Date(hydratedExpiresAt).getTime() <= Date.now()) {
            setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== targetId));
            setIncomingJobsQueue(prev => {
              const next = prev.filter(j => String(j._id || j.id) !== targetId);
              incomingJobsQueueRef.current = next;
              if (next.length === 0) setShowModal(false);
              return next;
            });
            Toast.show({
              type: 'info',
              text1: i18n.t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
              text2: i18n.t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
            });
            return;
          }
          jobSignal = { ...jobSignal, ...hydrated };
        } else {
          throw new Error('Job not found');
        }
      } catch (error) {
        setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== targetId));
        setIncomingJobsQueue(prev => {
          const next = prev.filter(j => String(j._id || j.id) !== targetId);
          incomingJobsQueueRef.current = next;
          if (next.length === 0) setShowModal(false);
          return next;
        });
        Toast.show({
          type: 'info',
          text1: i18n.t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
          text2: i18n.t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
        });
        return;
      }
    }

    // 4. Now safe to put into queue and show modal
    setIncomingJobsQueue(prevQueue => {
      const otherJobs = prevQueue.filter(j => String(j._id || j.id) !== targetId);
      const nextQueue = [jobSignal, ...otherJobs];
      incomingJobsQueueRef.current = nextQueue;
      return nextQueue;
    });
    setShowModal(true);

    // 5. In background, if it already had core details, verify freshness against database
    if (hasCoreDetails) {
      try {
        const response = await api.get(`/jobs/${targetId}`);
        if (response.data?.data) {
          const hydrated = response.data.data;
          if (hydrated.status && hydrated.status !== 'open') {
            setDismissedJobs(prev => prev.filter(j => String(j._id || j.id) !== targetId));
            setIncomingJobsQueue(prev => {
              const next = prev.filter(j => String(j._id || j.id) !== targetId);
              incomingJobsQueueRef.current = next;
              if (next.length === 0) setShowModal(false);
              return next;
            });
            Toast.show({
              type: 'info',
              text1: i18n.t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
              text2: i18n.t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
            });
            return;
          }
          setIncomingJobsQueue(prevQueue => {
            const nextQueue = prevQueue.map(item =>
              String(item._id || item.id) === targetId ? { ...item, ...hydrated } : item
            );
            incomingJobsQueueRef.current = nextQueue;
            return nextQueue;
          });
        }
      } catch (error) {
        console.warn('[IncomingJobContext] Could not refresh job for modal:', error);
      }
    }
  }, []);

  return (
    <IncomingJobContext.Provider value={{
      isInstantOnline,
      setIsInstantOnline,
      isScheduledOnline,
      setIsScheduledOnline,
      availabilityHydrated,
      isOnline: isInstantOnline || isScheduledOnline,
      toggleOnline,
      dismissedJobs,
      clearDismissedJob,
      acceptDismissedJob,
      openIncomingJobModal,
    }}>
      {children}

      <IncomingJobModal
        visible={showModal && incomingJobsQueue.length > 0}
        jobs={incomingJobsQueue.map(job => ({ ...job, hourlyRate: (user as any)?.hourlyRate }))}
        onAccept={handleAcceptJob}
        onCounterOffer={handleCounterOfferJob}
        onBidSubmitted={handleBidSubmitted}
        onReject={handleRejectJob}
        onClose={handleCloseModal}
        acceptingJobId={acceptingJobId}
      />

      <PaymentReceivedModal
        visible={showPaidModal}
        booking={paidBooking}
        onClose={() => setShowPaidModal(false)}
      />

      <JobAssignedSuccessModal
        visible={showAssignedModal}
        booking={assignedBooking}
        onClose={() => setShowAssignedModal(false)}
        onContinue={() => {
          setShowAssignedModal(false);
          router.push({
            pathname: '/transaction-details' as any,
            params: { id: assignedBooking?._id }
          });
        }}
      />
    </IncomingJobContext.Provider>
  );
}

export function useIncomingJob() {
  const context = useContext(IncomingJobContext);
  if (context === undefined) {
    throw new Error('useIncomingJob must be used within an IncomingJobProvider');
  }
  return context;
}
