import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  Navigation,
  PauseCircle,
  PlayCircle,
  Star,
  UserRound,
  Volume2,
  WalletCards,
  X,
  Zap,
  Send,
} from 'lucide-react-native';

import { alpha, useTheme, useThemeColors, useThemeShadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 28, 440);

interface IncomingJobModalProps {
  visible: boolean;
  jobs: any[];
  onAccept: (job: any) => void;
  onCounterOffer: (job: any) => void;
  onReject: (jobId: string) => void;
  onClose: () => void;
  acceptingJobId?: string | null;
}

type MediaItem = {
  type: 'image' | 'video' | 'audio';
  url: string;
};

const compactUrls = (urls: (string | undefined | null)[]) =>
  Array.from(new Set(urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)));

const getJobMedia = (job: any) => {
  const images = Array.isArray(job.media?.images)
    ? job.media.images
    : compactUrls([job.imageUrl, ...(Array.isArray(job.imageUrls) ? job.imageUrls : [])]);
  const videos = Array.isArray(job.media?.videos)
    ? job.media.videos
    : compactUrls([job.videoUrl, ...(Array.isArray(job.videoUrls) ? job.videoUrls : [])]);
  const audios = Array.isArray(job.media?.audios)
    ? job.media.audios
    : compactUrls(Array.isArray(job.audioUrls) ? job.audioUrls : []);

  return {
    images,
    videos,
    audios,
    items: [
      ...images.map((url: string) => ({ type: 'image' as const, url })),
      ...videos.map((url: string) => ({ type: 'video' as const, url })),
      ...audios.map((url: string) => ({ type: 'audio' as const, url })),
    ],
    totalCount: Number(job.media?.totalCount || images.length + videos.length + audios.length),
  };
};

const getClientMeta = (job: any) => job.clientMeta || (typeof job.customer === 'object' ? job.customer : null);

const formatMoney = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString()}`;

const formatAge = (value?: string, t?: any) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  if (!timestamp || Number.isNaN(timestamp)) return t ? t('incomingJobModal.newSignal', 'New') : 'New';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return t ? t('incomingJobModal.postedJustNow', 'Just now') : 'Just now';
  if (minutes < 60) return t ? t('incomingJobModal.postedMinutesAgo', '{{count}}m ago', { count: minutes }) : `${minutes}m ago`;
  return t ? t('incomingJobModal.postedHoursAgo', '{{count}}h ago', { count: Math.floor(minutes / 60) }) : `${Math.floor(minutes / 60)}h ago`;
};

const formatCountdown = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const resolveSecondsRemaining = (job: any) => {
  const expiresAt = job.signalMeta?.expiresAt || job.expiresAt;
  const expiryTimestamp = expiresAt ? new Date(expiresAt).getTime() : 0;
  if (expiryTimestamp && !Number.isNaN(expiryTimestamp)) {
    return Math.max(0, Math.floor((expiryTimestamp - Date.now()) / 1000));
  }
  return Math.max(0, Number(job.signalMeta?.responseWindowSeconds || 0));
};

export function IncomingJobModal({
  visible,
  jobs,
  onAccept,
  onCounterOffer,
  onReject,
  onClose,
  acceptingJobId,
}: IncomingJobModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);

  if (!jobs || jobs.length === 0) return null;

  const handleWalletPress = () => {
    onClose();
    router.push('/(tabs)/wallet' as any);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.screen}>
          {/* Subtle Dim Overlay */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: alpha(theme.colors.background.screen, 0.88) }]} />

          {/* Quick Close Button */}
          <TouchableOpacity
            style={[
              styles.closeButton,
              {
                backgroundColor: alpha(theme.colors.surface.card, 0.95),
                borderColor: alpha(colors.border || theme.colors.text.primary, 0.15),
                top: Math.max(insets.top + 10, 16),
              },
            ]}
            onPress={onClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
          >
            <X size={20} color={theme.colors.text.primary} strokeWidth={2.4} />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            scrollEnabled={parentScrollEnabled}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jobPager}
            decelerationRate="fast"
          >
            {jobs.map((job, index) => (
              <View key={job._id} style={[styles.jobPage, { width: screenWidth }]}>
                <JobDecisionCard
                  job={job}
                  totalJobs={jobs.length}
                  currentIndex={index + 1}
                  isLoading={acceptingJobId === job._id}
                  onAccept={() => onAccept(job)}
                  onCounterOffer={() => onCounterOffer(job)}
                  onReject={() => onReject(job._id)}
                  onWalletPress={handleWalletPress}
                  onScrollActive={setParentScrollEnabled}
                  theme={theme}
                  colors={colors}
                  shadows={shadows}
                />
              </View>
            ))}
          </ScrollView>

          {jobs.length > 1 && (
            <View style={[styles.swipeHint, { backgroundColor: alpha(theme.colors.surface.card, 0.9), borderColor: alpha(colors.cyan, 0.25) }]}>
              <ChevronLeft size={13} color={colors.cyan} strokeWidth={2.5} />
              <Text style={[styles.swipeHintText, { color: colors.cyan }]}>
                {t('incomingJobModal.swipeHint', 'Swipe for {{count}} offers', { count: jobs.length })}
              </Text>
              <ChevronRight size={13} color={colors.cyan} strokeWidth={2.5} />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function JobDecisionCard({
  job,
  totalJobs,
  currentIndex,
  isLoading,
  onAccept,
  onCounterOffer,
  onReject,
  onWalletPress,
  onScrollActive,
  theme,
  colors,
  shadows,
}: {
  job: any;
  totalJobs: number;
  currentIndex: number;
  isLoading: boolean;
  onAccept: () => void;
  onCounterOffer: () => void;
  onReject: () => void;
  onWalletPress: () => void;
  onScrollActive?: (active: boolean) => void;
  theme: ReturnType<typeof useTheme>;
  colors: ReturnType<typeof useThemeColors>;
  shadows: ReturnType<typeof useThemeShadows>;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { t } = useTranslation();
  const signal = job.signalMeta || {};
  const isInstant = job.urgency === 'instant';
  const accent = isInstant ? colors.cyan : colors.worker;
  const accentSecondary = isInstant ? theme.colors.brand.secondary : colors.worker;
  const media = useMemo(() => getJobMedia(job), [job]);
  const client = getClientMeta(job);
  const [secondsRemaining, setSecondsRemaining] = useState(() => resolveSecondsRemaining(job));

  // Inline Counter Offer state
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [activeCounterPrice, setActiveCounterPrice] = useState<number | null>(null);

  // Responsive device width helpers for button sizing
  const isSmallDevice = screenWidth < 380;
  const isVerySmallDevice = screenWidth < 345;
  const isCompactDevice = screenWidth < 410;
  const hasThreeActions = isInstant && !showCounterInput;

  const btnHeight = isSmallDevice ? 46 : 48;
  const secondaryIconSize = isSmallDevice ? 14 : 16;
  const primaryIconSize = isSmallDevice ? 15 : 18;

  useEffect(() => {
    let isMounted = true;
    const checkExistingBid = async () => {
      try {
        const response = await api.get('/jobs/my-bids', { params: { limit: 50, status: 'pending' } });
        if (response.data?.success && isMounted) {
          const matchedBid = response.data.data.find(
            (b: any) => String(b.jobPost?._id || b.jobPost) === String(job._id)
          );
          if (matchedBid) {
            setActiveCounterPrice(matchedBid.proposedPrice);
          }
        }
      } catch (err) {
        console.log('Error checking existing bids:', err);
      }
    };
    if (job?._id) {
      checkExistingBid();
    }
    return () => {
      isMounted = false;
    };
  }, [job?._id]);

  const handleSubmitCounter = async (priceToSubmit?: number) => {
    const defaultCounter = (activeCounterPrice ?? offerAmount) + 200;
    const finalPrice = priceToSubmit ?? (counterPrice ? Number(counterPrice) : defaultCounter);
    if (!finalPrice || finalPrice <= 0) {
      Toast.show({
        type: 'error',
        text1: t('bidSubmission.addYourQuote', 'Add Your Quote'),
        text2: t('bidSubmission.enterQuoteAmount', 'Enter the amount you want to charge.'),
      });
      return;
    }

    try {
      setSubmittingCounter(true);
      await api.post(`/jobs/${job._id}/bids`, {
        proposedPrice: finalPrice,
        message: 'Urgent Counter-Offer',
      });
      Toast.show({
        type: 'success',
        text1: t('bidSubmission.proposalSent', 'Proposal Sent'),
        text2: t('bidSubmission.proposalSentDesc', 'The client can now review your offer.'),
      });
      setCounterPrice('');
      setActiveCounterPrice(finalPrice);
      setShowCounterInput(false);
    } catch (err: any) {
      if (err.response?.status === 402) {
        const required = Number(err.response?.data?.requiredBalance || 500);
        Toast.show({
          type: 'error',
          text1: t('bidSubmission.topUpRequired', 'Top-Up Required'),
          text2: t('bidSubmission.keepRequiredBalance', 'Keep at least {{amount}} in your wallet to continue.', {
            amount: `Rs. ${required}`,
          }),
        });
        onWalletPress();
      } else {
        Toast.show({
          type: 'error',
          text1: t('bidSubmission.couldNotSend', 'Could Not Send Proposal'),
          text2: err.response?.data?.message || 'Please try again.',
        });
      }
    } finally {
      setSubmittingCounter(false);
    }
  };

  useEffect(() => {
    setSecondsRemaining(resolveSecondsRemaining(job));
    const interval = setInterval(() => {
      setSecondsRemaining(resolveSecondsRemaining(job));
    }, 1000);
    return () => clearInterval(interval);
  }, [job]);

  const offerAmount = Number(signal.amount || job.amount || job.budget || job.pricing?.clientOffer || job.hourlyRate || 0);
  const netEarning = Number(signal.estimatedNetEarning ?? (offerAmount > 0 ? Math.round(offerAmount * 0.9) : 0));
  const commission = Number(signal.estimatedCommission ?? (offerAmount > 0 ? Math.round(offerAmount * 0.1) : 0));
  const walletBalance = Number(signal.walletBalance || 0);
  const requiredWalletBalance = Number(signal.requiredWalletBalance || 0);
  const isWalletEligible = signal.isWalletEligible !== false;
  const distanceText = signal.distanceText || job.distanceText || 'Nearby';
  const schedule = signal.schedule || {};
  const clientRating = Number(client?.rating || 0);
  const completedJobs = Number(client?.completedJobs || 0);

  const timingText = isInstant
    ? t('incomingJobModal.immediateResponse', 'Immediate response requested')
    : `${schedule.fullDateLabel || schedule.dateLabel || t('incomingJobModal.scheduledVisit', 'Scheduled visit')}${
        schedule.timeLabel ? ` at ${schedule.timeLabel}` : ''
      }`;

  const primaryAmountLabel = isInstant
    ? t('incomingJobModal.netEarning', 'Net earning')
    : t('incomingJobModal.clientBudget', 'Client budget');

  const primaryAmountText = isInstant
    ? signal.estimatedNetEarningText || formatMoney(netEarning)
    : signal.clientBudgetText || (offerAmount > 0 ? formatMoney(offerAmount) : t('incomingJobModal.openBudget', 'Open budget'));

  const primaryAmountHint = isInstant
    ? commission > 0
      ? t('incomingJobModal.commissionText', '{{amount}} commission', { amount: formatMoney(commission) })
      : t('incomingJobModal.noCommission', 'No commission')
    : t('incomingJobModal.submitQuoteHint', 'Submit your own quote');

  return (
    // Clean, smooth subtle entrance animation without bouncy springiness
    <Animated.View
      entering={FadeInDown.duration(260)}
      style={[
        styles.cardFrame,
        {
          width: Math.min(screenWidth - 28, 440),
          maxHeight: Math.min(screenHeight * 0.85, 680),
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: alpha(accent, 0.28),
            backgroundColor: theme.colors.surface.card,
          },
        ]}
      >
        {/* Clean Header Bar */}
        <View style={[styles.headerBar, { backgroundColor: alpha(accent, 0.08), borderBottomColor: alpha(accent, 0.15) }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.urgencyBadge, { backgroundColor: alpha(accent, 0.16) }]}>
              {isInstant ? (
                <Zap size={13} color={accent} fill={accent} strokeWidth={2.4} />
              ) : (
                <BriefcaseBusiness size={13} color={accent} strokeWidth={2.4} />
              )}
              <Text style={[styles.urgencyText, { color: accent }]}>
                {isInstant
                  ? t('incomingJobModal.liveJobOffer', 'URGENT JOB')
                  : t('incomingJobModal.newScheduledRequest', 'SCHEDULED')}
              </Text>
            </View>
            <Text style={[styles.timeAgoText, { color: alpha(theme.colors.text.primary, 0.45) }]}>
              {formatAge(job.createdAt, t)}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {totalJobs > 1 && (
              <View style={[styles.queuePill, { backgroundColor: alpha(theme.colors.text.primary, 0.08) }]}>
                <Text style={[styles.queuePillText, { color: alpha(theme.colors.text.primary, 0.7) }]}>
                  {currentIndex}/{totalJobs}
                </Text>
              </View>
            )}

            <View style={[styles.timerPill, { backgroundColor: alpha(accent, 0.15), borderColor: alpha(accent, 0.3) }]}>
              <Clock3 size={12} color={accent} strokeWidth={2.6} />
              <Text style={[styles.timerPillText, { color: accent }]}>
                {formatCountdown(secondsRemaining)}
              </Text>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardContent}
        >
          {/* Hero Earnings & Distance Card */}
          <View style={[styles.heroCard, { backgroundColor: alpha(theme.colors.text.primary, 0.03), borderColor: alpha(accent, 0.18) }]}>
            <View style={styles.heroColumn}>
              <Text style={[styles.heroLabel, { color: alpha(theme.colors.text.primary, 0.5) }]}>
                {primaryAmountLabel}
              </Text>
              <Text style={[styles.heroAmount, { color: colors.success }]}>
                {primaryAmountText}
              </Text>
              <Text style={[styles.heroSubtext, { color: alpha(theme.colors.text.primary, 0.4) }]}>
                {primaryAmountHint}
              </Text>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: alpha(theme.colors.text.primary, 0.08) }]} />

            <View style={styles.heroColumn}>
              <Text style={[styles.heroLabel, { color: alpha(theme.colors.text.primary, 0.5) }]}>
                {t('incomingJobModal.travelDistance', 'Distance')}
              </Text>
              <View style={styles.distanceRow}>
                <Navigation size={15} color={accent} strokeWidth={2.4} />
                <Text style={[styles.heroDistance, { color: theme.colors.text.primary }]}>
                  {distanceText}
                </Text>
              </View>
              <Text style={[styles.heroSubtext, { color: alpha(theme.colors.text.primary, 0.4) }]}>
                {isInstant ? t('incomingJobModal.respondNearby', 'Near you') : t('incomingJobModal.planVisit', 'Plan visit')}
              </Text>
            </View>
          </View>

          {/* Job Title & Description */}
          <View style={styles.jobBriefSection}>
            <Text style={[styles.categoryTitle, { color: theme.colors.text.primary }]}>
              {job.category || t('jobDetails.defaultTitle', 'Service Request')}
            </Text>
            {job.description ? (
              <Text style={[styles.descriptionText, { color: alpha(theme.colors.text.primary, 0.72) }]} numberOfLines={3}>
                {job.description}
              </Text>
            ) : null}
          </View>

          {/* Core Info Rows (Location, Timing, Client) in one cohesive box */}
          <View style={[styles.infoBlock, { backgroundColor: alpha(theme.colors.text.primary, 0.02), borderColor: alpha(theme.colors.text.primary, 0.06) }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: alpha(accent, 0.1) }]}>
                <MapPin size={15} color={accent} strokeWidth={2.4} />
              </View>
              <View style={styles.infoRowContent}>
                <Text style={[styles.infoRowLabel, { color: alpha(theme.colors.text.primary, 0.45) }]}>
                  {t('incomingJobModal.serviceLocation', 'Location')}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {job.address || t('incomingJobModal.nearbyServiceArea', 'Nearby service area')}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRowDivider, { backgroundColor: alpha(theme.colors.text.primary, 0.05) }]} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: alpha(isInstant ? colors.success : colors.worker, 0.1) }]}>
                <CalendarDays size={15} color={isInstant ? colors.success : colors.worker} strokeWidth={2.4} />
              </View>
              <View style={styles.infoRowContent}>
                <Text style={[styles.infoRowLabel, { color: alpha(theme.colors.text.primary, 0.45) }]}>
                  {t('incomingJobModal.visitTiming', 'When')}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {timingText}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRowDivider, { backgroundColor: alpha(theme.colors.text.primary, 0.05) }]} />

            {/* Client Context Row */}
            <View style={styles.infoRow}>
              {client?.profileImage ? (
                <Image source={{ uri: client.profileImage }} style={styles.clientAvatar} />
              ) : (
                <View style={[styles.clientAvatarFallback, { backgroundColor: alpha(accent, 0.1) }]}>
                  <UserRound size={15} color={accent} strokeWidth={2.4} />
                </View>
              )}
              <View style={styles.infoRowContent}>
                <View style={styles.clientNameRow}>
                  <Text style={[styles.infoRowValue, { color: theme.colors.text.primary, fontWeight: '800' }]} numberOfLines={1}>
                    {client?.fullName || t('incomingJobModal.defaultClientName', 'Customer')}
                  </Text>
                  {clientRating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Star size={11} color="#FFD700" fill="#FFD700" />
                      <Text style={[styles.ratingText, { color: theme.colors.text.primary }]}>
                        {clientRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.clientSubtext, { color: alpha(theme.colors.text.primary, 0.45) }]}>
                  {completedJobs > 0
                    ? t('incomingJobModal.jobsCompleted', '{{count}} jobs done', { count: completedJobs })
                    : t('incomingJobModal.newClient', 'New customer')}
                </Text>
              </View>
            </View>
          </View>

          {/* Work Evidence (ONLY shown if attachments exist) */}
          {media.items.length > 0 && (
            <View style={styles.evidenceSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: alpha(theme.colors.text.primary, 0.6) }]}>
                  {t('incomingJobModal.workEvidence', 'Photos & Voice')}
                </Text>
                <Text style={[styles.sectionCountBadge, { color: accent }]}>
                  {media.totalCount}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaRail}
                onTouchStart={() => onScrollActive?.(false)}
                onTouchEnd={() => onScrollActive?.(true)}
                onTouchCancel={() => onScrollActive?.(true)}
              >
                {media.items.map((item: MediaItem, index: number) => (
                  <EvidenceTile
                    key={`${item.type}-${item.url}-${index}`}
                    item={item}
                    index={index}
                    accent={accent}
                    theme={theme}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Low Wallet Alert Banner (ONLY shown if ineligible) */}
          {!isWalletEligible && (
            <TouchableOpacity
              style={[styles.walletAlert, { backgroundColor: alpha(colors.worker, 0.1), borderColor: alpha(colors.worker, 0.3) }]}
              onPress={onWalletPress}
              activeOpacity={0.8}
            >
              <AlertCircle size={16} color={colors.worker} strokeWidth={2.4} />
              <View style={styles.walletAlertCopy}>
                <Text style={[styles.walletAlertTitle, { color: colors.worker }]}>
                  {t('incomingJobModal.walletTopUpRequired', 'Add Wallet Balance')}
                </Text>
                <Text style={[styles.walletAlertDesc, { color: alpha(theme.colors.text.primary, 0.6) }]}>
                  {t('incomingJobModal.walletBalanceDesc', 'Keep at least Rs. {{amount}} in wallet to accept jobs', {
                    amount: requiredWalletBalance,
                  })}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.worker} />
            </TouchableOpacity>
          )}

          {/* Active Counter Offer Badge if submitted */}
          {activeCounterPrice !== null && (
            <View style={[styles.activeCounterBadge, { backgroundColor: alpha(colors.success, 0.1), borderColor: alpha(colors.success, 0.25) }]}>
              <Check size={14} color={colors.success} strokeWidth={2.5} />
              <Text style={[styles.activeCounterText, { color: colors.success }]}>
                {t('incomingJobModal.activeCounterOffer', 'Your Sent Rate')}: {formatMoney(activeCounterPrice)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCounterInput(!showCounterInput)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.activeCounterChange, { color: accent }]}>
                  {showCounterInput ? t('common.cancel', 'Cancel') : t('incomingJobModal.counterAgain', 'Change')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Inline Quick Counter Row (expandable when requested) */}
          {showCounterInput && isInstant && (
            <View style={[styles.counterBox, { backgroundColor: alpha(theme.colors.text.primary, 0.04), borderColor: alpha(accent, 0.25) }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.counterBoxTitle, { color: theme.colors.text.primary, marginBottom: 0 }]}>
                  {t('incomingJobModal.offerLow', 'Want to give your own rate?')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCounterInput(false);
                    setCounterPrice('');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.text.muted }}>
                    ✕ {t('common.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Increment Buttons for fast response */}
              <View style={styles.quickIncrementsRow}>
                {[200, 500, 1000].map((inc) => {
                  const targetPrice = (activeCounterPrice ?? offerAmount) + inc;
                  const isSelected = Number(counterPrice || ((activeCounterPrice ?? offerAmount) + 200)) === targetPrice;
                  return (
                    <TouchableOpacity
                      key={inc}
                      style={[
                        styles.quickIncrementChip,
                        {
                          backgroundColor: isSelected ? accent : alpha(accent, 0.1),
                          borderColor: isSelected ? accent : alpha(accent, 0.25),
                        },
                      ]}
                      onPress={() => setCounterPrice(String(targetPrice))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickIncrementText,
                          {
                            color: isSelected ? theme.colors.text.onBrand : accent,
                            fontWeight: isSelected ? '900' : '800',
                          },
                        ]}
                      >
                        +{inc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.counterInputRow}>
                <View style={[styles.counterInputWrap, { borderColor: alpha(accent, 0.3) }]}>
                  <Text style={[styles.counterPrefix, { color: accent }]}>PKR</Text>
                  <TextInput
                    style={[styles.counterInput, { color: theme.colors.text.primary }]}
                    value={counterPrice}
                    onChangeText={(val) => setCounterPrice(val.replace(/[^\d]/g, ''))}
                    keyboardType="number-pad"
                    placeholder={String((activeCounterPrice ?? offerAmount) + 200)}
                    placeholderTextColor={alpha(theme.colors.text.primary, 0.3)}
                    autoFocus
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Clear Action Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface.card,
              borderTopColor: alpha(theme.colors.text.primary, 0.08),
              paddingHorizontal: isSmallDevice ? 10 : 12,
              gap: isSmallDevice ? 6 : 8,
            },
          ]}
        >
          {/* Skip / Cancel Button */}
          <TouchableOpacity
            style={[
              styles.skipBtn,
              {
                height: btnHeight,
                borderColor: alpha(theme.colors.text.primary, 0.15),
                paddingHorizontal: hasThreeActions ? (isSmallDevice ? 8 : 10) : 14,
                gap: isSmallDevice ? 3 : 4,
              },
            ]}
            onPress={showCounterInput ? () => { setShowCounterInput(false); setCounterPrice(''); } : onReject}
            disabled={isLoading || submittingCounter}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showCounterInput ? t('common.cancel', 'Cancel') : t('common.skip', 'Skip')}
          >
            <X size={isSmallDevice ? 14 : 17} color={alpha(theme.colors.text.primary, 0.6)} strokeWidth={2.4} />
            {(!hasThreeActions || !isVerySmallDevice) && (
              <Text
                style={[
                  styles.skipBtnText,
                  {
                    color: alpha(theme.colors.text.primary, 0.7),
                    fontSize: isSmallDevice ? 11 : 12,
                  },
                ]}
                numberOfLines={1}
              >
                {showCounterInput ? t('common.cancel', 'Cancel') : t('common.skip', 'Skip')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick Counter Toggle Button (if Instant & counter input closed) */}
          {isInstant && !showCounterInput && (
            <TouchableOpacity
              style={[
                styles.counterToggleBtn,
                {
                  height: btnHeight,
                  flex: 1,
                  minWidth: 0,
                  borderColor: alpha(accent, 0.35),
                  paddingHorizontal: isSmallDevice ? 6 : 10,
                  gap: isSmallDevice ? 4 : 5,
                },
              ]}
              onPress={() => {
                setShowCounterInput(true);
                if (!counterPrice) {
                  setCounterPrice(String((activeCounterPrice ?? offerAmount) + 200));
                }
              }}
              disabled={isLoading}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <CircleDollarSign size={secondaryIconSize} color={accent} strokeWidth={2.4} style={{ flexShrink: 0 }} />
              <Text
                style={[
                  styles.counterToggleBtnText,
                  {
                    color: accent,
                    fontSize: isSmallDevice ? 11 : 12,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                ellipsizeMode="tail"
              >
                {t('incomingJobModal.counterOffer', 'Give My Rate')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Primary Action Button: When countering, this is the SINGLE button to send the counter rate. When normal, it's Accept Offer. */}
          {showCounterInput ? (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  height: btnHeight,
                  flex: 1,
                  minWidth: 0,
                },
              ]}
              onPress={isWalletEligible ? () => handleSubmitCounter() : onWalletPress}
              disabled={submittingCounter || isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isWalletEligible ? [accent, accentSecondary] : [colors.worker, alpha(colors.worker, 0.85)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.primaryBtnGradient,
                  {
                    paddingHorizontal: isSmallDevice ? 8 : 10,
                    gap: isSmallDevice ? 4 : 6,
                  },
                ]}
              >
                {submittingCounter ? (
                  <ActivityIndicator color={theme.colors.text.onBrand} size="small" />
                ) : isWalletEligible ? (
                  <>
                    <Send size={primaryIconSize} color={theme.colors.text.onBrand} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <Text
                      style={[
                        styles.primaryBtnText,
                        {
                          color: theme.colors.text.onBrand,
                          fontSize: isSmallDevice ? 11 : isCompactDevice ? 12 : 13,
                          letterSpacing: isSmallDevice ? 0.1 : 0.2,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      ellipsizeMode="tail"
                    >
                      {t('incomingJobModal.sendMyRateBtn', 'Send Rate: Rs. {{amount}}', {
                        amount: Number(counterPrice || ((activeCounterPrice ?? offerAmount) + 200)).toLocaleString(),
                      })}
                    </Text>
                  </>
                ) : (
                  <>
                    <WalletCards size={primaryIconSize} color={theme.colors.text.onBrand} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                    <Text
                      style={[
                        styles.primaryBtnText,
                        {
                          color: theme.colors.text.onBrand,
                          fontSize: isSmallDevice ? 11 : isCompactDevice ? 12 : 13,
                          letterSpacing: isSmallDevice ? 0.1 : 0.2,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      ellipsizeMode="tail"
                    >
                      {t('incomingJobModal.topUpWallet', 'Add Balance')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  height: btnHeight,
                  flex: hasThreeActions ? 1.35 : 1,
                  minWidth: 0,
                },
              ]}
              onPress={isWalletEligible ? onAccept : onWalletPress}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isWalletEligible ? [accent, accentSecondary] : [colors.worker, alpha(colors.worker, 0.85)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.primaryBtnGradient,
                  {
                    paddingHorizontal: hasThreeActions ? (isSmallDevice ? 6 : 8) : 10,
                    gap: isSmallDevice ? 4 : 6,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.text.onBrand} size="small" />
                ) : isWalletEligible ? (
                  <>
                    <Check size={primaryIconSize} color={theme.colors.text.onBrand} strokeWidth={2.8} style={{ flexShrink: 0 }} />
                    <Text
                      style={[
                        styles.primaryBtnText,
                        {
                          color: theme.colors.text.onBrand,
                          fontSize: isSmallDevice ? 11 : isCompactDevice ? 12 : 13,
                          letterSpacing: isSmallDevice ? 0.1 : 0.2,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      ellipsizeMode="tail"
                    >
                      {isInstant
                        ? t('incomingJobModal.acceptOffer', 'Accept Offer')
                        : t('incomingJobModal.continueBid', 'Send Proposal')}
                    </Text>
                  </>
                ) : (
                  <>
                    <WalletCards size={primaryIconSize} color={theme.colors.text.onBrand} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                    <Text
                      style={[
                        styles.primaryBtnText,
                        {
                          color: theme.colors.text.onBrand,
                          fontSize: isSmallDevice ? 11 : isCompactDevice ? 12 : 13,
                          letterSpacing: isSmallDevice ? 0.1 : 0.2,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      ellipsizeMode="tail"
                    >
                      {t('incomingJobModal.topUpWallet', 'Add Balance')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Note */}
        <View style={styles.footerNoteRow}>
          <Text style={[styles.footerNoteText, { color: alpha(theme.colors.text.primary, 0.4) }]}>
            {isInstant
              ? t('incomingJobModal.instantFooterNote', 'First Ustad to accept gets this urgent job right away!')
              : t('incomingJobModal.scheduledFooterNote', 'Send your rate so the customer can book you.')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function EvidenceTile({ item, index, accent, theme }: { item: MediaItem; index: number; accent: string; theme: ReturnType<typeof useTheme> }) {
  if (item.type === 'audio') {
    return <AudioEvidenceTile item={item} index={index} accent={accent} theme={theme} />;
  }
  if (item.type === 'video') {
    return <VideoEvidenceTile item={item} index={index} accent={accent} theme={theme} />;
  }
  return <ImageEvidenceTile item={item} index={index} accent={accent} theme={theme} />;
}

function ImageEvidenceTile({ item, index, accent, theme }: { item: MediaItem; index: number; accent: string; theme: ReturnType<typeof useTheme> }) {
  const [previewVisible, setPreviewVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setPreviewVisible(true)}
        style={[styles.mediaThumb, { borderColor: alpha(accent, 0.25) }]}
      >
        <Image source={{ uri: item.url }} style={styles.mediaImage} />
        <View style={styles.mediaExpandBadge}>
          <Maximize2 size={11} color="#fff" strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
            <X size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <Image source={{ uri: item.url }} style={styles.previewMedia} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

function VideoEvidenceTile({ item, index, accent, theme }: { item: MediaItem; index: number; accent: string; theme: ReturnType<typeof useTheme> }) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const player = useVideoPlayer(item.url);

  useEffect(() => {
    if (!previewVisible) player.pause();
  }, [player, previewVisible]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setPreviewVisible(true)}
        style={[styles.mediaThumb, { borderColor: alpha(accent, 0.25), backgroundColor: alpha(accent, 0.08) }]}
      >
        <PlayCircle size={26} color={accent} strokeWidth={2} />
      </TouchableOpacity>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
            <X size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <VideoView player={player} style={styles.previewMedia} nativeControls allowsFullscreen />
        </View>
      </Modal>
    </>
  );
}

const formatPlaybackTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

function AudioEvidenceTile({ item, index, accent, theme }: { item: MediaItem; index: number; accent: string; theme: ReturnType<typeof useTheme> }) {
  const { t } = useTranslation();
  const player = useAudioPlayer(item.url);
  const status = useAudioPlayerStatus(player);

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      await player.seekTo(0);
    }
    player.play();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={togglePlayback}
      style={[styles.audioTile, { borderColor: alpha(accent, 0.28), backgroundColor: alpha(accent, 0.06) }]}
    >
      <View style={[styles.audioPlayBtn, { backgroundColor: alpha(accent, 0.15) }]}>
        {status.playing ? (
          <PauseCircle size={22} color={accent} strokeWidth={2.2} />
        ) : (
          <PlayCircle size={22} color={accent} strokeWidth={2.2} />
        )}
      </View>
      <View style={styles.audioCopy}>
        <View style={styles.audioTitleRow}>
          <Volume2 size={13} color={accent} strokeWidth={2.4} />
          <Text style={[styles.audioTitle, { color: theme.colors.text.primary }]}>
            {t('incomingJobModal.voiceBrief', 'Voice message')}
          </Text>
        </View>
        <Text style={[styles.audioDuration, { color: alpha(theme.colors.text.primary, 0.5) }]}>
          {formatPlaybackTime(status.currentTime)} / {formatPlaybackTime(status.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  jobPager: {
    alignItems: 'center',
  },
  jobPage: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardFrame: {
    width: CARD_WIDTH,
    maxHeight: Math.min(SCREEN_HEIGHT * 0.85, 680),
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeAgoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queuePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  queuePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  cardContent: {
    padding: 14,
    paddingBottom: 10,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  heroColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroDivider: {
    width: 1,
    height: 44,
    marginHorizontal: 12,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroDistance: {
    fontSize: 18,
    fontWeight: '900',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroSubtext: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  jobBriefSection: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  infoBlock: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  infoRowDivider: {
    height: 1,
    marginHorizontal: 12,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowContent: {
    flex: 1,
    minWidth: 0,
  },
  infoRowLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoRowValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  clientAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  clientAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clientSubtext: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  evidenceSection: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCountBadge: {
    fontSize: 11,
    fontWeight: '900',
  },
  mediaRail: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  mediaThumb: {
    width: 90,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaExpandBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 3,
  },
  audioTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    minWidth: 160,
  },
  audioPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCopy: {
    flex: 1,
    minWidth: 0,
  },
  audioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audioTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  audioDuration: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  walletAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  walletAlertCopy: {
    flex: 1,
    minWidth: 0,
  },
  walletAlertTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  walletAlertDesc: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginTop: 1,
  },
  activeCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  activeCounterText: {
    fontSize: 12,
    fontWeight: '800',
  },
  activeCounterChange: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  counterBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  counterBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  quickIncrementsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickIncrementChip: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIncrementText: {
    fontSize: 11,
    fontWeight: '900',
  },
  counterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  counterPrefix: {
    fontSize: 12,
    fontWeight: '900',
    marginRight: 6,
  },
  counterInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    padding: 0,
  },
  counterSubmitBtn: {
    width: 76,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
  },
  counterSubmitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterSubmitText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
  },
  skipBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  counterToggleBtn: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  counterToggleBtnText: {
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'center',
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flexShrink: 1,
    textAlign: 'center',
  },
  footerNoteRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.96)',
    paddingHorizontal: 12,
    paddingVertical: 70,
  },
  previewCloseButton: {
    position: 'absolute',
    top: 54,
    right: 18,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
});
