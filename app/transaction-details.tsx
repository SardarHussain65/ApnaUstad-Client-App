import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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
  XCircle,
  Zap,
} from 'lucide-react-native';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { Typography } from '../constants/Theme';
import { useBookingDetails, useUpdateBookingStatusMutation, usePayBookingMutation } from '../hooks';
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
  accepted: { color: P.cyan, muted: P.cyanMuted, label: 'Accepted', title: 'Ustad assigned', Icon: ShieldCheck },
  ongoing: { color: P.cyan, muted: P.cyanMuted, label: 'Ongoing', title: 'Work in progress', Icon: Navigation },
  completed: { color: P.green, muted: P.greenMuted, label: 'Completed', title: 'Job completed', Icon: CheckCircle2 },
  cancelled: { color: P.red, muted: P.redMuted, label: 'Cancelled', title: 'Job cancelled', Icon: XCircle },
};

const STEPS = [
  { value: 'pending', label: 'Request' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'ongoing', label: 'On site' },
  { value: 'completed', label: 'Done' },
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
  return (
    <View style={styles.infoTile}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}14` }]}>
        <Icon size={15} color={color} strokeWidth={2.4} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function PartnerInsight({ icon: Icon, label, value, color = P.cyan }: { icon: React.ComponentType<any>; label: string; value: string; color?: string }) {
  return (
    <View style={styles.partnerInsight}>
      <Icon size={14} color={color} strokeWidth={2.4} />
      <Text style={styles.partnerInsightValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.partnerInsightLabel} numberOfLines={1}>{label}</Text>
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, amount: initialAmount } = useLocalSearchParams<{ id: string; amount?: string }>();
  const { role, user } = useAuth();
  const isWorker = role === 'worker';

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const bypassBeforeRemoveRef = useRef(false);

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
          <Text style={styles.loadingText}>Loading booking details</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!booking) {
    return (
      <BackgroundWrapper>
        <View style={styles.loading}>
          <Text style={styles.emptyTitle}>Booking not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  const meta = booking.cardMeta;
  const status = booking.status || 'accepted';
  const isCommunicationLocked = status === 'completed' || status === 'cancelled';
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.accepted;
  const StatusIcon = statusInfo.Icon;
  const partner = isWorker ? booking.customer : booking.worker;
  const customerId = typeof booking.customer === 'object' ? booking.customer._id : booking.customer;
  const workerId = typeof booking.worker === 'object' ? booking.worker._id : booking.worker;
  const partnerName = meta?.counterParty?.fullName || partner?.fullName || 'Service partner';
  const partnerRole = isWorker ? 'Client' : 'Assigned Ustad';
  const partnerImage = meta?.counterParty?.profileImage || partner?.profileImage || '';
  const partnerProfileId = isWorker ? customerId : workerId;
  const partnerPhone = isCommunicationLocked ? '' : meta?.counterParty?.phone || partner?.phone || '';
  const partnerCategory = meta?.counterParty?.category || partner?.category || (isWorker ? 'Service client' : 'Ustad specialist');
  const partnerCity = meta?.counterParty?.city || partner?.city || '';
  const partnerAddress = meta?.counterParty?.address || partner?.address || partnerCity || '';
  const partnerRating = Number(meta?.counterParty?.rating ?? partner?.rating ?? 0);
  const partnerReviews = Number(meta?.counterParty?.totalReviews ?? partner?.totalReviews ?? 0);
  const partnerJobs = Number(meta?.counterParty?.totalJobs ?? partner?.totalJobs ?? 0);
  const partnerHourlyRate = Number(meta?.counterParty?.hourlyRate ?? partner?.hourlyRate ?? booking.hourlyRate ?? 0);
  const partnerExperience = Number(meta?.counterParty?.experience ?? partner?.experience ?? 0);
  const partnerJoinedAt = meta?.counterParty?.joinedAt || partner?.createdAt;
  const partnerStatusText = isWorker
    ? (meta?.counterParty?.isActive === false || partner?.isActive === false ? 'Inactive account' : 'Active client')
    : (meta?.counterParty?.isVerified || partner?.isVerified ? 'Verified Ustad' : 'Verification pending');
  const partnerSubtitle = isWorker
    ? (partnerAddress || partnerPhone || 'Client profile available')
    : `${partnerCategory}${partnerExperience > 0 ? ` • ${partnerExperience}y exp` : ''}`;
  const canTrackMission = Boolean(customerId && workerId);
  const amountValue = Number(meta?.financial?.amount ?? (isWorker ? booking.workerEarning : booking.totalAmount) ?? initialAmount ?? 0);
  const amountText = meta?.financial?.amountText || formatCurrency(amountValue);
  const amountLabel = isWorker ? 'Your Earning' : 'Booking Value';
  const serviceTitle = meta?.title || booking.category || 'Service Booking';
  const serviceDescription = meta?.description || booking.description || 'Service request details';
  const dateLabel = meta?.schedule?.dateLabel || formatDate(booking.scheduledDate);
  const timeLabel = meta?.schedule?.timeLabel || booking.scheduledTime || 'ASAP';
  const addressLabel = meta?.location?.address || booking.address || 'Service location';
  const workerLocation = (isWorker
    ? (booking.worker?.address || (user as any)?.address || booking.worker?.city || (user as any)?.city)
    : (booking.worker?.address || booking.worker?.city || meta?.counterParty?.address || '')
  ) || '';
  const missionKindLabel = meta?.missionKindLabel || (booking.bookingType === 'instant' ? 'Instant visit' : 'Scheduled visit');
  const paymentStatusLabel = booking.paymentStatus === 'paid' ? 'Paid' : 'Cash pending';
  const stepIndex = STEPS.findIndex(step => step.value === status);
  const visibleStepIndex = stepIndex < 0 ? 0 : stepIndex;
  const latitude = typeof booking.location === 'object' && booking.location.coordinates ? booking.location.coordinates[1] : 0;
  const longitude = typeof booking.location === 'object' && booking.location.coordinates ? booking.location.coordinates[0] : 0;
  const visualMedia = buildJobEvidenceItems({
    images: booking.imageUrls || [],
    videos: booking.videoUrls || [],
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
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} activeOpacity={0.8}>
            <ChevronLeft color={P.text} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>Booking Details</Text>
            <Text style={styles.headerTitle}>Overview</Text>
          </View>
          <TouchableOpacity onPress={shareMission} style={styles.headerButton} activeOpacity={0.8}>
            <Share2 color={P.textMuted} size={19} strokeWidth={2.3} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (status === 'completed' || status === 'cancelled' ? 24 : 40) }]}>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.heroCard}>
            <LinearGradient
              colors={[`${statusInfo.color}26`, 'rgba(10,13,34,0.96)', 'rgba(0,245,255,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroTop}>
              <View style={[styles.statusPill, { backgroundColor: statusInfo.muted, borderColor: `${statusInfo.color}50` }]}>
                <PulseDot color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
              <View style={styles.kindPill}>
                <Zap size={12} color={booking.bookingType === 'instant' ? P.orange : P.cyan} />
                <Text style={styles.kindText}>{missionKindLabel}</Text>
              </View>
            </View>

            <View style={styles.heroTitleRow}>
              <View style={[styles.heroStatusIcon, { backgroundColor: statusInfo.muted, borderColor: `${statusInfo.color}38` }]}>
                <StatusIcon size={22} color={statusInfo.color} strokeWidth={2.5} />
              </View>
              <View style={styles.heroTitleCopy}>
                <Text style={styles.heroStage}>{statusInfo.title}</Text>
                <Text style={[styles.heroTitle, Typography.threeD]} numberOfLines={1}>{serviceTitle}</Text>
                <Text style={styles.heroDescription} numberOfLines={2}>{serviceDescription}</Text>
              </View>
            </View>

            <View style={styles.valuePanel}>
              <View>
                <Text style={styles.valueLabel}>{amountLabel}</Text>
                <Text style={styles.valueText}>{amountText}</Text>
              </View>
              <View style={styles.paymentBadge}>
                <CreditCard size={14} color={booking.paymentStatus === 'paid' ? P.green : P.gold} />
                <Text style={styles.paymentBadgeText}>{paymentStatusLabel}</Text>
              </View>
            </View>

            {status !== 'cancelled' && (
              <View style={styles.timeline}>
                {STEPS.map((step, index) => {
                  const active = index <= visibleStepIndex;
                  const current = index === visibleStepIndex;
                  return (
                    <React.Fragment key={step.value}>
                      <View style={styles.timelineStep}>
                        <View style={[
                          styles.timelineNode,
                          active && { borderColor: P.cyan, backgroundColor: current ? 'transparent' : P.cyan },
                        ]}>
                          {current ? <View style={styles.timelineDot} /> : active ? <CheckCircle2 size={10} color="#001014" strokeWidth={3} /> : null}
                        </View>
                        <Text style={[styles.timelineText, active && { color: P.cyan }]}>{step.label}</Text>
                      </View>
                      {index < STEPS.length - 1 && <View style={[styles.timelineLine, index < visibleStepIndex && { backgroundColor: P.cyan }]} />}
                    </React.Fragment>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.quickGrid}>
            <InfoTile icon={CalendarDays} label="Date" value={dateLabel} />
            <InfoTile icon={Clock3} label="Time" value={timeLabel} color={P.orange} />
            <InfoTile icon={MapPin} label="Service Loc" value={addressLabel} color={P.green} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(450)} style={styles.section}>
            <SectionHeader icon={UserRound} title={partnerRole} />
            <TouchableOpacity activeOpacity={0.88} onPress={openPartnerProfile} disabled={!partnerProfileId} style={styles.partnerCard}>
              <LinearGradient
                colors={['rgba(0,245,255,0.13)', 'rgba(10,13,34,0.94)', 'rgba(0,255,127,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.partnerTopRow}>
                <View style={styles.avatarShell}>
                  {partnerImage ? (
                    <Image source={{ uri: partnerImage }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient colors={[P.cyanMuted, 'rgba(191,90,242,0.18)']} style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{initialsFor(partnerName)}</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.partnerCopy}>
                  <Text style={styles.partnerRoleText}>{partnerRole}</Text>
                  <Text style={[styles.partnerName, Typography.threeD]} numberOfLines={1}>{partnerName}</Text>
                  <Text style={styles.partnerSubText} numberOfLines={1}>{partnerSubtitle}</Text>
                </View>
                <View style={styles.partnerCue}>
                  <ChevronRight size={18} color={P.cyan} strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.partnerInsightRow}>
                {isWorker ? (
                  <>
                    <PartnerInsight icon={Phone} label="Contact" value={isCommunicationLocked ? 'Closed after job completion' : partnerPhone || 'In app'} />
                    <PartnerInsight icon={MapPin} label="Area" value={partnerCity || partnerAddress || 'Not shared'} color={P.green} />
                    <PartnerInsight icon={CalendarDays} label="Member" value={formatSince(partnerJoinedAt)} color={P.orange} />
                  </>
                ) : (
                  <>
                    <PartnerInsight icon={Star} label="Rating" value={partnerRating > 0 ? `${partnerRating.toFixed(1)} (${partnerReviews})` : 'New'} color={P.gold} />
                    <PartnerInsight icon={BriefcaseBusiness} label="Jobs" value={`${partnerJobs || 0} done`} color={P.green} />
                    <PartnerInsight icon={Banknote} label="Rate" value={formatCurrency(partnerHourlyRate)} />
                  </>
                )}
              </View>

              <View style={styles.partnerProfileRow}>
                <View style={[styles.partnerStatusDot, { backgroundColor: isWorker ? P.green : (partnerStatusText.includes('Verified') ? P.green : P.orange) }]} />
                <Text style={styles.partnerStatusText} numberOfLines={1}>{partnerStatusText}</Text>
                <View style={styles.partnerProfileLink}>
                  <Eye size={13} color={P.cyan} strokeWidth={2.4} />
                  <Text style={styles.partnerProfileText}>{isWorker ? 'View client profile' : 'View Ustad profile'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {visualMedia.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.section}>
              <SectionHeader icon={ImageIcon} title="Work Evidence" />
              <JobEvidenceGallery items={visualMedia} />
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(260).duration(450)} style={styles.section}>
            <SectionHeader icon={BriefcaseBusiness} title="Job Details" />
            <View style={styles.detailCard}>
              <InfoRow icon={BriefcaseBusiness} label="Category" value={booking.category || serviceTitle} />
              <InfoRow icon={MapPin} label="Service Location" value={addressLabel} />
              {!!workerLocation && (
                <InfoRow icon={MapPin} label="Worker Location" value={workerLocation} />
              )}
              <InfoRow icon={Clock3} label="Estimated Hours" value={`${booking.estimatedHours || 1} hour${booking.estimatedHours === 1 ? '' : 's'}`} />
              <InfoRow icon={Banknote} label={isWorker ? 'Hourly Rate' : 'Quoted Rate'} value={formatCurrency(booking.hourlyRate)} />
            </View>
          </Animated.View>

          {!!booking.description && (
            <Animated.View entering={FadeInDown.delay(380).duration(450)} style={styles.section}>
              <SectionHeader icon={ShieldCheck} title="Job Description" />
              <View style={styles.briefCard}>
                <Text style={styles.briefText}>{booking.description}</Text>
              </View>
            </Animated.View>
          )}

          {isWorker && status !== 'completed' && status !== 'cancelled' && (
            <Animated.View entering={FadeInDown.delay(500).duration(450)} style={styles.section}>
              <SectionHeader icon={ShieldCheck} title="Worker Controls" color={status === 'ongoing' ? P.green : P.cyan} />
              {status === 'accepted' && (
                <ActionButton
                  color={P.cyan}
                  icon={Zap}
                  label="Start Job"
                  loading={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'ongoing' })}
                />
              )}
              {status === 'ongoing' && (
                <ActionButton
                  color={P.green}
                  icon={CheckCircle2}
                  label="Complete Job"
                  loading={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'completed' })}
                />
              )}
            </Animated.View>
          )}

          {!isWorker && status === 'completed' && booking.paymentStatus !== 'paid' && (
            <Animated.View entering={FadeInDown.delay(500).duration(450)} style={styles.section}>
              <SectionHeader icon={CreditCard} title="Cash Settlement" color={P.green} />
              <ActionButton
                color={P.green}
                icon={CheckCircle2}
                label="Confirm Cash Payment"
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
                    onError: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                  });
                }}
              />
            </Animated.View>
          )}

          {!isWorker && status === 'completed' && (
            <Animated.View entering={FadeInDown.delay(560).duration(450)} style={styles.section}>
              <SectionHeader icon={Star} title="Service Review" color={booking.isReviewed ? P.green : P.gold} />
              {booking.isReviewed ? (
                <View style={styles.noticeCard}>
                  <CheckCircle2 size={18} color={P.green} />
                  <Text style={styles.noticeText}>Your feedback has been recorded for this job.</Text>
                </View>
              ) : (
                <View style={styles.reviewCard}>
                  <View style={styles.reviewIcon}>
                    <Star size={22} color={P.gold} fill={P.gold} />
                  </View>
                  <View style={styles.reviewCopy}>
                    <Text style={styles.reviewTitle}>Rate {partnerName}</Text>
                    <Text style={styles.reviewText}>A quick review helps improve service quality for future customers.</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/review', params: { bookingId: id } })} style={styles.reviewButton} activeOpacity={0.86}>
                    <Text style={styles.reviewButtonText}>Rate</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}

          {status === 'completed' && booking.paymentStatus === 'paid' && (
            <View style={styles.noticeCard}>
              <CheckCircle2 size={18} color={P.green} />
              <Text style={styles.noticeText}>Cash payment has been confirmed for this job.</Text>
            </View>
          )}
        </ScrollView>
        {status !== 'completed' && status !== 'cancelled' && (
          <Animated.View entering={FadeInDown.delay(620).duration(420)} style={[styles.floatingActions, { bottom: insets.bottom + 20 }]}>
            <FloatingAction icon={Navigation} label="Track" onPress={openRoute} color={P.green} disabled={!canTrackMission} />
            <FloatingAction icon={MessageCircle} label="Chat" onPress={navigateToChat} color={P.cyan} disabled={!partnerProfileId} />
            <FloatingAction icon={Phone} label="Call" onPress={callPartner} primary disabled={!partnerPhone} />
          </Animated.View>
        )}
      </View>
      <AlertModal
        visible={showPaymentSuccess}
        onDismiss={() => {
          setShowPaymentSuccess(false);
          router.replace('/(tabs)' as any);
        }}
        title="Settlement Confirmed"
        message={`You have successfully settled the payment of ${formatCurrency(booking.hourlyRate)} with your Ustad ${partnerName} for the ${booking.category} job.\n\nThank you for choosing Apna Ustad!`}
        buttonText="Back to Home"
        type="success"
      />
    </BackgroundWrapper>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<any>; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <Icon size={16} color={P.cyan} strokeWidth={2.4} />
      </View>
      <View style={styles.infoRowCopy}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue} numberOfLines={2}>{value}</Text>
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
});
