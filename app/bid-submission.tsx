import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  MessageSquare,
  Navigation,
  PauseCircle,
  PlayCircle,
  Send,
  ShieldCheck,
  UserRound,
  Volume2,
  WalletCards,
  X,
  Zap,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useJobDetails, useToast, useWorkerWallet } from '../hooks';
import api from '../services/api';
import { useTheme, useThemeColors, alpha } from '../constants/Theme';

const CYAN = '#00F5FF';
const GREEN = '#00FF7F';
const ORANGE = '#FF9500';
const RED = '#FF453A';
const PURPLE = '#BF5AF2';
const SURFACE = 'rgba(4,9,29,0.88)';
const BORDER = 'rgba(255,255,255,0.09)';
const TEXT_DIM = 'rgba(255,255,255,0.58)';
const TEXT_MUTED = 'rgba(255,255,255,0.38)';

const formatMoney = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

const keepDigits = (value: string) => value.replace(/[^\d]/g, '');
const formatPlaybackTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

function Surface({
  children,
  accent = CYAN,
  style,
}: {
  children: React.ReactNode;
  accent?: string;
  style?: object;
}) {
  return (
    <View style={[styles.surface, { borderColor: `${accent}38` }, style]}>
      <LinearGradient
        colors={[`${accent}16`, 'rgba(4,9,29,0.92)', 'rgba(4,9,29,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  detail,
  color = CYAN,
}: {
  icon: React.ComponentType<any>;
  title: string;
  detail?: string;
  color?: string;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
        <Icon size={15} color={color} strokeWidth={2.4} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {!!detail && <Text style={styles.sectionDetail}>{detail}</Text>}
    </View>
  );
}

function RequestFact({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.fact}>
      <Icon size={15} color={color} strokeWidth={2.3} />
      <View style={styles.factCopy}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function SettlementItem({
  label,
  value,
  color = '#FFFFFF',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.settlementItem}>
      <Text style={styles.settlementLabel}>{label}</Text>
      <Text style={[styles.settlementValue, { color }]}>{value}</Text>
    </View>
  );
}

function ImageEvidenceTile({ url, index }: { url: string; index: number }) {
  const [previewVisible, setPreviewVisible] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.evidenceTile} onPress={() => setPreviewVisible(true)} activeOpacity={0.8}>
        <Image source={{ uri: url }} style={styles.evidenceImage} />
        <View style={styles.evidenceIndex}><Text style={styles.evidenceIndexText}>{index + 1}</Text></View>
        <View style={styles.evidenceExpand}><Maximize2 size={11} color="#FFFFFF" /></View>
      </TouchableOpacity>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
            <X size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Image source={{ uri: url }} style={styles.previewMedia} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

function VideoEvidenceTile({ url, index }: { url: string; index: number }) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const player = useVideoPlayer(url);

  useEffect(() => {
    if (!previewVisible) player.pause();
  }, [player, previewVisible]);

  return (
    <>
      <TouchableOpacity
        style={[styles.evidenceTile, styles.videoTile]}
        onPress={() => setPreviewVisible(true)}
        activeOpacity={0.8}
      >
        <PlayCircle size={25} color={PURPLE} />
        <Text style={styles.videoTileText}>VIDEO {index + 1}</Text>
      </TouchableOpacity>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
            <X size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <VideoView player={player} style={styles.previewMedia} nativeControls allowsFullscreen />
        </View>
      </Modal>
    </>
  );
}

function AudioEvidenceTile({ url }: { url: string }) {
  const player = useAudioPlayer(url);
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
    <TouchableOpacity style={[styles.evidenceTile, styles.audioTile]} onPress={togglePlayback} activeOpacity={0.8}>
      {status.playing ? <PauseCircle size={25} color={ORANGE} /> : <PlayCircle size={25} color={ORANGE} />}
      <Volume2 size={13} color={ORANGE} />
      <Text style={styles.audioTileText}>{formatPlaybackTime(status.currentTime)} / {formatPlaybackTime(status.duration)}</Text>
    </TouchableOpacity>
  );
}

export default function BidSubmissionScreen() {
  const theme = useTheme();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const { jobId, title, urgency: urgencyParam, responseMode } = useLocalSearchParams<{
    jobId: string;
    title?: string;
    urgency?: 'instant' | 'scheduled';
    responseMode?: 'counter';
  }>();

  const [proposedPrice, setProposedPrice] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: job, isLoading: isLoadingJob } = useJobDetails(jobId);
  const { data: wallet, isLoading: isLoadingWallet } = useWorkerWallet();

  const urgency = job?.urgency || urgencyParam || 'scheduled';
  const isInstant = urgency === 'instant';
  const isCounterProposal = !isInstant || responseMode === 'counter';
  const signalMeta = job?.signalMeta;
  const detailMeta = job?.detailMeta;
  const client = job?.clientMeta || (typeof job?.customer === 'object'
    ? { ...job.customer, totalJobs: 0, completedJobs: 0 }
    : undefined);

  const media = useMemo(() => {
    const images = job?.media?.images
      || detailMeta?.media?.images
      || [job?.imageUrl, ...(job?.imageUrls || [])].filter((url): url is string => Boolean(url));
    const videos = job?.media?.videos
      || detailMeta?.media?.videos
      || [job?.videoUrl, ...(job?.videoUrls || [])].filter((url): url is string => Boolean(url));
    const audios = job?.media?.audios
      || detailMeta?.media?.audios
      || job?.audioUrls
      || [];

    return {
      images,
      videos,
      audios,
      totalCount: images.length + videos.length + audios.length,
    };
  }, [detailMeta?.media?.audios, detailMeta?.media?.images, detailMeta?.media?.videos, job?.audioUrls, job?.imageUrl, job?.imageUrls, job?.media?.audios, job?.media?.images, job?.media?.videos, job?.videoUrl, job?.videoUrls]);

  const budget = Number(signalMeta?.clientBudget || detailMeta?.financial?.amount || job?.amount || 0);
  const instantOffer = Number(signalMeta?.amount || budget || 0);
  const parsedPrice = Number(proposedPrice || 0);
  const commissionPercentage = wallet?.commissionEnabled === false
    ? 0
    : Number(wallet?.platformFeePercentage ?? 10);
  const commissionBase = isCounterProposal ? parsedPrice : instantOffer;
  const estimatedCommission = Math.round(commissionBase * (commissionPercentage / 100) * 100) / 100;
  const estimatedNetEarning = Math.max(0, commissionBase - estimatedCommission);
  const minimumWalletBalance = Number(wallet?.requiredBalance ?? signalMeta?.requiredWalletBalance ?? 500);
  const requiredWalletBalance = Math.max(minimumWalletBalance, estimatedCommission);
  const walletBalance = Number(wallet?.availableBalance ?? wallet?.balance ?? signalMeta?.walletBalance ?? 0);
  const isWalletBlocked = !!wallet && walletBalance < requiredWalletBalance;
  const walletShortfall = Math.max(0, requiredWalletBalance - walletBalance);

  const scheduledDate = detailMeta?.schedule?.fullDateLabel
    || (job?.scheduledDate
      ? new Date(job.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      : 'Date pending');
  const scheduledTime = detailMeta?.schedule?.timeLabel || job?.scheduledTime || (isInstant ? 'ASAP' : 'Time pending');
  const jobAddress = job?.address || detailMeta?.location?.address || signalMeta?.location?.address || 'Location not specified';
  const distanceText = signalMeta?.distanceText || 'Nearby';
  const clientTotalJobs = Number(client?.totalJobs || 0);
  const clientCompletedJobs = Number(client?.completedJobs || 0);
  const completionRate = clientTotalJobs > 0 ? Math.round((clientCompletedJobs / clientTotalJobs) * 100) : 0;
  const proposalReady = parsedPrice > 0 && message.trim().length > 0;

  useEffect(() => {
    if (isCounterProposal && !proposedPrice && budget > 0) {
      setProposedPrice(String(budget));
    }
  }, [budget, isCounterProposal, proposedPrice]);

  useEffect(() => {
    if (isInstant && isCounterProposal && !message) {
      setMessage(t('incomingJobModal.counterOffer', 'Counter Offer'));
    }
  }, [isInstant, isCounterProposal, message, t]);

  const quoteSuggestions = useMemo(() => {
    const values = budget > 0
      ? [Math.round(budget * 0.9), budget, Math.round(budget * 1.1)]
      : [500, 1000, 1500];
    return Array.from(new Set(values.filter(value => value > 0)));
  }, [budget]);

  const handleWalletPress = () => {
    router.push('/(tabs)/wallet' as any);
  };

  const handleAcceptInstant = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/jobs/${jobId}/accept-instant`);
      toast.success(t('bidSubmission.interestSent', 'Interest Sent'), t('bidSubmission.interestSentDesc', 'The client can now review your availability.'));
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      if (error.response?.status === 402) {
        const required = Number(error.response?.data?.requiredBalance || requiredWalletBalance);
        toast.warning(t('bidSubmission.topUpRequired', 'Top-Up Required'), t('bidSubmission.keepRequiredBalance', 'Keep at least {{amount}} in your wallet to continue.', { amount: formatMoney(required) }));
        router.push('/(tabs)/wallet' as any);
      } else {
        toast.error(t('bidSubmission.couldNotContinue', 'Could Not Continue'), error.response?.data?.message || t('bidSubmission.tryAgain', 'Please try again.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBid = async () => {
    if (isWalletBlocked) {
      toast.warning(t('bidSubmission.topUpRequired', 'Top-Up Required'), t('bidSubmission.addShortfall', 'Add {{amount}} to keep the required wallet balance.', { amount: formatMoney(walletShortfall) }));
      router.push('/(tabs)/wallet' as any);
      return;
    }

    if (isInstant && !isCounterProposal) {
      await handleAcceptInstant();
      return;
    }

    if (parsedPrice <= 0) {
      toast.error(t('bidSubmission.addYourQuote', 'Add Your Quote'), t('bidSubmission.enterQuoteAmount', 'Enter the amount you want to charge for this work.'));
      return;
    }

    if (!message.trim()) {
      toast.error(t('bidSubmission.addShortMessage', 'Add A Short Message'), t('bidSubmission.tellClientHelp', 'Tell the client how you can help with this work.'));
      return;
    }

    if (estimatedDays && Number(estimatedDays) <= 0) {
      toast.error(t('bidSubmission.checkEstDays', 'Check Estimated Days'), t('bidSubmission.daysGreaterThanZero', 'Estimated days must be greater than zero.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/jobs/${jobId}/bids`, {
        message: message.trim(),
        proposedPrice: parsedPrice,
        ...(estimatedDays ? { estimatedDays: Number(estimatedDays) } : {}),
      });
      toast.success(t('bidSubmission.proposalSent', 'Proposal Sent'), t('bidSubmission.proposalSentDesc', 'The client can now review your offer.'));
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      if (error.response?.status === 402) {
        const required = Number(error.response?.data?.requiredBalance || requiredWalletBalance);
        toast.warning(t('bidSubmission.topUpRequired', 'Top-Up Required'), t('bidSubmission.keepRequiredBalance', 'Keep at least {{amount}} in your wallet to continue.', { amount: formatMoney(required) }));
        router.push('/(tabs)/wallet' as any);
      } else {
        toast.error(t('bidSubmission.couldNotSend', 'Could Not Send Proposal'), error.response?.data?.message || t('bidSubmission.tryAgain', 'Please try again.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingJob) {
    return (
      <BackgroundWrapper>
        <View style={styles.centeredFill}>
          <View style={styles.loadingIcon}>
            <BriefcaseBusiness size={25} color={CYAN} />
          </View>
          <Text style={styles.loadingTitle}>{t('bidSubmission.loadingRequest', 'Loading request')}</Text>
          <Text style={styles.loadingText}>{t('bidSubmission.preparingDetails', 'Preparing the job details...')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!job) {
    return (
      <BackgroundWrapper>
        <View style={styles.centeredFill}>
          <AlertCircle size={32} color={RED} />
          <Text style={styles.loadingTitle}>{t('bidSubmission.requestUnavailable', 'Request unavailable')}</Text>
          <Text style={styles.loadingText}>{t('bidSubmission.expiredAssigned', 'This request may have expired or already been assigned.')}</Text>
          <TouchableOpacity style={styles.returnButton} onPress={() => router.back()}>
            <Text style={styles.returnButtonText}>{t('bidSubmission.goBack', 'Go back')}</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        <View style={[
          styles.header, 
          { 
            paddingTop: insets.top + 8,
            backgroundColor: theme.isDark ? 'transparent' : theme.colors.background.screen,
            borderBottomColor: theme.isDark ? BORDER : theme.colors.border.subtle,
          }
        ]}>
          <BlurView intensity={70} tint={theme.isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity 
            style={[
              styles.backButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.colors.text.primary, 0.03),
                borderColor: theme.isDark ? 'rgba(255,255,255,0.13)' : theme.colors.border.subtle,
              }
            ]} 
            onPress={() => router.back()} 
            activeOpacity={0.75}
          >
            <ChevronLeft size={21} color={theme.colors.text.primary} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: theme.colors.text.muted }]}>{isInstant ? t('bidSubmission.instantRequest', 'INSTANT REQUEST') : t('bidSubmission.scheduledRequest', 'SCHEDULED REQUEST')}</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              {isInstant ? (isCounterProposal ? t('bidSubmission.proposeFairPrice', 'Propose Fair Price') : t('bidSubmission.confirmAvailability', 'Confirm Availability')) : t('bidSubmission.sendProposal', 'Send Proposal')}
            </Text>
          </View>
          <View style={[styles.headerBadge, { borderColor: `${isInstant ? CYAN : ORANGE}45`, backgroundColor: `${isInstant ? CYAN : ORANGE}12` }]}>
            {isInstant ? <Zap size={12} color={CYAN} /> : <CalendarDays size={12} color={ORANGE} />}
            <Text style={[styles.headerBadgeText, { color: isInstant ? CYAN : ORANGE }]}>
              {isInstant ? t('bidSubmission.live', 'LIVE') : t('bidSubmission.planned', 'PLANNED')}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeInUp.duration(450)}>
            <Surface accent={isInstant ? CYAN : ORANGE} style={styles.requestSurface}>
              <View style={styles.requestTopRow}>
                <View style={styles.requestTitleGroup}>
                  <Text style={[styles.requestEyebrow, { color: isInstant ? CYAN : ORANGE }]}>
                    {isInstant ? t('bidSubmission.availableNow', 'AVAILABLE NOW') : t('bidSubmission.upcomingVisit', 'UPCOMING VISIT')}
                  </Text>
                  <Text style={styles.requestCategory}>{job.category || title || t('bidSubmission.serviceRequest', 'Service request')}</Text>
                </View>
                <View style={styles.budgetBadge}>
                  <Banknote size={14} color={GREEN} />
                  <View>
                    <Text style={styles.budgetLabel}>{isInstant ? t('bidSubmission.offer', 'OFFER') : t('bidSubmission.clientBudget', 'CLIENT BUDGET')}</Text>
                    <Text style={styles.budgetValue}>{budget > 0 ? formatMoney(budget) : t('bidSubmission.openBudget', 'Open budget')}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.requestDescription}>
                {job.description || t('bidSubmission.clientRequestHelp', 'The client has requested professional help for this service.')}
              </Text>

              <View style={styles.factRow}>
                <RequestFact
                  icon={isInstant ? Navigation : CalendarDays}
                  label={isInstant ? t('bidSubmission.distanceLabel', 'DISTANCE') : t('findingWorker.visitDate', 'VISIT DATE')}
                  value={isInstant ? (distanceText === 'Nearby' ? t('common.nearby', 'Nearby') : distanceText) : scheduledDate}
                  color={isInstant ? CYAN : ORANGE}
                />
                <View style={styles.factDivider} />
                <RequestFact
                  icon={Clock3}
                  label={isInstant ? t('bidSubmission.response', 'RESPONSE') : t('findingWorker.visitTime', 'VISIT TIME')}
                  value={scheduledTime}
                  color={isInstant ? CYAN : ORANGE}
                />
              </View>

              <View style={styles.locationRow}>
                <MapPin size={15} color={CYAN} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {jobAddress === 'Location not specified' ? t('bidSubmission.locationNotSpecified', 'Location not specified') : jobAddress}
                </Text>
              </View>

              {media.totalCount > 0 && (
                <View style={styles.evidenceSection}>
                  <SectionTitle
                    icon={ImageIcon}
                    title={t('bidSubmission.workEvidence', 'Work evidence')}
                    detail={media.totalCount === 1 ? t('bidSubmission.filesCount', { count: 1 }) : t('bidSubmission.filesCountPlural', { count: media.totalCount })}
                    color={PURPLE}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.evidenceList}>
                    {media.images.map((imageUrl, index) => (
                      <ImageEvidenceTile key={`${imageUrl}-${index}`} url={imageUrl} index={index} />
                    ))}
                    {media.videos.map((videoUrl, index) => (
                      <VideoEvidenceTile key={`${videoUrl}-${index}`} url={videoUrl} index={index} />
                    ))}
                    {media.audios.map((audioUrl, index) => (
                      <AudioEvidenceTile key={`${audioUrl}-${index}`} url={audioUrl} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </Surface>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).duration(450)}>
            <Surface accent={GREEN} style={styles.clientSurface}>
              <SectionTitle icon={UserRound} title={t('bidSubmission.clientHistory', 'Client history')} color={GREEN} />
              <View style={styles.clientRow}>
                {client?.profileImage ? (
                  <Image source={{ uri: client.profileImage }} style={styles.clientAvatar} />
                ) : (
                  <View style={styles.clientAvatarFallback}>
                    <UserRound size={22} color={GREEN} />
                  </View>
                )}
                <View style={styles.clientCopy}>
                  <Text style={styles.clientName}>{client?.fullName || t('transactionDetails.client', 'Client')}</Text>
                  <View style={styles.clientStatusRow}>
                    <ShieldCheck size={12} color={GREEN} />
                    <Text style={styles.clientStatusText}>
                      {clientTotalJobs > 0 ? t('bidSubmission.completedJobsCount', { completed: clientCompletedJobs, total: clientTotalJobs }) : t('bidSubmission.newClientProfile', 'New client profile')}
                    </Text>
                  </View>
                </View>
                {clientTotalJobs > 0 && (
                  <View style={styles.reliabilityBadge}>
                    <Text style={styles.reliabilityValue}>{completionRate}%</Text>
                    <Text style={styles.reliabilityLabel}>{t('bidSubmission.history', 'HISTORY')}</Text>
                  </View>
                )}
              </View>
            </Surface>
          </Animated.View>

          {isInstant && !isCounterProposal ? (
            <Animated.View entering={FadeInUp.delay(140).duration(450)}>
              <Surface accent={CYAN} style={styles.instantSurface}>
                <SectionTitle icon={Zap} title={t('bidSubmission.readyToRespond', 'Ready to respond?')} color={CYAN} />
                <Text style={styles.instantText}>
                  {t('bidSubmission.availabilityDesc', 'Send your availability to the client. They will review your profile before the booking is confirmed.')}
                </Text>
                <View style={styles.settlementRow}>
                  <SettlementItem label={t('bidSubmission.offerValue', 'Offer value')} value={formatMoney(instantOffer)} />
                  <View style={styles.settlementDivider} />
                  <SettlementItem label={t('bidSubmission.feeLabel', { percentage: commissionPercentage })} value={`- ${formatMoney(estimatedCommission)}`} color={ORANGE} />
                  <View style={styles.settlementDivider} />
                  <SettlementItem label={t('bidSubmission.youReceive', 'You receive')} value={formatMoney(estimatedNetEarning)} color={GREEN} />
                </View>
              </Surface>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(140).duration(450)}>
              <Surface accent={CYAN} style={styles.proposalSurface}>
                <SectionTitle
                  icon={Send}
                  title={isInstant ? t('bidSubmission.yourFairPrice', 'Your fair price') : t('bidSubmission.yourPrice', 'Your price')}
                  detail={proposalReady ? t('bidSubmission.readyToSend', 'Ready to send') : t('bidSubmission.quoteRequired', 'Quote required')}
                  color={CYAN}
                />

                <Text style={styles.formLabel}>{t('bidSubmission.quickQuote', 'QUICK QUOTE')}</Text>
                <View style={styles.quoteSuggestionRow}>
                  {quoteSuggestions.map(suggestion => {
                    const isSelected = parsedPrice === suggestion;
                    return (
                      <TouchableOpacity
                        key={suggestion}
                        style={[styles.quoteSuggestion, isSelected && styles.quoteSuggestionSelected]}
                        onPress={() => setProposedPrice(String(suggestion))}
                        activeOpacity={0.78}
                      >
                        <Text style={[styles.quoteSuggestionText, isSelected && styles.quoteSuggestionTextSelected]}>
                          {formatMoney(suggestion)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.quoteInputGroup}>
                    <Text style={styles.formLabel}>{parsedPrice === budget ? t('bidSubmission.acceptClientOffer', 'ACCEPT CLIENT OFFER') : t('bidSubmission.yourCounterOffer', 'YOUR COUNTER OFFER')}</Text>
                    <View style={styles.inputShell}>
                      <Text style={styles.inputPrefix}>PKR</Text>
                      <TextInput
                        style={styles.input}
                        value={proposedPrice}
                        onChangeText={value => setProposedPrice(keepDigits(value))}
                        keyboardType="number-pad"
                        placeholder={t('bidSubmission.enterAmount', 'Enter amount')}
                        placeholderTextColor={TEXT_MUTED}
                      />
                    </View>
                  </View>
                  <View style={styles.daysInputGroup}>
                    <Text style={styles.formLabel}>{t('bidSubmission.estDays', 'EST. DAYS')}</Text>
                    <View style={styles.inputShell}>
                      <CalendarDays size={16} color={ORANGE} />
                      <TextInput
                        style={styles.input}
                        value={estimatedDays}
                        onChangeText={value => setEstimatedDays(keepDigits(value))}
                        keyboardType="number-pad"
                        placeholder={t('common.optional', 'Optional')}
                        placeholderTextColor={TEXT_MUTED}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.formLabel}>{t('bidSubmission.messageToClient', 'MESSAGE TO CLIENT')}</Text>
                <View style={[styles.inputShell, styles.messageShell]}>
                  <MessageSquare size={16} color={CYAN} style={styles.messageIcon} />
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={300}
                    placeholder={t('bidSubmission.messagePlaceholder', 'Briefly explain how you will handle this work.')}
                    placeholderTextColor={TEXT_MUTED}
                    textAlignVertical="top"
                  />
                  <Text style={styles.messageCount}>{message.length}/300</Text>
                </View>

                <View style={styles.settlementBlock}>
                  <View style={styles.settlementHeader}>
                    <Text style={styles.settlementTitle}>{t('bidSubmission.estSettlement', 'Estimated settlement')}</Text>
                    <Text style={styles.settlementHint}>{t('bidSubmission.cashCollected', 'Cash collected after completion')}</Text>
                  </View>
                  <View style={styles.settlementRow}>
                    <SettlementItem label={t('bidSubmission.yourQuote', 'Your quote')} value={formatMoney(parsedPrice)} />
                    <View style={styles.settlementDivider} />
                    <SettlementItem label={t('bidSubmission.feeLabel', { percentage: commissionPercentage })} value={`- ${formatMoney(estimatedCommission)}`} color={ORANGE} />
                    <View style={styles.settlementDivider} />
                    <SettlementItem label={t('bidSubmission.youReceive', 'You receive')} value={formatMoney(estimatedNetEarning)} color={GREEN} />
                  </View>
                </View>
              </Surface>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(200).duration(450)}>
            <View style={[styles.walletStrip, isWalletBlocked && styles.walletStripBlocked]}>
              <WalletCards size={17} color={isWalletBlocked ? RED : GREEN} />
              <View style={styles.walletStripCopy}>
                <Text style={styles.walletStripTitle}>
                  {isLoadingWallet
                    ? t('bidSubmission.checkingWallet', 'Checking wallet eligibility')
                    : isWalletBlocked
                      ? t('bidSubmission.topUpNeeded', { amount: formatMoney(walletShortfall) })
                      : t('bidSubmission.walletReady', 'Wallet ready')}
                </Text>
                <Text style={styles.walletStripText}>
                  {t('bidSubmission.balanceRequired', { balance: formatMoney(walletBalance), required: formatMoney(requiredWalletBalance) })}
                </Text>
              </View>
              {isWalletBlocked ? (
                <TouchableOpacity style={styles.topUpButton} onPress={handleWalletPress} activeOpacity={0.78}>
                  <Text style={styles.topUpButtonText}>{t('bidSubmission.topUp', 'Top up')}</Text>
                </TouchableOpacity>
              ) : (
                <CheckCircle2 size={18} color={GREEN} />
              )}
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View
          entering={FadeInDown.delay(240).duration(450)}
          style={[styles.actionDock, { paddingBottom: insets.bottom + 12 }]}
        >
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.actionDockBorder} />
          <TouchableOpacity
            style={[styles.submitButton, isWalletBlocked && styles.submitButtonDisabled]}
            onPress={handleSubmitBid}
            disabled={isSubmitting || isWalletBlocked}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={isInstant ? [CYAN, '#168CFF'] : [CYAN, '#168CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#001014" />
              ) : (
                <>
                  {isInstant && !isCounterProposal ? <Zap size={19} color="#001014" /> : <Send size={18} color="#001014" />}
                  <View style={styles.submitCopy}>
                    <Text style={styles.submitTitle}>
                      {isInstant ? (isCounterProposal ? t('bidSubmission.sendFairPrice', 'SEND FAIR PRICE') : t('bidSubmission.sendAvailability', 'SEND AVAILABILITY')) : t('bidSubmission.sendProposal', 'SEND PROPOSAL')}
                    </Text>
                    <Text style={styles.submitSubtitle}>
                      {isInstant && !isCounterProposal
                        ? t('bidSubmission.clientConfirmationRequired', 'Client confirmation required')
                        : proposalReady
                          ? t('bidSubmission.proposalSummary', { quote: formatMoney(parsedPrice), earning: formatMoney(estimatedNetEarning) })
                          : t('bidSubmission.quoteAndMessageRequired', 'Add your quote and a short message')}
                    </Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0,245,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 6,
  },
  loadingText: {
    color: TEXT_DIM,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '600',
  },
  returnButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.3)',
  },
  returnButtonText: {
    color: CYAN,
    fontSize: 13,
    fontWeight: '900',
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 3,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 152,
    gap: 12,
  },
  surface: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: SURFACE,
  },
  requestSurface: {
    padding: 16,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  requestTitleGroup: {
    flex: 1,
  },
  requestEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 5,
  },
  requestCategory: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.24)',
    backgroundColor: 'rgba(0,255,127,0.08)',
  },
  budgetLabel: {
    color: TEXT_MUTED,
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 2,
  },
  budgetValue: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  requestDescription: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  factRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  fact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factCopy: {
    flex: 1,
  },
  factLabel: {
    color: TEXT_MUTED,
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 3,
  },
  factValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  factDivider: {
    width: 1,
    marginHorizontal: 10,
    backgroundColor: BORDER,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
  },
  locationText: {
    flex: 1,
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  evidenceSection: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  sectionTitleRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionDetail: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '800',
  },
  evidenceList: {
    gap: 9,
  },
  evidenceTile: {
    width: 112,
    height: 82,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.32)',
    backgroundColor: 'rgba(191,90,242,0.1)',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  evidenceIndex: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  evidenceIndexText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  evidenceExpand: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  videoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoTileText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: '900',
  },
  audioTile: {
    width: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderColor: 'rgba(255,149,0,0.34)',
    backgroundColor: 'rgba(255,149,0,0.1)',
  },
  audioTileText: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: '900',
  },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 70,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  previewClose: {
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
  clientSurface: {
    padding: 14,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.35)',
  },
  clientAvatarFallback: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.28)',
    backgroundColor: 'rgba(0,255,127,0.09)',
  },
  clientCopy: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 5,
  },
  clientStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clientStatusText: {
    color: TEXT_DIM,
    fontSize: 11,
    fontWeight: '700',
  },
  reliabilityBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.22)',
    backgroundColor: 'rgba(0,255,127,0.07)',
  },
  reliabilityValue: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
  },
  reliabilityLabel: {
    color: TEXT_MUTED,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
  },
  proposalSurface: {
    padding: 14,
  },
  instantSurface: {
    padding: 14,
  },
  instantText: {
    color: TEXT_DIM,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 14,
  },
  formLabel: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 7,
  },
  quoteSuggestionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quoteSuggestion: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  quoteSuggestionSelected: {
    borderColor: 'rgba(0,245,255,0.42)',
    backgroundColor: 'rgba(0,245,255,0.12)',
  },
  quoteSuggestionText: {
    color: TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
  },
  quoteSuggestionTextSelected: {
    color: CYAN,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 13,
  },
  quoteInputGroup: {
    flex: 1.35,
  },
  daysInputGroup: {
    flex: 1,
  },
  inputShell: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputPrefix: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  messageShell: {
    minHeight: 104,
    alignItems: 'flex-start',
    paddingTop: 11,
    paddingBottom: 21,
  },
  messageIcon: {
    marginTop: 1,
  },
  messageInput: {
    minHeight: 80,
    lineHeight: 19,
  },
  messageCount: {
    position: 'absolute',
    right: 9,
    bottom: 7,
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: '800',
  },
  settlementBlock: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  settlementTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  settlementHint: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 9,
    textAlign: 'right',
    fontWeight: '700',
  },
  settlementRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  settlementItem: {
    flex: 1,
  },
  settlementDivider: {
    width: 1,
    marginHorizontal: 8,
    backgroundColor: BORDER,
  },
  settlementLabel: {
    color: TEXT_MUTED,
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 5,
  },
  settlementValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  walletStrip: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.22)',
    backgroundColor: 'rgba(0,255,127,0.07)',
  },
  walletStripBlocked: {
    borderColor: 'rgba(255,69,58,0.24)',
    backgroundColor: 'rgba(255,69,58,0.07)',
  },
  walletStripCopy: {
    flex: 1,
  },
  walletStripTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  walletStripText: {
    color: TEXT_DIM,
    fontSize: 10,
    fontWeight: '700',
  },
  topUpButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: RED,
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  actionDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    overflow: 'hidden',
  },
  actionDockBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: BORDER,
  },
  submitButton: {
    minHeight: 62,
    overflow: 'hidden',
    borderRadius: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  submitCopy: {
    flex: 1,
  },
  submitTitle: {
    color: '#001014',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  submitSubtitle: {
    color: 'rgba(0,16,20,0.68)',
    fontSize: 10,
    fontWeight: '800',
  },
});
