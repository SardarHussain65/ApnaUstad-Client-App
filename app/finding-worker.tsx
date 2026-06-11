import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Shield, Star, MapPin, Check, Briefcase, Award, Clock, Eye, ChevronRight, MessageSquare, ArrowLeft, Search, Users, Radio, Image as ImageIcon, CalendarDays, Tag, Percent } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  useSharedValue,
  interpolate,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Colors, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { socketService } from '../services/socketService';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAcceptBidMutation, useCancelJobMutation } from '../hooks/mutations/useMutations';
import { useBidsByJob, useJobDetails } from '../hooks/queries/useMessagesAndJobs';
import api from '../services/api';
import Toast from 'react-native-toast-message';

const getWorkerRating = (worker?: any) => {
  const rating = Number(worker?.rating ?? worker?.averageRating ?? 0);
  return Number.isFinite(rating) && rating > 0 ? rating : 0;
};

const formatMoney = (value?: number | string) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? `Rs. ${amount.toLocaleString()}` : 'Open';
};

const formatElapsedTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function FindingWorkerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [status, setStatus] = useState('Finding nearby Ustads...');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  const bypassBeforeRemoveRef = useRef(false);

  const { data: job } = useJobDetails(jobId as string);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassBeforeRemoveRef.current) {
        return;
      }
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prevent infinite loop during replacement navigation
      bypassBeforeRemoveRef.current = true;

      // Redirect to home screen directly
      router.replace('/(tabs)' as any);
    });

    return unsubscribe;
  }, [navigation, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { mutate: acceptBid, isPending: isAccepting } = useAcceptBidMutation({
    onSuccess: (data) => {
      setStatus('Ustad selected');
      setShowModal(false);
      
      Toast.show({
        type: 'success',
        text1: 'Ustad Selected',
        text2: 'Your booking has been created successfully.',
      });

      // Redirect to booking details after a brief delay for UX
      setTimeout(() => {
        bypassBeforeRemoveRef.current = true;
        router.replace({
          pathname: '/transaction-details',
          params: { id: data._id }
        });
      }, 1500);
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Could Not Select Ustad',
        text2: err.response?.data?.message || 'Please try again.',
      });
    }
  });

  const { data: initialBids, isLoading: isBidsLoading } = useBidsByJob(jobId as string, {
    enabled: !!jobId,
    refetchInterval: 30000, // Reduced polling frequency to 30 seconds
  });

  const { mutate: cancelJob, isPending: isCancelling } = useCancelJobMutation({
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Request Cancelled',
        text2: 'Your service request has been cancelled.',
      });
      bypassBeforeRemoveRef.current = true;
      router.replace('/(tabs)' as any);
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Could Not Cancel Request',
        text2: err.response?.data?.message || 'Please try again.',
      });
    }
  });

  const handleCancelJob = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to stop searching and cancel this service request?',
      [
        { text: 'Keep Searching', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () => cancelJob({ jobId: jobId as string })
        }
      ]
    );
  };

  useEffect(() => {
    if (initialBids && initialBids.length > 0) {
      // Sync state with fetched bids, avoiding duplicates
      setApplicants(prev => {
        const combined = [...prev];
        initialBids.forEach(bid => {
          if (!combined.some(a => a._id === bid._id)) {
            combined.push(bid);
          }
        });
        return combined;
      });
      
      setStatus('Offers received');
    }
  }, [initialBids]);

  useEffect(() => {
    // Animations
    pulse.value = withRepeat(withTiming(1.2, { duration: 1500 }), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);

    // Socket Listeners
    const unsubscribeAssigned = socketService.on('job:assigned', (data) => {
      setStatus('Ustad selected');
      
      Toast.show({
        type: 'success',
        text1: 'Ustad Selected',
        text2: 'Your booking is ready.',
      });
      
      setTimeout(() => {
        bypassBeforeRemoveRef.current = true;
        router.replace({
          pathname: '/transaction-details',
          params: { id: data.booking._id }
        });
      }, 1500);
    });

    const unsubscribeBids = socketService.on('bid:new', (newBid: any) => {
      const bidJobId = String(newBid?.jobPost?._id || newBid?.jobPost || '');
      if (bidJobId && bidJobId !== String(jobId)) return;

      setApplicants(prev => {
        // Avoid duplicates
        if (prev.some(a => a._id === newBid._id)) return prev;
        return [...prev, newBid];
      });
      setStatus('Offers received');
    });

    const unsubscribeWithdrawn = socketService.on('bid:withdrawn', (payload: any) => {
      if (payload?.jobId && String(payload.jobId) !== String(jobId)) return;
      setApplicants(prev => {
        const nextApplicants = prev.filter(app => app._id !== payload?.bidId);
        if (nextApplicants.length === 0) setStatus('Finding nearby Ustads...');
        return nextApplicants;
      });
    });

    return () => {
      unsubscribeAssigned();
      unsubscribeBids();
      unsubscribeWithdrawn();
    };
  }, [jobId, pulse, rotation, router]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.2], [0.6, 0.1]),
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleWorkerPress = (worker: any) => {
    setSelectedWorker(worker);
    setPromoCodeInput('');
    setAppliedPromo(null);
    setShowModal(true);
  };

  const handleReviewFirstProposal = () => {
    if (applicants.length > 0) {
      handleWorkerPress(applicants[0]);
    }
  };

  const handleBackHome = () => {
    bypassBeforeRemoveRef.current = true;
    router.replace('/(tabs)' as any);
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim() || !selectedWorker) return;
    setIsApplyingPromo(true);
    const workerProfile = selectedWorker?.worker || {};
    const selectedPrice = selectedWorker?.proposedPrice || workerProfile?.hourlyRate || 0;
    try {
      const response = await api.post('/promos/validate', {
        code: promoCodeInput.trim(),
        bookingAmount: Number(selectedPrice),
      });

      if (response.data?.success && response.data?.data) {
        const valData = response.data.data;
        if (valData.isValid) {
          setAppliedPromo({
            isValid: true,
            code: promoCodeInput.trim().toUpperCase(),
            discountAmount: valData.discountAmount,
            finalAmount: valData.finalAmount,
            message: valData.message,
          });
          Toast.show({
            type: 'success',
            text1: 'Promo Code Applied!',
            text2: valData.message || 'Discount has been subtracted.',
          });
        } else {
          setAppliedPromo({
            isValid: false,
            message: valData.message,
          });
          Toast.show({
            type: 'error',
            text1: 'Invalid Promo Code',
            text2: valData.message || 'Please check code constraints.',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Validation Failed',
          text2: 'Could not apply promo code.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error Applying Promo',
        text2: err.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleHire = () => {
    if (!selectedWorker) return;
    acceptBid({ 
      jobId: jobId as string, 
      bidId: selectedWorker._id,
      promoCode: appliedPromo?.isValid ? appliedPromo.code : undefined
    });
  };

  const handleViewWorkerProfile = () => {
    const workerId = selectedWorker?.worker?._id;
    if (!workerId) return;
    setShowModal(false);
    router.push({
      pathname: '/worker-details' as any,
      params: {
        id: workerId,
        bidId: selectedWorker._id,
        jobId: jobId as string,
      },
    });
  };

  const selectedProfile = selectedWorker?.worker || {};
  const selectedRating = getWorkerRating(selectedProfile);
  const selectedReviews = Number(selectedProfile.totalReviews || 0);
  const selectedJobs = Number(selectedProfile.totalJobs || 0);
  const selectedSkills = Array.isArray(selectedProfile.skills) ? selectedProfile.skills.slice(0, 4) : [];
  const selectedPrice = selectedWorker?.proposedPrice || selectedProfile.hourlyRate;
  const selectedExperience = Number(selectedProfile.experience || 0);
  const selectedEstimatedDays = Number(selectedWorker?.estimatedDays || 0);
  const selectedAvailabilityLabel = selectedProfile.isAvailable === false ? 'Currently busy' : 'Available now';
  const ratedApplicants = applicants
    .map((applicant) => getWorkerRating(applicant.worker))
    .filter((rating) => rating > 0);
  const averageApplicantRating = ratedApplicants.length > 0
    ? ratedApplicants.reduce((sum, rating) => sum + rating, 0) / ratedApplicants.length
    : null;
  const evidenceCount = Number(
    job?.detailMeta?.media?.totalCount
    || job?.media?.totalCount
    || (job?.imageUrls?.length || 0) + (job?.videoUrls?.length || 0)
  );
  const isSearching = applicants.length === 0;
  const isInstant = job?.urgency === 'instant';
  const scheduledDateLabel = job?.detailMeta?.schedule?.fullDateLabel
    || (job?.scheduledDate
      ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date pending');
  const scheduledTimeLabel = job?.detailMeta?.schedule?.timeLabel || job?.scheduledTime || 'Time pending';

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBackHome} activeOpacity={0.75}>
            <ArrowLeft size={19} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>REQUEST SENT</Text>
            <Text style={styles.headerTitle}>Finding an Ustad</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.searchHero}>
            <LinearGradient
              colors={['rgba(0,245,255,0.14)', 'rgba(7,13,35,0.92)', 'rgba(191,90,242,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchHeroGradient}
            >
              <View style={styles.searchStatusBadge}>
                <Radio size={13} color={Colors.cyan} />
                <Text style={styles.searchStatusText}>{isSearching ? 'SEARCHING FOR USTADS' : `${applicants.length} OFFER${applicants.length === 1 ? '' : 'S'} RECEIVED`}</Text>
              </View>

              <View style={styles.animationContainer}>
                <Animated.View style={[styles.pulseRing, ringStyle]} />
                <View style={styles.satelliteOrbit}>
                  {applicants.slice(0, 6).map((app, index) => {
                    const angle = (index * (360 / Math.max(Math.min(applicants.length, 6), 1))) * (Math.PI / 180);
                    const radius = 91;
                    const tx = radius * Math.cos(angle);
                    const ty = radius * Math.sin(angle);

                    return (
                      <TouchableOpacity
                        key={app._id}
                        onPress={() => handleWorkerPress(app)}
                        style={[
                          styles.satelliteContainer,
                          { transform: [{ translateX: tx }, { translateY: ty }] }
                        ]}
                      >
                        <Animated.View entering={FadeIn.delay(180 * index).duration(450)} style={styles.satelliteGlow}>
                          <Image
                            source={{ uri: app.worker?.profileImage || 'https://via.placeholder.com/150' }}
                            style={styles.satelliteImage}
                          />
                          <View style={styles.priceBadge}>
                            <Text style={styles.priceText}>{formatMoney(app.proposedPrice)}</Text>
                          </View>
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Animated.View style={[styles.orbitContainer, orbitStyle]}>
                  <View style={styles.orbitNode} />
                </Animated.View>
                <View style={styles.centerNode}>
                  {isBidsLoading ? <ActivityIndicator size="small" color={Colors.cyan} /> : <Search color={Colors.cyan} size={28} />}
                </View>
              </View>

              <Text style={[styles.statusText, Typography.threeD]}>{status}</Text>
              <Text style={styles.subText}>
                {isSearching
                  ? 'Your request has been sent to nearby Ustads.'
                  : 'Review the offers and choose the Ustad who fits your work best.'}
              </Text>
            </LinearGradient>
          </Animated.View>

          {job && (
            <Animated.View entering={FadeIn.delay(200)} style={styles.jobBriefCard}>
              <LinearGradient
                colors={['rgba(0,245,255,0.10)', 'rgba(255,255,255,0.025)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.jobBriefGradient}
              >
                <View style={styles.sectionHeadingRow}>
                  <View style={styles.sectionIcon}>
                    <Briefcase size={15} color={Colors.cyan} />
                  </View>
                  <View style={styles.sectionHeadingCopy}>
                    <Text style={styles.sectionEyebrow}>YOUR JOB</Text>
                    <Text style={styles.jobTitle}>{job.category || 'Service Request'}</Text>
                  </View>
                  <View style={[styles.requestTypeBadge, job.urgency !== 'instant' && styles.scheduledBadge]}>
                    <Text style={[styles.requestTypeText, !isInstant && styles.scheduledText]}>
                      {isInstant ? 'URGENT' : 'SCHEDULED'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.jobDescription} numberOfLines={2}>
                  {job.description || 'Service details are being loaded...'}
                </Text>

                {!isInstant && (
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleItem}>
                      <CalendarDays size={14} color={Colors.orange} />
                      <View style={styles.scheduleCopy}>
                        <Text style={styles.scheduleLabel}>VISIT DATE</Text>
                        <Text style={styles.scheduleValue}>{scheduledDateLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleDivider} />
                    <View style={styles.scheduleItem}>
                      <Clock size={14} color={Colors.orange} />
                      <View style={styles.scheduleCopy}>
                        <Text style={styles.scheduleLabel}>VISIT TIME</Text>
                        <Text style={styles.scheduleValue}>{scheduledTimeLabel}</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.requestMetaRow}>
                  <View style={styles.requestMetaItem}>
                    <Text style={styles.requestMetaLabel}>BUDGET</Text>
                    <Text style={styles.requestMetaValue}>{formatMoney(job.detailMeta?.financial?.amount ?? job.budget ?? job.amount)}</Text>
                  </View>
                  <View style={styles.requestMetaDivider} />
                  <View style={styles.requestMetaItem}>
                    <Text style={styles.requestMetaLabel}>PHOTOS/VIDEOS</Text>
                    <View style={styles.inlineMeta}>
                      <ImageIcon size={13} color={Colors.purple} />
                      <Text style={styles.requestMetaValue}>{evidenceCount} photo{evidenceCount !== 1 ? 's' : ''} added</Text>
                    </View>
                  </View>
                </View>

                {!!job.address && (
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={Colors.pink} />
                    <Text style={styles.locationText} numberOfLines={1}>{job.address}</Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          {applicants.length > 0 ? (
            <Animated.View entering={SlideInDown.springify().damping(16)} style={styles.responseCard}>
              <LinearGradient
                colors={['rgba(0,255,127,0.15)', 'rgba(0,245,255,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.responseGradient}
              >
                <View style={styles.responseCopy}>
                  <Text style={styles.responseEyebrow}>USTADS ARE READY</Text>
                  <Text style={styles.responseTitle}>Review {applicants.length} offer{applicants.length === 1 ? '' : 's'}</Text>
                  <Text style={styles.responseText}>Compare profiles, ratings, and offers before choosing an Ustad.</Text>
                </View>
                <View style={styles.responseProfiles}>
                  {applicants.slice(0, 3).map((applicant) => (
                    <TouchableOpacity
                      key={applicant._id}
                      style={styles.responseProfile}
                      onPress={() => handleWorkerPress(applicant)}
                      activeOpacity={0.78}
                    >
                      <Image
                        source={{ uri: applicant.worker?.profileImage || 'https://via.placeholder.com/150' }}
                        style={styles.responseProfileImage}
                      />
                      <View style={styles.responseProfileCopy}>
                        <Text style={styles.responseProfileName} numberOfLines={1}>
                          {applicant.worker?.fullName || 'Available Ustad'}
                        </Text>
                        <Text style={styles.responseProfilePrice}>{formatMoney(applicant.proposedPrice)}</Text>
                      </View>
                      <ChevronRight size={15} color={Colors.cyan} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.reviewButton} onPress={handleReviewFirstProposal} activeOpacity={0.78}>
                  <Text style={styles.reviewButtonText}>Review first offer</Text>
                  <ChevronRight size={17} color="#001014" strokeWidth={2.8} />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          ) : (
            <View style={styles.waitingNote}>
              <Clock size={15} color={Colors.textMuted} />
              <Text style={styles.waitingText}>You can safely leave this screen. We will continue searching in the background.</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={15} color={Colors.cyan} />
              <Text style={styles.statVal}>{applicants.length}</Text>
              <Text style={styles.statLab}>OFFERS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Radio size={15} color={Colors.pink} />
              <Text style={styles.statVal}>{isInstant ? 'Urgent' : 'Scheduled'}</Text>
              <Text style={styles.statLab}>JOB TYPE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock size={15} color={Colors.orange} />
              <Text style={styles.statVal}>{formatElapsedTime(elapsedSeconds)}</Text>
              <Text style={styles.statLab}>ELAPSED</Text>
            </View>
          </View>

          {averageApplicantRating !== null && (
            <Text style={styles.ratingSummary}>
              Average rating: {averageApplicantRating.toFixed(1)} rating
            </Text>
          )}

          <TouchableOpacity
            style={[styles.cancelBtn, isCancelling && { opacity: 0.5 }]}
            onPress={handleCancelJob}
            disabled={isCancelling}
            activeOpacity={0.75}
          >
            {isCancelling ? (
              <ActivityIndicator color={Colors.error} size="small" />
            ) : (
              <X color={Colors.error} size={17} />
            )}
            <Text style={styles.cancelText}>{isCancelling ? 'CANCELLING...' : 'CANCEL REQUEST'}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Worker Details Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              onPress={() => setShowModal(false)} 
            />
            
            <Animated.View 
              entering={SlideInDown.springify().damping(15)}
              style={styles.modalContent}
            >
              <LinearGradient
                colors={['#0C0E24', '#080916']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderCopy}>
                    <Text style={styles.modalTitle}>USTAD OFFER</Text>
                    <Text style={styles.modalSubtitle}>Review the offer and Ustad profile</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                    <X size={19} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScroll}
                >
                  <LinearGradient
                    colors={['rgba(0,245,255,0.10)', 'rgba(255,255,255,0.025)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.identityCard}
                  >
                    <View style={styles.identityImageWrapper}>
                      <Image
                        source={{ uri: selectedProfile.profileImage || 'https://via.placeholder.com/150' }}
                        style={styles.identityImage}
                      />
                      <View style={[styles.statusGlow, !selectedProfile.isAvailable && styles.statusOffline]} />
                    </View>

                    <View style={styles.identityCopy}>
                      <Text style={styles.workerName} numberOfLines={1}>{selectedProfile.fullName || 'Specialist'}</Text>
                      <Text style={styles.workerCategory} numberOfLines={1}>{selectedProfile.category || 'Ustad Specialist'}</Text>
                      <View style={styles.identityMetaRow}>
                        <View style={styles.ratingRow}>
                          <Star size={13} color={Colors.yellow} fill={Colors.yellow} />
                          <Text style={styles.ratingText}>
                            {selectedRating > 0 ? selectedRating.toFixed(1) : 'New'} · {selectedReviews} review{selectedReviews === 1 ? '' : 's'}
                          </Text>
                        </View>
                        <View style={styles.identityMetaDivider} />
                        <View style={styles.availabilityRow}>
                          <View style={[styles.availabilityDot, !selectedProfile.isAvailable && styles.statusOffline]} />
                          <Text style={[styles.availabilityText, selectedProfile.isAvailable === false && styles.availabilityTextBusy]}>
                            {selectedAvailabilityLabel}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.verificationBadge, !selectedProfile.isVerified && styles.verificationBadgePending]}>
                      <Shield size={12} color={selectedProfile.isVerified ? Colors.green : Colors.orange} />
                      <Text style={[styles.verificationBadgeText, !selectedProfile.isVerified && styles.verificationBadgeTextPending]}>
                        {selectedProfile.isVerified ? 'VERIFIED' : 'REVIEWING'}
                      </Text>
                    </View>
                  </LinearGradient>

                  <View style={styles.proposalCard}>
                    <View style={styles.proposalHeader}>
                      <MessageSquare size={14} color={Colors.cyan} />
                      <Text style={styles.proposalTitle}>OFFER NOTE</Text>
                    </View>
                    <Text style={styles.proposalText}>
                      {selectedWorker?.message || 'I am ready to help you with this job.'}
                    </Text>
                    <View style={styles.proposalDivider} />
                    <View style={styles.proposalFooter}>
                      <View>
                        <Text style={styles.proposalLabel}>OFFERED PRICE</Text>
                        {appliedPromo?.isValid ? (
                          <View style={styles.priceContainer}>
                            <Text style={styles.strikethroughAmount}>{formatMoney(selectedPrice)}</Text>
                            <Text style={[styles.proposalAmount, { color: Colors.green }]}>
                              {formatMoney(appliedPromo.finalAmount)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.proposalAmount}>{formatMoney(selectedPrice)}</Text>
                        )}
                      </View>
                      <View style={styles.proposalTimeline}>
                        <Clock size={14} color={Colors.orange} />
                        <View>
                          <Text style={styles.proposalTimelineLabel}>ESTIMATED TIME</Text>
                          <Text style={styles.proposalTimelineValue}>
                            {selectedEstimatedDays > 0
                              ? `${selectedEstimatedDays} day${selectedEstimatedDays === 1 ? '' : 's'}`
                              : 'Flexible'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Promo Code Input Panel */}
                  <View style={styles.promoContainer}>
                    <View style={styles.promoHeader}>
                      <Tag size={14} color={Colors.cyan} strokeWidth={2.4} />
                      <Text style={styles.promoHeaderTitle}>PROMO & COUPONS</Text>
                    </View>
                    <View style={styles.promoInputWrapper}>
                      <TextInput
                        style={styles.promoInput}
                        placeholder="Enter Promo Code (e.g. SPECIAL30)"
                        placeholderTextColor="#646B7E"
                        value={promoCodeInput}
                        onChangeText={setPromoCodeInput}
                        autoCapitalize="characters"
                        editable={!isApplyingPromo && !appliedPromo?.isValid}
                      />
                      {appliedPromo?.isValid ? (
                        <TouchableOpacity
                          style={styles.promoCancelBtn}
                          onPress={() => {
                            setPromoCodeInput('');
                            setAppliedPromo(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.promoCancelText}>REMOVE</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.promoApplyBtn, !promoCodeInput.trim() && styles.promoApplyBtnDisabled]}
                          onPress={handleApplyPromo}
                          disabled={!promoCodeInput.trim() || isApplyingPromo}
                          activeOpacity={0.8}
                        >
                          {isApplyingPromo ? (
                            <ActivityIndicator size="small" color="#001014" />
                          ) : (
                            <Text style={styles.promoApplyText}>APPLY</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {appliedPromo && (
                      <View style={[
                        styles.promoFeedbackCard, 
                        appliedPromo.isValid ? styles.promoFeedbackSuccess : styles.promoFeedbackError
                      ]}>
                        {appliedPromo.isValid ? (
                          <View style={styles.promoFeedbackSuccessRow}>
                            <View style={styles.promoFeedbackDot} />
                            <Text style={styles.promoFeedbackSuccessText}>
                              Code "{appliedPromo.code}" applied! You saved Rs. {appliedPromo.discountAmount.toLocaleString()}.
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.promoFeedbackErrorText}>
                            {appliedPromo.message}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.trustStrip}>
                    <View style={styles.trustMetric}>
                      <Award size={16} color={Colors.cyan} />
                      <Text style={styles.trustValue}>{selectedExperience > 0 ? `${selectedExperience} yrs` : 'New'}</Text>
                      <Text style={styles.trustLabel}>EXPERIENCE</Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustMetric}>
                      <Briefcase size={16} color={Colors.green} />
                      <Text style={styles.trustValue}>{selectedJobs}</Text>
                      <Text style={styles.trustLabel}>JOBS</Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustMetric}>
                      <MapPin size={16} color={Colors.pink} />
                      <Text style={styles.trustValue} numberOfLines={1} adjustsFontSizeToFit>{selectedProfile.city || 'Nearby'}</Text>
                      <Text style={styles.trustLabel}>CITY</Text>
                    </View>
                  </View>

                  {!!selectedProfile.bio && (
                    <View style={styles.bioCard}>
                      <Text style={styles.bioLabel}>ABOUT SPECIALIST</Text>
                      <Text style={styles.bioText} numberOfLines={3}>{selectedProfile.bio}</Text>
                    </View>
                  )}

                  {selectedSkills.length > 0 && (
                    <View style={styles.skillsSection}>
                      <Text style={styles.skillsLabel}>SPECIALIST SKILLS</Text>
                      <View style={styles.skillsWrap}>
                        {selectedSkills.map((skill: string) => (
                          <View key={skill} style={styles.skillPill}>
                            <Text style={styles.skillText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={handleViewWorkerProfile}
                    activeOpacity={0.8}
                  >
                    <Eye size={17} color={Colors.cyan} />
                    <Text style={styles.profileBtnText}>PROFILE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.hireBtn}
                    onPress={handleHire}
                    disabled={isAccepting}
                  >
                    <LinearGradient
                      colors={['#00F0FF', '#0066FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.hireGradient}
                    >
                      {isAccepting ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <>
                          <Check size={19} color="#000" strokeWidth={3} />
                          <Text style={styles.hireText}>SELECT USTAD</Text>
                          <ChevronRight size={18} color="#000" strokeWidth={3} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.24)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.cyan,
  },
  liveText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  searchHero: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
    backgroundColor: 'rgba(2,8,26,0.82)',
  },
  searchHeroGradient: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  searchStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,245,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
  },
  searchStatusText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  animationContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.85)',
  },
  centerNode: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,245,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.4)',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  orbitContainer: {
    position: 'absolute',
    width: 196,
    height: 196,
    alignItems: 'center',
  },
  orbitNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
    maxWidth: 300,
  },
  jobBriefCard: {
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(4,9,29,0.82)',
  },
  jobBriefGradient: {
    padding: 16,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 13,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.22)',
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionEyebrow: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  jobTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  requestTypeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,20,147,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,20,147,0.24)',
  },
  scheduledBadge: {
    backgroundColor: 'rgba(255,149,0,0.08)',
    borderColor: 'rgba(255,149,0,0.24)',
  },
  requestTypeText: {
    color: Colors.pink,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scheduledText: {
    color: Colors.orange,
  },
  jobDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.76)',
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    marginBottom: 12,
    borderRadius: 13,
    backgroundColor: 'rgba(255,149,0,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.18)',
  },
  scheduleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleCopy: {
    flex: 1,
  },
  scheduleDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    backgroundColor: 'rgba(255,149,0,0.18)',
  },
  scheduleLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  scheduleValue: {
    color: Colors.orange,
    fontSize: 12,
    fontWeight: '900',
  },
  requestMetaRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  requestMetaItem: {
    flex: 1,
  },
  requestMetaDivider: {
    width: 1,
    marginHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  requestMetaLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  requestMetaValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
  },
  locationText: {
    flex: 1,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
  },
  responseCard: {
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.25)',
    backgroundColor: 'rgba(2,18,26,0.88)',
  },
  responseGradient: {
    padding: 15,
  },
  responseCopy: {
    marginBottom: 12,
  },
  responseEyebrow: {
    color: Colors.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  responseTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  responseText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  responseProfiles: {
    gap: 8,
    marginBottom: 12,
  },
  responseProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  responseProfileImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.35)',
  },
  responseProfileCopy: {
    flex: 1,
  },
  responseProfileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  responseProfilePrice: {
    color: Colors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  reviewButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    backgroundColor: Colors.cyan,
  },
  reviewButtonText: {
    color: '#001014',
    fontSize: 13,
    fontWeight: '900',
  },
  waitingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  waitingText: {
    flex: 1,
    color: Colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(3,8,25,0.76)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  statLab: {
    color: Colors.textDim,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ratingSummary: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.16)',
  },
  cancelText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  satelliteOrbit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteContainer: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteGlow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.cyan,
    backgroundColor: '#000',
    overflow: 'visible',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  satelliteImage: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  priceBadge: {
    position: 'absolute',
    bottom: -9,
    backgroundColor: Colors.cyan,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  priceText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.3)',
  },
  modalGradient: {
    maxHeight: '100%',
    paddingTop: 9,
    paddingBottom: 16,
  },
  modalHandle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalBody: {
    flexShrink: 1,
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  modalHeaderCopy: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  modalSubtitle: {
    color: Colors.textDim,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  identityCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
    overflow: 'hidden',
  },
  identityImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    padding: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,245,255,0.72)',
    backgroundColor: 'rgba(0,245,255,0.08)',
  },
  identityImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  identityCopy: {
    flex: 1,
    paddingRight: 74,
  },
  statusGlow: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 999,
    backgroundColor: '#00FF00',
    borderWidth: 2,
    borderColor: '#08101C',
  },
  statusOffline: {
    backgroundColor: Colors.textMuted,
  },
  workerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 3,
  },
  workerCategory: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  identityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    fontSize: 10,
    color: Colors.textDim,
    fontWeight: '800',
  },
  identityMetaDivider: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: Colors.green,
  },
  availabilityText: {
    color: Colors.green,
    fontSize: 10,
    fontWeight: '800',
  },
  availabilityTextBusy: {
    color: Colors.textMuted,
  },
  verificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,230,118,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.24)',
  },
  verificationBadgePending: {
    backgroundColor: 'rgba(255,149,0,0.08)',
    borderColor: 'rgba(255,149,0,0.24)',
  },
  verificationBadgeText: {
    color: Colors.green,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  verificationBadgeTextPending: {
    color: Colors.orange,
  },
  proposalCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.16)',
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  proposalTitle: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  proposalText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  proposalDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  proposalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  proposalLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  proposalAmount: {
    color: Colors.green,
    fontSize: 22,
    fontWeight: '900',
  },
  proposalTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 96,
  },
  proposalTimelineLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  proposalTimelineValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  trustMetric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  trustDivider: {
    width: 1,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trustValue: {
    maxWidth: '100%',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
    paddingHorizontal: 5,
  },
  trustLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  bioCard: {
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  bioLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 7,
  },
  bioText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  skillsSection: {
    marginBottom: 3,
  },
  skillsLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  skillText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  profileBtn: {
    width: 104,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.28)',
    backgroundColor: 'rgba(0,240,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileBtnText: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hireBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  hireGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hireText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  strikethroughAmount: {
    color: '#646B7E',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  promoContainer: {
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  promoHeaderTitle: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  promoInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  promoApplyBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyBtnDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  promoApplyText: {
    color: '#001014',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  promoCancelBtn: {
    height: 40,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCancelText: {
    color: Colors.error,
    fontSize: 10,
    fontWeight: '900',
  },
  promoFeedbackCard: {
    marginTop: 8,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  promoFeedbackSuccess: {
    backgroundColor: 'rgba(0, 255, 127, 0.05)',
    borderColor: 'rgba(0, 255, 127, 0.15)',
  },
  promoFeedbackError: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
  promoFeedbackSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoFeedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  promoFeedbackSuccessText: {
    color: Colors.green,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  promoFeedbackErrorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: '600',
  }
});
