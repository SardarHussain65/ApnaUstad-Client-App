import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
  Volume2,
  XCircle,
  Zap,
  Scale,
} from 'lucide-react-native';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { RaiseDisputeModal } from '../components/disputes/RaiseDisputeModal';
import { Typography, useTheme, useThemeColors, alpha } from '../constants/Theme';
import { useBookingDetails, useUpdateBookingStatusMutation, usePayBookingMutation, useCreateReviewMutation } from '../hooks';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import { AlertModal } from '../components/ui/BeautifulModal';
import { JobEvidenceGallery, buildJobEvidenceItems } from '../components/common/JobEvidenceGallery';

const P = {
  surface: 'rgba(9, 12, 32, 0.82)',
  surfaceStrong: 'rgba(12, 16, 42, 0.94)',
  border: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(0,245,255,0.24)',
  cyan: '#00F5FF',
  cyanMuted: 'rgba(0,245,255,0.1)',
  green: '#00FF7F',
  greenMuted: 'rgba(0,255,127,0.1)',
  orange: '#FF8C00',
  orangeMuted: 'rgba(255,140,0,0.12)',
  red: '#FF3B30',
  redMuted: 'rgba(255,59,48,0.12)',
  gold: '#FFD700',
  text: '#FFFFFF',
  textMuted: '#9BA3B4',
  textDim: '#646B7E',
};

const STATUS_MAP: Record<string, { color: string; muted: string; label: string; title: string; Icon: React.ComponentType<any> }> = {
  pending: { color: P.orange, muted: P.orangeMuted, label: 'Pending', title: 'Request sent', Icon: Clock3 },
  accepted: { color: P.cyan, muted: P.cyanMuted, label: 'Assigned', title: 'Ustad assigned', Icon: ShieldCheck },
  ongoing: { color: P.cyan, muted: P.cyanMuted, label: 'Ongoing', title: 'Work in progress', Icon: Navigation },
  completed: { color: P.green, muted: P.greenMuted, label: 'Completed', title: 'Job completed', Icon: CheckCircle2 },
  cancelled: { color: P.red, muted: P.redMuted, label: 'Cancelled', title: 'Job cancelled', Icon: XCircle },
};

const STEPS = [
  { value: 'pending', label: 'Posted' },
  { value: 'accepted', label: 'Assigned' },
  { value: 'ongoing', label: 'Started' },
  { value: 'completed', label: 'Completed' },
] as const;

const formatCurrency = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString()}`;

const formatDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatSince = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'New member';
  return `Since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
};

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false
    );
  }, [scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 1.5 - scale.value,
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseOuter, { backgroundColor: color }, pulseStyle]} />
      <View style={[styles.pulseInner, { backgroundColor: color }]} />
    </View>
  );
}

function SectionHeader({ icon: Icon, title, color = P.cyan }: { icon: React.ComponentType<any>; title: string; color?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
        <Icon size={14} color={color} strokeWidth={2.4} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: `${color}24` }]} />
    </View>
  );
}

function InfoTile({ icon: Icon, label, value, color = P.cyan }: { icon: React.ComponentType<any>; label: string; value: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.infoTile, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}14` }]}>
        <Icon size={15} color={color} strokeWidth={2.4} />
      </View>
      <Text style={[styles.infoLabel, { color: theme.colors.text.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text.primary }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function PartnerInsight({ icon: Icon, label, value, color = P.cyan }: { icon: React.ComponentType<any>; label: string; value: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.partnerInsight, { borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : theme.colors.border.subtle, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.045)' : theme.colors.surface.card }]}>
      <Icon size={14} color={color} strokeWidth={2.4} />
      <Text style={[styles.partnerInsightValue, { color: theme.colors.text.primary }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.partnerInsightLabel, { color: theme.colors.text.muted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function FloatingAction({
  icon: Icon,
  label,
  onPress,
  color = P.cyan,
  primary,
  disabled,
}: {
  icon: React.ComponentType<any>;
  label: string;
  onPress: () => void;
  color?: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  // Determine gradient colors based on button role
  let gradientColors: readonly [string, string] = ['#00F5FF', '#0066FF']; // default cyan for CHAT
  let shadowColor = '#00F5FF';

  if (primary) {
    gradientColors = ['#FF2A6D', '#FF5E62']; // high attention sunset coral gradient for CALL
    shadowColor = '#FF2A6D';
  } else if (color === P.green) {
    gradientColors = ['#00FF7F', '#00A85A']; // neon green for TRACK
    shadowColor = '#00FF7F';
  }

  const activeIconColor = '#001014'; // high contrast dark navy icon on vibrant solid backgrounds

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.floatingAction,
        !disabled && {
          shadowColor,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        },
        disabled && styles.floatingActionDisabled,
      ]}
    >
      {!disabled ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
      )}
      <Icon size={22} color={disabled ? P.textDim : activeIconColor} strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

export default function TransactionDetailsScreen() {
  const theme = useTheme();
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { id, amount: initialAmount, autoAssigned } = useLocalSearchParams<{ id: string; amount?: string; autoAssigned?: string }>();
  const { role, user } = useAuth();
  const isWorker = role === 'worker';

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showAutoAssignedModal, setShowAutoAssignedModal] = useState(autoAssigned === 'true');
  const bypassBeforeRemoveRef = useRef(false);

  useEffect(() => {
    if (autoAssigned === 'true') {
      router.setParams({ autoAssigned: undefined } as any);
    }
  }, [autoAssigned]);

  const { mutate: createReview, isPending: isCreatingReview } = useCreateReviewMutation();
  const galleryCardWidth = windowWidth - 72;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassBeforeRemoveRef.current) {
        return;
      }
      e.preventDefault();
      bypassBeforeRemoveRef.current = true;
      router.replace('/(tabs)' as any);
    });

    return unsubscribe;
  }, [navigation, router]);

  const { data: booking, isLoading, refetch } = useBookingDetails(id);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateBookingStatusMutation();
  const { mutate: payBooking, isPending: isPaying } = usePayBookingMutation();

  useEffect(() => {
    const unsub = socketService.on('booking:status', () => refetch());
    return () => unsub();
  }, [refetch]);

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.loading}>
          <ActivityIndicator color={P.cyan} size="large" />
          <Text style={styles.loadingText}>{t('transactionDetails.loadingDetails', 'Loading booking details')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!booking) {
    return (
      <BackgroundWrapper>
        <View style={styles.loading}>
          <Text style={styles.emptyTitle}>{t('transactionDetails.bookingNotFound', 'Booking not found')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>{t('transactionDetails.goBack', 'Go back')}</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  const meta = booking.cardMeta;
  const status = booking.status || 'accepted';
  const disputeMeta = booking.disputeMeta;
  const hasActiveDispute = Boolean(
    disputeMeta?.hasDispute && ['open', 'under_review'].includes(disputeMeta.disputeStatus || '')
  );
  const canRaiseDispute = disputeMeta?.canRaiseDispute === true;
  const jobAmount = Number(disputeMeta?.bookingAmount ?? meta?.financial?.amount ?? booking.totalAmount ?? 0);
  const isJobEnded = status === 'completed' || status === 'cancelled';
  /** Rare edge case — small corner control only while job is still active */
  const showDisputeReportCorner = canRaiseDispute && !isJobEnded;
  const showDisputeStatusCorner = hasActiveDispute;
  const isCommunicationLocked = status === 'completed' || status === 'cancelled';
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.accepted;
  const StatusIcon = statusInfo.Icon;
  const statusLabel = t(`bookingStatus.${status}.label`, statusInfo.label);
  const statusTitle = t(`bookingStatus.${status}.title`, statusInfo.title);
  const partner = isWorker ? booking.customer : booking.worker;
  const customerId = typeof booking.customer === 'object' ? booking.customer._id : booking.customer;
  const workerId = typeof booking.worker === 'object' ? booking.worker._id : booking.worker;
  const partnerName = meta?.counterParty?.fullName || partner?.fullName || t('transactionDetails.servicePartner', 'Service partner');
  const partnerRole = isWorker ? t('transactionDetails.client', 'Client') : t('transactionDetails.assignedUstad', 'Assigned Ustad');
  const partnerImage = meta?.counterParty?.profileImage || partner?.profileImage || '';
  const partnerProfileId = isWorker ? customerId : workerId;
  const partnerPhone = isCommunicationLocked ? '' : meta?.counterParty?.phone || partner?.phone || '';
  const partnerCategory = meta?.counterParty?.category || partner?.category || (isWorker ? t('transactionDetails.activeClient', 'Service client') : t('findingWorker.ustadSpecialist', 'Ustad specialist'));
  const partnerCity = meta?.counterParty?.city || partner?.city || '';
  const partnerAddress = meta?.counterParty?.address || partner?.address || partnerCity || '';
  const partnerRating = Number(meta?.counterParty?.rating ?? partner?.rating ?? 0);
  const partnerReviews = Number(meta?.counterParty?.totalReviews ?? partner?.totalReviews ?? 0);
  const partnerJobs = Number(meta?.counterParty?.totalJobs ?? partner?.totalJobs ?? 0);
  const partnerHourlyRate = Number(meta?.counterParty?.hourlyRate ?? partner?.hourlyRate ?? booking.hourlyRate ?? 0);
  const partnerExperience = Number(meta?.counterParty?.experience ?? partner?.experience ?? 0);
  const partnerJoinedAt = meta?.counterParty?.joinedAt || partner?.createdAt;

  const formatSince = (value?: string) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return t('transactionDetails.newMember', 'New member');
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return t('transactionDetails.memberSince', `Since ${dateStr}`, { date: dateStr });
  };

  const partnerStatusText = isWorker
    ? (meta?.counterParty?.isActive === false || partner?.isActive === false 
        ? t('transactionDetails.inactiveAccount', 'Inactive account') 
        : t('transactionDetails.activeClient', 'Active client'))
    : (meta?.counterParty?.isVerified || partner?.isVerified 
        ? t('transactionDetails.verifiedUstad', 'Verified Ustad') 
        : t('transactionDetails.verificationPending', 'Verification pending'));
  const partnerSubtitle = isWorker
    ? (partnerAddress || partnerPhone || t('transactionDetails.clientProfileAvailable', 'Client profile available'))
    : `${partnerCategory}${partnerExperience > 0 ? ` • ${t('transactionDetails.yearsExp', '{{count}}y exp', { count: partnerExperience })}` : ''}`;
  const canTrackMission = Boolean(customerId && workerId);
  const amountValue = Number(meta?.financial?.amount ?? (isWorker ? booking.workerEarning : booking.totalAmount) ?? initialAmount ?? 0);
  const amountText = meta?.financial?.amountText || formatCurrency(amountValue);
  const amountLabel = isWorker ? t('transactionDetails.yourEarning', 'Your Earning') : t('transactionDetails.bookingValue', 'Booking Value');
  const serviceTitle = meta?.title || booking.category || t('transactionDetails.jobDetails', 'Service Booking');
  const serviceDescription = meta?.description || booking.description || t('transactionDetails.serviceDescription', 'Service request details');
  
  const rawDateLabel = meta?.schedule?.dateLabel || formatDate(booking.scheduledDate);
  const dateLabel = rawDateLabel === 'Today' ? t('transactionDetails.today', 'Today') : rawDateLabel;

  const rawTimeLabel = meta?.schedule?.timeLabel || booking.scheduledTime || 'ASAP';
  const timeLabel = rawTimeLabel === 'ASAP' ? t('transactionDetails.asap', 'ASAP') : rawTimeLabel;

  const addressLabel = meta?.location?.address || booking.address || t('transactionDetails.serviceLocation', 'Service location');
  const workerLocation = (isWorker
    ? (booking.worker?.address || (user as any)?.address || booking.worker?.city || (user as any)?.city)
    : (booking.worker?.address || booking.worker?.city || meta?.counterParty?.address || '')
  ) || '';
  const missionKindLabel = meta?.missionKindLabel || (booking.bookingType === 'instant' ? t('transactionDetails.instantVisit', 'Instant visit') : t('transactionDetails.scheduledVisit', 'Scheduled visit'));
  const paymentStatusLabel = booking.paymentStatus === 'paid' ? t('transactionDetails.paid', 'Paid') : t('transactionDetails.cashPending', 'Cash pending');
  const stepIndex = STEPS.findIndex(step => step.value === status);
  const visibleStepIndex = stepIndex < 0 ? 0 : stepIndex;
  const latitude = typeof booking.location === 'object' && booking.location.coordinates ? booking.location.coordinates[1] : 0;
  const longitude = typeof booking.location === 'object' && booking.location.coordinates ? booking.location.coordinates[0] : 0;
  const photosAndVideos = buildJobEvidenceItems({
    images: booking.imageUrls || [],
    videos: booking.videoUrls || [],
  });

  const voiceBriefs = buildJobEvidenceItems({
    audios: booking.audioUrls || [],
  });

  const navigateToChat = () => {
    if (!partnerProfileId || isCommunicationLocked) return;
    router.push({
      pathname: '/chat',
      params: { bookingId: id, recipientName: partnerName, recipientId: partnerProfileId },
    });
  };

  const openRoute = () => {
    router.push({
      pathname: '/job-tracking',
      params: {
        bookingId: id,
        customerId,
        workerId,
        latitude,
        longitude,
      },
    });
  };

  const shareMission = () => {
    Share.share({
      message: `${serviceTitle} booking - ${statusInfo.label} - ${amountText}`,
    });
  };

  const callPartner = () => {
    if (!isCommunicationLocked && partnerPhone) Linking.openURL(`tel:${partnerPhone}`);
  };

  const openPartnerProfile = () => {
    if (!partnerProfileId) return;
    router.push({
      pathname: (isWorker ? '/client-details' : '/worker-details') as any,
      params: { id: partnerProfileId, bookingId: id },
    });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[
          styles.header, 
          { 
            paddingTop: insets.top + 8,
            backgroundColor: theme.isDark ? 'rgba(5,5,16,0.74)' : theme.colors.background.screen,
            borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
          }
        ]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(theme.colors.text.primary, 0.03),
                borderColor: theme.isDark ? P.border : theme.colors.border.subtle,
              }
            ]} 
            activeOpacity={0.8}
          >
            <ChevronLeft color={theme.colors.text.primary} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerEyebrow, { color: theme.colors.text.muted }]}>{t('transactionDetails.bookingDetails', 'Booking Details')}</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('transactionDetails.overview', 'Overview')}</Text>
          </View>
          {showDisputeStatusCorner ? (
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  disputeMeta?.statusLabel || t('disputes.statusUnderReview', 'Under review'),
                  disputeMeta?.nextStep || t('disputes.activeNotice', 'Cash payment is on hold until ApnaUstad completes review.'),
                );
              }} 
              style={[
                styles.headerButton,
                {
                  backgroundColor: 'rgba(255,59,48,0.12)',
                  borderColor: 'rgba(255,59,48,0.3)',
                }
              ]} 
              activeOpacity={0.8}
            >
              <Scale color="#FF3B30" size={19} strokeWidth={2.3} />
            </TouchableOpacity>
          ) : showDisputeReportCorner ? (
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDisputeModal(true);
              }} 
              style={[
                styles.headerButton,
                {
                  backgroundColor: 'rgba(255,107,53,0.12)',
                  borderColor: 'rgba(255,107,53,0.35)',
                }
              ]} 
              activeOpacity={0.8}
            >
              <Scale color="#FF6B35" size={19} strokeWidth={2.3} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButtonPlaceholder} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (status === 'completed' || status === 'cancelled' ? 24 : 40) }]}>
          <Animated.View 
            entering={FadeInDown.duration(450)} 
            style={[
              styles.heroCard, 
              { 
                borderColor: theme.isDark ? P.borderStrong : theme.colors.border.subtle,
                backgroundColor: theme.isDark ? P.surfaceStrong : theme.colors.surface.card
              }
            ]}
          >
            <LinearGradient
              colors={theme.isDark 
                ? [`${statusInfo.color}26`, 'rgba(10,13,34,0.96)', 'rgba(0,245,255,0.08)']
                : [`${statusInfo.color}14`, theme.colors.surface.card, theme.colors.surface.subtle]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroTop}>
              <View style={[styles.statusPill, { backgroundColor: statusInfo.muted, borderColor: `${statusInfo.color}50` }]}>
                <PulseDot color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusLabel}</Text>
              </View>
              <View style={[styles.kindPill, { 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.surface.subtle,
                borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : theme.colors.border.subtle
              }]}>
                <Zap size={12} color={booking.bookingType === 'instant' ? P.orange : P.cyan} />
                <Text style={[styles.kindText, { color: theme.colors.text.secondary }]}>{missionKindLabel}</Text>
              </View>
            </View>

            <View style={styles.heroTitleRow}>
              <View style={[styles.heroStatusIcon, { backgroundColor: statusInfo.muted, borderColor: `${statusInfo.color}38` }]}>
                <StatusIcon size={22} color={statusInfo.color} strokeWidth={2.5} />
              </View>
              <View style={styles.heroTitleCopy}>
                <Text style={[styles.heroStage, { color: theme.colors.text.muted }]}>{statusTitle}</Text>
                <Text style={[styles.heroTitle, Typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>{serviceTitle}</Text>
                <Text style={[styles.heroDescription, { color: theme.colors.text.secondary }]} numberOfLines={2}>{serviceDescription}</Text>
              </View>
            </View>

            <View style={[styles.valuePanel, {
              borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.18)' : theme.colors.surface.subtle,
            }]}>
              <View>
                <Text style={[styles.valueLabel, { color: theme.colors.text.muted }]}>{amountLabel}</Text>
                <Text style={[styles.valueText, { color: theme.colors.text.primary }]}>{amountText}</Text>
              </View>
              <View style={[styles.paymentBadge, {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.surface.card,
                borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : theme.colors.border.subtle,
              }]}>
                <CreditCard size={14} color={booking.paymentStatus === 'paid' ? P.green : P.gold} />
                <Text style={[styles.paymentBadgeText, { color: theme.colors.text.secondary }]}>{paymentStatusLabel}</Text>
              </View>
            </View>

            {status !== 'cancelled' && (
              <View style={styles.timeline}>
                {STEPS.map((step, index) => {
                  const active = index <= visibleStepIndex;
                  const current = index === visibleStepIndex;
                  const stepColor = active ? (theme.isDark ? P.cyan : theme.colors.brand.primary) : theme.colors.text.dim;
                  return (
                    <React.Fragment key={step.value}>
                      <View style={styles.timelineStep}>
                        <View style={[
                          styles.timelineNode,
                          { borderColor: theme.colors.text.dim },
                          active && { borderColor: stepColor, backgroundColor: current ? 'transparent' : stepColor },
                        ]}>
                          {current ? <View style={[styles.timelineDot, { backgroundColor: stepColor }]} /> : active ? <CheckCircle2 size={10} color={theme.isDark ? '#001014' : '#ffffff'} strokeWidth={3} /> : null}
                        </View>
                        <Text style={[styles.timelineText, { color: theme.colors.text.dim }, active && { color: stepColor }]}>
                          {t('transactionDetails.step' + step.label, step.label)}
                        </Text>
                      </View>
                      {index < STEPS.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : theme.colors.border.subtle }, index < visibleStepIndex && { backgroundColor: stepColor }]} />}
                    </React.Fragment>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.quickGrid}>
            <InfoTile icon={CalendarDays} label={t('transactionDetails.date', 'Date')} value={dateLabel} />
            <InfoTile icon={Clock3} label={t('transactionDetails.time', 'Time')} value={timeLabel} color={P.orange} />
            <InfoTile icon={MapPin} label={t('transactionDetails.serviceLoc', 'Service Loc')} value={addressLabel} color={P.green} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(450)} style={styles.section}>
            <SectionHeader icon={UserRound} title={partnerRole} />
            <TouchableOpacity 
              activeOpacity={0.88} 
              onPress={openPartnerProfile} 
              disabled={!partnerProfileId} 
              style={[
                styles.partnerCard,
                {
                  borderColor: theme.isDark ? P.borderStrong : theme.colors.border.subtle,
                  backgroundColor: theme.isDark ? P.surfaceStrong : theme.colors.surface.card
                }
              ]}
            >
              <LinearGradient
                colors={theme.isDark 
                  ? ['rgba(0,245,255,0.13)', 'rgba(10,13,34,0.94)', 'rgba(0,255,127,0.08)']
                  : ['rgba(0,245,255,0.08)', theme.colors.surface.card, 'rgba(0,255,127,0.04)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.partnerTopRow}>
                <View style={[styles.avatarShell, { borderColor: theme.isDark ? P.borderStrong : theme.colors.border.subtle, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.colors.surface.subtle }]}>
                  {partnerImage ? (
                    <Image source={{ uri: partnerImage }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient colors={[P.cyanMuted, 'rgba(191,90,242,0.18)']} style={styles.avatarFallback}>
                      <Text style={[styles.avatarText, { color: theme.colors.brand.primary }]}>{initialsFor(partnerName)}</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.partnerCopy}>
                  <Text style={[styles.partnerRoleText, { color: theme.colors.text.muted }]}>{partnerRole}</Text>
                  <Text style={[styles.partnerName, Typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>{partnerName}</Text>
                  <Text style={[styles.partnerSubText, { color: theme.colors.text.secondary }]} numberOfLines={1}>{partnerSubtitle}</Text>
                </View>
                <View style={[styles.partnerCue, { backgroundColor: theme.isDark ? P.cyanMuted : alpha(theme.colors.brand.primary, 0.08), borderColor: theme.isDark ? P.borderStrong : theme.colors.border.subtle }]}>
                  <ChevronRight size={18} color={theme.colors.brand.primary} strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.partnerInsightRow}>
                {isWorker ? (
                  <>
                    <PartnerInsight icon={Phone} label={t('transactionDetails.contact', 'Contact')} value={isCommunicationLocked ? t('transactionDetails.closedAfterCompletion', 'Closed after job completion') : partnerPhone || t('chat.inApp', 'In app')} color={theme.colors.brand.primary} />
                    <PartnerInsight icon={MapPin} label={t('transactionDetails.area', 'Area')} value={partnerCity || partnerAddress || t('common.notShared', 'Not shared')} color={P.green} />
                    <PartnerInsight icon={CalendarDays} label={t('transactionDetails.member', 'Member')} value={formatSince(partnerJoinedAt)} color={P.orange} />
                  </>
                ) : (
                  <>
                    <PartnerInsight icon={Banknote} label={t('transactionDetails.rate', 'Rate')} value={formatCurrency(partnerHourlyRate)} color={theme.colors.brand.primary} />
                  </>
                )}
              </View>

              <View style={[styles.partnerProfileRow, { borderColor: theme.isDark ? 'rgba(0,245,255,0.16)' : theme.colors.border.subtle, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.18)' : theme.colors.surface.subtle }]}>
                <View style={[styles.partnerStatusDot, { backgroundColor: isWorker ? P.green : (partnerStatusText.includes('Verified') ? P.green : P.orange) }]} />
                <Text style={[styles.partnerStatusText, { color: theme.colors.text.secondary }]} numberOfLines={1}>{partnerStatusText}</Text>
                <View style={styles.partnerProfileLink}>
                  <Eye size={13} color={theme.colors.brand.primary} strokeWidth={2.4} />
                  <Text style={[styles.partnerProfileText, { color: theme.colors.brand.primary }]}>
                    {isWorker ? t('transactionDetails.viewClientProfile', 'View client profile') : t('transactionDetails.viewUstadProfile', 'View Ustad profile')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Unified Collapsible Job Details Card */}
          {(voiceBriefs.length > 0 || photosAndVideos.length > 0 || !!booking.description || !!booking.category) && (
            <Animated.View entering={FadeInDown.delay(260).duration(450)} style={styles.section}>
              <SectionHeader icon={BriefcaseBusiness} title={t('transactionDetails.jobDetails', 'Job Details')} />
              
              <View style={[styles.unifiedJobCard, { borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle }]}>
                <LinearGradient
                  colors={theme.isDark 
                    ? ['rgba(9, 12, 32, 0.94)', 'rgba(12, 16, 42, 0.98)']
                    : [theme.colors.surface.card, theme.colors.surface.card]}
                  style={StyleSheet.absoluteFillObject}
                />
                
                {/* Primary Info: Written Description (Always visible, max 3 lines when collapsed) */}
                {!!booking.description && (
                  <View style={styles.primaryDescBlock}>
                    <Text style={[styles.primaryDescLabel, { color: theme.colors.text.muted }]}>{t('transactionDetails.descriptionLabel', 'DESCRIPTION')}</Text>
                    <Text 
                      style={[styles.primaryDescText, { color: theme.colors.text.primary }]} 
                      numberOfLines={isDetailsExpanded ? undefined : 3}
                    >
                      {booking.description}
                    </Text>
                  </View>
                )}

                {/* Primary Specifications: Category & Duration Badges */}
                <View style={styles.primaryBadgesRow}>
                  <View style={[styles.primaryBadge, { borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.25)' : theme.colors.border.subtle, backgroundColor: theme.isDark ? 'rgba(0, 245, 255, 0.06)' : theme.colors.surface.subtle }]}>
                    <BriefcaseBusiness size={11} color={theme.colors.brand.primary} />
                    <Text style={[styles.primaryBadgeText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                      {booking.category || serviceTitle}
                    </Text>
                  </View>
                  <View style={[styles.primaryBadge, { borderColor: theme.isDark ? 'rgba(255, 140, 0, 0.25)' : theme.colors.border.subtle, backgroundColor: theme.isDark ? 'rgba(255, 140, 0, 0.06)' : theme.colors.surface.subtle }]}>
                    <Clock3 size={11} color={P.orange} />
                    <Text style={[styles.primaryBadgeText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                      {booking.estimatedHours === 1 
                        ? t('transactionDetails.durationHours', { count: 1 }) 
                        : t('transactionDetails.durationHoursPlural', { count: booking.estimatedHours || 1 })}
                    </Text>
                  </View>
                </View>

                {/* Collapsed Preview Item Indicators (Photo pile, Voice, Specs) */}
                {!isDetailsExpanded && (
                  <View style={styles.collapsedPreviewContainer}>
                    {/* Photos/Videos stack preview */}
                    {photosAndVideos.length > 0 && (
                      <View style={styles.previewItem}>
                        <View style={styles.thumbnailPile}>
                          {photosAndVideos.slice(0, 3).map((item, idx) => (
                            <Image 
                              key={idx}
                              source={{ uri: item.url }} 
                              style={[
                                styles.previewThumbnail, 
                                { marginLeft: idx > 0 ? -12 : 0, zIndex: 3 - idx }
                              ]} 
                            />
                          ))}
                        </View>
                        <Text style={[styles.previewItemText, { color: theme.colors.text.secondary }]}>
                          {photosAndVideos.length === 1 
                            ? t('transactionDetails.filesCount', { count: 1 }) 
                            : t('transactionDetails.filesCountPlural', { count: photosAndVideos.length })}
                        </Text>
                      </View>
                    )}

                    {/* Voice Brief indicator preview */}
                    {voiceBriefs.length > 0 && (
                      <View style={styles.previewItem}>
                        <View style={[styles.voicePreviewIcon, { backgroundColor: theme.isDark ? P.orangeMuted : alpha(P.orange, 0.08) }]}>
                          <Volume2 size={10} color={P.orange} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.previewItemText, { color: P.orange }]}>
                          {t('transactionDetails.voiceBrief', 'Voice Brief')}
                        </Text>
                      </View>
                    )}

                    {/* Spec Indicators preview */}
                    <View style={styles.previewItem}>
                      <View style={[styles.specsPreviewIcon, { backgroundColor: theme.isDark ? P.cyanMuted : alpha(theme.colors.brand.primary, 0.08) }]}>
                        <MapPin size={10} color={theme.colors.brand.primary} strokeWidth={2.5} />
                      </View>
                      <Text style={[styles.previewItemText, { color: theme.colors.brand.primary }]}>
                        {t('transactionDetails.locRates', 'Loc & Rates')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Collapsible Content */}
                {isDetailsExpanded && (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.expandedContentBlock}>
                    
                    {/* 1. Photos & Videos section (if any) */}
                    {photosAndVideos.length > 0 && (
                      <View style={styles.detailsSubSection}>
                        <Text style={[styles.detailsSubSectionTitle, { color: theme.colors.text.muted }]}>{t('transactionDetails.photosVideos', 'PHOTOS & VIDEOS')}</Text>
                        <JobEvidenceGallery items={photosAndVideos} isWorker={isWorker} cardWidth={galleryCardWidth} />
                      </View>
                    )}

                    {/* 2. Voice brief player (if any) */}
                    {voiceBriefs.length > 0 && (
                      <View style={styles.detailsSubSection}>
                        <Text style={[styles.detailsSubSectionTitle, { color: theme.colors.text.muted }]}>
                          {isWorker ? t('transactionDetails.clientVoiceBrief', "CLIENT'S VOICE BRIEF") : t('transactionDetails.yourVoiceBrief', "YOUR VOICE BRIEF")}
                        </Text>
                        <JobEvidenceGallery items={voiceBriefs} isWorker={isWorker} cardWidth={galleryCardWidth} />
                      </View>
                    )}

                    {/* 3. Fully detailed specifications (Location & Rates) */}
                    <View style={styles.detailsSubSection}>
                      <Text style={[styles.detailsSubSectionTitle, { color: theme.colors.text.muted }]}>{t('transactionDetails.additionalDetails', 'ADDITIONAL DETAILS')}</Text>
                      <View style={[styles.detailSpecsCard, { borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle, backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.12)' : theme.colors.surface.subtle }]}>
                        <InfoRow icon={MapPin} label={t('transactionDetails.serviceLocation', 'Service Location')} value={addressLabel} />
                        <InfoRow 
                          icon={Banknote} 
                          label={isWorker ? t('transactionDetails.hourlyRate', 'Hourly Rate') : t('transactionDetails.quotedRate', 'Quoted Rate')} 
                          value={formatCurrency(booking.hourlyRate)} 
                        />
                      </View>
                    </View>

                  </Animated.View>
                )}

                {/* Expansion Toggle Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsDetailsExpanded(prev => !prev)}
                  style={styles.unifiedCardToggle}
                >
                  <Text style={[styles.unifiedCardToggleText, { color: theme.colors.brand.primary }]}>
                    {isDetailsExpanded ? t('transactionDetails.showLess', 'Show Less') : t('transactionDetails.showMoreDetails', 'Show More Details')}
                  </Text>
                  <ChevronRight
                    size={14}
                    color={theme.colors.brand.primary}
                    style={{ transform: [{ rotate: isDetailsExpanded ? '270deg' : '90deg' }] }}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {isWorker && status !== 'completed' && status !== 'cancelled' && (
            <Animated.View entering={FadeInDown.delay(500).duration(450)} style={styles.section}>
              <SectionHeader icon={ShieldCheck} title={t('transactionDetails.workerControls', 'Worker Controls')} color={status === 'ongoing' ? P.green : P.cyan} />
              {status === 'accepted' && (
                <ActionButton
                  color={P.cyan}
                  icon={Zap}
                  label={t('transactionDetails.startJob', 'Start Job')}
                  loading={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'ongoing' })}
                />
              )}
              {status === 'ongoing' && (
                <ActionButton
                  color={P.green}
                  icon={CheckCircle2}
                  label={t('transactionDetails.completeJob', 'Complete Job')}
                  loading={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'completed' })}
                />
              )}
            </Animated.View>
          )}

          {!isWorker && status === 'completed' && booking.paymentStatus !== 'paid' && !hasActiveDispute && (
            <Animated.View entering={FadeInDown.delay(500).duration(450)} style={styles.section}>
              <SectionHeader icon={CreditCard} title={t('transactionDetails.cashSettlement', 'Cash Settlement')} color={P.green} />
              <ActionButton
                color={P.green}
                icon={CheckCircle2}
                label={t('transactionDetails.confirmCash', 'Confirm Cash Payment')}
                loading={isPaying}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  payBooking({
                    bookingId: id as string,
                    paymentMethod: 'cash'
                  }, {
                    onSuccess: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      refetch();
                      setShowPaymentSuccess(true);
                    },
                    onError: (error: any) => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      const message = error?.response?.data?.message || t('transactionDetails.paymentFailed', 'Could not confirm payment.');
                      Alert.alert(t('transactionDetails.paymentBlocked', 'Payment paused'), message);
                    }
                  });
                }}
              />
            </Animated.View>
          )}

          {!isWorker && status === 'completed' && (
            <Animated.View entering={FadeInDown.delay(560).duration(450)} style={styles.section}>
              <SectionHeader icon={Star} title={t('transactionDetails.serviceReview', 'Service Review')} color={booking.isReviewed ? P.green : P.gold} />
              {booking.isReviewed ? (
                <View style={styles.noticeCard}>
                  <CheckCircle2 size={18} color={P.green} />
                  <Text style={styles.noticeText}>{t('transactionDetails.feedbackRecorded', 'Your feedback has been recorded for this job.')}</Text>
                </View>
              ) : (
                <View style={styles.inlineReviewCard}>
                  <Text style={styles.inlineReviewTitle}>{t('transactionDetails.ratePartner', `Rate ${partnerName}`, { name: partnerName })}</Text>
                  <Text style={styles.inlineReviewSubtitle}>
                    {t('transactionDetails.reviewSubtitle', 'A quick review helps improve service quality for future customers.')}
                  </Text>

                  {/* 5-Star Selection Row */}
                  <View style={styles.starsRowContainer}>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const active = num <= selectedRating;
                      return (
                        <TouchableOpacity 
                          key={num} 
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedRating(num);
                          }}
                          activeOpacity={0.7}
                          style={styles.starTouch}
                        >
                          <Star 
                            size={32} 
                            color={active ? P.gold : 'rgba(255,255,255,0.15)'} 
                            fill={active ? P.gold : 'transparent'} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Comment Input */}
                  <TextInput
                    style={styles.reviewInput}
                    placeholder={t('transactionDetails.commentPlaceholder', 'Write a comment about their work... (optional)')}
                    placeholderTextColor={P.textDim}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    numberOfLines={3}
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.reviewSubmitBtn,
                      (selectedRating === 0 || isCreatingReview) && styles.reviewSubmitBtnDisabled
                    ]}
                    disabled={selectedRating === 0 || isCreatingReview}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      createReview({
                        booking: id as string,
                        worker: workerId as string,
                        rating: selectedRating,
                        comment: reviewComment.trim() || undefined,
                      }, {
                        onSuccess: () => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Toast.show({
                            type: 'success',
                            text1: t('review.successTitle', 'Review Submitted'),
                            text2: t('review.successDesc', 'Thank you for your feedback!'),
                          });
                          refetch();
                        },
                        onError: (err: any) => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          Toast.show({
                            type: 'error',
                            text1: t('review.failedTitle', 'Failed to Submit Review'),
                            text2: err.response?.data?.message || t('common.tryAgain', 'Please try again.'),
                          });
                        }
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    {isCreatingReview ? (
                      <ActivityIndicator size="small" color="#001014" />
                    ) : (
                      <Text style={styles.reviewSubmitBtnText}>{t('transactionDetails.submitReview', 'Submit Review')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}

          {status === 'completed' && booking.paymentStatus === 'paid' && (
            <View style={styles.noticeCard}>
              <CheckCircle2 size={18} color={P.green} />
              <Text style={styles.noticeText}>{t('transactionDetails.paymentConfirmed', 'Cash payment has been confirmed for this job.')}</Text>
            </View>
          )}
        </ScrollView>



        {status !== 'completed' && status !== 'cancelled' && (
          <Animated.View entering={FadeInDown.delay(620).duration(420)} style={[styles.floatingActions, { bottom: insets.bottom + 20 }]}>
            <FloatingAction icon={Navigation} label={t('transactionDetails.track', 'Track')} onPress={openRoute} color={P.green} disabled={!canTrackMission} />
            <FloatingAction icon={MessageCircle} label={t('transactionDetails.chat', 'Chat')} onPress={navigateToChat} color={P.cyan} disabled={!partnerProfileId} />
            <FloatingAction icon={Phone} label={t('transactionDetails.call', 'Call')} onPress={callPartner} primary disabled={!partnerPhone} />
          </Animated.View>
        )}
      </View>
      <RaiseDisputeModal
        visible={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        bookingId={id as string}
        jobAmount={jobAmount}
        onSubmitted={() => {
          refetch();
        }}
      />
      <AlertModal
        visible={showPaymentSuccess}
        onDismiss={() => {
          setShowPaymentSuccess(false);
          router.replace('/(tabs)' as any);
        }}
        title={t('transactionDetails.settlementConfirmed', 'Settlement Confirmed')}
        message={t('transactionDetails.settlementMsg', `You have successfully settled the payment of {{amount}} with your Ustad {{ustad}} for the {{category}} job.\n\nThank you for choosing Apna Ustad!`, { amount: formatCurrency(booking.hourlyRate), ustad: partnerName, category: booking.category })}
        buttonText={t('transactionDetails.backToHome', 'Back to Home')}
        type="success"
      />

      <Modal
        visible={showAutoAssignedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAutoAssignedModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <BlurView intensity={45} style={StyleSheet.absoluteFill} tint={theme.isDark ? "dark" : "light"} />
          <View style={styles.successModalContainer}>
            <Animated.View 
              entering={SlideInDown.springify().damping(15)}
              style={[
                styles.successCard, 
                { 
                  backgroundColor: theme.isDark ? '#07091A' : '#FFFFFF', 
                  borderColor: theme.isDark ? 'rgba(0, 255, 127, 0.3)' : 'rgba(0, 168, 107, 0.25)',
                  shadowColor: theme.isDark ? '#00FF7F' : '#00A86B',
                }
              ]}
            >
              <LinearGradient
                colors={theme.isDark 
                  ? ['rgba(0, 255, 127, 0.15)', 'rgba(7, 9, 26, 0.95)'] 
                  : ['rgba(0, 168, 107, 0.08)', 'rgba(255, 255, 255, 0.98)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successGradient}
              >
                <View style={[
                  styles.successBadgeOutline, 
                  { 
                    backgroundColor: theme.isDark ? 'rgba(0, 255, 127, 0.15)' : 'rgba(0, 168, 107, 0.12)',
                    shadowColor: theme.isDark ? '#00FF7F' : '#00A86B' 
                  }
                ]}>
                  <LinearGradient
                    colors={theme.isDark ? ['#00FF7F', '#00F5FF'] : ['#00A86B', '#34C759']}
                    style={styles.successBadgeCircle}
                  >
                    <CheckCircle2 size={32} color={theme.isDark ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
                  </LinearGradient>
                </View>

                <Text style={[styles.successTitle, { color: theme.isDark ? '#00FF7F' : '#00A86B' }]}>
                  {t('findingWorker.assignedTitle', 'USTAD ASSIGNED! ⚡')}
                </Text>
                
                <Text style={[styles.successSubtitle, { color: theme.isDark ? 'rgba(255, 255, 255, 0.7)' : '#444446' }]}>
                  {partner ? (
                    <>
                      <Text style={{ fontWeight: '800', color: theme.isDark ? '#FFFFFF' : '#1C1C1E' }}>
                        {partnerName}
                      </Text>{' '}
                      has accepted your job request with your price of{' '}
                      <Text style={{ fontWeight: '800', color: theme.isDark ? '#00F5FF' : '#007AFF' }}>
                        Rs. {amountValue.toLocaleString()}
                      </Text>
                      !
                    </>
                  ) : (
                    <>
                      An Ustad has accepted your job request at your offered price of{' '}
                      <Text style={{ fontWeight: '800', color: theme.isDark ? '#00F5FF' : '#007AFF' }}>
                        Rs. {amountValue.toLocaleString()}
                      </Text>
                      !
                    </>
                  )}
                </Text>

                {partner && (
                  <View style={[
                    styles.assignedWorkerCard, 
                    { 
                      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
                    }
                  ]}>
                    {partnerImage ? (
                      <Image source={{ uri: partnerImage }} style={styles.assignedWorkerAvatar} />
                    ) : (
                      <View style={[styles.assignedWorkerAvatar, { backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }]}>
                        <UserRound size={20} color={theme.isDark ? '#FFF' : '#000'} />
                      </View>
                    )}
                    <View style={styles.assignedWorkerDetails}>
                      <Text style={[styles.assignedWorkerName, { color: theme.isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                        {partnerName}
                      </Text>
                      <Text style={[styles.assignedWorkerCategory, { color: theme.isDark ? 'rgba(255, 255, 255, 0.5)' : '#666668' }]}>
                        {partnerCategory}
                      </Text>
                      <View style={styles.assignedWorkerRatingRow}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Text style={[styles.assignedWorkerRating, { color: theme.isDark ? 'rgba(255, 255, 255, 0.7)' : '#444446' }]}>
                          {partnerRating > 0 ? partnerRating.toFixed(1) : 'New'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={[styles.successPriceRow, { borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Text style={[styles.successPriceLabel, { color: theme.isDark ? 'rgba(255, 255, 255, 0.4)' : '#666668' }]}>AGREED PRICE:</Text>
                  <Text style={[styles.successPriceValue, { color: theme.isDark ? '#00F5FF' : '#007AFF' }]}>Rs. {amountValue.toLocaleString()}</Text>
                </View>

                <TouchableOpacity
                  style={styles.successActionBtn}
                  onPress={() => setShowAutoAssignedModal(false)}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={theme.isDark ? ['#00FF7F', '#00F5FF'] : ['#00A86B', '#007AFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.successActionGradient}
                  >
                    <Text style={[styles.successActionText, { color: theme.isDark ? '#000000' : '#FFFFFF' }]}>GOT IT</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<any>; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.colors.border.subtle }]}>
      <View style={[styles.infoRowIcon, { backgroundColor: theme.isDark ? P.cyanMuted : alpha(theme.colors.brand.primary, 0.08) }]}>
        <Icon size={16} color={theme.colors.brand.primary} strokeWidth={2.4} />
      </View>
      <View style={styles.infoRowCopy}>
        <Text style={[styles.infoRowLabel, { color: theme.colors.text.muted }]}>{label}</Text>
        <Text style={[styles.infoRowValue, { color: theme.colors.text.primary }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  color,
  icon: Icon,
  label,
  loading,
  onPress,
}: {
  color: string;
  icon: React.ComponentType<any>;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const isCyan = color === P.cyan;

  // --- REANIMATED HEARTBEAT PULSE ---
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1100 }),
        withTiming(1, { duration: 1100 })
      ),
      -1,
      true
    );
  }, [scale]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradientColors: readonly [string, string, string] = isCyan
    ? ['#00F5FF', '#007AFF', '#7D00FF'] // Cyan-to-Blue-to-Indigo
    : ['#00FF87', '#00E676', '#00B85A']; // Vibrant Emerald-Mint-Green

  const textColor = isCyan ? '#FFFFFF' : '#001014';
  const shadowColor = isCyan ? '#007AFF' : '#00E676';

  return (
    <Animated.View style={buttonAnimatedStyle}>
      <TouchableOpacity
        activeOpacity={0.76}
        onPress={onPress}
        disabled={loading}
        style={[
          styles.primaryAction,
          {
            shadowColor,
            shadowOpacity: 0.38,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryActionGradient}
        >
          {/* 3D Liquid Glass Glare Highlight Overlay */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassHighlight}
          />

          {/* Button Content (Cleanly Centered) */}
          <View style={styles.primaryActionContent}>
            {loading ? (
              <ActivityIndicator color={textColor} size="small" />
            ) : (
              <Icon size={20} color={textColor} strokeWidth={2.5} />
            )}
            <Text style={[styles.primaryActionText, { color: textColor }]}>{label}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: P.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyTitle: {
    color: P.text,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: P.cyan,
  },
  emptyButtonText: {
    color: '#001014',
    fontWeight: '900',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: P.border,
  },
  headerButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    color: P.textDim,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 3,
  },
  headerTitle: {
    color: P.text,
    fontSize: 19,
    fontWeight: '900',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: P.borderStrong,
    backgroundColor: P.surfaceStrong,
    padding: 16,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pulseWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pulseInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kindText: {
    color: P.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitleRow: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    marginBottom: 15,
  },
  heroStatusIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroStage: {
    color: P.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 2,
  },
  heroTitle: {
    color: P.text,
    fontSize: 24,
    fontWeight: '900',
  },
  heroDescription: {
    color: P.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 5,
  },
  valuePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 14,
    marginBottom: 15,
  },
  valueLabel: {
    color: P.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  valueText: {
    color: P.text,
    fontSize: 31,
    fontWeight: '900',
    marginTop: 2,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  paymentBadgeText: {
    color: P.text,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineStep: {
    alignItems: 'center',
    width: 58,
  },
  timelineNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: P.textDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P.cyan,
  },
  timelineText: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  timelineLine: {
    flex: 1,
    height: 2,
    marginTop: 10,
    marginHorizontal: -10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 22,
  },
  infoTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surface,
    padding: 12,
  },
  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  infoLabel: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: P.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
    lineHeight: 17,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  partnerCard: {
    position: 'relative',
    overflow: 'hidden',
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: P.borderStrong,
    backgroundColor: P.surfaceStrong,
    padding: 14,
  },
  partnerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarShell: {
    width: 64,
    height: 64,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: P.borderStrong,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: P.cyan,
    fontSize: 18,
    fontWeight: '900',
  },
  partnerCopy: {
    flex: 1,
    minWidth: 0,
  },
  partnerRoleText: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  partnerName: {
    color: P.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  partnerSubText: {
    color: P.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  partnerCue: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.cyanMuted,
    borderWidth: 1,
    borderColor: P.borderStrong,
  },
  partnerInsightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerInsight: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 10,
    justifyContent: 'space-between',
  },
  partnerInsightValue: {
    color: P.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  partnerInsightLabel: {
    color: P.textDim,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  partnerProfileRow: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.16)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  partnerStatusText: {
    flex: 1,
    minWidth: 0,
    color: P.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  partnerProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  partnerProfileText: {
    color: P.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  imageRail: {
    gap: 12,
    paddingRight: 2,
  },
  imageCard: {
    height: 210,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.borderStrong,
    backgroundColor: P.surfaceStrong,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  videoEvidence: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
  },
  videoEvidenceTitle: {
    color: P.text,
    fontSize: 18,
    fontWeight: '900',
  },
  videoEvidenceHint: {
    color: P.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  imageIndex: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '900',
  },
  mediaTypeBadge: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  mediaTypeText: {
    color: P.text,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  detailCard: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceStrong,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  infoRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.cyanMuted,
  },
  infoRowCopy: {
    flex: 1,
  },
  infoRowLabel: {
    color: P.textDim,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoRowValue: {
    color: P.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 20,
  },
  briefCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceStrong,
    padding: 16,
  },
  briefText: {
    color: P.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  primaryAction: {
    borderRadius: 32, // Perfect capsule shape (half of 64 height)
    overflow: 'visible', // allows shadow to expand
  },
  primaryActionGradient: {
    minHeight: 64, // Taller and thicker premium look
    borderRadius: 32,
    overflow: 'hidden', // clips reflection glare cleanly
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)', // bright clean capsule edge border
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%', // covers top half of capsule
  },
  primaryActionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  floatingActions: {
    position: 'absolute',
    right: 20,
    gap: 14,
    alignItems: 'center',
  },
  floatingAction: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  floatingActionPrimary: {
    borderColor: 'transparent',
  },
  floatingActionDisabled: {
    opacity: 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  floatingActionText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.22)',
    backgroundColor: P.greenMuted,
    padding: 15,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    color: P.green,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  disputeHelper: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
  },
  disputeCornerBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 30,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  disputeCornerStatus: {
    position: 'absolute',
    left: 16,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
    backgroundColor: 'rgba(255,59,48,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    backgroundColor: 'rgba(255,215,0,0.08)',
    padding: 14,
  },
  reviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.13)',
  },
  reviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewTitle: {
    color: P.text,
    fontSize: 14,
    fontWeight: '900',
  },
  reviewText: {
    color: P.textMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 3,
  },
  reviewButton: {
    borderRadius: 14,
    backgroundColor: P.gold,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  reviewButtonText: {
    color: '#201600',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  unifiedJobCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceStrong,
    padding: 16,
    overflow: 'hidden',
  },
  primaryDescBlock: {
    marginBottom: 12,
  },
  primaryDescLabel: {
    color: P.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  primaryDescText: {
    color: P.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  primaryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  primaryBadgeText: {
    color: P.text,
    fontSize: 11,
    fontWeight: '700',
  },
  expandedContentBlock: {
    marginTop: 16,
    gap: 16,
  },
  detailsSubSection: {
    gap: 8,
  },
  detailsSubSectionTitle: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  detailSpecsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
    overflow: 'hidden',
  },
  unifiedCardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: -16,
    marginBottom: -16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  unifiedCardToggleText: {
    color: P.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  collapsedPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thumbnailPile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewThumbnail: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: P.surfaceStrong,
    backgroundColor: '#000',
  },
  previewItemText: {
    color: P.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  voicePreviewIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
  },
  specsPreviewIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
  },
  inlineReviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    backgroundColor: 'rgba(255,215,0,0.04)',
    padding: 16,
    gap: 12,
  },
  inlineReviewTitle: {
    color: P.text,
    fontSize: 16,
    fontWeight: '900',
  },
  inlineReviewSubtitle: {
    color: P.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  starsRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  starTouch: {
    padding: 4,
  },
  reviewInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(255,255,255,0.02)',
    color: P.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  reviewSubmitBtn: {
    borderRadius: 14,
    backgroundColor: P.gold,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  reviewSubmitBtnDisabled: {
    opacity: 0.5,
  },
  reviewSubmitBtnText: {
    color: '#201600',
    fontSize: 13,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContainer: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  successCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  successGradient: {
    padding: 24,
    alignItems: 'center',
  },
  successBadgeOutline: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  successBadgeCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  successPriceRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  successPriceLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  successPriceValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  successActionBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  successActionGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successActionText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  assignedWorkerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    marginBottom: 20,
  },
  assignedWorkerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  assignedWorkerDetails: {
    flex: 1,
  },
  assignedWorkerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  assignedWorkerCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  assignedWorkerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  assignedWorkerRating: {
    fontSize: 10,
    fontWeight: '700',
  },
});
