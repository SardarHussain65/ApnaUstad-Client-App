import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Colors, Spacing } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import AnimatedRN, {
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Star,
  ShieldCheck,
  Share2,
  Award,
  Zap,
  Clock,
  MessageSquare,
  Phone,
  Target,
  TrendingUp,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorker, useWorkerReviews } from '../hooks';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = SCREEN_WIDTH * 0.32;

// ─── Design Tokens ──────────────────────────────────────────────────────────────
const NEON_CYAN = '#00F5FF';
const NEON_AMBER = '#FFB800';
const NEON_GREEN = '#39FF14';
const NEON_PINK = '#FF2D78';
const NEON_BLUE = '#1E90FF';
const NEON_PURPLE = '#BF5FFF';
const GOLD = '#FFD700';
const BORDER_S = 'rgba(255,255,255,0.07)';

const PORTFOLIO = [
  { id: '1', url: 'https://images.unsplash.com/photo-1581578731548-c64a958b4751?q=80&w=400' },
  { id: '2', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400' },
  { id: '3', url: 'https://images.unsplash.com/photo-1558403194-611308249627?q=80&w=400' },
];

// ─── NeonCard ──────────────────────────────────────────────────────────────────
function NeonCard({
  children,
  accentColor = NEON_CYAN,
  style,
}: {
  children: React.ReactNode;
  accentColor?: string;
  style?: object;
}) {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.neonWrapper, style]}>
      <View style={[styles.cTL, { borderColor: accentColor }]} />
      <View style={[styles.cTR, { borderColor: accentColor }]} />
      <View style={[styles.cBL, { borderColor: accentColor }]} />
      <View style={[styles.cBR, { borderColor: accentColor }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: 22, borderWidth: 1, borderColor: accentColor, opacity: pulse },
        ]}
      />
      <View style={[styles.neonInner, { backgroundColor: `${accentColor}06` }]}>
        {children}
      </View>
    </View>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  color,
  right,
}: {
  icon: any;
  title: string;
  color: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.secHeader}>
      <Icon size={13} color={color} />
      <Text style={[styles.secHeaderText, { color }]}>{title}</Text>
      <View style={[styles.secHeaderLine, { backgroundColor: `${color}35` }]} />
      {right}
    </View>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  value,
  label,
  color,
  delay,
}: {
  icon: any;
  value: string;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <AnimatedRN.View entering={FadeInDown.delay(delay).duration(600)} style={{ flex: 1 }}>
      <View style={[styles.statCard, { borderColor: `${color}22` }]}>
        <LinearGradient
          colors={[`${color}18`, 'transparent']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
          <Icon size={18} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </AnimatedRN.View>
  );
}

// ─── Review Item ───────────────────────────────────────────────────────────────
function ReviewItem({ review, isLast }: { review: any; isLast: boolean }) {
  return (
    <View style={[styles.reviewItem, !isLast && styles.reviewDivider]}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatarWrap}>
          <Text style={styles.reviewAvatarLetter}>
            {review.customer?.fullName?.[0]?.toUpperCase() || 'C'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName}>{review.customer?.fullName || 'Customer'}</Text>
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        </View>
        <View style={styles.reviewStarRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i} size={11} color={GOLD}
              fill={i <= review.rating ? GOLD : 'transparent'}
            />
          ))}
        </View>
      </View>
      {!!review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const scrollY = useSharedValue(0);
  const orbRotation = useSharedValue(0);
  const [accepting, setAccepting] = useState(false);

  const { data: worker, isLoading } = useWorker(params.id as string);
  const { data: reviews = [], isLoading: isLoadingReviews } = useWorkerReviews(params.id as string);

  useEffect(() => {
    orbRotation.value = withRepeat(withTiming(360, { duration: 14000 }), -1, false);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  // Orb shrinks as user scrolls
  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${orbRotation.value}deg` },
      { scale: interpolate(scrollY.value, [0, 120], [1, 0.75], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(scrollY.value, [0, 120], [0.7, 0.3], Extrapolate.CLAMP),
  }));

  // Header title fades in on scroll
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 120], [0, 1], Extrapolate.CLAMP),
  }));

  const handleAccept = async () => {
    if (!params.bidId) return;
    setAccepting(true);
    try {
      const res = await api.post(`/jobs/${params.jobId}/bids/${params.bidId}/accept`);
      router.replace({ pathname: '/transaction-details', params: { id: res.data.data._id } });
    } catch (e) {
      console.error(e);
    } finally {
      setAccepting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.centerFill}>
          <View style={styles.loadingRing}>
            <View style={styles.loadingCore}>
              <Target size={24} color={NEON_CYAN} />
            </View>
          </View>
          <Text style={styles.loadingLabel}>LOADING OPERATIVE</Text>
          <Text style={styles.loadingSub}>Retrieving specialist data…</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  const hasBid = !!params.bidId;
  const actionColors = hasBid ? [NEON_CYAN, NEON_BLUE] : [NEON_BLUE, NEON_PURPLE];
  const actionLabel = hasBid ? 'ACCEPT PROPOSAL' : 'INITIATE MISSION';

  return (
    <BackgroundWrapper>
      {/* Ambient gradient */}
      <LinearGradient
        colors={[`${NEON_CYAN}08`, 'transparent', `${NEON_PURPLE}05`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={{ flex: 1 }}>

        {/* ── Scroll-fade Header ──────────────────────────────────────────── */}
        <AnimatedRN.View style={[styles.solidHeader, { paddingTop: insets.top + 6, height: 60 + insets.top }, headerTitleStyle]}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.solidHeaderLine} />
          <Text style={styles.solidHeaderTitle} numberOfLines={1}>
            {worker?.fullName?.toUpperCase()}
          </Text>
        </AnimatedRN.View>

        {/* ── Fixed Controls ──────────────────────────────────────────────── */}
        <View style={[styles.topControls, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color={NEON_CYAN} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Share2 color="rgba(255,255,255,0.6)" size={19} />
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Content ──────────────────────────────────────────── */}
        <AnimatedRN.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 70,
            paddingBottom: 130,
            paddingHorizontal: 16,
          }}
        >

          {/* ── Profile Hero ─────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(100).duration(700)} style={styles.heroSection}>
            {/* Spinning orb behind avatar */}
            <View style={styles.orbContainer}>
              <AnimatedRN.View style={[styles.orbRing, orbStyle]}>
                <LinearGradient
                  colors={[NEON_CYAN, NEON_PURPLE, NEON_PINK, NEON_CYAN]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </AnimatedRN.View>

              {/* Avatar */}
              <View style={styles.avatarRing}>
                <Image
                  source={{
                    uri: worker?.profileImage ||
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
                  }}
                  style={styles.avatar}
                />
              </View>

              {/* Verified badge */}
              {worker?.isVerified && (
                <AnimatedRN.View entering={FadeInDown.delay(400)} style={styles.verifiedBadge}>
                  <CheckCircle size={13} color="#fff" fill={NEON_GREEN} />
                </AnimatedRN.View>
              )}
            </View>

            {/* Name + Role + Rating */}
            <Text style={styles.heroName}>{worker?.fullName || 'Specialist'}</Text>
            <Text style={[styles.heroRole, { color: NEON_CYAN }]}>
              {worker?.category?.toUpperCase() || 'CERTIFIED OPERATIVE'}
            </Text>

            <View style={styles.ratingPill}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={13} color={GOLD} fill={i <= Math.round(worker?.rating ?? 5) ? GOLD : 'transparent'} />
              ))}
              <Text style={styles.ratingNum}>{worker?.rating?.toFixed(1) || '5.0'}</Text>
              <Text style={styles.ratingMissions}>· {worker?.totalReviews || 0} missions</Text>
            </View>
          </AnimatedRN.View>

          {/* ── Stats Row ────────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <StatCard icon={Award} value={`${worker?.experience || 1}y`} label="EXPERIENCE" color={NEON_AMBER} delay={300} />
            <StatCard icon={TrendingUp} value="100%" label="SUCCESS" color={NEON_GREEN} delay={400} />
            <StatCard icon={Clock} value={`₨${worker?.hourlyRate || '--'}`} label="RATE/HR" color={NEON_CYAN} delay={500} />
          </View>

          {/* ── Bio ──────────────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(550).duration(600)} style={{ marginBottom: 16 }}>
            <NeonCard accentColor="rgba(255,255,255,0.18)">
              <SectionHeader icon={Target} title="OPERATIVE BIO" color="rgba(255,255,255,0.45)" />
              <Text style={styles.bioText}>
                {worker?.bio || 'No professional biography provided. Standards of excellence apply.'}
              </Text>
            </NeonCard>
          </AnimatedRN.View>

          {/* ── Reviews ──────────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(620).duration(600)} style={{ marginBottom: 16 }}>
            <NeonCard accentColor={GOLD}>
              <SectionHeader
                icon={Star}
                title="CLIENT REVIEWS"
                color={GOLD}
                right={
                  <Text style={[styles.reviewCount, { color: `${GOLD}70` }]}>
                    {worker?.totalReviews || reviews.length} TOTAL
                  </Text>
                }
              />
              {isLoadingReviews ? (
                <ActivityIndicator color={NEON_CYAN} style={{ paddingVertical: 20 }} />
              ) : reviews.length > 0 ? (
                reviews.slice(0, 3).map((review: any, i: number) => (
                  <ReviewItem key={review._id} review={review} isLast={i === Math.min(reviews.length, 3) - 1} />
                ))
              ) : (
                <View style={styles.noReviewsBox}>
                  <Text style={styles.noReviewsText}>No reviews yet. Be the first!</Text>
                </View>
              )}
            </NeonCard>
          </AnimatedRN.View>

          {/* ── Portfolio ────────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(700).duration(600)} style={{ marginBottom: 16 }}>
            <NeonCard accentColor={NEON_PINK}>
              <SectionHeader
                icon={ImageIcon}
                title="MISSION PORTFOLIO"
                color={NEON_PINK}
                right={
                  <TouchableOpacity>
                    <Text style={[styles.viewAllText, { color: NEON_PINK }]}>VIEW ALL</Text>
                  </TouchableOpacity>
                }
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {PORTFOLIO.map((item) => (
                  <View key={item.id} style={styles.portfolioThumb}>
                    <Image source={{ uri: item.url }} style={StyleSheet.absoluteFillObject as any} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                    />
                  </View>
                ))}
              </ScrollView>
            </NeonCard>
          </AnimatedRN.View>

        </AnimatedRN.ScrollView>

        {/* ── Action Dock ──────────────────────────────────────────────────── */}
        <AnimatedRN.View
          entering={FadeInDown.delay(800).duration(700)}
          style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}
        >
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.dockLine} />
          <View style={styles.dockRow}>

            {/* Message */}
            <TouchableOpacity style={styles.dockIconBtn}>
              <LinearGradient
                colors={[`${NEON_CYAN}20`, `${NEON_CYAN}08`]}
                style={StyleSheet.absoluteFillObject}
              />
              <MessageSquare size={20} color={NEON_CYAN} />
            </TouchableOpacity>

            {/* Call */}
            <TouchableOpacity style={styles.dockIconBtn}>
              <LinearGradient
                colors={[`${NEON_GREEN}20`, `${NEON_GREEN}08`]}
                style={StyleSheet.absoluteFillObject}
              />
              <Phone size={20} color={NEON_GREEN} />
            </TouchableOpacity>

            {/* Primary CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, accepting && { opacity: 0.6 }]}
              onPress={() => {
                if (hasBid) {
                  handleAccept();
                } else {
                  router.push({
                    pathname: '/job-creation',
                    params: {
                      title: worker?.category,
                      targetWorkerId: worker?._id,
                      targetWorkerName: worker?.fullName,
                    },
                  });
                }
              }}
              disabled={accepting}
              activeOpacity={0.85}
            >
              <LinearGradient colors={actionColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              {/* Shine */}
              <View style={styles.ctaShine} />
              {accepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Zap size={17} color="#fff" fill="#fff" />
                  <Text style={styles.ctaText}>{actionLabel}</Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </AnimatedRN.View>

      </View>
    </BackgroundWrapper>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(val?: string) {
  if (!val) return 'Recent';
  const d = new Date(val);
  return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Loading
  loadingRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 1, borderColor: `${NEON_CYAN}38`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loadingCore: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: `${NEON_CYAN}13`,
    borderWidth: 1, borderColor: `${NEON_CYAN}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingLabel: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  loadingSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: 1 },

  // Solid header
  solidHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9,
    justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 12, overflow: 'hidden',
  },
  solidHeaderLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 1, backgroundColor: BORDER_S,
  },
  solidHeaderTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  // Top Controls
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

  // Hero
  heroSection: { alignItems: 'center', marginBottom: 24, paddingTop: 10 },
  orbContainer: {
    width: AVATAR_SIZE + 20, height: AVATAR_SIZE + 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  orbRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: (AVATAR_SIZE + 20) / 2,
    opacity: 0.65,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarRing: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    padding: 3, backgroundColor: '#030712',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%', borderRadius: AVATAR_SIZE / 2 },
  verifiedBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#030712',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: NEON_GREEN,
  },
  heroName: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
  heroRole: { fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 14 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: BORDER_S,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100,
  },
  ratingNum: { color: GOLD, fontSize: 13, fontWeight: '900', marginLeft: 4 },
  ratingMissions: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },

  // NeonCard
  neonWrapper: { position: 'relative', borderRadius: 22 },
  cTL: { position: 'absolute', top: 0, left: 0, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6, zIndex: 2 },
  cTR: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6, zIndex: 2 },
  cBL: { position: 'absolute', bottom: 0, left: 0, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6, zIndex: 2 },
  cBR: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6, zIndex: 2 },
  neonInner: { borderRadius: 22, padding: 18, overflow: 'hidden' },

  // Section Header
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  secHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  secHeaderLine: { flex: 1, height: 1 },

  // Bio
  bioText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 24, fontWeight: '400' },

  // Reviews
  reviewCount: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  reviewItem: { paddingVertical: 14 },
  reviewDivider: { borderBottomWidth: 1, borderBottomColor: BORDER_S },
  reviewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewAvatarWrap: {
    width: 36, height: 36, borderRadius: 12, marginRight: 10,
    backgroundColor: `${GOLD}15`,
    borderWidth: 1, borderColor: `${GOLD}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarLetter: { color: GOLD, fontSize: 13, fontWeight: '900' },
  reviewerName: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  reviewDate: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' },
  reviewStarRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  noReviewsBox: { alignItems: 'center', paddingVertical: 20 },
  noReviewsText: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },

  // Portfolio
  portfolioThumb: {
    width: SCREEN_WIDTH * 0.38, height: 110,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: `${NEON_PINK}30`,
  },
  viewAllText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Dock
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 14, overflow: 'hidden',
  },
  dockLine: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1, backgroundColor: BORDER_S,
  },
  dockRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 16,
  },
  dockIconBtn: {
    width: 50, height: 50, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER_S,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaBtn: {
    flex: 1, height: 50, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, overflow: 'hidden',
  },
  ctaShine: {
    position: 'absolute', top: 0, left: 0, right: '60%', bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
});