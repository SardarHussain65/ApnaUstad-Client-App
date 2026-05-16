import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { IncomingJobModal } from '../components/home/IncomingJobModal';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { PaymentReceivedModal } from '../components/home/PaymentReceivedModal';
import * as Haptics from 'expo-haptics';

interface IncomingJobContextType {
  isInstantOnline: boolean;
  setIsInstantOnline: (val: boolean) => void;
  isScheduledOnline: boolean;
  setIsScheduledOnline: (val: boolean) => void;
  /** Legacy support or computed master state */
  isOnline: boolean;
  /** Jobs that arrived via socket but were dismissed from the modal without accepting */
  dismissedJobs: any[];
  /** Remove a single job from the dismissed list */
  clearDismissedJob: (jobId: string) => void;
  /** Accept a dismissed job directly from the home screen card */
  acceptDismissedJob: (job: any) => void;
}

const IncomingJobContext = createContext<IncomingJobContextType | undefined>(undefined);

export function IncomingJobProvider({ children }: { children: React.ReactNode }) {
  const { role, user, token } = useAuth();
  const router = useRouter();

  const [isInstantOnline, setIsInstantOnline] = useState(true);
  const [isScheduledOnline, setIsScheduledOnline] = useState(true);

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

  // Only subscribe when the logged-in user is authenticated
  useEffect(() => {
    if (!token) return;

    // --- WORKER ONLY: New Job Notifications ---
    let unsubscribeNewJob = () => { };
    if (role === 'worker') {
      unsubscribeNewJob = socketService.on('job:new', (newJob: any) => {
        console.log('📩 [IncomingJobContext] Real-time Job Received:', newJob);

        // Filter by preference
        const isEnabled = newJob.urgency === 'instant' ? isInstantOnline : isScheduledOnline;

        if (isEnabled) {
          setIncomingJobsQueue(prevQueue => {
            // Avoid adding duplicates
            if (prevQueue.some(job => job._id === newJob._id)) {
              return prevQueue;
            }
            const next = [...prevQueue, newJob];
            incomingJobsQueueRef.current = next;
            return next;
          });
          setShowModal(true);
        }
      });
    }

    const unsubscribeWon = socketService.on('bid:won', (data: any) => {
      console.log('🏆 [IncomingJobContext] Mission Secured:', data);

      Toast.show({
        type: 'success',
        text1: 'MISSION SECURED! 🚀',
        text2: 'The client has hired you. Tap to view mission details.',
        visibilityTime: 5000,
        onPress: () => {
          router.push({
            pathname: '/transaction-details' as any,
            params: { id: data.booking._id }
          });
        }
      });

      // Optional: Auto redirect after delay
      setTimeout(() => {
        router.push({
          pathname: '/transaction-details' as any,
          params: { id: data.booking._id }
        });
      }, 2000);
    });

    const unsubscribeLost = socketService.on('bid:lost', (data: any) => {
      console.log('📉 [IncomingJobContext] Mission Lost:', data);
      Toast.show({
        type: 'info',
        text1: 'MISSION TERMINATED',
        text2: 'The client has selected another specialist.',
      });
    });

    // --- GENERIC: Booking Status Updates ---
    const unsubscribeAccepted = socketService.on('booking:accepted', (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'PROTOCOL ACTIVE 🛡️',
        text2: role === 'worker'
          ? `You have accepted the mission for ${data?.category || 'a new job'}.`
          : `Specialist has accepted your request for ${data?.category || 'the job'}.`,
      });
    });

    const unsubscribeOngoing = socketService.on('booking:ongoing', (data: any) => {
      Toast.show({
        type: 'info',
        text1: 'ENGAGEMENT STARTED ⚡',
        text2: role === 'worker'
          ? `You have initialized the mission: ${data?.category || 'Task'}.`
          : `The Ustad is now on-site performing: ${data?.category || 'Task'}`,
      });
    });

    const unsubscribeCompleted = socketService.on('booking:completed', (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'OBJECTIVE SECURED 🏁',
        text2: role === 'worker'
          ? `You have successfully completed the mission: ${data?.category || 'Task'}.`
          : `Mission accomplished! Your Ustad has finished: ${data?.category || 'Task'}`,
      });
    });

    const unsubscribeCancelled = socketService.on('booking:cancelled', (data: any) => {
      Toast.show({
        type: 'error',
        text1: 'PROTOCOL SHUTDOWN ⚠️',
        text2: `Mission aborted: ${data?.category || 'the job'} has been cancelled.`,
      });
    });

    const unsubscribePaid = socketService.on('booking:paid', (data: any) => {
      console.log('💰 [IncomingJobContext] Payment Received Event:', data);

      if (role === 'worker') {
        setPaidBooking(data);
        setShowPaidModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Toast.show({
          type: 'success',
          text1: 'PAYMENT VERIFIED ✅',
          text2: `Your settlement for ${data.category || 'the job'} has been confirmed.`,
        });
      }
    });

    return () => {
      unsubscribeNewJob();
      unsubscribeWon();
      unsubscribeLost();
      unsubscribeAccepted();
      unsubscribeOngoing();
      unsubscribeCompleted();
      unsubscribeCancelled();
      unsubscribePaid();
    };
  }, [role, token, isInstantOnline, isScheduledOnline]);

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
          Toast.show({
            type: 'success',
            text1: 'MISSION ACCEPTED',
            text2: 'Protocol initialized. Waiting for client confirmation...',
          });
          // Close modal cleanly - remaining jobs (not the accepted one) go to dismissed
          const remaining = incomingJobsQueueRef.current.filter(j => j._id !== job._id);
          addToDismissed(remaining);
          incomingJobsQueueRef.current = [];
          setIncomingJobsQueue([]);
          setShowModal(false);
        }
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'LINK FAILURE',
          text2: error.response?.data?.message || 'Could not establish connection.',
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

  const acceptDismissedJob = useCallback(async (job: any) => {
    if (!job) return;
    clearDismissedJob(job._id);

    if (job.urgency === 'instant') {
      try {
        setAcceptingJobId(job._id);
        const response = await api.post(`/jobs/${job._id}/accept-instant`);
        if (response.data.success) {
          Toast.show({
            type: 'success',
            text1: 'MISSION ACCEPTED',
            text2: 'Protocol initialized. Waiting for client confirmation...',
          });
        }
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'LINK FAILURE',
          text2: error.response?.data?.message || 'Could not establish connection.',
        });
      } finally {
        setAcceptingJobId(null);
      }
    } else {
      router.push({
        pathname: '/bid-submission' as any,
        params: {
          jobId: job._id,
          title: job.category,
          urgency: job.urgency,
        },
      });
    }
  }, [router, clearDismissedJob]);

  return (
    <IncomingJobContext.Provider value={{
      isInstantOnline,
      setIsInstantOnline,
      isScheduledOnline,
      setIsScheduledOnline,
      isOnline: isInstantOnline || isScheduledOnline,
      dismissedJobs,
      clearDismissedJob,
      acceptDismissedJob,
    }}>
      {children}

      <IncomingJobModal
        visible={showModal && incomingJobsQueue.length > 0}
        jobs={incomingJobsQueue.map(job => ({ ...job, hourlyRate: (user as any)?.hourlyRate }))}
        onAccept={handleAcceptJob}
        onReject={handleRejectJob}
        onClose={handleCloseModal}
        acceptingJobId={acceptingJobId}
      />

      <PaymentReceivedModal
        visible={showPaidModal}
        booking={paidBooking}
        onClose={() => setShowPaidModal(false)}
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
