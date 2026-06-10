import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
  Wrench,
  Zap,
} from 'lucide-react-native';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useBookingDetails, useWorker, useWorkerReviews } from '../hooks';
import api from '../services/api';

const C = {
  cyan: '#00F5FF',
  blue: '#087BFF',
  green: '#00E887',
  amber: '#FFB000',
  pink: '#FF4D8D',
  text: '#FFFFFF',
  muted: '#A8B0C2',
  dim: '#6E778C',
  surface: 'rgba(5, 11, 31, 0.88)',
  border: 'rgba(255,255,255,0.09)',
};

const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

const formatDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function WorkerDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string | string[];
    bidId?: string | string[];
    jobId?: string | string[];
    bookingId?: string | string[];
    category?: string | string[];
  }>();
  const workerId = firstParam(params.id);
  const bidId = firstParam(params.bidId);
  const jobId = firstParam(params.jobId);
  const bookingId = firstParam(params.bookingId);
  const selectedCategory = firstParam(params.category);
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: worker, isLoading } = useWorker(workerId, selectedCategory);
  const { data: reviews = [], isLoading: isLoadingReviews } = useWorkerReviews(workerId);
  const { data: contextBooking } = useBookingDetails(bookingId);

  const rating = Number(worker?.rating || 0);
  const reviewCount = Number(worker?.totalReviews || reviews.length || 0);
  const completedJobs = Number(worker?.totalJobs || 0);
  const experience = Number(worker?.experience || 0);
  const hourlyRate = Number(worker?.hourlyRate || 0);
  const skills = Array.isArray(worker?.skills) ? worker.skills : [];
  const isAvailable = worker?.isAvailable !== false;
  const hasBid = Boolean(bidId && jobId);
  const hasBooking = Boolean(bookingId);
  const isCommunicationLocked = hasBooking
    && (!contextBooking || contextBooking.status === 'completed' || contextBooking.status === 'cancelled');
  const hasActiveBooking = hasBooking && !isCommunicationLocked;
  const bookingWorker = typeof contextBooking?.worker === 'object' ? contextBooking.worker : null;
  const workerPhone = hasActiveBooking && bookingWorker?._id === workerId ? bookingWorker?.phone : '';
  const primaryLabel = hasBid ? 'SELECT USTAD' : 'REQUEST SERVICE';

  const shareProfile = async () => {
    await Share.share({
      message: `${worker?.fullName || 'ApnaUstad specialist'} - ${worker?.category || 'Service specialist'}${worker?.city ? ` in ${worker.city}` : ''}.`,
    });
  };

  const callWorker = async () => {
    if (!workerPhone) {
      Alert.alert('Phone unavailable', 'This Ustad has not shared a contact number.');
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
      const response = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`);
      router.replace({ pathname: '/transaction-details', params: { id: response.data.data._id } });
    } catch (error: any) {
      Alert.alert('Unable to select Ustad', error?.response?.data?.message || 'Please try again in a moment.');
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

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <ActivityIndicator color={C.cyan} />
          <Text style={styles.loadingText}>Loading Ustad profile</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!worker) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Ustad profile unavailable</Text>
          <TouchableOpacity style={styles.emptyAction} onPress={() => router.back()}>
            <Text style={styles.emptyActionText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
            <ChevronLeft size={22} color={C.text} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>USTAD PROFILE</Text>
            <Text style={styles.headerTitle}>Specialist Overview</Text>
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={shareProfile} activeOpacity={0.8}>
            <Share2 size={18} color={C.muted} strokeWidth={2.3} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 108 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(520)} style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(0,245,255,0.16)', 'rgba(5,11,31,0.92)', 'rgba(8,123,255,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroTop}>
              <View style={styles.avatarShell}>
                {worker.profileImage ? (
                  <Image source={{ uri: worker.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{initialsFor(worker.fullName)}</Text>
                  </View>
                )}
                <View style={[styles.availabilityDot, !isAvailable && styles.availabilityDotBusy]} />
              </View>

              <View style={styles.heroCopy}>
                <View style={styles.heroBadgeRow}>
                  <View style={[styles.verificationPill, !worker.isVerified && styles.verificationPillPending]}>
                    <ShieldCheck size={12} color={worker.isVerified ? C.green : C.amber} />
                    <Text style={[styles.verificationText, !worker.isVerified && styles.verificationTextPending]}>
                      {worker.isVerified ? 'VERIFIED USTAD' : 'VERIFICATION PENDING'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.workerName}>{worker.fullName}</Text>
                <Text style={styles.workerCategory}>{worker.category || 'Service Specialist'}</Text>
                <View style={styles.locationLine}>
                  <MapPin size={13} color={C.pink} />
                  <Text style={styles.locationText} numberOfLines={1}>{worker.city || 'Service area not added'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroBottom}>
              <View style={styles.ratingBlock}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={14}
                      color={C.amber}
                      fill={value <= Math.round(rating) ? C.amber : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'New profile'}</Text>
                <Text style={styles.ratingMeta}>{reviewCount} review{reviewCount === 1 ? '' : 's'}</Text>
              </View>
              <View style={[styles.availabilityPill, !isAvailable && styles.availabilityPillBusy]}>
                <View style={[styles.availabilityMiniDot, !isAvailable && styles.availabilityDotBusy]} />
                <Text style={[styles.availabilityLabel, !isAvailable && styles.availabilityLabelBusy]}>
                  {isAvailable ? 'AVAILABLE FOR WORK' : 'CURRENTLY BUSY'}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(520)} style={styles.statsStrip}>
            <Metric icon={Award} value={experience > 0 ? `${experience} yrs` : 'New'} label="EXPERIENCE" color={C.amber} />
            <View style={styles.metricDivider} />
            <Metric icon={BriefcaseBusiness} value={String(completedJobs)} label="JOBS" color={C.green} />
            <View style={styles.metricDivider} />
            <Metric icon={Clock3} value={hourlyRate > 0 ? `Rs. ${hourlyRate.toLocaleString()}` : 'Open'} label="RATE / HR" color={C.cyan} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(130).duration(520)} style={styles.sectionCard}>
            <SectionTitle icon={Sparkles} title="PROFESSIONAL SUMMARY" color={C.cyan} />
            <Text style={styles.bioText}>{worker.bio || 'This Ustad has not added a professional summary yet.'}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(520)} style={styles.sectionCard}>
            <SectionTitle icon={Wrench} title="SKILLS & SERVICE" color={C.pink} />
            {skills.length > 0 ? (
              <View style={styles.skillsWrap}>
                {skills.map((skill) => (
                  <View key={skill} style={styles.skillPill}>
                    <Check size={12} color={C.cyan} strokeWidth={3} />
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>Skills have not been added yet.</Text>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(230).duration(520)} style={styles.sectionCard}>
            <SectionTitle
              icon={Star}
              title="CLIENT REVIEWS"
              color={C.amber}
              right={<Text style={styles.sectionCount}>{reviewCount} TOTAL</Text>}
            />
            {isLoadingReviews ? (
              <ActivityIndicator color={C.cyan} style={styles.reviewsLoader} />
            ) : reviews.length > 0 ? (
              reviews.slice(0, 3).map((review: any, index: number) => (
                <ReviewItem key={review._id} review={review} isLast={index === Math.min(reviews.length, 3) - 1} />
              ))
            ) : (
              <View style={styles.emptyReviews}>
                <Star size={18} color={C.dim} />
                <Text style={styles.emptySectionText}>No client reviews yet.</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {(!hasBooking || hasActiveBooking) && (
          <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dockLine} />
            <View style={[styles.dockRow, hasActiveBooking && styles.bookingDockRow]}>
              <TouchableOpacity
                style={[styles.dockButton, hasActiveBooking && styles.bookingDockButton]}
                onPress={hasActiveBooking ? openChat : shareProfile}
                activeOpacity={0.8}
              >
                {hasActiveBooking ? <MessageSquare size={19} color={C.cyan} /> : <Share2 size={19} color={C.cyan} />}
              </TouchableOpacity>
              {hasActiveBooking && (
                <TouchableOpacity style={[styles.dockButton, styles.bookingDockButton]} onPress={callWorker} activeOpacity={0.8}>
                  <Phone size={19} color={C.green} />
                </TouchableOpacity>
              )}
              {!hasBooking && (
                <TouchableOpacity style={styles.primaryAction} onPress={handlePrimaryAction} activeOpacity={0.86} disabled={isAccepting}>
                  <LinearGradient colors={[C.cyan, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  {isAccepting ? (
                    <ActivityIndicator color="#001018" size="small" />
                  ) : (
                    <>
                      <Zap size={18} color="#001018" fill="#001018" />
                      <Text style={styles.primaryActionText}>{primaryLabel}</Text>
                      <ChevronRight size={18} color="#001018" strokeWidth={3} />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </BackgroundWrapper>
  );
}

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
  return (
    <View style={styles.metric}>
      <Icon size={16} color={color} />
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

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
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: `${color}35` }]} />
      {right}
    </View>
  );
}

function ReviewItem({ review, isLast }: { review: any; isLast: boolean }) {
  return (
    <View style={[styles.reviewItem, !isLast && styles.reviewDivider]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          {review.customer?.profileImage ? (
            <Image source={{ uri: review.customer.profileImage }} style={styles.reviewAvatarImage} />
          ) : (
            <Text style={styles.reviewAvatarText}>{initialsFor(review.customer?.fullName || 'Client')}</Text>
          )}
        </View>
        <View style={styles.reviewCopy}>
          <Text style={styles.reviewerName}>{review.customer?.fullName || 'Client'}</Text>
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        </View>
        <View style={styles.reviewRating}>
          <Star size={12} color={C.amber} fill={C.amber} />
          <Text style={styles.reviewRatingText}>{review.rating}</Text>
        </View>
      </View>
      {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadingText: { color: C.muted, fontSize: 13, fontWeight: '800' },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  emptyAction: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(0,245,255,0.12)' },
  emptyActionText: { color: C.cyan, fontSize: 12, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerButton: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,245,255,0.18)', backgroundColor: 'rgba(4,9,26,0.78)' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerEyebrow: { color: C.dim, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,245,255,0.18)', padding: 15, marginBottom: 12, backgroundColor: C.surface },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarShell: { width: 82, height: 82, borderRadius: 24, padding: 3, borderWidth: 2, borderColor: 'rgba(0,245,255,0.74)', backgroundColor: 'rgba(0,245,255,0.09)' },
  avatar: { width: '100%', height: '100%', borderRadius: 20 },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(0,245,255,0.11)' },
  avatarFallbackText: { color: C.cyan, fontSize: 24, fontWeight: '900' },
  availabilityDot: { position: 'absolute', bottom: 0, right: 0, width: 15, height: 15, borderRadius: 999, borderWidth: 2, borderColor: '#071024', backgroundColor: C.green },
  availabilityDotBusy: { backgroundColor: C.dim },
  heroCopy: { flex: 1, minWidth: 0 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 7 },
  verificationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,232,135,0.24)', backgroundColor: 'rgba(0,232,135,0.08)' },
  verificationPillPending: { borderColor: 'rgba(255,176,0,0.24)', backgroundColor: 'rgba(255,176,0,0.08)' },
  verificationText: { color: C.green, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  verificationTextPending: { color: C.amber },
  workerName: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 3 },
  workerCategory: { color: C.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { flex: 1, color: C.muted, fontSize: 11, fontWeight: '700' },
  heroDivider: { height: 1, marginVertical: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  ratingStars: { flexDirection: 'row', gap: 2 },
  ratingText: { color: C.amber, fontSize: 12, fontWeight: '900' },
  ratingMeta: { color: C.dim, fontSize: 10, fontWeight: '700' },
  availabilityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,232,135,0.08)', borderWidth: 1, borderColor: 'rgba(0,232,135,0.20)' },
  availabilityPillBusy: { backgroundColor: 'rgba(110,119,140,0.08)', borderColor: 'rgba(110,119,140,0.2)' },
  availabilityMiniDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.green },
  availabilityLabel: { color: C.green, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  availabilityLabelBusy: { color: C.dim },
  statsStrip: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 13, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginBottom: 12 },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: 1, marginVertical: 5, backgroundColor: 'rgba(255,255,255,0.08)' },
  metricValue: { maxWidth: '100%', color: C.text, fontSize: 14, fontWeight: '900', marginTop: 7, paddingHorizontal: 4 },
  metricLabel: { color: C.dim, fontSize: 8, fontWeight: '900', letterSpacing: 0.9, marginTop: 4 },
  sectionCard: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionLine: { flex: 1, height: 1 },
  sectionCount: { color: C.dim, fontSize: 9, fontWeight: '900' },
  bioText: { color: C.muted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,245,255,0.16)', backgroundColor: 'rgba(0,245,255,0.05)' },
  skillText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  reviewsLoader: { paddingVertical: 16 },
  emptyReviews: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  emptySectionText: { color: C.dim, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  reviewItem: { paddingVertical: 10 },
  reviewDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,176,0,0.2)', backgroundColor: 'rgba(255,176,0,0.08)' },
  reviewAvatarImage: { width: '100%', height: '100%' },
  reviewAvatarText: { color: C.amber, fontSize: 12, fontWeight: '900' },
  reviewCopy: { flex: 1 },
  reviewerName: { color: C.text, fontSize: 12, fontWeight: '900', marginBottom: 3 },
  reviewDate: { color: C.dim, fontSize: 10, fontWeight: '700' },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,176,0,0.08)' },
  reviewRatingText: { color: C.amber, fontSize: 11, fontWeight: '900' },
  reviewComment: { color: C.muted, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 8 },
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 12, overflow: 'hidden' },
  dockLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: C.border },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16 },
  bookingDockRow: { justifyContent: 'center' },
  dockButton: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,245,255,0.18)', backgroundColor: 'rgba(0,245,255,0.07)' },
  bookingDockButton: { width: 68 },
  primaryAction: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, overflow: 'hidden', borderRadius: 15 },
  primaryActionText: { color: '#001018', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
});
