import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
import { Colors, Typography, Spacing } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useCancelJobMutation } from '../hooks/mutations/useMutations';
import Toast from 'react-native-toast-message';
import AnimatedRN, {
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Clock,
  Calendar,
  Shield,
  Zap,
  MoreHorizontal,
  MessageSquare,
  Banknote,
  Image as ImageIcon,
  FileText,
  User,
  Target,
  Navigation,
  Eye,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { addAlpha } from '../utils/colorUtils';
import { useJobDetails } from '../hooks';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const NEON_CYAN = '#00F5FF';
const NEON_AMBER = '#FFB800';
const NEON_RED = '#FF3B30';
const NEON_GREEN = '#39FF14';
const NEON_PINK = '#FF2D78';
const NEON_BLUE = '#1E90FF';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER_SOFT = 'rgba(255,255,255,0.07)';

// ─── Animated Neon Corner Card ──────────────────────────────────────────────────
function NeonCard({
  children,
  accentColor = NEON_CYAN,
  style,
}: {
  children: React.ReactNode;
  accentColor?: string;
  style?: object;
}) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 2400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.neonWrapper, style]}>
      <View style={[styles.cTL, { borderColor: accentColor }]} />
      <View style={[styles.cTR, { borderColor: accentColor }]} />
      <View style={[styles.cBL, { borderColor: accentColor }]} />
      <View style={[styles.cBR, { borderColor: accentColor }]} />
      <Animated.View style={[StyleSheet.absoluteFillObject, { borderRadius: 20, borderWidth: 1, borderColor: accentColor, opacity: pulse }]} />
      <View style={[styles.neonInner, { backgroundColor: addAlpha(accentColor, '07') }]}>
        {children}
      </View>
    </View>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={13} color={color} />
      <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: addAlpha(color, '35') }]} />
    </View>
  );
}

// ─── Stat Pill ──────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: addAlpha(color, '22') }]}>
      <LinearGradient colors={[addAlpha(color, '18'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.statIcon, { backgroundColor: addAlpha(color, '18') }]}>
        <Icon size={15} color={color} />
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Glow Badge ─────────────────────────────────────────────────────────────────
function GlowBadge({ label, color, dot = true }: { label: string; color: string; dot?: boolean }) {
  return (
    <View style={[styles.glowBadge, { backgroundColor: addAlpha(color, '15'), borderColor: addAlpha(color, '40') }]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: color }]} />}
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Action Button ───────────────────────────────────────────────────────────────
function ActionButton({
  onPress,
  colors: gradColors,
  icon: Icon,
  label,
  flex = true,
}: {
  onPress?: () => void;
  colors: [string, string, ...string[]];
  icon: any;
  label: string;
  flex?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, flex && { flex: 1 }]} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.actionBtnShine} />
      <Icon size={18} color="#fff" />
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────────
export default function JobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; bookingId?: string; mode?: string; pendingBidId?: string }>();
  const resolvedId = params.id || params.bookingId;
  const { role } = useAuth();
  const { data: job, isLoading } = useJobDetails(resolvedId as string);

  const scrollY = useSharedValue(0);
  const isPendingBidPreview = params.mode === 'pending-bid' || !!params.pendingBidId;

  const { mutate: cancelJob, isPending: isCancelling } = useCancelJobMutation({
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'MISSION CANCELLED',
        text2: 'The job post has been cancelled.',
      });
      router.replace('/(tabs)' as any);
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'CANCELLATION FAILED',
        text2: err.response?.data?.message || 'Could not cancel the job.',
      });
    }
  });

  const handleCancelJob = () => {
    Alert.alert(
      "Cancel Mission",
      "Are you sure you want to cancel this mission?",
      [
        { text: "No, Keep It Open", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: () => cancelJob({ jobId: (job?._id || resolvedId) as string }) 
        }
      ]
    );
  };

  const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });

  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolate.CLAMP),
  }));

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading || !job) {
    return (
      <BackgroundWrapper>
        <View style={styles.centerFill}>
          <View style={styles.loadingRing}>
            <View style={styles.loadingInner}>
              <Target size={26} color={NEON_CYAN} />
            </View>
          </View>
          <Text style={styles.loadingLabel}>LOADING MISSION DATA</Text>
          <Text style={styles.loadingSubLabel}>Decrypting intel…</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  const isInstant = job.urgency === 'instant';
  const imageUrls = job.imageUrls || [];
  const jobAddress = job.address || 'Location unavailable';
  const customerId = typeof job.customer === 'object' ? job.customer?._id : job.customer;
  const workerId = typeof job.worker === 'object' ? job.worker?._id : job.worker;

  const urgencyColor = isInstant ? NEON_RED : NEON_CYAN;
  const scheduledDate = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Today';

  return (
    <BackgroundWrapper>
      {/* Ambient tint */}
      <LinearGradient
        colors={[`${urgencyColor}08`, 'transparent', `${NEON_AMBER}05`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={{ flex: 1 }}>

        {/* ── Scroll-fade Title Header ─────────────────────────────────────── */}
        <AnimatedRN.View style={[styles.solidHeader, { paddingTop: insets.top + 8, height: 64 + insets.top }, headerOpacity]}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[styles.solidHeaderLine]} />
          <Text style={styles.solidHeaderTitle} numberOfLines={1}>{job.category?.toUpperCase()}</Text>
        </AnimatedRN.View>

        {/* ── Fixed Back / More ────────────────────────────────────────────── */}
        <View style={[styles.topControls, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color={NEON_CYAN} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <MoreHorizontal color="rgba(255,255,255,0.7)" size={22} />
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Content ───────────────────────────────────────────── */}
        <AnimatedRN.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 80, paddingBottom: 150, paddingHorizontal: 16 }}
        >

          {/* ── Hero Title Block ─────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(100).duration(700)}>
            <View style={styles.heroBanner}>
              <View style={[styles.heroBannerAccent, { backgroundColor: urgencyColor }]} />
              <LinearGradient
                colors={[`${urgencyColor}12`, 'transparent']}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.heroBadgeRow}>
                <GlowBadge label={isInstant ? '⚡ URGENT PROTOCOL' : '✦ VERIFIED MISSION'} color={urgencyColor} />
                {(job.amount || 0) > 0 && (
                  <GlowBadge label={`PKR ${job.amount}`} color={NEON_GREEN} dot={false} />
                )}
              </View>

              <Text style={styles.heroTitle}>{job.category?.toUpperCase()}</Text>

              <View style={styles.heroStatusRow}>
                <Text style={styles.heroStatusLabel}>STATUS</Text>
                <Text style={[styles.heroStatusValue, { color: urgencyColor }]}>{job.status?.toUpperCase()}</Text>
              </View>
            </View>
          </AnimatedRN.View>

          {/* ── Time + Date Stats ────────────────────────────────────────── */}
          <AnimatedRN.View entering={SlideInLeft.delay(180).duration(600)} style={styles.statsRow}>
            <StatPill icon={Clock} label="TIME" value={job.scheduledTime || 'ASAP'} color={NEON_CYAN} />
            <StatPill icon={Calendar} label="DATE" value={scheduledDate} color={NEON_AMBER} />
          </AnimatedRN.View>

          {/* ── Image Evidence Carousel ──────────────────────────────────── */}
          {imageUrls.length > 0 && (
            <AnimatedRN.View entering={FadeInUp.delay(260).duration(600)} style={{ marginBottom: 14 }}>
              <NeonCard accentColor={NEON_PINK}>
                <SectionHeader icon={ImageIcon} title="VISUAL EVIDENCE" color={NEON_PINK} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {imageUrls.map((url: string, i: number) => (
                    <TouchableOpacity key={i} activeOpacity={0.9} style={styles.imgThumb}>
                      <Image source={{ uri: url }} style={StyleSheet.absoluteFillObject as any} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                      />
                      <View style={styles.imgCounter}>
                        <Text style={styles.imgCounterText}>{i + 1}/{imageUrls.length}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </NeonCard>
            </AnimatedRN.View>
          )}

          {/* ── Location ─────────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(320).duration(600)} style={{ marginBottom: 14 }}>
            <NeonCard accentColor={NEON_CYAN}>
              <SectionHeader icon={MapPin} title="DEPLOYMENT LOCATION" color={NEON_CYAN} />
              <View style={styles.locationRow}>
                <View style={[styles.locationPulse, { backgroundColor: NEON_CYAN }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationPrimary}>{jobAddress.split(',')[0]}</Text>
                  <Text style={styles.locationSecondary}>{jobAddress}</Text>
                </View>
              </View>
            </NeonCard>
          </AnimatedRN.View>

          {/* ── Target Client ─────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(380).duration(600)} style={{ marginBottom: 14 }}>
            <NeonCard accentColor={NEON_AMBER}>
              <SectionHeader icon={User} title="TARGET CLIENT" color={NEON_AMBER} />
              <View style={styles.clientRow}>
                <View style={styles.clientAvatarWrap}>
                  <Image
                    source={{ uri: (job.customer as any)?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' }}
                    style={styles.clientAvatar}
                  />
                  <View style={[styles.clientOnline, { backgroundColor: NEON_GREEN }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{(job.customer as any)?.fullName || 'Anonymous User'}</Text>
                  <View style={styles.clientVerifiedRow}>
                    <Shield size={11} color={NEON_GREEN} />
                    <Text style={[styles.clientVerifiedText, { color: NEON_GREEN }]}>IDENTITY VERIFIED</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.msgIconBtn, { borderColor: addAlpha(NEON_CYAN, '35'), backgroundColor: addAlpha(NEON_CYAN, '0D') }]}>
                  <MessageSquare size={17} color={NEON_CYAN} />
                </TouchableOpacity>
              </View>
            </NeonCard>
          </AnimatedRN.View>

          {/* ── Mission Briefing ──────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(440).duration(600)} style={{ marginBottom: 14 }}>
            <NeonCard accentColor="rgba(255,255,255,0.2)">
              <SectionHeader icon={FileText} title="MISSION BRIEFING" color="rgba(255,255,255,0.5)" />
              <View style={styles.briefingBox}>
                <Text style={styles.briefingText}>{job.description}</Text>
              </View>
            </NeonCard>
          </AnimatedRN.View>

        </AnimatedRN.ScrollView>

        {/* ── Action Dock ──────────────────────────────────────────────────── */}

        {/* Worker — Open Job */}
        {role === 'worker' && job.status === 'open' && !isPendingBidPreview && (
          <AnimatedRN.View entering={FadeInDown.delay(500).duration(600)} style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dockBorderTop} />
            <View style={styles.dockRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => router.back()}>
                <Text style={styles.declineBtnText}>DECLINE</Text>
              </TouchableOpacity>
              <ActionButton
                onPress={() => isInstant
                  ? router.push({ pathname: '/finding-worker', params: { jobId: job._id, mode: 'accept' } })
                  : router.push({ pathname: '/bid-submission', params: { jobId: job._id } })
                }
                colors={isInstant ? [NEON_RED, '#FF6B35'] : [NEON_BLUE, NEON_PINK]}
                icon={isInstant ? Zap : Target}
                label={isInstant ? 'ACCEPT MISSION' : 'SUBMIT BID'}
              />
            </View>
          </AnimatedRN.View>
        )}

        {/* Worker — Pending Bid */}
        {role === 'worker' && isPendingBidPreview && (
          <AnimatedRN.View entering={FadeInDown.delay(500).duration(600)} style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dockBorderTop} />
            <View style={styles.dockRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => router.back()}>
                <Text style={styles.declineBtnText}>BACK</Text>
              </TouchableOpacity>
              <ActionButton
                colors={[NEON_CYAN, NEON_BLUE]}
                icon={Clock}
                label="AWAITING CONFIRMATION"
              />
            </View>
          </AnimatedRN.View>
        )}

        {/* Client — View Bids & Cancel */}
        {role === 'client' && (job.status === 'open' || job.status === 'reviewing') && (
          <AnimatedRN.View entering={FadeInDown.delay(500).duration(600)} style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dockBorderTop} />
            <View style={[styles.dockRow, { paddingHorizontal: 16 }]}>
              <TouchableOpacity 
                style={[styles.declineBtn, isCancelling && { opacity: 0.5 }]} 
                onPress={handleCancelJob}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
                ) : (
                  <Text style={[styles.declineBtnText, { color: NEON_RED }]}>CANCEL</Text>
                )}
              </TouchableOpacity>
              <ActionButton
                onPress={() => router.push({ pathname: '/bids-list', params: { jobId: job._id } })}
                colors={[NEON_BLUE, NEON_CYAN]}
                icon={Eye}
                label="VIEW ALL PROPOSALS"
              />
            </View>
          </AnimatedRN.View>
        )}

        {/* Tracking — Active Jobs */}
        {(job.status === 'assigned' || job.status === 'in-progress' || job.status === 'ongoing') && (
          <AnimatedRN.View entering={FadeInDown.delay(500).duration(600)} style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dockBorderTop} />
            <View style={[styles.dockRow, { paddingHorizontal: 16 }]}>
              <ActionButton
                onPress={() => router.push({
                  pathname: '/job-tracking',
                  params: {
                    bookingId: job._id,
                    customerId,
                    workerId,
                    latitude: typeof job.location === 'object' && job.location.coordinates ? job.location.coordinates[1] : 0,
                    longitude: typeof job.location === 'object' && job.location.coordinates ? job.location.coordinates[0] : 0,
                  },
                })}
                colors={[NEON_CYAN, NEON_BLUE]}
                icon={Navigation}
                label={role === 'worker' ? 'VIEW ROUTE & SEND GPS' : 'TRACK WORKER POSITION'}
              />
            </View>
          </AnimatedRN.View>
        )}

      </View>
    </BackgroundWrapper>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Loading
  loadingRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 1, borderColor: `${NEON_CYAN}40`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  loadingInner: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: `${NEON_CYAN}15`,
    borderWidth: 1, borderColor: `${NEON_CYAN}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingLabel: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  loadingSubLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: 1 },

  // Header
  solidHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9,
    justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 12, overflow: 'hidden',
  },
  solidHeaderLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
    backgroundColor: BORDER_SOFT,
  },
  solidHeaderTitle: {
    color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 3,
  },
  topControls: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1, borderColor: `${NEON_CYAN}30`,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero Banner
  heroBanner: {
    borderRadius: 20, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER_SOFT, overflow: 'hidden',
  },
  heroBannerAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2,
  },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  heroTitle: {
    color: '#fff', fontSize: 30, fontWeight: '900',
    letterSpacing: 1, lineHeight: 34, marginBottom: 12,
  },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroStatusLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10,
    fontWeight: '800', letterSpacing: 2,
  },
  heroStatusValue: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  // Glow Badge
  glowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 16, padding: 14, overflow: 'hidden',
    backgroundColor: CARD_BG,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
  statValue: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

  // NeonCard
  neonWrapper: { position: 'relative', borderRadius: 20 },
  cTL: { position: 'absolute', top: 0, left: 0, width: 15, height: 15, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6, zIndex: 2 },
  cTR: { position: 'absolute', top: 0, right: 0, width: 15, height: 15, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6, zIndex: 2 },
  cBL: { position: 'absolute', bottom: 0, left: 0, width: 15, height: 15, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6, zIndex: 2 },
  cBR: { position: 'absolute', bottom: 0, right: 0, width: 15, height: 15, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6, zIndex: 2 },
  neonInner: { borderRadius: 20, padding: 18, overflow: 'hidden' },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  sectionHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  sectionLine: { flex: 1, height: 1 },

  // Image Carousel
  imgThumb: {
    width: 190, height: 115, borderRadius: 14,
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: `${NEON_PINK}30`,
  },
  imgCounter: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  imgCounterText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Location
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  locationPulse: { width: 8, height: 8, borderRadius: 4 },
  locationPrimary: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  locationSecondary: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', lineHeight: 18 },

  // Client
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatarWrap: { position: 'relative' },
  clientAvatar: {
    width: 50, height: 50, borderRadius: 16,
    borderWidth: 1.5, borderColor: `${NEON_AMBER}50`,
  },
  clientOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#030712',
  },
  clientName: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 5 },
  clientVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clientVerifiedText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  msgIconBtn: {
    width: 42, height: 42, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Briefing
  briefingBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 14,
    borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.2)',
  },
  briefingText: {
    color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 24, fontWeight: '400',
  },

  // Dock
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 14, overflow: 'hidden',
  },
  dockBorderTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: BORDER_SOFT,
  },
  dockRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16,
  },

  // Decline Button
  declineBtn: {
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  declineBtnText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5,
  },

  // Action Button
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
    overflow: 'hidden', position: 'relative',
  },
  actionBtnShine: {
    position: 'absolute', top: 0, left: 0, right: '60%', bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionBtnText: {
    color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5,
  },
});
