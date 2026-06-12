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
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Banknote,
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
  Radio,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  Volume2,
  WalletCards,
  X,
  Zap,
} from 'lucide-react-native';

import { Colors, Shadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 24, 520);

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
  if (!timestamp || Number.isNaN(timestamp)) return t ? t('incomingJobModal.newSignal', 'New signal') : 'New signal';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return t ? t('incomingJobModal.postedJustNow', 'Posted just now') : 'Posted just now';
  if (minutes < 60) return t ? t('incomingJobModal.postedMinutesAgo', 'Posted {{count}}m ago', { count: minutes }) : `Posted ${minutes}m ago`;
  return t ? t('incomingJobModal.postedHoursAgo', 'Posted {{count}}h ago', { count: Math.floor(minutes / 60) }) : `Posted ${Math.floor(minutes / 60)}h ago`;
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
  const router = useRouter();
  const { t } = useTranslation();
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);

  if (!jobs || jobs.length === 0) return null;

  const handleWalletPress = () => {
    onClose();
    router.push('/(tabs)/wallet' as any);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <LinearGradient colors={['rgba(2,4,16,0.82)', 'rgba(0,0,0,0.98)']} style={StyleSheet.absoluteFillObject} />

        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(180)} style={styles.screen}>
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <X size={21} color={Colors.cyan} strokeWidth={2.6} />
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
              <View key={job._id} style={styles.jobPage}>
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
                />
              </View>
            ))}
          </ScrollView>

          {jobs.length > 1 && (
            <View style={[styles.swipeHint, { bottom: insets.bottom + 14 }]}>
              <ChevronLeft size={14} color={Colors.cyan} strokeWidth={2.5} />
              <Text style={styles.swipeHintText}>{t('incomingJobModal.swipeHint', 'Swipe for {{count}} offers', { count: jobs.length })}</Text>
              <ChevronRight size={14} color={Colors.cyan} strokeWidth={2.5} />
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
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const workerLoc = (user as any)?.address || (user as any)?.city || '';
  const signal = job.signalMeta || {};
  const isInstant = job.urgency === 'instant';
  const accent = isInstant ? '#00F0FF' : '#FF8C00';
  const accentSecondary = isInstant ? '#007AFF' : '#FF5E00';
  const media = useMemo(() => getJobMedia(job), [job]);
  const client = getClientMeta(job);
  const [secondsRemaining, setSecondsRemaining] = useState(() => resolveSecondsRemaining(job));
  const glow = useSharedValue(0.35);

  useEffect(() => {
    setSecondsRemaining(resolveSecondsRemaining(job));
    const interval = setInterval(() => {
      setSecondsRemaining(resolveSecondsRemaining(job));
    }, 1000);
    return () => clearInterval(interval);
  }, [job]);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 1200 }), withTiming(0.35, { duration: 1200 })),
      -1,
      true
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const offerAmount = Number(signal.amount || job.amount || job.hourlyRate || 0);
  const netEarning = Number(signal.estimatedNetEarning ?? offerAmount);
  const commission = Number(signal.estimatedCommission || 0);
  const walletBalance = Number(signal.walletBalance || 0);
  const requiredWalletBalance = Number(signal.requiredWalletBalance || 0);
  const isWalletEligible = signal.isWalletEligible !== false;
  const distanceText = signal.distanceText || job.distanceText || 'Nearby';
  const schedule = signal.schedule || {};
  const clientRating = Number(client?.rating || 0);
  const completedJobs = Number(client?.completedJobs || 0);
  const totalJobsPosted = Number(client?.totalJobs || 0);
  const timingText = isInstant
    ? t('incomingJobModal.immediateResponse', 'Immediate response requested')
    : `${schedule.fullDateLabel || schedule.dateLabel || t('incomingJobModal.scheduledVisit', 'Scheduled visit')} at ${schedule.timeLabel || t('incomingJobModal.timePending', 'Time pending')}`;
  const primaryAmountLabel = isInstant ? t('incomingJobModal.netEarning', 'Net earning') : t('incomingJobModal.clientBudget', 'Client budget');
  const primaryAmountText = isInstant
    ? (signal.estimatedNetEarningText || formatMoney(netEarning))
    : (signal.clientBudgetText || (offerAmount > 0 ? formatMoney(offerAmount) : t('incomingJobModal.openBudget', 'Open budget')));
  const primaryAmountHint = isInstant
    ? (commission > 0 ? t('incomingJobModal.commissionText', '{{amount}} commission', { amount: formatMoney(commission) }) : t('incomingJobModal.noCommission', 'No commission'))
    : t('incomingJobModal.submitQuoteHint', 'Submit your own quote');

  return (
    <Animated.View entering={SlideInDown.duration(420).springify().damping(18)} style={styles.cardFrame}>
      <Animated.View style={[styles.cardGlow, { shadowColor: accent }, glowStyle]} />

      <View style={styles.card}>
        <LinearGradient colors={['rgba(8,11,31,0.98)', 'rgba(5,8,24,0.99)']} style={StyleSheet.absoluteFillObject} />

        <LinearGradient
          colors={[accent, accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.liveBar}
        >
          <View style={styles.liveBarLeft}>
            <Radio size={13} color="#001014" strokeWidth={2.8} />
            <Text style={styles.liveBarText}>{isInstant ? t('incomingJobModal.liveJobOffer', 'LIVE JOB OFFER') : t('incomingJobModal.newScheduledRequest', 'NEW SCHEDULED REQUEST')}</Text>
          </View>
          <View style={styles.liveBarRight}>
            {totalJobs > 1 && <Text style={styles.queueText}>{currentIndex}/{totalJobs}</Text>}
            <View style={styles.timer}>
              <Clock3 size={11} color="#001014" strokeWidth={2.7} />
              <Text style={styles.timerText}>{formatCountdown(secondsRemaining)}</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardContent}
        >
          <View style={styles.summaryHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}42` }]}>
              {isInstant ? (
                <Zap size={25} color={accent} fill={accent} strokeWidth={2.4} />
              ) : (
                <BriefcaseBusiness size={24} color={accent} strokeWidth={2.3} />
              )}
            </View>
            <View style={styles.summaryCopy}>
              <View style={styles.eyebrowRow}>
                <View style={[styles.signalDot, { backgroundColor: accent }]} />
                <Text style={[styles.eyebrowText, { color: accent }]}>
                  {isInstant ? t('incomingJobModal.instantResponse', 'Instant response') : t('incomingJobModal.scheduledOpportunity', 'Scheduled opportunity')}
                </Text>
                <Text style={styles.postedText}>{formatAge(job.createdAt, t)}</Text>
              </View>
              <Text style={styles.categoryTitle} numberOfLines={1}>{job.category || t('jobDetails.defaultTitle', 'Service request')}</Text>
            </View>
          </View>

          <Text style={styles.descriptionText}>
            {job.description || t('incomingJobModal.defaultDescription', 'The client has requested professional assistance for this service.')}
          </Text>

          <View style={styles.primaryFacts}>
            <DecisionMetric
              icon={CircleDollarSign}
              label={primaryAmountLabel}
              value={primaryAmountText}
              hint={primaryAmountHint}
              color={Colors.green}
            />
            <DecisionMetric
              icon={Navigation}
              label={t('incomingJobModal.travelDistance', 'Travel distance')}
              value={distanceText}
              hint={isInstant ? t('incomingJobModal.respondNearby', 'Respond nearby') : t('incomingJobModal.planVisit', 'Plan your visit')}
              color={accent}
            />
          </View>

          <View style={styles.detailCard}>
            <DetailRow icon={MapPin} label={t('incomingJobModal.serviceLocation', 'Service location')} value={job.address || t('incomingJobModal.nearbyServiceArea', 'Nearby service area')} color={accent} />
            <DetailRow icon={CalendarDays} label={t('incomingJobModal.visitTiming', 'Visit timing')} value={timingText} color={isInstant ? Colors.green : '#FF8C00'} />
            <DetailRow
              icon={Banknote}
              label={t('incomingJobModal.clientOffer', 'Client offer')}
              value={signal.clientBudgetText || (offerAmount > 0 ? formatMoney(offerAmount) : t('incomingJobModal.openBudget', 'Open budget'))}
              color={Colors.green}
              isLast
            />
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitle}>
              <ImageIcon size={14} color={accent} strokeWidth={2.4} />
              <Text style={[styles.sectionTitle, { color: accent }]}>{t('incomingJobModal.workEvidence', 'Work evidence')}</Text>
            </View>
            <Text style={styles.sectionMeta}>{t('incomingJobModal.attachmentsLabel', '{{count}} attachments', { count: media.totalCount })}</Text>
          </View>

          {media.items.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRail}
              onTouchStart={() => onScrollActive?.(false)}
              onTouchEnd={() => onScrollActive?.(true)}
              onTouchCancel={() => onScrollActive?.(true)}
            >
              {media.items.map((item: MediaItem, index: number) => (
                <EvidenceTile key={`${item.type}-${item.url}-${index}`} item={item} index={index} accent={accent} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyEvidence}>
              <ImageIcon size={18} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyEvidenceText}>{t('incomingJobModal.noEvidenceMsg', 'No work evidence attached. Review the brief carefully.')}</Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitle}>
              <UserRound size={14} color={accent} strokeWidth={2.4} />
              <Text style={[styles.sectionTitle, { color: accent }]}>{t('incomingJobModal.clientContext', 'Client context')}</Text>
            </View>
          </View>

          <View style={styles.clientCard}>
            {client?.profileImage ? (
              <Image source={{ uri: client.profileImage }} style={styles.clientAvatar} />
            ) : (
              <View style={[styles.clientAvatarFallback, { borderColor: `${accent}45` }]}>
                <UserRound size={20} color={accent} />
              </View>
            )}
            <View style={styles.clientCopy}>
              <Text style={styles.clientLabel}>{t('incomingJobModal.serviceClient', 'Service client')}</Text>
              <Text style={styles.clientName} numberOfLines={1}>{client?.fullName || t('incomingJobModal.defaultClientName', 'ApnaUstad client')}</Text>
              <View style={styles.clientStats}>
                <View style={styles.clientStat}>
                  <Star size={11} color="#FFD700" fill={clientRating > 0 ? '#FFD700' : 'transparent'} />
                  <Text style={styles.clientStatText}>{clientRating > 0 ? t('incomingJobModal.clientRating', '{{rating}} rating', { rating: clientRating.toFixed(1) }) : t('incomingJobModal.newClient', 'New client')}</Text>
                </View>
                <View style={styles.clientStat}>
                  <ShieldCheck size={11} color={Colors.green} />
                  <Text style={styles.clientStatText}>{t('incomingJobModal.jobsCompleted', '{{completed}}/{{total}} jobs completed', { completed: completedJobs, total: totalJobsPosted })}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[
            styles.walletCard,
            {
              borderColor: isWalletEligible ? 'rgba(0,255,127,0.28)' : 'rgba(255,140,0,0.34)',
              backgroundColor: isWalletEligible ? 'rgba(0,255,127,0.07)' : 'rgba(255,140,0,0.1)',
            }
          ]}>
            <View style={[styles.walletIcon, { backgroundColor: isWalletEligible ? 'rgba(0,255,127,0.12)' : 'rgba(255,140,0,0.14)' }]}>
              <WalletCards size={18} color={isWalletEligible ? Colors.green : '#FF8C00'} strokeWidth={2.4} />
            </View>
            <View style={styles.walletCopy}>
              <Text style={[styles.walletTitle, { color: isWalletEligible ? Colors.green : '#FF8C00' }]}>
                {isWalletEligible ? t('incomingJobModal.walletReady', 'Wallet ready for acceptance') : t('incomingJobModal.walletTopUpRequired', 'Wallet top-up required')}
              </Text>
              <Text style={styles.walletText}>
                {t('incomingJobModal.walletBalanceDesc', 'Balance {{balance}}. Minimum required {{required}}.', { balance: formatMoney(walletBalance), required: formatMoney(requiredWalletBalance) })}
              </Text>
            </View>
          </View>
        </ScrollView>



        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={onReject} disabled={isLoading} activeOpacity={0.75}>
            <X size={18} color="rgba(255,255,255,0.62)" strokeWidth={2.5} />
            <Text style={styles.skipButtonText}>{t('common.skip', 'Skip')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={isWalletEligible ? onAccept : onWalletPress}
            disabled={isLoading}
            activeOpacity={0.86}
          >
            <LinearGradient
              colors={isWalletEligible ? [accent, accentSecondary] : ['#FFB000', '#FF7300']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#001014" size="small" />
              ) : isWalletEligible ? (
                <>
                  <Check size={19} color="#001014" strokeWidth={3} />
                  <Text style={styles.primaryButtonText}>
                    {isInstant ? t('incomingJobModal.acceptOffer', 'Accept offer') : t('incomingJobModal.continueBid', 'Continue to bid')}
                  </Text>
                  <ChevronRight size={17} color="#001014" strokeWidth={3} />
                </>
              ) : (
                <>
                  <WalletCards size={18} color="#201000" strokeWidth={2.7} />
                  <Text style={styles.primaryButtonText}>{t('incomingJobModal.topUpWallet', 'Top up wallet')}</Text>
                  <ChevronRight size={17} color="#201000" strokeWidth={3} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footerNote}>
          <ShieldAlert size={11} color="rgba(255,255,255,0.4)" />
          <Text style={styles.footerNoteText}>
            {isInstant ? t('incomingJobModal.instantFooterNote', 'Acceptance sends your interest to the client for confirmation.') : t('incomingJobModal.scheduledFooterNote', 'Submit your quote after reviewing the complete request.')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function DecisionMetric({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Icon size={15} color={color} strokeWidth={2.5} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricHint} numberOfLines={1}>{hint}</Text>
    </View>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  color,
  isLast,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={[styles.detailIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={15} color={color} strokeWidth={2.4} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function EvidenceTile({ item, index, accent }: { item: MediaItem; index: number; accent: string }) {
  if (item.type === 'audio') {
    return <AudioEvidenceTile item={item} index={index} accent={accent} />;
  }
  if (item.type === 'video') {
    return <VideoEvidenceTile item={item} index={index} accent={accent} />;
  }
  return <ImageEvidenceTile item={item} index={index} accent={accent} />;
}

function ImageEvidenceTile({ item, index, accent }: { item: MediaItem; index: number; accent: string }) {
  const { t } = useTranslation();
  const [previewVisible, setPreviewVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => setPreviewVisible(true)}
        style={[styles.mediaTile, { borderColor: `${accent}38` }]}
      >
        <Image source={{ uri: item.url }} style={styles.mediaImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.mediaIndex}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.expandBadge}>
          <Maximize2 size={12} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <View style={styles.mediaTypeBadge}>
          <Text style={styles.mediaTypeText}>{t('incomingJobModal.photo', 'PHOTO')}</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
            <X size={22} color="#FFFFFF" strokeWidth={2.7} />
          </TouchableOpacity>
          <Image source={{ uri: item.url }} style={styles.previewMedia} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

function VideoEvidenceTile({ item, index, accent }: { item: MediaItem; index: number; accent: string }) {
  const { t } = useTranslation();
  const [previewVisible, setPreviewVisible] = useState(false);
  const player = useVideoPlayer(item.url);

  useEffect(() => {
    if (!previewVisible) player.pause();
  }, [player, previewVisible]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => setPreviewVisible(true)}
        style={[styles.mediaTile, { borderColor: `${accent}38` }]}
      >
        <View style={styles.videoTile}>
          <PlayCircle size={34} color={accent} strokeWidth={1.8} />
          <Text style={styles.videoTileText}>{t('incomingJobModal.playVideo', 'Play job video')}</Text>
        </View>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.mediaIndex}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.mediaTypeBadge}>
          <Text style={styles.mediaTypeText}>{t('incomingJobModal.video', 'VIDEO')}</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
            <X size={22} color="#FFFFFF" strokeWidth={2.7} />
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

function AudioEvidenceTile({ item, index, accent }: { item: MediaItem; index: number; accent: string }) {
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
      activeOpacity={0.82}
      onPress={togglePlayback}
      style={[styles.mediaTile, styles.audioTile, { borderColor: `${accent}38` }]}
    >
      <View style={[styles.audioPlayButton, { borderColor: `${accent}55`, backgroundColor: `${accent}16` }]}>
        {status.playing ? (
          <PauseCircle size={32} color={accent} strokeWidth={1.8} />
        ) : (
          <PlayCircle size={32} color={accent} strokeWidth={1.8} />
        )}
      </View>
      <View style={styles.audioCopy}>
        <View style={styles.audioTitleRow}>
          <Volume2 size={14} color={accent} strokeWidth={2.3} />
          <Text style={styles.audioTitle}>{t('incomingJobModal.voiceBrief', 'Client voice brief')}</Text>
        </View>
        <Text style={styles.audioSubtitle}>
          {status.playing ? t('incomingJobModal.playingVoice', 'Playing requirement details') : t('incomingJobModal.tapListen', 'Tap to listen before responding')}
        </Text>
        <Text style={[styles.audioDuration, { color: accent }]}>
          {formatPlaybackTime(status.currentTime)} / {formatPlaybackTime(status.duration)}
        </Text>
      </View>
      <Text style={styles.mediaIndex}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.mediaTypeBadge}>
        <Text style={styles.mediaTypeText}>{t('incomingJobModal.voice', 'VOICE')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,4,16,0.96)',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.34)',
  },
  jobPager: {
    alignItems: 'center',
  },
  jobPage: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  swipeHint: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.24)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  swipeHintText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardFrame: {
    width: CARD_WIDTH,
    maxHeight: Math.min(SCREEN_HEIGHT * 0.82, 760),
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
  },
  card: {
    overflow: 'hidden',
    maxHeight: Math.min(SCREEN_HEIGHT * 0.82, 760),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.28)',
    backgroundColor: '#07091A',
    ...Shadows.depth,
  },
  liveBar: {
    height: 42,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveBarText: {
    color: '#001014',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  queueText: {
    color: '#001014',
    fontSize: 10,
    fontWeight: '900',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  timerText: {
    color: '#001014',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  cardContent: {
    padding: 16,
    paddingBottom: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrowText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  postedText: {
    flex: 1,
    color: 'rgba(255,255,255,0.38)',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 14,
  },
  primaryFacts: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    minHeight: 98,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  metricHint: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  detailCard: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  sectionHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
  },
  mediaRail: {
    gap: 9,
    paddingRight: 2,
    marginBottom: 16,
  },
  mediaTile: {
    width: Math.min(CARD_WIDTH - 32, 250),
    height: 132,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,240,255,0.08)',
  },
  videoTileText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '900',
  },
  audioTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,140,0,0.08)',
  },
  audioPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCopy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 14,
  },
  audioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  audioTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  audioSubtitle: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  audioDuration: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 6,
  },
  mediaIndex: {
    position: 'absolute',
    left: 11,
    bottom: 10,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  mediaTypeBadge: {
    position: 'absolute',
    right: 9,
    bottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.46)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  mediaTypeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  expandBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  emptyEvidence: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  emptyEvidenceText: {
    flex: 1,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 11,
    marginBottom: 12,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
  },
  clientAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  clientCopy: {
    flex: 1,
    minWidth: 0,
  },
  clientLabel: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  clientStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 5,
  },
  clientStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientStatText: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 10,
    fontWeight: '700',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCopy: {
    flex: 1,
    minWidth: 0,
  },
  walletTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  walletText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 3,
  },
  counterOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,176,0,0.26)',
    backgroundColor: 'rgba(255,176,0,0.07)',
  },
  counterOfferIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,176,0,0.11)',
  },
  counterOfferCopy: {
    flex: 1,
  },
  counterOfferTitle: {
    color: '#FFB000',
    fontSize: 11,
    fontWeight: '900',
  },
  counterOfferText: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(2,4,16,0.84)',
  },
  skipButton: {
    width: 74,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  primaryButton: {
    flex: 1,
    height: 54,
    overflow: 'hidden',
    borderRadius: 17,
    ...Shadows.glow,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  primaryButtonText: {
    color: '#001014',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  footerNote: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: 'rgba(2,4,16,0.84)',
  },
  footerNoteText: {
    flex: 1,
    color: 'rgba(255,255,255,0.38)',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
  },
});
