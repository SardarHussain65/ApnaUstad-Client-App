import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, Dimensions,
  TouchableOpacity, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Share2, ShieldCheck, Zap,
  MapPin, Phone, MessageCircle, Calendar,
  Image as ImageIcon, CheckCircle2, Clock,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookingDetails, useUpdateBookingStatusMutation } from '../hooks';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { AnimatedButton } from '../components/AnimatedButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const P = {
  bg: '#060810',
  surface: '#0C0F1A',
  raised: '#111527',
  border: 'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.12)',
  cyan: '#00F5FF',
  cyanDim: '#00B8C0',
  cyanMuted: 'rgba(0,245,255,0.10)',
  cyanGlow: 'rgba(0,245,255,0.18)',
  success: '#00E676',
  successMuted: 'rgba(0,230,118,0.12)',
  error: '#FF4C6A',
  errorMuted: 'rgba(255,76,106,0.12)',
  orange: '#FF6B00',
  white: '#FFFFFF',
  text1: '#E8EAED',
  text2: '#7A8394',
  text3: '#3D4455',
};

const STATUS_MAP: Record<string, { color: string; muted: string; label: string }> = {
  pending: { color: P.orange, muted: 'rgba(255,107,0,0.12)', label: 'PENDING' },
  accepted: { color: P.cyan, muted: P.cyanMuted, label: 'ACCEPTED' },
  ongoing: { color: P.cyan, muted: P.cyanGlow, label: 'ONGOING' },
  completed: { color: P.success, muted: P.successMuted, label: 'COMPLETED' },
  cancelled: { color: P.error, muted: P.errorMuted, label: 'CANCELLED' },
};

const STEPS = ['pending', 'accepted', 'ongoing', 'completed'] as const;

// ─── Pulse dot ────────────────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [1, 1.5], [0.6, 0]),
  }));
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color }, animStyle]} />
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label, color = P.cyan }: any) {
  return (
    <View style={sl.row}>
      <View style={[sl.badge, { backgroundColor: color + '18' }]}>
        <Icon size={11} color={color} strokeWidth={2.5} />
      </View>
      <Text style={[sl.text, { color }]}>{label}</Text>
      <View style={[sl.line, { backgroundColor: color + '20' }]} />
    </View>
  );
}
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  badge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  line: { flex: 1, height: 1 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TransactionDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, amount: initialAmount } = useLocalSearchParams<{ id: string; amount?: string }>();
  const { role } = useAuth();

  const { data: booking, isLoading, refetch } = useBookingDetails(id);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateBookingStatusMutation();

  useEffect(() => {
    const unsub = socketService.on('booking:status', () => refetch());
    return () => unsub();
  }, [refetch]);

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.loading}>
          <ActivityIndicator color={P.cyan} size="large" />
          <Text style={styles.loadingText}>RETRIEVING MISSION DATA</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  const amount = booking?.totalAmount || initialAmount || '—';
  const status = booking?.status || 'accepted';
  const isWorker = role === 'worker';
  const partner = isWorker ? booking?.customer : booking?.worker;
  const st = STATUS_MAP[status] || STATUS_MAP.accepted;

  const stepIndex = STEPS.indexOf(status as any);

  const navigateToChat = () => {
    router.push({
      pathname: '/chat',
      params: { bookingId: id, recipientName: partner?.fullName || 'Partner', recipientId: partner?._id },
    });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.root}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft color={P.text1} size={20} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>BOOKING DETAILS</Text>
            <Text style={styles.headerTitle}>Mission Parameters</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn}>
            <Share2 color={P.text2} size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Status Badge ── */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: st.muted, borderColor: st.color + '40' }]}>
              <PulseDot color={st.color} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </Animated.View>

          {/* ── Progress Tracker ── */}
          {status !== 'cancelled' && (
            <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.tracker}>
              {STEPS.map((s, i) => {
                const done = i < stepIndex;
                const current = i === stepIndex;
                const color = done || current ? P.cyan : P.text3;
                return (
                  <React.Fragment key={s}>
                    <View style={styles.stepCol}>
                      <View style={[
                        styles.stepNode,
                        (done || current) && { borderColor: P.cyan, backgroundColor: done ? P.cyan : 'transparent' },
                        current && { shadowColor: P.cyan, shadowOpacity: 0.7, shadowRadius: 8, elevation: 8 },
                      ]}>
                        {done
                          ? <CheckCircle2 size={10} color="#000" strokeWidth={3} />
                          : current
                            ? <View style={styles.stepInnerDot} />
                            : null}
                      </View>
                      <Text style={[styles.stepLabel, { color }]}>{s.slice(0, 4).toUpperCase()}</Text>
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.stepTrack, done && { backgroundColor: P.cyan }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </Animated.View>
          )}

          {/* ── Amount Hero ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <View style={styles.amountCard}>
              <LinearGradient
                colors={['rgba(0,245,255,0.07)', 'transparent']}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* corner marks */}
              <View style={[styles.cTL, { borderColor: P.cyan + '50' }]} />
              <View style={[styles.cBR, { borderColor: P.cyan + '25' }]} />

              <Text style={styles.amountEyebrow}>MISSION VALUATION</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amountCurrency}>PKR</Text>
                <Text style={styles.amountValue}>{amount}</Text>
              </View>
              <View style={styles.datePill}>
                <Calendar size={11} color={P.text3} strokeWidth={2} />
                <Text style={styles.dateText}>
                  {booking?.scheduledDate
                    ? new Date(booking.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'PROTOCOL ACTIVE'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Visual Evidence ── */}
          {booking?.imageUrls && booking.imageUrls.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.section}>
              <SectionLabel icon={ImageIcon} label="VISUAL EVIDENCE" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                {booking.imageUrls.map((url: string, i: number) => (
                  <TouchableOpacity key={i} activeOpacity={0.88} style={styles.carouselThumb}>
                    <Image source={{ uri: url }} style={styles.carouselImg} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.carouselIndex}>{String(i + 1).padStart(2, '0')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* ── Partner Card ── */}
          <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.section}>
            <SectionLabel icon={ShieldCheck} label={isWorker ? 'CLIENT PROFILE' : 'ASSIGNED USTAD'} />
            <View style={styles.partnerCard}>
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <LinearGradient
                  colors={[P.cyanGlow, 'transparent']}
                  style={StyleSheet.absoluteFill}
                  borderRadius={20}
                />
                <Text style={styles.avatarInitial}>{partner?.fullName?.[0]?.toUpperCase() || 'U'}</Text>
              </View>
              <View style={styles.partnerMeta}>
                <Text style={styles.partnerRole}>{isWorker ? 'CLIENT' : 'SPECIALIST'}</Text>
                <Text style={styles.partnerName} numberOfLines={1}>
                  {partner?.fullName || 'Identifying...'}
                </Text>
              </View>
              {/* Action Buttons */}
              <View style={styles.partnerActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${partner?.phone}`)}
                >
                  <Phone size={16} color={P.cyan} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnFilled]}
                  onPress={navigateToChat}
                >
                  <MessageCircle size={16} color="#000" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── Details List ── */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
            <SectionLabel icon={Zap} label="MISSION DETAILS" />
            <View style={styles.detailsCard}>
              <DetailRow
                icon={Zap}
                label="CATEGORY"
                value={booking?.category || 'General Service'}
              />
              <View style={styles.divider} />
              <DetailRow
                icon={MapPin}
                label="SERVICE LOCATION"
                value={booking?.address || 'Standard Orbit'}
              />
              {booking?.scheduledTime && (
                <>
                  <View style={styles.divider} />
                  <DetailRow
                    icon={Clock}
                    label="SCHEDULED TIME"
                    value={booking.scheduledTime}
                  />
                </>
              )}
            </View>
          </Animated.View>

          {/* ── Mission Brief ── */}
          {booking?.description && (
            <Animated.View entering={FadeInDown.delay(360).duration(500)} style={styles.section}>
              <SectionLabel icon={ShieldCheck} label="MISSION BRIEF" />
              <View style={styles.briefCard}>
                <Text style={styles.briefText}>{booking.description}</Text>
              </View>
            </Animated.View>
          )}

          {/* ── Worker Controls ── */}
          {isWorker && status !== 'completed' && status !== 'cancelled' && (
            <Animated.View entering={FadeInDown.delay(420).duration(500)} style={styles.section}>
              <SectionLabel icon={ShieldCheck} label="OPERATIONAL CONTROLS" />
              {status === 'accepted' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'ongoing' })}
                  style={styles.ctaBtn}
                >
                  <LinearGradient colors={[P.cyan, P.cyanDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                    {isUpdating
                      ? <ActivityIndicator color="#000" />
                      : <>
                        <Zap size={16} color="#000" strokeWidth={2.5} />
                        <Text style={styles.ctaText}>Initialize Mission</Text>
                      </>}
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {status === 'ongoing' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'completed' })}
                  style={styles.ctaBtn}
                >
                  <LinearGradient colors={[P.success, '#00B85A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                    {isUpdating
                      ? <ActivityIndicator color="#000" />
                      : <>
                        <CheckCircle2 size={16} color="#000" strokeWidth={2.5} />
                        <Text style={styles.ctaText}>Finalize Deployment</Text>
                      </>}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* ── Client Active Notice ── */}
          {!isWorker && status === 'ongoing' && (
            <Animated.View entering={FadeInDown.delay(420).duration(500)} style={styles.activeNotice}>
              <ActivityIndicator size="small" color={P.cyan} />
              <Text style={styles.activeNoticeText}>Ustad is currently on-site performing the mission</Text>
            </Animated.View>
          )}

          {/* ── Client Settlement ── */}
          {!isWorker && status === 'completed' && booking?.paymentStatus !== 'paid' && (
            <Animated.View entering={FadeInDown.delay(420).duration(500)} style={styles.section}>
              <SectionLabel icon={ShieldCheck} label="MISSION SETTLEMENT" />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ 
                  pathname: '/payment', 
                  params: { bookingId: id, amount: amount } 
                })}
                style={styles.ctaBtn}
              >
                <LinearGradient colors={[P.cyan, P.cyanDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  <CheckCircle2 size={16} color="#000" strokeWidth={2.5} />
                  <Text style={styles.ctaText}>PROCEED TO PAYMENT</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Client Paid Notice ── */}
          {!isWorker && status === 'completed' && booking?.paymentStatus === 'paid' && (
            <Animated.View entering={FadeInDown.delay(420).duration(500)} style={styles.activeNotice}>
              <CheckCircle2 size={18} color={P.success} />
              <Text style={[styles.activeNoticeText, { color: P.success }]}>Mission Settlement Completed. Protocol Terminated.</Text>
            </Animated.View>
          )}

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={dr.row}>
      <View style={dr.iconBox}>
        <Icon size={15} color={P.cyan} strokeWidth={2} />
      </View>
      <View style={dr.content}>
        <Text style={dr.label}>{label}</Text>
        <Text style={dr.value} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}
const dr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: P.cyanMuted, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  label: { fontSize: 9, fontWeight: '800', color: P.text3, letterSpacing: 1.5, marginBottom: 3 },
  value: { fontSize: 14, fontWeight: '700', color: P.text1 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 10, fontWeight: '800', color: P.text3, letterSpacing: 2 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: P.border,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: P.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 3, color: P.text3, marginBottom: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: P.text1 },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  // Status
  statusRow: { alignItems: 'center', marginBottom: 24 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 30, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  // Tracker
  tracker: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 28, paddingHorizontal: 4,
  },
  stepCol: { alignItems: 'center', gap: 6 },
  stepNode: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: P.text3,
    backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  stepInnerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.cyan },
  stepLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, color: P.text3 },
  stepTrack: { flex: 1, height: 1.5, backgroundColor: P.text3 + '40', marginHorizontal: 4, marginTop: -18 },

  // Amount Card
  amountCard: {
    alignItems: 'center', marginBottom: 28,
    paddingVertical: 28, paddingHorizontal: 20,
    borderRadius: 24, borderWidth: 1, borderColor: P.border,
    backgroundColor: P.raised, overflow: 'hidden', position: 'relative',
  },
  cTL: { position: 'absolute', top: 12, left: 12, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 3 },
  cBR: { position: 'absolute', bottom: 12, right: 12, width: 10, height: 10, borderBottomWidth: 1, borderRightWidth: 1 },
  amountEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: P.text3, marginBottom: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amountCurrency: { fontSize: 16, fontWeight: '800', color: P.text3 },
  amountValue: { fontSize: 52, fontWeight: '900', color: P.white, letterSpacing: -1 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: P.border,
  },
  dateText: { fontSize: 10, fontWeight: '700', color: P.text3, letterSpacing: 0.5 },

  // Section
  section: { marginBottom: 24 },

  // Carousel
  carousel: { gap: 12, paddingRight: 4 },
  carouselThumb: {
    width: 160, height: 110, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: P.border, position: 'relative',
  },
  carouselImg: { width: '100%', height: '100%' },
  carouselIndex: {
    position: 'absolute', bottom: 8, left: 10,
    fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.55)', letterSpacing: 1,
  },

  // Partner Card
  partnerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: P.raised, borderRadius: 20,
    borderWidth: 1, borderColor: P.border, padding: 16,
  },
  avatarWrap: {
    width: 54, height: 54, borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1.5, borderColor: P.cyan + '35',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '900', color: P.cyan },
  partnerMeta: { flex: 1 },
  partnerRole: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: P.text3, marginBottom: 3 },
  partnerName: { fontSize: 17, fontWeight: '800', color: P.text1 },
  partnerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: P.cyanMuted, borderWidth: 1, borderColor: P.cyan + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnFilled: { backgroundColor: P.cyan, borderColor: P.cyan },

  // Details Card
  detailsCard: {
    backgroundColor: P.raised, borderRadius: 18,
    borderWidth: 1, borderColor: P.border, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: P.border, marginHorizontal: 16 },

  // Brief Card
  briefCard: {
    backgroundColor: P.raised, borderRadius: 18,
    borderWidth: 1, borderColor: P.border,
    padding: 18,
  },
  briefText: { fontSize: 14, color: P.text2, lineHeight: 22, fontWeight: '500' },

  // CTA
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.4 },

  // Active Notice
  activeNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: P.cyanMuted, borderRadius: 16,
    borderWidth: 1, borderColor: P.cyan + '25',
    padding: 18,
  },
  activeNoticeText: { flex: 1, fontSize: 12, color: P.cyan, fontWeight: '700', lineHeight: 18 },
});