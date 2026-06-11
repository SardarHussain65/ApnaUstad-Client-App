import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Star,
  Clock,
  Banknote,
  ShieldCheck,
  Users,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import AnimatedRN, { FadeInDown, FadeInUp, SlideInLeft } from 'react-native-reanimated';
import { Colors, Spacing } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ──────────────────────────────────────────────────────────────
const NEON_CYAN = '#00F5FF';
const NEON_AMBER = '#FFB800';
const NEON_GREEN = '#39FF14';
const NEON_PINK = '#FF2D78';
const NEON_BLUE = '#1E90FF';
const GOLD = '#FFD700';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER_S = 'rgba(255,255,255,0.07)';

// ─── Animated NeonCard with corner brackets ─────────────────────────────────────
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
        Animated.timing(pulse, { toValue: 0.9, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 2600, useNativeDriver: true }),
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

// ─── Rank Badge (1st, 2nd, 3rd) ────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const configs: Record<number, { color: string; label: string }> = {
    1: { color: GOLD, label: '#1' },
    2: { color: '#C0C0C0', label: '#2' },
    3: { color: '#CD7F32', label: '#3' },
  };
  const cfg = configs[rank] || { color: 'rgba(255,255,255,0.2)', label: `#${rank}` };
  return (
    <View style={[styles.rankBadge, { backgroundColor: `${cfg.color}18`, borderColor: `${cfg.color}50` }]}>
      <Text style={[styles.rankBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Star Rating ────────────────────────────────────────────────────────────────
function StarRating({ value }: { value: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={11}
          color={GOLD}
          fill={i <= Math.round(value) ? GOLD : 'transparent'}
        />
      ))}
      <Text style={styles.ratingNum}>{value?.toFixed(1) || '5.0'}</Text>
    </View>
  );
}

// ─── Stat Chip ──────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: `${color}25`, backgroundColor: `${color}0D` }]}>
      <Icon size={11} color={color} />
      <Text style={[styles.statChipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function BidsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [bids, setBids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => { fetchBids(); }, [jobId]);

  const fetchBids = async () => {
    try {
      const res = await api.get(`/jobs/${jobId}/bids`);
      setBids(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (bidId: string) => {
    setAccepting(bidId);
    try {
      const res = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`);
      router.replace({ pathname: '/transaction-details', params: { id: res.data.data._id } });
    } catch (e) {
      console.error(e);
    } finally {
      setAccepting(null);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.centerFill}>
          <View style={styles.loadingRing}>
            <View style={styles.loadingCore}>
              <Target size={24} color={NEON_CYAN} />
            </View>
          </View>
          <Text style={styles.loadingTitle}>FINDING USTADS</Text>
          <Text style={styles.loadingSub}>Fetching Ustad bids...</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      {/* Ambient tint */}
      <LinearGradient
        colors={[`${NEON_CYAN}07`, 'transparent', `${NEON_PINK}04`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={{ flex: 1 }}>

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <AnimatedRN.View
          entering={FadeInUp.duration(500)}
          style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        >
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.topBarLine} />

          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft color={NEON_CYAN} size={20} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>USTAD BIDS</Text>
            <View style={[styles.countPill, { borderColor: `${NEON_CYAN}35`, backgroundColor: `${NEON_CYAN}10` }]}>
              <Users size={10} color={NEON_CYAN} />
              <Text style={[styles.countPillText, { color: NEON_CYAN }]}>
                {bids.length} USTAD{bids.length !== 1 ? 'S' : ''}
              </Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </AnimatedRN.View>

        {/* ── List ─────────────────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 90,
            paddingBottom: 40,
            paddingHorizontal: 16,
          }}
        >

          {/* ── Empty State ──────────────────────────────────────────────── */}
          {bids.length === 0 && (
            <AnimatedRN.View entering={FadeInDown.delay(200).duration(700)} style={styles.emptyBox}>
              <View style={styles.emptyIconRing}>
                <TrendingUp size={28} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={styles.emptyTitle}>NO BIDS YET</Text>
              <Text style={styles.emptySub}>Ustads will submit bids shortly. Please check back soon.</Text>
            </AnimatedRN.View>
          )}

          {/* ── Bid Cards ────────────────────────────────────────────────── */}
          {bids.map((bid, index) => {
            const isDeploying = accepting === bid._id;
            const rating = bid.worker?.averageRating ?? 5;
            const accentColor = index === 0 ? GOLD : index === 1 ? NEON_CYAN : index === 2 ? NEON_PINK : NEON_BLUE;

            return (
              <AnimatedRN.View
                key={bid._id}
                entering={FadeInDown.delay(index * 120).duration(700)}
                style={{ marginBottom: 16 }}
              >
                <NeonCard accentColor={accentColor}>

                  {/* ── Card Header ────────────────────────────────────── */}
                  <View style={styles.cardTop}>
                    {/* Avatar + Info */}
                    <View style={styles.workerRow}>
                      <View style={styles.avatarWrap}>
                        <Image
                          source={{ uri: bid.worker?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }}
                          style={styles.avatar}
                        />
                        <View style={[styles.avatarOnline, { backgroundColor: NEON_GREEN }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.workerNameRow}>
                          <Text style={styles.workerName} numberOfLines={1}>
                            {bid.worker?.fullName || 'Anonymous'}
                          </Text>
                          <RankBadge rank={index + 1} />
                        </View>
                        <StarRating value={rating} />
                      </View>
                    </View>

                    {/* Price */}
                    <View style={styles.priceBlock}>
                      <Text style={styles.priceLabel}>QUOTED</Text>
                      <Text style={[styles.priceValue, { color: accentColor }]}>
                        Rs. {bid.proposedPrice}
                      </Text>
                    </View>
                  </View>

                  {/* ── Divider ──────────────────────────────────────── */}
                  <View style={styles.cardDivider} />

                  {/* ── Message ──────────────────────────────────────── */}
                  <View style={styles.msgBox}>
                    <Text style={styles.msgText} numberOfLines={3}>
                      {bid.message || 'No message provided.'}
                    </Text>
                  </View>

                  {/* ── Chips ────────────────────────────────────────── */}
                  <View style={styles.chipsRow}>
                    <StatChip icon={ShieldCheck} label="VERIFIED" color={NEON_GREEN} />
                    <StatChip icon={Clock} label="AVAILABLE" color={NEON_AMBER} />
                    {bid.estimatedDays && (
                      <StatChip icon={Banknote} label={`${bid.estimatedDays}D EST.`} color={NEON_CYAN} />
                    )}
                  </View>

                  {/* ── Action Row ───────────────────────────────────── */}
                  <View style={styles.actionRow}>
                    {/* Review Button */}
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => router.push({
                        pathname: '/worker-details',
                        params: { id: bid.worker?._id, jobId, bidId: bid._id },
                      })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reviewBtnText}>PROFILE</Text>
                      <ChevronRight size={13} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>

                    {/* Deploy Button */}
                    <TouchableOpacity
                      style={[styles.deployBtn, isDeploying && { opacity: 0.6 }]}
                      onPress={() => handleAccept(bid._id)}
                      disabled={isDeploying || !!accepting}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={
                          index === 0
                            ? [GOLD, '#FF8C00']
                            : index === 1
                              ? [NEON_CYAN, NEON_BLUE]
                              : [NEON_PINK, '#FF6B35']
                        }
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {/* Shine */}
                      <View style={styles.deployShine} />
                      {isDeploying ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Zap size={15} color="#fff" fill="#fff" />
                          <Text style={styles.deployText}>HIRE USTAD</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                </NeonCard>
              </AnimatedRN.View>
            );
          })}

        </ScrollView>
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
    borderWidth: 1, borderColor: `${NEON_CYAN}38`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loadingCore: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: `${NEON_CYAN}13`,
    borderWidth: 1, borderColor: `${NEON_CYAN}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  loadingSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: 1 },

  // Top Bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, overflow: 'hidden',
  },
  topBarLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 1, backgroundColor: BORDER_S,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${NEON_CYAN}0D`,
    borderWidth: 1, borderColor: `${NEON_CYAN}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { alignItems: 'center', gap: 6 },
  topBarTitle: {
    color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3,
  },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 10,
  },
  countPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // NeonCard
  neonWrapper: { position: 'relative', borderRadius: 22 },
  cTL: { position: 'absolute', top: 0, left: 0, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6, zIndex: 2 },
  cTR: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6, zIndex: 2 },
  cBL: { position: 'absolute', bottom: 0, left: 0, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6, zIndex: 2 },
  cBR: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6, zIndex: 2 },
  neonInner: { borderRadius: 22, padding: 18, overflow: 'hidden' },

  // Card Top
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#030712',
  },
  workerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  workerName: { color: '#fff', fontSize: 15, fontWeight: '800', flex: 1 },

  // Rank Badge
  rankBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  rankBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  // Star Row
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNum: { color: GOLD, fontSize: 11, fontWeight: '900', marginLeft: 4 },

  // Price
  priceBlock: { alignItems: 'flex-end' },
  priceLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  priceValue: { fontSize: 20, fontWeight: '900' },

  // Divider
  cardDivider: { height: 1, backgroundColor: BORDER_S, marginBottom: 14 },

  // Message
  msgBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 12,
    borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.15)',
    marginBottom: 14,
  },
  msgText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  // Chips
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  statChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Action Row
  actionRow: { flexDirection: 'row', gap: 10 },

  // Review Button
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1,
    borderColor: BORDER_S,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reviewBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Deploy Button
  deployBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14, overflow: 'hidden',
  },
  deployShine: {
    position: 'absolute', top: 0, left: 0, right: '65%', bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  deployText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyIconRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1, borderColor: BORDER_S,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '900',
    letterSpacing: 3, marginBottom: 10,
  },
  emptySub: {
    color: 'rgba(255,255,255,0.2)', fontSize: 13,
    textAlign: 'center', lineHeight: 20,
  },
});