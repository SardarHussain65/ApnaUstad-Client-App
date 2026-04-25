import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  useSharedValue,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import {
  Zap,
  MapPin,
  CircleDollarSign,
  Navigation,
  X,
  Check,
  ShieldAlert,
  Target,
  Briefcase,
  Clock,
  Radio,
  Wifi,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;

interface IncomingJobModalProps {
  visible: boolean;
  job: any;
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

// Corner bracket component for HUD aesthetic
function CornerBracket({ position, color }: { position: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const rotations = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' };
  return (
    <View style={[
      styles.cornerBracket,
      {
        top: position.startsWith('t') ? 0 : undefined,
        bottom: position.startsWith('b') ? 0 : undefined,
        left: position.endsWith('l') ? 0 : undefined,
        right: position.endsWith('r') ? 0 : undefined,
        transform: [{ rotate: rotations[position] }],
      }
    ]}>
      <View style={[styles.bracketH, { backgroundColor: color }]} />
      <View style={[styles.bracketV, { backgroundColor: color }]} />
    </View>
  );
}

// Hex grid background cell
function HexCell({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <View style={[styles.hexCell, { left: x, top: y, opacity }]}>
      <View style={styles.hexShape} />
    </View>
  );
}

export function IncomingJobModal({ visible, job, onAccept, onReject, isLoading = false }: IncomingJobModalProps) {
  // Animation values
  const scanY = useSharedValue(-200);
  const glowPulse = useSharedValue(0);
  const cardEntrance = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const countdown = useSharedValue(29);
  const dataFlicker = useSharedValue(1);
  const borderFlow = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Scanning line that sweeps vertically
      scanY.value = withRepeat(
        withTiming(700, { duration: 2800, easing: Easing.linear }),
        -1,
        false
      );
      scanY.value = -200;

      // Outer glow breathing
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400 }),
          withTiming(0.3, { duration: 1400 })
        ),
        -1,
        true
      );

      // Icon ring pulse
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) })
        ),
        -1,
        true
      );

      // Data flicker effect
      dataFlicker.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0.6, { duration: 60 }),
          withTiming(1, { duration: 60 }),
          withTiming(0.8, { duration: 80 }),
          withTiming(1, { duration: 1800 }),
        ),
        -1,
        false
      );

      // Border flow animation
      borderFlow.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      scanY.value = -200;
      glowPulse.value = 0;
    }
  }, [visible]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
    opacity: interpolate(
      scanY.value,
      [-200, 0, 300, 600, 700],
      [0, 0.8, 0.5, 0.3, 0]
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const flickerStyle = useAnimatedStyle(() => ({
    opacity: dataFlicker.value,
  }));

  if (!job) return null;

  const isInstant = job.urgency === 'instant';
  const accentColor = isInstant ? '#00F0FF' : '#FF6B00';
  const accentSecondary = isInstant ? '#0066FF' : '#FF2D55';
  const accentDim = isInstant ? '#00F0FF30' : '#FF6B0030';

  // Generate hex grid positions
  const hexCells = [
    { x: 20, y: 30, opacity: 0.06 }, { x: 55, y: 10, opacity: 0.04 },
    { x: 90, y: 30, opacity: 0.08 }, { x: 125, y: 10, opacity: 0.03 },
    { x: 160, y: 30, opacity: 0.06 }, { x: 195, y: 10, opacity: 0.05 },
    { x: 230, y: 30, opacity: 0.07 }, { x: 265, y: 10, opacity: 0.04 },
    { x: 300, y: 30, opacity: 0.06 }, { x: 335, y: 10, opacity: 0.03 },
    { x: 37, y: 60, opacity: 0.05 }, { x: 72, y: 80, opacity: 0.07 },
    { x: 107, y: 60, opacity: 0.04 }, { x: 142, y: 80, opacity: 0.06 },
    { x: 177, y: 60, opacity: 0.08 }, { x: 212, y: 80, opacity: 0.05 },
    { x: 247, y: 60, opacity: 0.04 }, { x: 282, y: 80, opacity: 0.07 },
    { x: 317, y: 60, opacity: 0.03 }, { x: 352, y: 80, opacity: 0.05 },
  ];

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* Full screen backdrop */}
      <View style={styles.backdrop}>
        {/* Radial vignette overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Main content container */}
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.container}
        >
          {/* Outer glow ring behind card */}
          <Animated.View style={[styles.outerGlow, glowStyle, { shadowColor: accentColor }]} />

          {/* ─── MAIN CARD ─── */}
          <Animated.View
            entering={SlideInDown.duration(500).springify().damping(18)}
            style={styles.card}
          >
            {/* Card base layer - dark background */}
            <LinearGradient
              colors={['#08091A', '#0C0E24', '#080916']}
              style={styles.cardGradient}
            >
              {/* Hex grid pattern overlay */}
              <View style={styles.hexGrid}>
                {hexCells.map((cell, i) => (
                  <HexCell key={i} {...cell} />
                ))}
              </View>

              {/* Scanning beam */}
              <Animated.View style={[styles.scanBeam, { backgroundColor: accentColor }, scanStyle]} />

              {/* ── TOP STATUS BAR ── */}
              <View style={[styles.topBar, { borderBottomColor: accentColor + '25' }]}>
                <LinearGradient
                  colors={[accentColor + 'CC', accentSecondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.topBarGradient}
                >
                  {/* Left: Target label */}
                  <View style={styles.topBarLeft}>
                    <View style={styles.targetDot} />
                    <Target size={12} color="#000" strokeWidth={2.5} />
                    <Text style={styles.topBarLabel}>INTERCEPT ACTIVE</Text>
                  </View>

                  {/* Right: Countdown */}
                  <View style={styles.timerBox}>
                    <Clock size={10} color="#000" />
                    <Text style={styles.timerText}>00:29</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* ── HERO SECTION ── */}
              <View style={styles.heroSection}>
                {/* Signal rings behind icon */}
                <View style={styles.iconWrapper}>
                  {/* Outer pulsing rings */}
                  <Animated.View style={[styles.ring, styles.ring3, { borderColor: accentColor + '10' }, ringStyle]} />
                  <Animated.View style={[styles.ring, styles.ring2, { borderColor: accentColor + '20' }]} />
                  <Animated.View style={[styles.ring, styles.ring1, { borderColor: accentColor + '40' }]} />

                  {/* Icon circle */}
                  <LinearGradient
                    colors={[accentColor + '20', accentColor + '08']}
                    style={styles.iconCircle}
                  >
                    <View style={[styles.iconInner, { borderColor: accentColor + '60' }]}>
                      {isInstant
                        ? <Zap size={34} color={accentColor} fill={accentColor} />
                        : <Briefcase size={34} color={accentColor} />
                      }
                    </View>
                  </LinearGradient>
                </View>

                {/* Category title */}
                <Text style={styles.categoryTitle} numberOfLines={1}>
                  {job.category?.toUpperCase() || 'ELECTRICIAN'}
                </Text>

                {/* Type badge */}
                <View style={[styles.typeBadge, { borderColor: accentColor + '50' }]}>
                  <LinearGradient
                    colors={[accentColor + '12', accentColor + '06']}
                    style={styles.typeBadgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={[styles.badgeDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                      {isInstant ? 'INSTANT RESPONSE' : 'SCHEDULED MISSION'}
                    </Text>
                  </LinearGradient>
                </View>
              </View>

              {/* ── DIAGONAL SLASH DIVIDER ── */}
              <View style={styles.slashDivider}>
                <LinearGradient
                  colors={['transparent', accentColor + '60', accentColor, accentColor + '60', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.slashLine}
                />
              </View>

              {/* ── MISSION BRIEF ── */}
              <Animated.View style={[styles.briefCard, flickerStyle]}>
                <View style={[styles.briefHeader, { borderLeftColor: accentColor }]}>
                  <Radio size={11} color={accentColor} />
                  <Text style={[styles.briefHeaderText, { color: accentColor }]}>MISSION BRIEF</Text>
                  <View style={[styles.briefLiveDot, { backgroundColor: accentColor }]} />
                </View>
                <Text style={styles.briefText} numberOfLines={3}>
                  {job.description || "Inbound request for professional services. Secure the mission immediately."}
                </Text>
              </Animated.View>

              {/* ── DATA PANELS ── */}
              <View style={styles.dataPanels}>
                {/* Earning panel */}
                <View style={[styles.dataPanel, { borderColor: accentColor + '30' }]}>
                  <LinearGradient
                    colors={[accentColor + '10', 'transparent']}
                    style={styles.dataPanelGrad}
                  >
                    <CircleDollarSign size={16} color={accentColor} />
                    <Text style={[styles.dataPanelValue, { color: '#FFFFFF' }]}>
                      {isInstant ? `Rs. ${job.hourlyRate || '500'}` : 'OPEN BID'}
                    </Text>
                    <Text style={[styles.dataPanelLabel, { color: accentColor + 'AA' }]}>
                      {isInstant ? 'EST. EARNING' : 'COMPETITIVE'}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Divider */}
                <View style={[styles.panelDivider, { backgroundColor: accentColor + '30' }]} />

                {/* Distance panel */}
                <View style={[styles.dataPanel, { borderColor: accentColor + '30' }]}>
                  <LinearGradient
                    colors={[accentColor + '10', 'transparent']}
                    style={styles.dataPanelGrad}
                  >
                    <Navigation size={16} color={accentColor} />
                    <Text style={[styles.dataPanelValue, { color: '#FFFFFF' }]}>1.4 KM</Text>
                    <Text style={[styles.dataPanelLabel, { color: accentColor + 'AA' }]}>DISTANCE</Text>
                  </LinearGradient>
                </View>
              </View>

              {/* ── LOCATION ROW ── */}
              <View style={[styles.locationRow, { borderColor: accentColor + '20' }]}>
                <MapPin size={13} color={accentColor + 'AA'} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {job.address || "Sector 7G, Neo Lahore"}
                </Text>
                <View style={[styles.locationPing, { backgroundColor: accentColor }]} />
              </View>

              {/* ── CORNER BRACKETS ── */}
              <CornerBracket position="tl" color={accentColor} />
              <CornerBracket position="tr" color={accentColor} />
              <CornerBracket position="bl" color={accentColor} />
              <CornerBracket position="br" color={accentColor} />

              {/* ── ACTION FOOTER ── */}
              <View style={styles.footer}>
                {/* Reject button */}
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={onReject}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.rejectInner}>
                    <X size={20} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>

                {/* Accept button */}
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={onAccept}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={isInstant
                      ? ['#00F0FF', '#008FFF', '#0055FF']
                      : ['#FF6B00', '#FF3D00', '#FF0055']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.acceptGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <>
                        {/* Left glow accent */}
                        <View style={styles.acceptGlowDot} />
                        <Check size={20} color="#000" strokeWidth={3} />
                        <Text style={styles.acceptText}>
                          {isInstant ? 'ACCEPT MISSION' : 'VIEW DETAILS'}
                        </Text>
                        {/* Right chevron indicator */}
                        <View style={styles.acceptChevron}>
                          <Text style={styles.acceptChevronText}>›</Text>
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </LinearGradient>
          </Animated.View>

          {/* ── ALERT STRIP BELOW CARD ── */}
          <Animated.View
            entering={FadeIn.delay(400).duration(600)}
            style={styles.alertStrip}
          >
            <View style={styles.alertInner}>
              <ShieldAlert size={13} color="#FF3B3B" />
              <Text style={styles.alertText}>NEURAL LINK EXPIRES IN 30S</Text>
              {/* Blinking dot */}
              <View style={styles.alertBlink} />
            </View>
          </Animated.View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 4, 18, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },

  outerGlow: {
    position: 'absolute',
    width: CARD_WIDTH + 40,
    height: 580,
    borderRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 0,
  },

  // ─── CARD ───
  card: {
    width: CARD_WIDTH,
    borderRadius: 28,
    overflow: 'hidden',
    height: height * 0.75,
    // Drop shadow
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },

  cardGradient: {
    flex: 1,
    borderRadius: 28,
    height: height * 0.75, // Explicit height based on devic
    borderWidth: 0.5,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    overflow: 'hidden',
  },

  // Hex grid
  hexGrid: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  hexCell: {
    position: 'absolute',
    width: 30,
    height: 34,
  },
  hexShape: {
    width: 30,
    height: 34,
    borderWidth: 0.5,
    borderColor: '#00F0FF',
    backgroundColor: 'transparent',
    // Hexagon via border radius approximation
    borderRadius: 4,
    transform: [{ rotate: '30deg' }],
  },

  // Scan beam
  scanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.15,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  // ─── TOP BAR ───
  topBar: {
    borderBottomWidth: 0.5,
    overflow: 'hidden',
  },
  topBarGradient: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    opacity: 0.6,
  },
  topBarLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ─── HERO ───
  heroSection: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
  },

  iconWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  ring1: { width: 86, height: 86 },
  ring2: { width: 96, height: 96 },
  ring3: { width: 110, height: 110 },

  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginBottom: 12,
    textShadowColor: 'rgba(0,240,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  typeBadge: {
    borderWidth: 0.5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  typeBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ─── SLASH DIVIDER ───
  slashDivider: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  slashLine: {
    height: 1,
    width: '100%',
  },

  // ─── BRIEF ───
  briefCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
    marginBottom: 14,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 2,
    paddingLeft: 8,
    marginBottom: 10,
  },
  briefHeaderText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  briefLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 4,
    opacity: 0.8,
  },
  briefText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 21,
    letterSpacing: 0.2,
  },

  // ─── DATA PANELS ───
  dataPanels: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  dataPanel: {
    flex: 1,
    overflow: 'hidden',
  },
  dataPanelGrad: {
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  dataPanelValue: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dataPanelLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  panelDivider: {
    width: 0.5,
    marginVertical: 12,
  },

  // ─── LOCATION ───
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  locationPing: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },

  // ─── CORNER BRACKETS ───
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
  },
  bracketH: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  bracketV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    height: 16,
    borderRadius: 1,
  },

  // ─── FOOTER ───
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  rejectBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  rejectInner: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  acceptBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    // Subtle shadow
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  acceptGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  acceptGlowDot: {
    position: 'absolute',
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  acceptText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  acceptChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptChevronText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '900',
    marginTop: -1,
  },

  // ─── ALERT STRIP ───
  alertStrip: {
    marginTop: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,59,59,0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,59,59,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF3B3B',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  alertBlink: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF3B3B',
    marginLeft: 4,
  },
});