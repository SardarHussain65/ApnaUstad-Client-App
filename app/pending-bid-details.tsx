import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import AnimatedRN, { FadeInDown, FadeInUp, SlideInLeft, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Clock,
  Calendar,
  Shield,
  Banknote,
  AlertCircle,
  Trash2,
  Zap,
  Target,
  User,
  FileText,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useWorkerBids, useJobDetails } from '../hooks';
import { useWithdrawBidMutation } from '../hooks/mutations/useMutations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NEON_CYAN = '#00F5FF';
const NEON_AMBER = '#FFB800';
const NEON_RED = '#FF3B30';
const NEON_GREEN = '#39FF14';
const DEEP_BG = '#030712';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER_GLOW = 'rgba(0,245,255,0.18)';
const BORDER_SOFT = 'rgba(255,255,255,0.07)';

// ─── Reusable Neon Border Card ─────────────────────────────────────────────────
function NeonCard({
  children,
  accentColor = NEON_CYAN,
  style,
}: {
  children: React.ReactNode;
  accentColor?: string;
  style?: object;
}) {
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.neonCardWrapper, style]}>
      {/* Corner Accents */}
      <View style={[styles.cornerTL, { borderColor: accentColor }]} />
      <View style={[styles.cornerTR, { borderColor: accentColor }]} />
      <View style={[styles.cornerBL, { borderColor: accentColor }]} />
      <View style={[styles.cornerBR, { borderColor: accentColor }]} />

      {/* Glow border */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 20,
            borderWidth: 1,
            borderColor: accentColor,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Content */}
      <View style={[styles.neonCardInner, { backgroundColor: `${accentColor}08` }]}>
        {children}
      </View>
    </View>
  );
}

// ─── Glowing Label Badge ───────────────────────────────────────────────────────
function GlowBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.glowBadge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statPill, { borderColor: `${color}25` }]}>
      <LinearGradient
        colors={[`${color}20`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Icon size={16} color={color} />
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={14} color={color} />
      <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: `${color}40` }]} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PendingBidDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; pendingBidId?: string }>();

  const { data: bids, isLoading: isLoadingBids } = useWorkerBids();
  const bid = bids?.find(b => b._id === params.pendingBidId);
  const { data: job, isLoading: isLoadingJob } = useJobDetails(
    params.id || (typeof bid?.jobPost === 'string' ? bid.jobPost : bid?.jobPost?._id)
  );
  const { mutate: withdrawBid, isPending: isWithdrawing } = useWithdrawBidMutation();

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoadingBids || isLoadingJob || (!job && !bid)) {
    return (
      <BackgroundWrapper>
        <View style={styles.centeredFill}>
          {/* Pulse rings */}
          <View style={styles.pulseOuter}>
            <View style={styles.pulseInner}>
              <Zap size={28} color={NEON_CYAN} />
            </View>
          </View>
          <Text style={styles.loadingText}>FETCHING MISSION DATA</Text>
          <Text style={styles.loadingSubText}>Please stand by…</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  const displayJob = job || (typeof bid?.jobPost === 'object' ? bid.jobPost : null);

  // ── Error State ────────────────────────────────────────────────────────────
  if (!displayJob) {
    return (
      <BackgroundWrapper>
        <View style={[styles.centeredFill, { padding: 28 }]}>
          <View style={styles.errorIconRing}>
            <AlertCircle size={36} color={NEON_RED} />
          </View>
          <Text style={styles.errorTitle}>MISSION ABORTED</Text>
          <Text style={styles.errorBody}>
            This mission has been cancelled or assigned to another operative.
          </Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()}>
            <ChevronLeft size={16} color={NEON_CYAN} />
            <Text style={styles.outlineBtnText}>RETURN TO BASE</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  const handleWithdraw = () => {
    if (!bid) return;
    withdrawBid({ bidId: bid._id }, { onSuccess: () => router.back() });
  };

  const jobAddress = displayJob.address || 'Location unavailable';
  const scheduledDate = displayJob.scheduledDate
    ? new Date(displayJob.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Today';

  return (
    <BackgroundWrapper>
      {/* Ambient background gradients */}
      <LinearGradient
        colors={['rgba(0,245,255,0.06)', 'transparent', 'rgba(255,184,0,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={{ flex: 1 }}>

        {/* ── Fixed Header ──────────────────────────────────────────────── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[styles.topBarBorder]} />

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft color={NEON_CYAN} size={22} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarLabel}>PROPOSAL SENT</Text>
            <GlowBadge label="PENDING REVIEW" color={NEON_AMBER} />
          </View>

          {/* Spacer */}
          <View style={{ width: 44 }} />
        </View>

        {/* ── Scrollable Body ────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 100,
            paddingBottom: 140,
            paddingHorizontal: 16,
          }}
        >

          {/* ── Hero Category Banner ─────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(100).duration(700)}>
            <LinearGradient
              colors={['rgba(0,245,255,0.12)', 'rgba(0,245,255,0.03)', 'transparent']}
              style={styles.heroBanner}
            >
              <View style={[styles.heroBannerAccent, { backgroundColor: NEON_CYAN }]} />
              <Text style={styles.heroCategory}>{displayJob.category?.toUpperCase()}</Text>
              <Text style={styles.heroSub}>ACTIVE PROPOSAL — AWAITING CLIENT DECISION</Text>
            </LinearGradient>
          </AnimatedRN.View>

          {/* ── Stats Row ─────────────────────────────────────────────────── */}
          <AnimatedRN.View entering={SlideInLeft.delay(200).duration(600)} style={styles.statsRow}>
            <StatPill icon={Clock} label="TIME" value={displayJob.scheduledTime || 'ASAP'} color={NEON_CYAN} />
            <StatPill icon={Calendar} label="DATE" value={scheduledDate} color={NEON_AMBER} />
          </AnimatedRN.View>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <AnimatedRN.View entering={FadeInUp.delay(300).duration(600)}>
            <NeonCard accentColor={NEON_CYAN} style={{ marginBottom: 16 }}>
              <SectionHeader icon={MapPin} title="DEPLOYMENT LOCATION" color={NEON_CYAN} />
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: NEON_CYAN }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationPrimary}>{jobAddress.split(',')[0]}</Text>
                  <Text style={styles.locationSecondary}>{jobAddress}</Text>
                </View>
              </View>
            </NeonCard>
          </AnimatedRN.View>

          {/* ── Target Client ─────────────────────────────────────────────── */}
          {displayJob.customer && (
            <AnimatedRN.View entering={FadeInUp.delay(400).duration(600)}>
              <NeonCard accentColor={NEON_AMBER} style={{ marginBottom: 16 }}>
                <SectionHeader icon={User} title="TARGET CLIENT" color={NEON_AMBER} />
                <View style={styles.clientRow}>
                  <View style={styles.clientAvatarWrap}>
                    <Image
                      source={{
                        uri:
                          (displayJob.customer as any)?.profileImage ||
                          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
                      }}
                      style={styles.clientAvatar}
                    />
                    <View style={styles.onlineDot} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>
                      {(displayJob.customer as any)?.fullName || 'Anonymous User'}
                    </Text>
                    <View style={styles.verifiedRow}>
                      <Shield size={11} color={NEON_GREEN} />
                      <Text style={[styles.verifiedText, { color: NEON_GREEN }]}>
                        IDENTITY VERIFIED
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.clientCodeBadge]}>
                    <Text style={styles.clientCodeText}>VIP</Text>
                  </View>
                </View>
              </NeonCard>
            </AnimatedRN.View>
          )}

          {/* ── Your Proposal ─────────────────────────────────────────────── */}
          {bid && (
            <AnimatedRN.View entering={FadeInUp.delay(500).duration(600)}>
              <NeonCard accentColor={NEON_CYAN} style={{ marginBottom: 16 }}>
                <SectionHeader icon={FileText} title="YOUR PROPOSAL" color={NEON_CYAN} />

                {/* Price + Days */}
                <View style={styles.proposalMetaRow}>
                  <View style={styles.proposalMetaBlock}>
                    <View style={styles.proposalMetaIcon}>
                      <Banknote size={18} color={NEON_GREEN} />
                    </View>
                    <Text style={styles.proposalMetaLabel}>PROPOSED PRICE</Text>
                    <Text style={[styles.proposalMetaValue, { color: NEON_GREEN }]}>
                      PKR {bid.proposedPrice}
                    </Text>
                  </View>

                  <View style={styles.proposalMetaDivider} />

                  <View style={styles.proposalMetaBlock}>
                    <View style={styles.proposalMetaIcon}>
                      <Clock size={18} color={NEON_AMBER} />
                    </View>
                    <Text style={styles.proposalMetaLabel}>ESTIMATED TIME</Text>
                    <Text style={[styles.proposalMetaValue, { color: NEON_AMBER }]}>
                      {bid.estimatedDays} DAY{bid.estimatedDays !== 1 ? 'S' : ''}
                    </Text>
                  </View>
                </View>

                {/* Separator */}
                <View style={styles.thinDivider} />

                {/* Message */}
                <Text style={styles.msgLabel}>MESSAGE TO CLIENT</Text>
                <View style={styles.msgBox}>
                  <Text style={styles.msgText}>
                    {bid.message || 'No additional message provided.'}
                  </Text>
                </View>
              </NeonCard>
            </AnimatedRN.View>
          )}

        </ScrollView>

        {/* ── Bottom Action Dock ─────────────────────────────────────────── */}
        <AnimatedRN.View
          entering={FadeInDown.delay(600).duration(600)}
          style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}
        >
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.dockTopBorder} />

          <TouchableOpacity
            style={[styles.withdrawBtn, isWithdrawing && { opacity: 0.6 }]}
            onPress={handleWithdraw}
            disabled={isWithdrawing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255,59,48,0.18)', 'rgba(255,59,48,0.06)']}
              style={StyleSheet.absoluteFillObject}
            />
            {isWithdrawing ? (
              <ActivityIndicator color={NEON_RED} />
            ) : (
              <View style={styles.withdrawInner}>
                <View style={[styles.withdrawIconWrap]}>
                  <Trash2 size={18} color={NEON_RED} />
                </View>
                <View>
                  <Text style={styles.withdrawTitle}>WITHDRAW PROPOSAL</Text>
                  <Text style={styles.withdrawSub}>This action cannot be undone</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </AnimatedRN.View>

      </View>
    </BackgroundWrapper>
  );
}

// ─── Stylesheet ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Utilities
  centeredFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading
  pulseOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: `${NEON_CYAN}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${NEON_CYAN}18`,
    borderWidth: 1,
    borderColor: `${NEON_CYAN}60`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 6,
  },
  loadingSubText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    letterSpacing: 1,
  },

  // Error
  errorIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${NEON_RED}15`,
    borderWidth: 1,
    borderColor: `${NEON_RED}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 12,
  },
  errorBody: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${NEON_CYAN}50`,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    backgroundColor: `${NEON_CYAN}08`,
  },
  outlineBtnText: {
    color: NEON_CYAN,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 20,
    overflow: 'hidden',
  },
  topBarBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: BORDER_SOFT,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${NEON_CYAN}35`,
    backgroundColor: `${NEON_CYAN}0D`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
    gap: 6,
  },
  topBarLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },

  // Glow Badge
  glowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    gap: 5,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Hero Banner
  heroBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  heroBannerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  heroCategory: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // NeonCard
  neonCardWrapper: {
    position: 'relative',
    borderRadius: 20,
  },
  cornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: 16, height: 16,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderTopLeftRadius: 6,
    zIndex: 2,
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16,
    borderTopWidth: 2, borderRightWidth: 2,
    borderTopRightRadius: 6,
    zIndex: 2,
  },
  cornerBL: {
    position: 'absolute', bottom: 0, left: 0,
    width: 16, height: 16,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderBottomLeftRadius: 6,
    zIndex: 2,
  },
  cornerBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderBottomRightRadius: 6,
    zIndex: 2,
  },
  neonCardInner: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  locationSecondary: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Client
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatarWrap: {
    position: 'relative',
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: `${NEON_AMBER}50`,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NEON_GREEN,
    borderWidth: 1.5,
    borderColor: DEEP_BG,
  },
  clientName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  clientCodeBadge: {
    borderWidth: 1,
    borderColor: `${NEON_AMBER}40`,
    backgroundColor: `${NEON_AMBER}12`,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clientCodeText: {
    color: NEON_AMBER,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Proposal
  proposalMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  proposalMetaBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  proposalMetaIcon: {
    marginBottom: 8,
  },
  proposalMetaLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  proposalMetaValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  proposalMetaDivider: {
    width: 1,
    backgroundColor: BORDER_SOFT,
    marginVertical: 8,
  },
  thinDivider: {
    height: 1,
    backgroundColor: BORDER_SOFT,
    marginVertical: 16,
  },
  msgLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  msgBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: `${NEON_CYAN}50`,
  },
  msgText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Dock
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  dockTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: BORDER_SOFT,
  },
  withdrawBtn: {
    borderWidth: 1,
    borderColor: `${NEON_RED}40`,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  withdrawIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${NEON_RED}15`,
    borderWidth: 1,
    borderColor: `${NEON_RED}35`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawTitle: {
    color: NEON_RED,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  withdrawSub: {
    color: `${NEON_RED}70`,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});