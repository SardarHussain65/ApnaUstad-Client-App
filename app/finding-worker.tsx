import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Star,
  MapPin,
  Check,
  Briefcase,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Search,
  Users,
  Radio,
  Image as ImageIcon,
  CalendarDays,
  Tag,
  Zap,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  interpolate,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../context/LanguageContext';
import { useTheme, useThemeColors, useThemeTypography, Colors, alpha } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { ConfirmModal } from '../components/ui';
import { useConfirmModal } from '../hooks';
import { socketService } from '../services/socketService';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useAcceptBidMutation,
  useCancelJobMutation,
  useRejectBidMutation,
} from '../hooks/mutations/useMutations';
import { useBidsByJob, useJobDetails } from '../hooks/queries/useMessagesAndJobs';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeyFactory';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { addAlpha } from '../utils/colorUtils';

const getWorkerRating = (worker?: any) => {
  const rating = Number(worker?.rating ?? worker?.averageRating ?? 0);
  return Number.isFinite(rating) && rating > 0 ? rating : 0;
};

const formatMoney = (value?: number | string) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? `Rs. ${amount.toLocaleString()}` : 'Open';
};

export default function FindingWorkerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const theme = useTheme();
  const colors = theme.colors;
  const legacyColors = theme.legacy;
  const typography = useThemeTypography();

  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const cardLayoutsRef = useRef<{ [key: string]: number }>({});
  const confirmModal = useConfirmModal();

  useEffect(() => {
    if (applicants.length > 0) {
      setSelectedApplicantId((prev) => {
        if (prev && applicants.some((a) => a._id === prev)) return prev;
        return applicants[0]._id;
      });
    } else {
      setSelectedApplicantId(null);
    }
  }, [applicants]);

  const handleSelectOfferTab = (applicantId: string) => {
    setSelectedApplicantId(applicantId);
    const targetY = cardLayoutsRef.current[applicantId];
    if (typeof targetY === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, targetY - 24), animated: true });
    }
  };

  // Collapsible Job Request Brief state
  const [isRequestExpanded, setIsRequestExpanded] = useState(false);

  // Radar Animation Shared Values
  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const rotation = useSharedValue(0);

  const bypassBeforeRemoveRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const assignedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: job, refetch: refetchJob } = useJobDetails(jobId as string, {
    staleTime: 0,
    refetchInterval: 3000,
  });
  const isInstant = job?.urgency === 'instant';

  const getRemainingTimeForEscalation = () => {
    if (!job?.expiresAt) return 600;
    const expiresTime = new Date(job.expiresAt).getTime();
    const nowTime = Date.now();
    const remainingMs = Math.max(0, expiresTime - nowTime);
    return Math.floor(remainingMs / 1000);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isBoosting, setIsBoosting] = useState(false);
  const [showBoosterPrompt, setShowBoosterPrompt] = useState(false);
  const [selectedIncrement, setSelectedIncrement] = useState<number | null>(200);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');

  const basePrice = Number(job?.amount ?? job?.budget ?? 1000);

  const effectiveNewPrice = useMemo(() => {
    if (customPriceInput && Number(customPriceInput) > 0) {
      return Number(customPriceInput);
    }
    if (selectedIncrement !== null) {
      return basePrice + selectedIncrement;
    }
    return basePrice + 200;
  }, [basePrice, selectedIncrement, customPriceInput]);

  const isDark = theme.isDark;

  const decisionTheme = useMemo(() => ({
    boosterCardBg: isDark ? 'rgba(8, 14, 30, 0.95)' : '#FFFFFF',
    boosterCardBorder: isDark ? 'rgba(255, 140, 0, 0.35)' : '#FCD34D',
    boosterGradient: isDark
      ? ['rgba(255, 140, 0, 0.12)', 'rgba(255, 59, 48, 0.05)', 'rgba(10, 16, 32, 0.95)']
      : ['#FFFBF0', '#FFFFFF', '#FFF5F5'],
    urduTitle: isDark ? '#FFD700' : '#B45309',
    chipBg: isDark ? 'rgba(255, 140, 0, 0.08)' : '#F8FAFC',
    chipBorder: isDark ? 'rgba(255, 140, 0, 0.3)' : '#CBD5E1',
    chipText: isDark ? '#FF9A24' : '#334155',
    chipSelectedBg: isDark ? '#FF8C00' : '#EA580C',
    chipSelectedBorder: isDark ? '#FFA033' : '#C2410C',
    chipSelectedText: '#FFFFFF',
    inputWrapBg: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F8FAFC',
    inputWrapBorder: isDark ? 'rgba(255, 255, 255, 0.18)' : '#94A3B8',
    inputPrefix: isDark ? '#00F0FF' : '#0284C7',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    inputPlaceholder: isDark ? 'rgba(255, 255, 255, 0.35)' : '#64748B',
    submitBtnBg: isDark ? '#FF8C00' : '#EA580C',
    submitBtnText: '#FFFFFF',
    desc: isDark ? 'rgba(255, 255, 255, 0.72)' : '#334155',
    subtext: isDark ? 'rgba(255, 255, 255, 0.5)' : '#475569',
  }), [isDark]);

  const handleBoostPrice = async (targetPrice?: number) => {
    const finalPrice = targetPrice ?? effectiveNewPrice;
    if (!finalPrice || finalPrice <= 0) {
      Toast.show({
        type: 'error',
        text1: t('common.error', 'Invalid Price'),
        text2: 'Please enter a valid amount.',
      });
      return;
    }

    try {
      setIsBoosting(true);
      const res = await api.post(`/jobs/${jobId}/escalate`, {
        newPrice: finalPrice,
        additionalMinutes: 10,
      });
      if (res.data?.success) {
        Toast.show({
          type: 'success',
          text1: t('findingWorker.boosterApplied', 'Rate updated to {{amount}}! Searching for Ustads...', {
            amount: `Rs. ${finalPrice.toLocaleString()}`,
          }),
        });
        setShowBoosterPrompt(false);
        setRemainingSeconds(600);
        setCustomPriceInput('');
        setSelectedIncrement(200);
        await refetchJob();
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error', 'Could Not Update Rate'),
        text2: err.response?.data?.message || 'Please try again.',
      });
    } finally {
      setIsBoosting(false);
    }
  };

  const handleDismissBooster = async () => {
    try {
      setIsBoosting(true);
      const res = await api.post(`/jobs/${jobId}/escalate`, {
        additionalMinutes: 10,
      });
      if (res.data?.success) {
        setShowBoosterPrompt(false);
        setRemainingSeconds(600);
        Toast.show({
          type: 'info',
          text1: t('findingWorker.searchExtendedTitle', 'Search Extended!'),
          text2: t('findingWorker.searchExtendedDesc', 'Searching for 10 more minutes at current rate...'),
        });
        await refetchJob();
      }
    } catch (err: any) {
      setShowBoosterPrompt(false);
      setRemainingSeconds(600);
    } finally {
      setIsBoosting(false);
    }
  };

  useEffect(() => {
    if (!isInstant) return;
    const timer = setInterval(() => {
      const rem = getRemainingTimeForEscalation();
      setRemainingSeconds(rem);
      if (rem <= 0) {
        setShowBoosterPrompt(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [job, isInstant]);

  const handleRedirectToBooking = (bookingId: string) => {
    if (!bookingId || hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    if (assignedTimerRef.current) {
      clearTimeout(assignedTimerRef.current);
      assignedTimerRef.current = null;
    }

    bypassBeforeRemoveRef.current = true;
    router.replace({
      pathname: '/transaction-details',
      params: { id: bookingId, autoAssigned: 'true' },
    });
  };

  useEffect(() => {
    if (job && (job.status === 'assigned' || job.status === 'ongoing' || job.status === 'completed')) {
      const bookingId = (job as any).bookingId;
      if (bookingId) {
        handleRedirectToBooking(bookingId);
      }
    }
  }, [job, router]);

  const formatCountdown = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassBeforeRemoveRef.current) {
        return;
      }
      e.preventDefault();
      bypassBeforeRemoveRef.current = true;

      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      router.replace('/(tabs)' as any);
    });

    return unsubscribe;
  }, [navigation, router]);

  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [rejectingBidId, setRejectingBidId] = useState<string | null>(null);

  const { mutate: acceptBid, isPending: isAccepting } = useAcceptBidMutation({
    onSuccess: (data) => {
      setAcceptingBidId(null);
      Toast.show({
        type: 'success',
        text1: t('findingWorker.ustadsReady', 'Ustad Selected!'),
        text2: t('findingWorker.bookingSuccess', 'Your booking has been created successfully.'),
      });

      if (assignedTimerRef.current) {
        clearTimeout(assignedTimerRef.current);
      }
      assignedTimerRef.current = setTimeout(() => {
        if (data?._id) {
          handleRedirectToBooking(data._id);
        }
      }, 1200);
    },
    onError: (err: any) => {
      setAcceptingBidId(null);
      Toast.show({
        type: 'error',
        text1: t('findingWorker.selectUstadError', 'Could Not Select Ustad'),
        text2: err.response?.data?.message || 'Please try again.',
      });
    },
  });

  const { mutate: rejectBid, isPending: isRejecting } = useRejectBidMutation({
    onSuccess: (_, variables) => {
      setRejectingBidId(null);
      setApplicants((prev) => prev.filter((app) => app._id !== variables.bidId));
      Toast.show({
        type: 'info',
        text1: t('findingWorker.offerDeclined', 'Offer Declined'),
        text2: t('findingWorker.offerDeclinedMsg', 'Ustad has been notified and can submit an updated rate.'),
      });
    },
    onError: (err: any) => {
      setRejectingBidId(null);
      Toast.show({
        type: 'error',
        text1: t('common.error', 'Error'),
        text2: err?.response?.data?.message || 'Could not decline offer.',
      });
    },
  });

  const handleHireApplicant = (applicant: any) => {
    setAcceptingBidId(applicant._id);
    acceptBid({
      jobId: jobId as string,
      bidId: applicant._id,
    });
  };

  const handleRejectApplicant = (applicant: any) => {
    confirmModal.showConfirm(
      t('findingWorker.declineOfferTitle', 'Decline Offer?'),
      t(
        'findingWorker.declineOfferPrompt',
        "Decline {{name}}'s quote of {{price}}? They will be notified and can submit an updated rate.",
        {
          name: applicant.worker?.fullName || 'Ustad',
          price: formatMoney(applicant.proposedPrice),
        }
      ),
      () => {
        confirmModal.closeConfirm();
        setRejectingBidId(applicant._id);
        rejectBid({
          jobId: jobId as string,
          bidId: applicant._id,
        });
      },
      undefined,
      t('common.decline', 'Decline Offer'),
      t('common.keep', 'Keep Offer'),
      colors.status.error
    );
  };

  const { data: initialBids, isLoading: isBidsLoading } = useBidsByJob(jobId as string, {
    enabled: !!jobId,
    refetchInterval: 20000,
  });

  const { mutate: cancelJob, isPending: isCancelling } = useCancelJobMutation({
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: t('findingWorker.requestCancelled', 'Request Cancelled'),
        text2: t('findingWorker.cancelSuccess', 'Your service request has been cancelled.'),
      });
      bypassBeforeRemoveRef.current = true;
      router.replace('/(tabs)' as any);
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: t('findingWorker.cancelError', 'Could Not Cancel Request'),
        text2: err.response?.data?.message || 'Please try again.',
      });
    },
  });

  const handleCancelJob = () => {
    confirmModal.showConfirm(
      t('findingWorker.cancelJob', 'Cancel Request'),
      t('findingWorker.cancelJobConfirm', 'Are you sure you want to stop searching and cancel this service request?'),
      () => {
        confirmModal.closeConfirm();
        cancelJob({ jobId: jobId as string });
      },
      undefined,
      t('findingWorker.cancelRequest', 'Cancel Request'),
      t('findingWorker.keepSearching', 'Keep Searching'),
      colors.status.error
    );
  };

  useEffect(() => {
    if (initialBids && initialBids.length > 0) {
      const pendingBids = initialBids.filter((bid) => bid.status === 'pending');
      setApplicants((prev) => {
        const combined = [...prev];
        pendingBids.forEach((bid) => {
          if (!combined.some((a) => a._id === bid._id)) {
            combined.push(bid);
          }
        });
        return combined.filter((bid) => bid.status === 'pending');
      });
    }
  }, [initialBids]);

  useEffect(() => {
    // Multi-layer radar wave pulse animations
    pulse1.value = withRepeat(withTiming(1.35, { duration: 2200 }), -1, true);
    pulse2.value = withRepeat(withTiming(1.65, { duration: 3200 }), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 9000 }), -1, false);
  }, [pulse1, pulse2, rotation]);

  useEffect(() => {
    const unsubscribeAssigned = socketService.on('job:assigned', (data: any) => {
      const incomingJobId = (data?.jobId || data?.jobPost?._id || data?.jobPost)?.toString();
      if (incomingJobId && jobId && String(incomingJobId) !== String(jobId)) {
        return;
      }

      const bookingId = (data?.bookingId || data?.booking?._id || data?._id)?.toString();
      if (!bookingId || hasRedirectedRef.current) return;

      Toast.show({
        type: 'success',
        text1: t('findingWorker.ustadsReady', 'Ustad Assigned!'),
        text2: 'Your booking is confirmed.',
      });

      if (assignedTimerRef.current) {
        clearTimeout(assignedTimerRef.current);
      }
      assignedTimerRef.current = setTimeout(() => {
        handleRedirectToBooking(bookingId);
      }, 1200);
    });

    const unsubscribeAutoAssigned = socketService.on('job:auto_assigned', (data: any) => {
      const incomingJobId = (data?.jobPost?._id || data?.jobPost || data?.jobId)?.toString();
      if (incomingJobId && jobId && String(incomingJobId) !== String(jobId)) {
        return;
      }

      Toast.show({
        type: 'success',
        text1: t('findingWorker.assignedTitle', 'USTAD ASSIGNED! ⚡'),
        text2: t('findingWorker.assignedDesc', 'An Ustad has accepted your urgent request.'),
      });

      const bookingId = (data?._id || data?.booking?._id || data?.bookingId)?.toString();
      if (bookingId) {
        handleRedirectToBooking(bookingId);
      }
    });

    const unsubscribeSearchExtended = socketService.on('job:search_extended', (data: any) => {
      if (data?.jobId && String(data.jobId) !== String(jobId)) return;

      if (data?.suggestEscalation || data?.timeout || data?.expired) {
        setShowBoosterPrompt(true);
        refetchJob();
      } else if (data?.resumed) {
        setShowBoosterPrompt(false);
        setRemainingSeconds(600);
        refetchJob();
      } else {
        refetchJob();
      }
    });

    const unsubscribeBids = socketService.on('bid:new', (newBid: any) => {
      const bidJobId = String(newBid?.jobPost?._id || newBid?.jobPost || '');
      if (bidJobId && bidJobId !== String(jobId)) return;

      if (newBid.status !== 'pending') return;

      setApplicants((prev) => {
        if (prev.some((a) => a._id === newBid._id)) {
          return prev.map((a) => (a._id === newBid._id ? newBid : a));
        }
        return [...prev, newBid];
      });
    });

    const unsubscribeBidUpdated = socketService.on('bid:updated', (updatedBid: any) => {
      const bidJobId = String(updatedBid?.jobPost?._id || updatedBid?.jobPost || '');
      if (bidJobId && bidJobId !== String(jobId)) return;

      if (updatedBid.status !== 'pending') return;

      setApplicants((prev) => {
        if (prev.some((a) => a._id === updatedBid._id)) {
          return prev.map((a) => (a._id === updatedBid._id ? updatedBid : a));
        }
        return [...prev, updatedBid];
      });
    });

    const unsubscribeWithdrawn = socketService.on('bid:withdrawn', (payload: any) => {
      if (payload?.jobId && String(payload.jobId) !== String(jobId)) return;
      setApplicants((prev) => prev.filter((app) => app._id !== payload?.bidId));
    });

    const unsubscribeRejected = socketService.on('bid:rejected', (payload: any) => {
      if (payload?.jobId && String(payload.jobId) !== String(jobId)) return;
      setApplicants((prev) => prev.filter((app) => app._id !== payload?.bidId));
    });

    const unsubscribeCancelled = socketService.on('job:cancelled', (data: any) => {
      const targetId = (data?.jobId || data?._id)?.toString();
      if (!targetId || targetId === String(jobId)) {
        Toast.show({
          type: 'info',
          text1: t('findingWorker.requestCancelled', 'Request Cancelled'),
          text2: data?.reason || t('findingWorker.cancelSuccess', 'This service request has been cancelled.'),
        });
        bypassBeforeRemoveRef.current = true;
        router.replace('/(tabs)' as any);
      }
    });

    return () => {
      if (assignedTimerRef.current) {
        clearTimeout(assignedTimerRef.current);
        assignedTimerRef.current = null;
      }
      unsubscribeAssigned();
      unsubscribeAutoAssigned();
      unsubscribeSearchExtended();
      unsubscribeBids();
      unsubscribeBidUpdated();
      unsubscribeWithdrawn();
      unsubscribeRejected();
      unsubscribeCancelled();
    };
  }, [jobId, pulse1, pulse2, rotation, router, t]);

  const ringStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: interpolate(pulse1.value, [1, 1.35], [0.55, 0.04]),
  }));

  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: interpolate(pulse2.value, [1, 1.65], [0.35, 0.02]),
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleWorkerPress = (worker: any) => {
    const targetWorkerId = worker?.worker?._id || worker?.worker;
    if (targetWorkerId) {
      router.push({
        pathname: '/worker-details' as any,
        params: {
          id: targetWorkerId,
          bidId: worker._id,
          jobId: jobId as string,
          proposedPrice: String(worker.proposedPrice || ''),
        },
      });
    }
  };

  const handleBackHome = () => {
    bypassBeforeRemoveRef.current = true;
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    router.replace('/(tabs)' as any);
  };

  const evidenceCount = Number(
    job?.detailMeta?.media?.totalCount ||
      job?.media?.totalCount ||
      (job?.imageUrls?.length || 0) + (job?.videoUrls?.length || 0)
  );

  const scheduledDateLabel =
    job?.detailMeta?.schedule?.fullDateLabel ||
    (job?.scheduledDate
      ? new Date(job.scheduledDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Date pending');
  const scheduledTimeLabel =
    job?.detailMeta?.schedule?.timeLabel || job?.scheduledTime || 'Time pending';

  const hasOffers = applicants.length > 0;

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        {/* Modern App Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border.subtle,
              backgroundColor: theme.isDark ? 'rgba(5, 10, 24, 0.92)' : colors.background.screen,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surface.card,
                borderColor: theme.colors.border.subtle,
              },
            ]}
            onPress={handleBackHome}
            activeOpacity={0.7}
          >
            <ArrowLeft
              size={18}
              color={colors.text.primary}
              strokeWidth={2.4}
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: colors.text.muted }]}>
              {t('findingWorker.requestSent', 'REQUEST SENT')}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              {t('findingWorker.findingUstad', 'Finding Your Ustad')}
            </Text>
          </View>

          <View
            style={[
              styles.liveBadge,
              {
                backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.08)' : '#DBEAFE',
                borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.25)' : '#93C5FD',
              },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                { backgroundColor: theme.isDark ? Colors.cyan : colors.brand.primary },
              ]}
            />
            <Text
              style={[
                styles.liveText,
                { color: theme.isDark ? Colors.cyan : colors.brand.primary },
              ]}
            >
              {hasOffers ? `${applicants.length} OFFER${applicants.length > 1 ? 'S' : ''}` : 'SEARCHING'}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Modern Searching Hero Card */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[
              styles.searchHero,
              {
                backgroundColor: theme.isDark ? 'rgba(8, 14, 32, 0.88)' : colors.surface.card,
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
              },
            ]}
          >
            <LinearGradient
              colors={
                theme.isDark
                  ? ['rgba(0, 245, 255, 0.08)', 'rgba(6, 12, 28, 0.95)', 'rgba(30, 41, 59, 0.5)']
                  : [alpha(colors.brand.primary, 0.04), colors.surface.card, '#FFFFFF']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.searchHeroGradient, hasOffers && styles.searchHeroGradientSmall]}
            >
              {/* Radar Scanner Animation */}
              <View style={[styles.animationContainer, hasOffers && styles.animationContainerSmall]}>
                {/* Secondary outer pulse ring */}
                <Animated.View
                  style={[
                    styles.pulseRingOuter,
                    hasOffers && styles.pulseRingOuterSmall,
                    ringStyle2,
                    { borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.35)' : alpha(colors.brand.primary, 0.25) },
                  ]}
                />
                {/* Primary pulse ring */}
                <Animated.View
                  style={[
                    styles.pulseRing,
                    hasOffers && styles.pulseRingSmall,
                    ringStyle1,
                    { borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.75)' : alpha(colors.brand.primary, 0.45) },
                  ]}
                />

                {/* Satellite Ustad Pins on Radar */}
                <View style={styles.satelliteOrbit}>
                  {applicants.slice(0, 6).map((app, index) => {
                    const angle =
                      (index * (360 / Math.max(Math.min(applicants.length, 6), 1))) * (Math.PI / 180);
                    const radius = hasOffers ? 52 : 84;
                    const tx = radius * Math.cos(angle);
                    const ty = radius * Math.sin(angle);
                    const isSelected = (selectedApplicantId || applicants[0]?._id) === app._id;

                    return (
                      <TouchableOpacity
                        key={app._id}
                        onPress={() => {
                          if (hasOffers) {
                            handleSelectOfferTab(app._id);
                          } else {
                            handleWorkerPress(app);
                          }
                        }}
                        style={[
                          styles.satelliteContainer,
                          hasOffers && styles.satelliteContainerSmall,
                          { transform: [{ translateX: tx }, { translateY: ty }] },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Animated.View
                          entering={FadeIn.delay(120 * index).duration(350)}
                          style={[
                            styles.satelliteGlow,
                            hasOffers && styles.satelliteGlowSmall,
                            isSelected && {
                              borderColor: '#10B981',
                              borderWidth: 2.2,
                              shadowColor: '#10B981',
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: app.worker?.profileImage || 'https://via.placeholder.com/150' }}
                            style={styles.satelliteImage}
                            contentFit="cover"
                            transition={150}
                            cachePolicy="memory-disk"
                          />
                          <View
                            style={[
                              styles.satellitePricePill,
                              hasOffers && styles.satellitePricePillSmall,
                              isSelected && { borderColor: '#10B981' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.satellitePriceText,
                                hasOffers && styles.satellitePriceTextSmall,
                                isSelected && { color: '#10B981' },
                              ]}
                            >
                              {formatMoney(app.proposedPrice)}
                            </Text>
                          </View>
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Orbit beacon rotating */}
                <Animated.View style={[styles.orbitContainer, orbitStyle, hasOffers && styles.orbitContainerSmall]}>
                  <View
                    style={[
                      styles.orbitNode,
                      {
                        backgroundColor: theme.isDark ? Colors.cyan : colors.brand.primary,
                        shadowColor: theme.isDark ? Colors.cyan : colors.brand.primary,
                      },
                    ]}
                  />
                </Animated.View>

                {/* Central Radar Disc */}
                <View
                  style={[
                    styles.centerNode,
                    hasOffers && styles.centerNodeSmall,
                    {
                      backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.12)' : alpha(colors.brand.primary, 0.08),
                      borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.35)' : alpha(colors.brand.primary, 0.25),
                    },
                  ]}
                >
                  {isBidsLoading ? (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                  ) : (
                    <Search color={theme.isDark ? Colors.cyan : colors.brand.primary} size={hasOffers ? 18 : 26} />
                  )}
                </View>
              </View>

              {/* Status Title & Subtitle */}
              <Text style={[styles.statusText, hasOffers && styles.statusTextSmall, { color: colors.text.primary }]}>
                {hasOffers
                  ? t('findingWorker.offersReceivedTitle', 'Offers Received!')
                  : t('findingWorker.searchingUstads', 'Broadcasting Request...')}
              </Text>
              <Text style={[styles.subText, hasOffers && styles.subTextSmall, { color: colors.text.secondary }]}>
                {hasOffers
                  ? t('findingWorker.offersReviewSubtext', 'Review quotes below and tap Hire to confirm your Ustad.')
                  : isInstant
                  ? t('findingWorker.broadcastDesc', 'We sent your request to nearby verified Ustads at this fixed price.')
                  : t('findingWorker.searchDesc', 'Matching your scheduled request with top rated Ustads nearby.')}
              </Text>

              {/* Status Chips Row */}
              <View style={[styles.chipsRow, hasOffers && styles.chipsRowSmall]}>
                {isInstant ? (
                  <>
                    <View
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.08)' : alpha(colors.brand.primary, 0.07),
                          borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.2)' : alpha(colors.brand.primary, 0.2),
                        },
                      ]}
                    >
                      <Zap size={12} color={theme.isDark ? Colors.cyan : colors.brand.primary} />
                      <Text style={[styles.chipPillText, { color: theme.isDark ? Colors.cyan : colors.brand.primary }]}>
                        Fixed Rate: Rs. {basePrice.toLocaleString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: theme.isDark ? 'rgba(255, 140, 0, 0.08)' : alpha(colors.brand.worker, 0.07),
                          borderColor: theme.isDark ? 'rgba(255, 140, 0, 0.2)' : alpha(colors.brand.worker, 0.2),
                        },
                      ]}
                    >
                      <Clock size={12} color={theme.isDark ? Colors.orange : colors.brand.worker} />
                      <Text style={[styles.chipPillText, { color: theme.isDark ? Colors.orange : colors.brand.worker }]}>
                        {remainingSeconds > 0 ? `${formatCountdown(remainingSeconds)} left` : 'Searching...'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.08)' : alpha(colors.brand.primary, 0.07),
                          borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.2)' : alpha(colors.brand.primary, 0.2),
                        },
                      ]}
                    >
                      <Tag size={12} color={theme.isDark ? Colors.cyan : colors.brand.primary} />
                      <Text style={[styles.chipPillText, { color: theme.isDark ? Colors.cyan : colors.brand.primary }]}>
                        Budget: Rs. {basePrice.toLocaleString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: theme.isDark ? 'rgba(255, 140, 0, 0.08)' : alpha(colors.brand.worker, 0.07),
                          borderColor: theme.isDark ? 'rgba(255, 140, 0, 0.2)' : alpha(colors.brand.worker, 0.2),
                        },
                      ]}
                    >
                      <CalendarDays size={12} color={theme.isDark ? Colors.orange : colors.brand.worker} />
                      <Text style={[styles.chipPillText, { color: theme.isDark ? Colors.orange : colors.brand.worker }]}>
                        {scheduledDateLabel}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Notified Nearby Badge (shown while searching) */}
              {!hasOffers && !!job?.notifiedWorkersCount && job.notifiedWorkersCount > 0 && (
                <View
                  style={[
                    styles.notifiedPill,
                    {
                      backgroundColor: theme.isDark ? 'rgba(52, 199, 89, 0.08)' : alpha(colors.status.success, 0.08),
                      borderColor: theme.isDark ? 'rgba(52, 199, 89, 0.22)' : alpha(colors.status.success, 0.25),
                    },
                  ]}
                >
                  <View style={[styles.greenPulseDot, { backgroundColor: '#34C759' }]} />
                  <Text style={[styles.notifiedPillText, { color: theme.isDark ? '#34C759' : colors.status.success }]}>
                    {t('findingWorker.notifiedCount', 'Notified {{count}} active Ustads nearby', {
                      count: job.notifiedWorkersCount,
                    })}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Quick Rate Booster Prompt (if active) */}
          {showBoosterPrompt && isInstant && (
            <Animated.View
              entering={FadeIn.duration(350)}
              style={[
                styles.boosterCard,
                {
                  backgroundColor: decisionTheme.boosterCardBg,
                  borderColor: decisionTheme.boosterCardBorder,
                },
              ]}
            >
              <LinearGradient
                colors={decisionTheme.boosterGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boosterGradient}
              >
                <View style={styles.boosterHeadingRow}>
                  <View
                    style={[
                      styles.boosterIconWrap,
                      {
                        backgroundColor: isDark ? addAlpha(legacyColors.orange, '20') : '#FEF3C7',
                        borderColor: isDark ? 'rgba(255, 140, 0, 0.4)' : '#FCD34D',
                      },
                    ]}
                  >
                    <Zap size={16} color={isDark ? legacyColors.orange : '#D97706'} fill={isDark ? legacyColors.orange : '#D97706'} />
                  </View>
                  <View style={styles.boosterHeadingCopy}>
                    <Text style={[styles.boosterEyebrow, { color: isDark ? '#FF8C00' : '#D97706' }]}>
                      {t('findingWorker.boosterTitle', 'Want an Ustad Faster?')}
                    </Text>
                    <Text style={[styles.boosterUrduTitle, { color: decisionTheme.urduTitle }]}>
                      استاد اس ریٹ پر راضی نہیں ہیں
                    </Text>
                  </View>
                </View>

                <Text style={[styles.boosterDescription, { color: decisionTheme.desc }]}>
                  {t(
                    'findingWorker.boosterDesc',
                    "Nearby Ustads haven't accepted this rate yet. Increase your offer to attract Ustads faster!"
                  )}
                </Text>

                {/* Quick Increment Chips */}
                <View style={styles.quickIncrementsRow}>
                  {[200, 500, 1000].map((inc) => {
                    const isSelected = selectedIncrement === inc && !customPriceInput;
                    const target = basePrice + inc;
                    return (
                      <TouchableOpacity
                        key={inc}
                        style={[
                          styles.quickIncrementChip,
                          {
                            backgroundColor: isSelected ? decisionTheme.chipSelectedBg : decisionTheme.chipBg,
                            borderColor: isSelected ? decisionTheme.chipSelectedBorder : decisionTheme.chipBorder,
                          },
                        ]}
                        onPress={() => {
                          setSelectedIncrement(inc);
                          setCustomPriceInput('');
                        }}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.quickIncrementText,
                            {
                              color: isSelected ? decisionTheme.chipSelectedText : decisionTheme.chipText,
                              fontWeight: isSelected ? '900' : '700',
                            },
                          ]}
                        >
                          +{inc} (Rs. {target.toLocaleString()})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Price Input & Submit */}
                <View style={styles.customPriceRow}>
                  <View
                    style={[
                      styles.customPriceInputWrap,
                      {
                        backgroundColor: decisionTheme.inputWrapBg,
                        borderColor: decisionTheme.inputWrapBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.customPricePrefix, { color: decisionTheme.inputPrefix }]}>PKR</Text>
                    <TextInput
                      style={[styles.customPriceInput, { color: decisionTheme.inputText }]}
                      value={customPriceInput}
                      onChangeText={(val) => {
                        const cleaned = val.replace(/[^\d]/g, '');
                        setCustomPriceInput(cleaned);
                        if (cleaned) setSelectedIncrement(null);
                      }}
                      placeholder={String(effectiveNewPrice)}
                      placeholderTextColor={decisionTheme.inputPlaceholder}
                      keyboardType="number-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.boostSubmitBtn,
                      { backgroundColor: decisionTheme.submitBtnBg },
                      isBoosting && { opacity: 0.6 },
                    ]}
                    onPress={() => handleBoostPrice()}
                    disabled={isBoosting}
                    activeOpacity={0.8}
                  >
                    {isBoosting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.boostSubmitBtnText, { color: decisionTheme.submitBtnText }]}>
                        {t('findingWorker.boosterBtn', 'Set Rs. {{amount}} & Search', {
                          amount: effectiveNewPrice.toLocaleString(),
                        })}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.keepSearchingLink}
                  onPress={handleDismissBooster}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.keepSearchingLinkText, { color: decisionTheme.subtext }]}>
                    ⏱ {t('findingWorker.keepCurrentRate', 'Keep searching at Rs. {{amount}}', { amount: basePrice.toLocaleString() })}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          )}

          {/* OFFERS RECEIVED HERO SECTION (Placed directly after radar when offers arrive!) */}
          {hasOffers && (
            <Animated.View
              entering={SlideInDown.springify().damping(18)}
              style={[
                styles.offersSection,
                {
                  backgroundColor: theme.isDark ? 'rgba(6, 16, 28, 0.94)' : colors.surface.card,
                  borderColor: theme.isDark ? 'rgba(52, 199, 89, 0.3)' : '#86EFAC',
                },
              ]}
            >
              <LinearGradient
                colors={
                  theme.isDark
                    ? ['rgba(52, 199, 89, 0.12)', 'rgba(8, 20, 32, 0.95)']
                    : ['#F0FDF4', '#FFFFFF']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.offersSectionGradient}
              >
                {/* Header row with count */}
                <View style={styles.offersSectionHeader}>
                  <View style={styles.offersHeaderTitleRow}>
                    <View style={styles.offersBadgePill}>
                      <Text style={styles.offersBadgePillText}>
                        {applicants.length === 1 ? '1 NEW OFFER' : `${applicants.length} NEW OFFERS`}
                      </Text>
                    </View>
                    <Text style={[styles.offersSectionTitle, { color: colors.text.primary }]}>
                      {applicants.length === 1
                        ? t('findingWorker.reviewOffers', { count: 1, defaultValue: 'View 1 offer' })
                        : t('findingWorker.reviewOffersPlural', {
                            count: applicants.length,
                            defaultValue: `View ${applicants.length} offers`,
                          })}
                    </Text>
                  </View>
                  <Text style={[styles.offersSectionSubtitle, { color: colors.text.secondary }]}>
                    {t('findingWorker.compareProfiles', 'Review ratings and tap Hire to confirm.')}
                  </Text>
                </View>

                {/* Quick Offer Switcher Tabs (when multiple offers exist) */}
                {applicants.length > 1 && (
                  <View style={styles.offerTabsWrapper}>
                    <Text style={[styles.offerTabsHeaderLabel, { color: colors.text.muted }]}>
                      {t('findingWorker.selectOfferToReview', 'SELECT OFFER TO ACCEPT:')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.offerTabsScrollContent}
                    >
                      {applicants.map((app, idx) => {
                        const isTabActive = (selectedApplicantId || applicants[0]?._id) === app._id;
                        const proposed = Number(app.proposedPrice || 0);
                        const minPrice = Math.min(
                          ...applicants.map((a: any) => Number(a.proposedPrice || Infinity))
                        );
                        const isLowest = applicants.length > 1 && proposed === minPrice;
                        return (
                          <TouchableOpacity
                            key={app._id}
                            style={[
                              styles.offerTabPill,
                              {
                                backgroundColor: isTabActive
                                  ? (theme.isDark ? 'rgba(0, 245, 255, 0.15)' : alpha(colors.brand.primary, 0.12))
                                  : (theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                                borderColor: isTabActive
                                  ? (theme.isDark ? Colors.cyan : colors.brand.primary)
                                  : (theme.isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1'),
                              },
                            ]}
                            onPress={() => handleSelectOfferTab(app._id)}
                            activeOpacity={0.75}
                          >
                            <View
                              style={[
                                styles.offerTabDot,
                                {
                                  backgroundColor: isTabActive
                                    ? (theme.isDark ? Colors.cyan : colors.brand.primary)
                                    : '#94A3B8',
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.offerTabTitle,
                                {
                                  color: isTabActive
                                    ? (theme.isDark ? Colors.cyan : colors.brand.primary)
                                    : colors.text.primary,
                                  fontWeight: isTabActive ? '800' : '600',
                                },
                              ]}
                            >
                              {app.worker?.fullName?.split(' ')[0] || `Ustad ${idx + 1}`} ({formatMoney(app.proposedPrice)})
                            </Text>
                            {isLowest && (
                              <View style={styles.offerTabBestBadge}>
                                <Text style={styles.offerTabBestText}>Best</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* List of Offers */}
                <View style={styles.applicantCardsList}>
                  {applicants.map((applicant, index) => {
                    const isAcceptingThis = isAccepting && acceptingBidId === applicant._id;
                    const isRejectingThis = isRejecting && rejectingBidId === applicant._id;
                    const workerRating = getWorkerRating(applicant.worker);
                    const proposed = Number(applicant.proposedPrice || 0);
                    const priceDiff = basePrice - proposed;
                    const isSelected = (selectedApplicantId || applicants[0]?._id) === applicant._id;
                    const minPrice = Math.min(
                      ...applicants.map((a: any) => Number(a.proposedPrice || Infinity))
                    );
                    const isLowest = applicants.length > 1 && proposed === minPrice;
                    const reviewCount = applicant.worker?.totalReviews ?? applicant.worker?.totalJobs ?? 0;
                    const categoryText = applicant.worker?.category || applicant.worker?.specialty;

                    return (
                      <View
                        key={applicant._id}
                        onLayout={(e) => {
                          cardLayoutsRef.current[applicant._id] = e.nativeEvent.layout.y;
                        }}
                        style={[
                          styles.applicantCard,
                          {
                            backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.75)' : '#FFFFFF',
                            borderColor: isSelected
                              ? (theme.isDark ? Colors.cyan : colors.brand.primary)
                              : (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle),
                            borderWidth: isSelected ? 1.8 : 1,
                          },
                        ]}
                      >
                        {/* Offer Index and Best Price Badge */}
                        <View style={styles.applicantCardTopRow}>
                          <View style={styles.offerIndexPill}>
                            <Text style={styles.offerIndexPillText}>
                              {`OFFER ${index + 1} OF ${applicants.length}`}
                            </Text>
                          </View>
                          {isLowest && (
                            <View style={styles.bestOfferBadge}>
                              <Sparkles size={11} color="#10B981" />
                              <Text style={styles.bestOfferBadgeText}>BEST PRICE</Text>
                            </View>
                          )}
                        </View>
                        {/* Worker Identity Row (Tap opens Profile) */}
                        <TouchableOpacity
                          style={styles.applicantHeaderRow}
                          onPress={() => handleWorkerPress(applicant)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.applicantAvatarWrapper}>
                            <Image
                              source={{
                                uri: applicant.worker?.profileImage || 'https://via.placeholder.com/150',
                              }}
                              style={styles.applicantAvatar}
                              contentFit="cover"
                              transition={150}
                              cachePolicy="memory-disk"
                            />
                            <View style={styles.verifiedCheckBadge}>
                              <ShieldCheck size={11} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                          </View>

                          <View style={styles.applicantInfo}>
                            <View style={styles.applicantNameRow}>
                              <Text
                                style={[styles.applicantName, { color: colors.text.primary }]}
                                numberOfLines={1}
                              >
                                {applicant.worker?.fullName || 'Verified Ustad'}
                              </Text>

                              {workerRating > 0 && (
                                <View style={styles.ratingBadge}>
                                  <Star size={11} color="#FFD700" fill="#FFD700" />
                                  <Text style={styles.ratingBadgeText}>
                                    {workerRating.toFixed(1)}
                                    {reviewCount > 0 ? ` (${reviewCount})` : ''}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {Boolean(categoryText) && (
                              <Text
                                style={[styles.workerCategoryText, { color: colors.text.muted }]}
                                numberOfLines={1}
                              >
                                {categoryText}
                              </Text>
                            )}

                            <View style={styles.priceRow}>
                              <Text style={styles.quotedPriceText}>
                                {formatMoney(applicant.proposedPrice)}
                              </Text>

                              {priceDiff > 0 && (
                                <View style={styles.savingsTag}>
                                  <Sparkles size={10} color="#10B981" />
                                  <Text style={styles.savingsTagText}>
                                    Save Rs. {priceDiff.toLocaleString()}
                                  </Text>
                                </View>
                              )}
                              {priceDiff < 0 && (
                                <View style={styles.counterOfferTag}>
                                  <Text style={styles.counterOfferTagText}>
                                    Counter-offer (+Rs. {Math.abs(priceDiff).toLocaleString()})
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <ChevronRight
                            size={18}
                            color={colors.text.muted}
                            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                          />
                        </TouchableOpacity>

                        {/* Proposal Message Note (if provided by Ustad) */}
                        {Boolean(applicant.message) && (
                          <View
                            style={[
                              styles.proposalMessageBubble,
                              {
                                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                              },
                            ]}
                          >
                            <Text
                              style={[styles.proposalMessageText, { color: theme.colors.text.secondary }]}
                              numberOfLines={2}
                            >
                              "{applicant.message}"
                            </Text>
                          </View>
                        )}

                        {/* Actions Row: Accept / Decline */}
                        <View
                          style={[
                            styles.applicantActionsRow,
                            { borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' },
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.hireButton,
                              { backgroundColor: colors.status.success },
                              (isAccepting || isRejecting) && { opacity: 0.65 },
                            ]}
                            onPress={() => handleHireApplicant(applicant)}
                            disabled={isAccepting || isRejecting}
                            activeOpacity={0.82}
                          >
                            {isAcceptingThis ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <View style={styles.btnContentRow}>
                                <Check size={15} color="#FFFFFF" strokeWidth={2.8} />
                                <Text style={styles.hireButtonText}>
                                  {t('common.hire', 'Accept & Hire')} ({formatMoney(applicant.proposedPrice)})
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.declineButton,
                              {
                                borderColor: alpha(colors.status.error, 0.35),
                                backgroundColor: alpha(colors.status.error, 0.08),
                              },
                              (isAccepting || isRejecting) && { opacity: 0.65 },
                            ]}
                            onPress={() => handleRejectApplicant(applicant)}
                            disabled={isAccepting || isRejecting}
                            activeOpacity={0.8}
                          >
                            {isRejectingThis ? (
                              <ActivityIndicator size="small" color={colors.status.error} />
                            ) : (
                              <View style={styles.btnContentRow}>
                                <X size={14} color={colors.status.error} strokeWidth={2.4} />
                                <Text style={[styles.declineButtonText, { color: colors.status.error }]}>
                                  {t('common.reject', 'Decline')}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Compact / Collapsible Job Brief Card */}
          {job && (
            <Animated.View
              entering={FadeIn.delay(150)}
              style={[
                styles.jobCard,
                {
                  backgroundColor: theme.isDark ? 'rgba(10, 16, 32, 0.85)' : colors.surface.card,
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                },
              ]}
            >
              {/* Header: Title + Category + Urgent Tag + Toggle */}
              <TouchableOpacity
                style={styles.jobCardHeader}
                onPress={() => setIsRequestExpanded((prev) => !prev)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.jobCategoryIconWrap,
                    {
                      backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.1)' : alpha(colors.brand.primary, 0.1),
                      borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.25)' : alpha(colors.brand.primary, 0.25),
                    },
                  ]}
                >
                  <Briefcase size={16} color={theme.isDark ? Colors.cyan : colors.brand.primary} />
                </View>

                <View style={styles.jobCardHeaderCopy}>
                  <Text style={[styles.jobCardEyebrow, { color: colors.text.muted }]}>
                    {t('findingWorker.yourJob', 'YOUR REQUEST')}
                  </Text>
                  <Text style={[styles.jobCardTitle, { color: colors.text.primary }]} numberOfLines={1}>
                    {job.category || 'Service Request'}
                  </Text>
                </View>

                <View style={styles.jobCardHeaderRight}>
                  <View
                    style={[
                      styles.urgencyBadge,
                      {
                        backgroundColor: isInstant
                          ? (theme.isDark ? 'rgba(0, 245, 255, 0.12)' : '#DBEAFE')
                          : (theme.isDark ? 'rgba(255, 140, 0, 0.12)' : '#FFEDD5'),
                        borderColor: isInstant
                          ? (theme.isDark ? 'rgba(0, 245, 255, 0.28)' : '#93C5FD')
                          : (theme.isDark ? 'rgba(255, 140, 0, 0.28)' : '#FDBA74'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgencyBadgeText,
                        {
                          color: isInstant
                            ? (theme.isDark ? Colors.cyan : colors.brand.primary)
                            : (theme.isDark ? Colors.orange : colors.brand.worker),
                        },
                      ]}
                    >
                      {isInstant ? 'URGENT' : 'SCHEDULED'}
                    </Text>
                  </View>

                  {isRequestExpanded ? (
                    <ChevronUp size={16} color={colors.text.muted} />
                  ) : (
                    <ChevronDown size={16} color={colors.text.muted} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Quick Info Strip (Always visible) */}
              <View
                style={[
                  styles.jobQuickStrip,
                  { borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' },
                ]}
              >
                <View style={styles.jobQuickItem}>
                  <Tag size={13} color={colors.brand.primary} />
                  <Text style={[styles.jobQuickText, { color: colors.text.secondary }]}>
                    {formatMoney(job.detailMeta?.financial?.amount ?? job.budget ?? job.amount)}
                  </Text>
                </View>

                {evidenceCount > 0 && (
                  <View style={styles.jobQuickItem}>
                    <ImageIcon size={13} color={colors.brand.secondary} />
                    <Text style={[styles.jobQuickText, { color: colors.text.secondary }]}>
                      {evidenceCount} photo{evidenceCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {!!job.address && (
                  <View style={[styles.jobQuickItem, { flex: 1 }]}>
                    <MapPin size={13} color={colors.brand.worker} />
                    <Text
                      style={[styles.jobQuickText, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {job.address}
                    </Text>
                  </View>
                )}
              </View>

              {/* Expanded Description & Details */}
              {isRequestExpanded && (
                <View
                  style={[
                    styles.jobExpandedSection,
                    { borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' },
                  ]}
                >
                  {!!job.description && (
                    <Text style={[styles.jobDescriptionText, { color: colors.text.secondary }]}>
                      {job.description}
                    </Text>
                  )}

                  {!isInstant && (
                    <View
                      style={[
                        styles.scheduleBox,
                        {
                          backgroundColor: theme.isDark ? 'rgba(255, 149, 0, 0.07)' : '#FFF7ED',
                          borderColor: theme.isDark ? 'rgba(255, 149, 0, 0.18)' : '#FDBA74',
                        },
                      ]}
                    >
                      <View style={styles.scheduleItem}>
                        <CalendarDays size={14} color={colors.brand.worker} />
                        <Text style={[styles.scheduleValue, { color: colors.text.primary }]}>
                          {scheduledDateLabel}
                        </Text>
                      </View>
                      <View style={styles.scheduleItem}>
                        <Clock size={14} color={colors.brand.worker} />
                        <Text style={[styles.scheduleValue, { color: colors.text.primary }]}>
                          {scheduledTimeLabel}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          )}

          {/* Safe to Leave App Reassurance Box (When searching) */}
          {!hasOffers && (
            <View
              style={[
                styles.reassuranceCard,
                {
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : colors.surface.card,
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : theme.colors.border.subtle,
                },
              ]}
            >
              <Clock size={16} color={colors.text.muted} />
              <Text style={[styles.reassuranceText, { color: colors.text.muted }]}>
                {t(
                  'findingWorker.safeToLeave',
                  "Safe to close the app — we'll notify you via push notification as soon as an Ustad responds."
                )}
              </Text>
            </View>
          )}

          {/* Cancel Request Button */}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255, 59, 48, 0.06)' : '#FEF2F2',
                borderColor: theme.isDark ? 'rgba(255, 59, 48, 0.2)' : '#FCA5A5',
              },
              isCancelling && { opacity: 0.5 },
            ]}
            onPress={handleCancelJob}
            disabled={isCancelling}
            activeOpacity={0.75}
          >
            {isCancelling ? (
              <ActivityIndicator color={colors.status.error} size="small" />
            ) : (
              <X color={colors.status.error} size={15} strokeWidth={2.4} />
            )}
            <Text style={[styles.cancelButtonText, { color: colors.status.error }]}>
              {isCancelling
                ? t('findingWorker.cancelling', 'Cancelling...')
                : t('findingWorker.cancelRequest', 'Cancel Service Request')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Confirmation Modal */}
        <ConfirmModal
          visible={confirmModal.visible}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          confirmColor={confirmModal.confirmColor}
          isLoading={isCancelling}
        />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  searchHero: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  searchHeroGradient: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
  },
  searchHeroGradientSmall: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  animationContainer: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  animationContainerSmall: {
    width: 140,
    height: 140,
    marginVertical: 0,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.2,
  },
  pulseRingOuterSmall: {
    width: 136,
    height: 136,
    borderRadius: 68,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
  },
  pulseRingSmall: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  centerNode: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  centerNodeSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  orbitContainer: {
    position: 'absolute',
    width: 176,
    height: 176,
    alignItems: 'center',
  },
  orbitContainerSmall: {
    width: 124,
    height: 124,
  },
  orbitNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  satelliteOrbit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteContainerSmall: {
    width: 40,
    height: 40,
  },
  satelliteGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.cyan,
    backgroundColor: '#0F172A',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  satelliteGlowSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  satelliteImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  satellitePricePill: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  satellitePricePillSmall: {
    bottom: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  satellitePriceText: {
    fontSize: 8,
    fontWeight: '900',
    color: Colors.cyan,
  },
  satellitePriceTextSmall: {
    fontSize: 7.5,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: -0.2,
  },
  statusTextSmall: {
    fontSize: 16,
    marginTop: 4,
  },
  subText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
    fontWeight: '500',
    maxWidth: 290,
  },
  subTextSmall: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  chipsRowSmall: {
    marginTop: 6,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  chipPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  notifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Offers Received Section
  offersSection: {
    marginTop: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  offersSectionGradient: {
    padding: 16,
  },
  offersSectionHeader: {
    marginBottom: 12,
  },
  offersHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  offersBadgePill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offersBadgePillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  offersSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  offersSectionSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  offerTabsWrapper: {
    marginBottom: 10,
  },
  offerTabsHeaderLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  offerTabsScrollContent: {
    gap: 8,
    paddingRight: 6,
  },
  offerTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  offerTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  offerTabTitle: {
    fontSize: 12,
  },
  offerTabBestBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  offerTabBestText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  applicantCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  offerIndexPill: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offerIndexPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  bestOfferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestOfferBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  applicantCardsList: {
    gap: 10,
  },
  applicantCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  applicantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingBottom: 10,
  },
  applicantAvatarWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  applicantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  applicantName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  workerCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  ratingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFD700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  quotedPriceText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#10B981',
  },
  savingsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  savingsTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  counterOfferTag: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  counterOfferTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
  },
  proposalMessageBubble: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  proposalMessageText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  applicantActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  hireButton: {
    flex: 1.4,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  hireButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  declineButton: {
    flex: 0.8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  declineButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  compareOffersBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  compareOffersBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  // Collapsible Job Request Brief Card
  jobCard: {
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  jobCategoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  jobCardHeaderCopy: {
    flex: 1,
  },
  jobCardEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  jobCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  jobCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  urgencyBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jobQuickStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
    flexWrap: 'wrap',
  },
  jobQuickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  jobQuickText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobExpandedSection: {
    padding: 14,
    borderTopWidth: 1,
  },
  jobDescriptionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 14,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Booster Card
  boosterCard: {
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  boosterGradient: {
    padding: 16,
  },
  boosterHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  boosterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  boosterHeadingCopy: {
    flex: 1,
  },
  boosterEyebrow: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  boosterUrduTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  boosterDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 12,
  },
  quickIncrementsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickIncrementChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIncrementText: {
    fontSize: 10.5,
  },
  customPriceRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customPriceInputWrap: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 6,
  },
  customPricePrefix: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  customPriceInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  boostSubmitBtn: {
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostSubmitBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  keepSearchingLink: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  keepSearchingLinkText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Reassurance & Cancel
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  reassuranceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
