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
  /** True while worker is marked online (controlled from WorkerHome toggle) */
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
}

const IncomingJobContext = createContext<IncomingJobContextType | undefined>(undefined);

export function IncomingJobProvider({ children }: { children: React.ReactNode }) {
  const { role, user, token } = useAuth();
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);

  const [isAccepting, setIsAccepting] = useState(false);
  
  // Modal state
  const [incomingJob, setIncomingJob] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Payment notification state
  const [paidBooking, setPaidBooking] = useState<any>(null);
  const [showPaidModal, setShowPaidModal] = useState(false);

  // Only subscribe when the logged-in user is authenticated
  useEffect(() => {
    if (!token) return;

    // --- WORKER ONLY: New Job Notifications ---
    let unsubscribeNewJob = () => {};
    if (role === 'worker') {
      unsubscribeNewJob = socketService.on('job:new', (newJob: any) => {
        console.log('📩 [IncomingJobContext] Real-time Job Received:', newJob);
        if (isOnline) {
          setIncomingJob(newJob);
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
            pathname: '/transaction-details',
            params: { id: data.booking._id }
          });
        }
      });

      // Optional: Auto redirect after delay
      setTimeout(() => {
        router.push({
          pathname: '/transaction-details',
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
      console.log('👤 Current User Role:', role);
      
      if (role === 'worker') {
        console.log('✅ Showing Payment Modal for Worker');
        setPaidBooking(data);
        setShowPaidModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        console.log('ℹ️ Showing Payment Toast for Client');
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
  }, [role, token, isOnline]);

  const handleAcceptJob = useCallback(async () => {
    if (!incomingJob) return;

    if (incomingJob.urgency === 'instant') {
      try {
        setIsAccepting(true);
        const response = await api.post(`/jobs/${incomingJob._id}/accept-instant`);

        if (response.data.success) {
          Toast.show({
            type: 'success',
            text1: 'MISSION ACCEPTED',
            text2: 'Protocol initialized. Waiting for client confirmation...',
          });
          setShowModal(false);
          setIncomingJob(null);
        }
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'LINK FAILURE',
          text2: error.response?.data?.message || 'Could not establish connection.',
        });
      } finally {
        setIsAccepting(false);
      }
    } else {
      // Scheduled job → navigate to bidding screen
      setShowModal(false);
      router.push({
        pathname: '/bid-submission',
        params: {
          jobId: incomingJob._id,
          title: incomingJob.category,
          urgency: incomingJob.urgency,
        },
      });
      setIncomingJob(null);
    }
  }, [incomingJob, router]);

  const handleRejectJob = useCallback(() => {
    setShowModal(false);
    setIncomingJob(null);
  }, []);

  return (
    <IncomingJobContext.Provider value={{ isOnline, setIsOnline }}>
      {children}

      {/* Global modal — floats above any active screen */}
      <IncomingJobModal
        visible={showModal}
        job={incomingJob ? { ...incomingJob, hourlyRate: (user as any)?.hourlyRate } : null}
        onAccept={handleAcceptJob}
        onReject={handleRejectJob}
        isLoading={isAccepting}
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
