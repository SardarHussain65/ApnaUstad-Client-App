import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { IncomingJobModal } from '../components/home/IncomingJobModal';
import api from '../services/api';
import Toast from 'react-native-toast-message';

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

  // Modal state
  const [incomingJob, setIncomingJob] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Only subscribe when the logged-in user is a worker with a valid token
  useEffect(() => {
    if (role !== 'worker' || !token) return;

    const unsubscribeNewJob = socketService.on('job:new', (newJob: any) => {
      console.log('📩 [IncomingJobContext] Real-time Job Received:', newJob);

      if (isOnline) {
        console.log('✨ [IncomingJobContext] Showing Incoming Job Modal globally');
        setIncomingJob(newJob);
        setShowModal(true);
      } else {
        console.log('⏳ [IncomingJobContext] Worker is Offline, skipping modal');
      }
    });

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

    return () => {
      unsubscribeNewJob();
      unsubscribeWon();
      unsubscribeLost();
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
