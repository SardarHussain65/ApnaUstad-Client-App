import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Award,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MessageSquare,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Wrench,
  Zap,
  Heart,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { Skeleton, useShimmerTranslateX } from '../components/ui/Skeleton';
import { useBookingDetails, useWorker, useWorkerReviews, useToggleFavoriteMutation } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useIsRTL } from '../context/LanguageContext';
import api from '../services/api';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../constants/Theme';

const firstParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const formatDate = (value?: string, locale: string = 'en') => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return locale === 'ur' ? 'حالیہ' : 'Recent';
  return date.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ─── Profile Skeleton ─────────────────────────────────────────────────────────
function ProfileSkeleton({ translateX }: { translateX?: any }) {
  const theme = useTheme();
  const cardBg = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const borderCol = theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.border.subtle;

  return (
    <View style={{ gap: 14, paddingTop: 16 }}>
      {/* Hero skeleton */}
      <View style={[styles.skeletonBlock, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Skeleton width={76} height={76} borderRadius={22} translateX={translateX} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="40%" height={14} borderRadius={6} translateX={translateX} />
            <Skeleton width="70%" height={20} borderRadius={6} translateX={translateX} />
            <Skeleton width="50%" height={14} borderRadius={6} translateX={translateX} />
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: borderCol, marginVertical: 14 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={110} height={16} borderRadius={6} translateX={translateX} />
          <Skeleton width={90} height={22} borderRadius={11} translateX={translateX} />
        </View>
      </View>

      {/* Stats strip skeleton */}
      <View style={[styles.skeletonBlock, { backgroundColor: cardBg, borderColor: borderCol, flexDirection: 'row', justifyContent: 'space-around' }]}>
        <Skeleton width={80} height={42} borderRadius={8} translateX={translateX} />
        <Skeleton width={80} height={42} borderRadius={8} translateX={translateX} />
        <Skeleton width={80} height={42} borderRadius={8} translateX={translateX} />
      </View>

      {/* Bio skeleton */}
      <View style={[styles.skeletonBlock, { backgroundColor: cardBg, borderColor: borderCol, gap: 10 }]}>
        <Skeleton width="35%" height={16} borderRadius={6} translateX={translateX} />
        <Skeleton width="100%" height={14} borderRadius={6} translateX={translateX} />
        <Skeleton width="85%" height={14} borderRadius={6} translateX={translateX} />
      </View>
    </View>
  );
}

export default function WorkerDetailsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = useIsRTL();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = useThemeColors();
  const primaryColor = theme.colors.brand?.primary || colors.primary;
  const secondaryColor = theme.colors.brand?.secondary || colors.secondary;
  const warningColor = colors.orange || '#FFB800';
  const shimmerTranslateX = useShimmerTranslateX();

  const params = useLocalSearchParams<{
    id?: string | string[];
    bidId?: string | string[];
    jobId?: string | string[];
    bookingId?: string | string[];
    category?: string | string[];
    proposedPrice?: string | string[];
  }>();

  const workerId = firstParam(params.id);
  const bidId = firstParam(params.bidId);
  const jobId = firstParam(params.jobId);
  const bookingId = firstParam(params.bookingId);
  const selectedCategory = firstParam(params.category);
  const proposedPriceParam = firstParam(params.proposedPrice);
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: worker, isLoading } = useWorker(workerId, selectedCategory);
  const { data: reviews = [], isLoading: isLoadingReviews } = useWorkerReviews(workerId);
  const { data: contextBooking } = useBookingDetails(bookingId);

  const { user, role, updateUser } = useAuth();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const [isToggling, setIsToggling] = useState(false);

  const isFavorite = user?.favorites?.includes(workerId as any);

  const handleToggleFavorite = async () => {
    if (!user?._id || isToggling) return;
    setIsToggling(true);
    try {
      const result = await toggleFavoriteMutation.mutateAsync({
        userId: user._id,
        workerId: workerId!,
      });
      await updateUser({
        ...user,
        favorites: result.favorites,
      });
      Toast.show({
        type: 'success',
        text1: result.isFavorite ? t('workerDetails.favoriteAdded') : t('workerDetails.favoriteRemoved'),
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error?.response?.data?.message || t('common.tryAgain'),
      });
    } finally {
      setIsToggling(false);
    }
  };

  const rating = Number(worker?.rating || (worker as any)?.averageRating || 0);
  const reviewCount = Number(worker?.totalReviews || reviews.length || 0);
  const completedJobs = Number(worker?.totalJobs || 0);
  const experience = Number(worker?.experience || 0);
  const hourlyRate = Number(worker?.hourlyRate || 0);
  const skills = Array.isArray(worker?.skills) ? worker.skills : [];
  const isAvailable = worker?.isAvailable !== false;
  const hasBid = Boolean(bidId && jobId);
  const hasBooking = Boolean(bookingId);
  const isCommunicationLocked =
    hasBooking &&
    (!contextBooking || contextBooking.status === 'completed' || contextBooking.status === 'cancelled');
  const hasActiveBooking = hasBooking && !isCommunicationLocked;
  const bookingWorker = typeof contextBooking?.worker === 'object' ? contextBooking.worker : null;
  const workerPhone = hasActiveBooking && bookingWorker?._id === workerId ? bookingWorker?.phone : '';

  const quotedAmount = proposedPriceParam ? Number(proposedPriceParam) : null;
  const primaryLabel = hasBid
    ? quotedAmount && quotedAmount > 0
      ? `Hire Ustad • Rs. ${quotedAmount.toLocaleString()}`
      : t('workerDetails.selectUstad', 'HIRE THIS USTAD')
    : t('workerDetails.requestService', 'SEND WORK REQUEST');

  const shareProfile = async () => {
    const defaultName = t('workerDetails.defaultSpecialist', { defaultValue: 'ApnaUstad specialist' });
    const defaultCategory = t('workerDetails.defaultCategory', { defaultValue: 'Service specialist' });
    const cityInfo = worker?.city ? t('workerDetails.shareCity', { city: worker.city }) : '';
    await Share.share({
      message: t('workerDetails.shareMessage', {
        name: worker?.fullName || defaultName,
        category: worker?.category || defaultCategory,
        cityInfo,
      }),
    });
  };

  const callWorker = async () => {
    if (!workerPhone) {
      Toast.show({
        type: 'info',
        text1: t('workerDetails.phoneUnavailable'),
        text2: t('workerDetails.phoneUnavailableDesc'),
      });
      return;
    }
    await Linking.openURL(`tel:${workerPhone}`);
  };

  const openChat = () => {
    if (!hasActiveBooking || !bookingId || !workerId) return;
    router.push({
      pathname: '/chat',
      params: { bookingId, recipientId: workerId, recipientName: worker?.fullName || 'Ustad' },
    });
  };

  const acceptProposal = async () => {
    if (!jobId || !bidId) return;
    setIsAccepting(true);
    try {
      const response = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`, {});
      router.replace({ pathname: '/transaction-details', params: { id: response.data.data._id } });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('workerDetails.unableSelect'),
        text2: error?.response?.data?.message || t('workerDetails.acceptError'),
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (hasBid) {
      acceptProposal();
      return;
    }
    router.push({
      pathname: '/job-creation',
      params: {
        title: worker?.category,
        targetWorkerId: worker?._id,
        targetWorkerName: worker?.fullName,
      },
    });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        {/* ── Top Header ──────────────────────────────────────────────────── */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12),
              backgroundColor: theme.isDark ? 'rgba(5,5,16,0.76)' : theme.colors.background.screen,
              borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
            },
          ]}
        >
          <BlurView intensity={70} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />

          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border.subtle,
              },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <ChevronLeft
              size={22}
              color={theme.colors.text.primary}
              strokeWidth={2.4}
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: theme.colors.text.dim }]}>
              {t('workerDetails.headerEyebrow', 'USTAD PROFILE')}
            </Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {worker?.fullName || t('workerDetails.headerTitle', 'About This Ustad')}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {role === 'client' && (
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    marginRight: 8,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border.subtle,
                  },
                ]}
                onPress={handleToggleFavorite}
                activeOpacity={0.8}
                disabled={isToggling}
              >
                <Heart
                  size={18}
                  color={isFavorite ? colors.pink : theme.colors.text.dim}
                  fill={isFavorite ? colors.pink : 'transparent'}
                  strokeWidth={2.3}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border.subtle,
                },
              ]}
              onPress={shareProfile}
              activeOpacity={0.8}
            >
              <Share2 size={18} color={theme.colors.text.muted} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scrollable Body ─────────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === 'ios' ? 76 : 84),
              paddingBottom: insets.bottom + 110,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading Skeleton */}
          {isLoading && !worker && <ProfileSkeleton translateX={shimmerTranslateX} />}

          {/* Not Found State */}
          {!isLoading && !worker && (
            <View style={styles.center}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                {t('workerDetails.unavailable', 'Profile not available')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: alpha(primaryColor, 0.12), borderColor: alpha(primaryColor, 0.25) }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.emptyActionText, { color: primaryColor }]}>{t('common.back', 'Go Back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Profile */}
          {worker && (
            <>
              {/* ── Quoted Offer Banner (if opened from a proposal) ── */}
              {hasBid && quotedAmount && quotedAmount > 0 && (
                <Animated.View
                  entering={FadeInDown.duration(400)}
                  style={[
                    styles.quoteBanner,
                    {
                      backgroundColor: alpha(colors.success, 0.08),
                      borderColor: alpha(colors.success, 0.22),
                    },
                  ]}
                >
                  <Tag size={16} color={colors.success} strokeWidth={2.4} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.quoteBannerLabel, { color: alpha(colors.success, 0.85) }]}>
                      PROPOSED QUOTE FOR YOUR TASK
                    </Text>
                    <Text style={[styles.quoteBannerPrice, { color: colors.success }]}>
                      Rs. {quotedAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.quoteCheckPill, { backgroundColor: alpha(colors.success, 0.15) }]}>
                    <Check size={13} color={colors.success} strokeWidth={3} />
                    <Text style={[styles.quoteCheckText, { color: colors.success }]}>Fixed Quote</Text>
                  </View>
                </Animated.View>
              )}

              {/* ── Hero Identity Card ── */}
              <Animated.View
                entering={FadeInUp.duration(500)}
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: theme.isDark ? 'rgba(17, 24, 39, 0.82)' : theme.colors.surface.card,
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
                    'transparent',
                  ]}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />

                <View style={styles.heroTop}>
                  <View
                    style={[
                      styles.avatarShell,
                      {
                        borderColor: alpha(primaryColor, 0.35),
                        backgroundColor: alpha(primaryColor, 0.08),
                      },
                    ]}
                  >
                    {worker.profileImage ? (
                      <Image source={{ uri: worker.profileImage }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: alpha(primaryColor, 0.1) }]}>
                        <Text style={[styles.avatarFallbackText, { color: primaryColor }]}>
                          {initialsFor(worker.fullName)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.availabilityDot,
                        !isAvailable && styles.availabilityDotBusy,
                        { borderColor: theme.isDark ? '#071024' : '#FFFFFF', backgroundColor: isAvailable ? colors.success : '#6B7280' },
                      ]}
                    />
                  </View>

                  <View style={styles.heroCopy}>
                    <View style={styles.heroBadgeRow}>
                      <View
                        style={[
                          styles.verificationPill,
                          {
                            backgroundColor: worker.isVerified ? alpha(colors.success, 0.1) : alpha(warningColor, 0.1),
                            borderColor: worker.isVerified ? alpha(colors.success, 0.25) : alpha(warningColor, 0.25),
                          },
                        ]}
                      >
                        <ShieldCheck size={12} color={worker.isVerified ? colors.success : warningColor} strokeWidth={2.4} />
                        <Text
                          style={[
                            styles.verificationText,
                            { color: worker.isVerified ? colors.success : warningColor },
                          ]}
                        >
                          {worker.isVerified
                            ? t('workerDetails.verifiedUstad', 'CNIC VERIFIED')
                            : t('workerDetails.verificationPending', 'ID PENDING')}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.workerName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                      {worker.fullName}
                    </Text>

                    <Text style={[styles.workerCategory, { color: primaryColor }]} numberOfLines={1}>
                      {worker.category || t('workerDetails.defaultCategory', 'Service Specialist')}
                    </Text>

                    <View style={styles.locationLine}>
                      <MapPin size={12} color={theme.colors.text.muted} strokeWidth={2.2} />
                      <Text style={[styles.locationText, { color: theme.colors.text.muted }]} numberOfLines={1}>
                        {worker.city || t('workerDetails.noCity', 'Service area not added')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.heroDivider,
                    { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.07)' : theme.colors.border.subtle },
                  ]}
                />

                <View style={styles.heroBottom}>
                  <View style={styles.ratingBlock}>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <Star
                          key={val}
                          size={13}
                          color="#FFB800"
                          fill={val <= Math.round(rating) ? '#FFB800' : 'transparent'}
                        />
                      ))}
                    </View>
                    <Text style={[styles.ratingText, { color: theme.colors.text.primary }]}>
                      {rating > 0 ? rating.toFixed(1) : t('workerDetails.newProfile', 'New')}
                    </Text>
                    <Text style={[styles.ratingMeta, { color: theme.colors.text.muted }]}>
                      {t('workerDetails.reviewsCount', { count: reviewCount, defaultValue: `(${reviewCount})` })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.availabilityPill,
                      {
                        backgroundColor: isAvailable ? alpha(colors.success, 0.08) : 'rgba(255,255,255,0.04)',
                        borderColor: isAvailable ? alpha(colors.success, 0.22) : 'rgba(255,255,255,0.08)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.availabilityMiniDot,
                        { backgroundColor: isAvailable ? colors.success : '#6B7280' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.availabilityLabel,
                        { color: isAvailable ? colors.success : theme.colors.text.muted },
                      ]}
                    >
                      {isAvailable ? t('workerDetails.available', 'AVAILABLE') : t('workerDetails.busy', 'BUSY')}
                    </Text>
                  </View>
                </View>
              </Animated.View>

              {/* ── Key Metrics Strip ── */}
              <Animated.View
                entering={FadeInDown.delay(70).duration(450)}
                style={[
                  styles.statsStrip,
                  {
                    backgroundColor: theme.isDark ? 'rgba(17, 24, 39, 0.82)' : theme.colors.surface.card,
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                  },
                ]}
              >
                <Metric
                  icon={Award}
                  value={experience > 0 ? t('workerDetails.yrs', { count: experience }) : t('workerDetails.newExperience', 'New')}
                  label={t('workerDetails.experienceLabel', 'EXPERIENCE')}
                  color="#FFB800"
                />
                <View
                  style={[
                    styles.metricDivider,
                    { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : theme.colors.border.subtle },
                  ]}
                />
                <Metric
                  icon={BriefcaseBusiness}
                  value={String(completedJobs)}
                  label={t('workerDetails.jobsLabel', 'JOBS DONE')}
                  color={colors.success}
                />
                <View
                  style={[
                    styles.metricDivider,
                    { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : theme.colors.border.subtle },
                  ]}
                />
                <Metric
                  icon={Clock3}
                  value={
                    hourlyRate > 0
                      ? t('workerDetails.hourlyRateValue', { rate: hourlyRate.toLocaleString() })
                      : t('workerDetails.openRate', 'Quote Basis')
                  }
                  label={t('workerDetails.rateLabel', 'RATE / HR')}
                  color={primaryColor}
                />
              </Animated.View>

              {/* ── About Bio Card ── */}
              <Animated.View
                entering={FadeInDown.delay(120).duration(450)}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.isDark ? 'rgba(17, 24, 39, 0.82)' : theme.colors.surface.card,
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                  },
                ]}
              >
                <SectionTitle icon={Sparkles} title={t('workerDetails.bioTitle', 'ABOUT MY WORK')} color={primaryColor} />
                <Text style={[styles.bioText, { color: theme.colors.text.secondary }]}>
                  {worker.bio || t('workerDetails.bioPlaceholder', 'Experienced professional available for repair and installation tasks.')}
                </Text>
              </Animated.View>

              {/* ── Specialties & Skills Card ── */}
              <Animated.View
                entering={FadeInDown.delay(170).duration(450)}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.isDark ? 'rgba(17, 24, 39, 0.82)' : theme.colors.surface.card,
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                  },
                ]}
              >
                <SectionTitle icon={Wrench} title={t('workerDetails.skillsTitle', 'SPECIALTIES & SKILLS')} color={colors.cyan || primaryColor} />
                {skills.length > 0 ? (
                  <View style={styles.skillsWrap}>
                    {skills.map((skill) => (
                      <View
                        key={skill}
                        style={[
                          styles.skillPill,
                          {
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
                          },
                        ]}
                      >
                        <Check size={11} color={colors.success} strokeWidth={2.8} />
                        <Text style={[styles.skillText, { color: theme.colors.text.primary }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptySectionText, { color: theme.colors.text.dim }]}>
                    {t('workerDetails.skillsPlaceholder', 'General work in this category.')}
                  </Text>
                )}
              </Animated.View>

              {/* ── Customer Reviews Card ── */}
              <Animated.View
                entering={FadeInDown.delay(220).duration(450)}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.isDark ? 'rgba(17, 24, 39, 0.82)' : theme.colors.surface.card,
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                  },
                ]}
              >
                <SectionTitle
                  icon={Star}
                  title={t('workerDetails.reviewsTitle', 'CUSTOMER REVIEWS')}
                  color="#FFB800"
                  right={
                    <Text style={[styles.sectionCount, { color: theme.colors.text.dim }]}>
                      {t('workerDetails.totalReviews', { count: reviewCount })}
                    </Text>
                  }
                />

                {isLoadingReviews ? (
                  <ActivityIndicator color={primaryColor} style={{ paddingVertical: 18 }} />
                ) : reviews.length > 0 ? (
                  reviews.slice(0, 3).map((review: any, index: number) => (
                    <ReviewItem
                      key={review._id || index}
                      review={review}
                      isLast={index === Math.min(reviews.length, 3) - 1}
                    />
                  ))
                ) : (
                  <View style={styles.emptyReviews}>
                    <Star size={16} color={theme.colors.text.dim} />
                    <Text style={[styles.emptySectionText, { color: theme.colors.text.dim }]}>
                      {t('workerDetails.noReviews', 'No customer reviews yet.')}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* ── Sticky Bottom Dock ────────────────────────────────────────── */}
        {worker && (!hasBooking || hasActiveBooking) && (
          <View style={[styles.dock, { paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 12 : 16) }]}>
            <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View
              style={[
                styles.dockLine,
                { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle },
              ]}
            />

            <View style={styles.dockRow}>
              {/* If active booking: Chat & Phone actions */}
              {hasActiveBooking && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.dockActionBtn,
                      {
                        backgroundColor: alpha(primaryColor, 0.1),
                        borderColor: alpha(primaryColor, 0.25),
                      },
                    ]}
                    onPress={openChat}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={18} color={primaryColor} />
                    <Text style={[styles.dockActionLabel, { color: primaryColor }]}>Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dockActionBtn,
                      {
                        backgroundColor: alpha(colors.success, 0.1),
                        borderColor: alpha(colors.success, 0.25),
                      },
                    ]}
                    onPress={callWorker}
                    activeOpacity={0.8}
                  >
                    <Phone size={18} color={colors.success} />
                    <Text style={[styles.dockActionLabel, { color: colors.success }]}>Call</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* If NOT active booking: Primary Hire / Request Action */}
              {!hasBooking && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.shareDockBtn,
                      {
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border.subtle,
                      },
                    ]}
                    onPress={shareProfile}
                    activeOpacity={0.8}
                  >
                    <Share2 size={18} color={theme.colors.text.muted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryAction, isAccepting && { opacity: 0.7 }]}
                    onPress={handlePrimaryAction}
                    activeOpacity={0.85}
                    disabled={isAccepting}
                  >
                    <LinearGradient
                      colors={[primaryColor, secondaryColor || '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {isAccepting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Zap size={16} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.primaryActionText}>{primaryLabel}</Text>
                        <ChevronRight
                          size={16}
                          color="#FFFFFF"
                          strokeWidth={2.8}
                          style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </BackgroundWrapper>
  );
}

// ─── Metric Item ──────────────────────────────────────────────────────────────
function Metric({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Icon size={16} color={color} />
      <Text
        style={[styles.metricValue, { color: theme.colors.text.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: theme.colors.text.dim }]}>{label}</Text>
    </View>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({
  icon: Icon,
  title,
  color,
  right,
}: {
  icon: React.ComponentType<any>;
  title: string;
  color: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}14` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View
        style={[
          styles.sectionLine,
          { backgroundColor: theme.isDark ? `${color}28` : theme.colors.border.subtle },
        ]}
      />
      {right}
    </View>
  );
}

// ─── Review Item ──────────────────────────────────────────────────────────────
function ReviewItem({ review, isLast }: { review: any; isLast: boolean }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const clientName = review.customer?.fullName || t('jobDetails.client', 'Customer');

  return (
    <View
      style={[
        styles.reviewItem,
        !isLast && [
          styles.reviewDivider,
          { borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.border.subtle },
        ],
      ]}
    >
      <View style={styles.reviewHeader}>
        <View
          style={[
            styles.reviewAvatar,
            {
              borderColor: theme.isDark ? 'rgba(255,184,0,0.25)' : theme.colors.border.subtle,
              backgroundColor: theme.isDark ? 'rgba(255,184,0,0.08)' : 'rgba(0,0,0,0.03)',
            },
          ]}
        >
          {review.customer?.profileImage ? (
            <Image source={{ uri: review.customer.profileImage }} style={styles.reviewAvatarImage} />
          ) : (
            <Text style={[styles.reviewAvatarText, { color: '#FFB800' }]}>{initialsFor(clientName)}</Text>
          )}
        </View>

        <View style={styles.reviewCopy}>
          <Text style={[styles.reviewerName, { color: theme.colors.text.primary }]}>{clientName}</Text>
          <Text style={[styles.reviewDate, { color: theme.colors.text.dim }]}>
            {formatDate(review.createdAt, i18n.language)}
          </Text>
        </View>

        <View
          style={[
            styles.reviewRating,
            {
              backgroundColor: theme.isDark ? 'rgba(255,184,0,0.1)' : 'rgba(255,184,0,0.08)',
              borderColor: 'rgba(255,184,0,0.25)',
            },
          ]}
        >
          <Star size={11} color="#FFB800" fill="#FFB800" />
          <Text style={[styles.reviewRatingText, { color: '#FFB800' }]}>{review.rating || 5}</Text>
        </View>
      </View>

      {!!review.comment && (
        <Text style={[styles.reviewComment, { color: theme.colors.text.secondary }]}>
          "{review.comment}"
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 100 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyAction: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  emptyActionText: { fontSize: 12, fontWeight: '800' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 15, fontWeight: '800' },

  scroll: { paddingHorizontal: 16 },

  skeletonBlock: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },

  // Quote Banner
  quoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  quoteBannerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quoteBannerPrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  quoteCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quoteCheckText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Hero Card
  heroCard: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarShell: {
    width: 76,
    height: 76,
    borderRadius: 22,
    padding: 3,
    borderWidth: 1.5,
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 18 },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  avatarFallbackText: { fontSize: 22, fontWeight: '900' },
  availabilityDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  availabilityDotBusy: { backgroundColor: '#6B7280' },
  heroCopy: { flex: 1, minWidth: 0, gap: 3 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 2 },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  verificationText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  workerName: { fontSize: 18, fontWeight: '900' },
  workerCategory: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  locationText: { flex: 1, fontSize: 11, fontWeight: '600' },

  heroDivider: { height: 1, marginVertical: 14 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingStars: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '800' },
  ratingMeta: { fontSize: 11, fontWeight: '600' },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  availabilityMiniDot: { width: 6, height: 6, borderRadius: 3 },
  availabilityLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: 1, height: 28 },
  metricValue: { maxWidth: '100%', fontSize: 14, fontWeight: '900', marginTop: 4, paddingHorizontal: 4 },
  metricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },

  // Section Cards
  sectionCard: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sectionLine: { flex: 1, height: 1 },
  sectionCount: { fontSize: 10, fontWeight: '800' },
  bioText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillText: { fontSize: 11, fontWeight: '700' },
  emptyReviews: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  emptySectionText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },

  // Reviews
  reviewItem: { paddingVertical: 10 },
  reviewDivider: { borderBottomWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  reviewAvatarImage: { width: '100%', height: '100%' },
  reviewAvatarText: { fontSize: 13, fontWeight: '900' },
  reviewCopy: { flex: 1, gap: 1 },
  reviewerName: { fontSize: 12, fontWeight: '800' },
  reviewDate: { fontSize: 10, fontWeight: '500' },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  reviewRatingText: { fontSize: 11, fontWeight: '800' },
  reviewComment: { fontSize: 12, lineHeight: 18, fontWeight: '500', marginTop: 6, fontStyle: 'italic' },

  // Dock
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    overflow: 'hidden',
  },
  dockLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  dockActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dockActionLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  shareDockBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryAction: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    overflow: 'hidden',
    borderRadius: 14,
    position: 'relative',
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
});
