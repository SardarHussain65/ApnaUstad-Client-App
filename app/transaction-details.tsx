import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, ShieldCheck, Zap, Download, Info, Copy, CheckCircle2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function TransactionDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const sealRotation = useSharedValue(0);
  const statusPulse = useSharedValue(1);

  React.useEffect(() => {
    sealRotation.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
    statusPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const sealAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sealRotation.value}deg` }]
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statusPulse.value }],
    opacity: interpolate(statusPulse.value, [1, 1.2], [1, 0.6])
  }));

  const amount = params.amount || '4,500';
  const title = params.title || 'Deep Cleaning Service';
  const date = params.date || 'Oct 24, 2024 • 02:30 PM';
  const isIncome = !amount.toString().includes('-');

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Header */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transaction Vault</Text>
            <TouchableOpacity>
              <Share2 color="#fff" size={22} />
            </TouchableOpacity>
          </View>
          <Animated.View entering={FadeInUp.delay(200).springify().damping(15)}>
            {/* Holographic Receipt Ticket */}
            <View style={styles.ticketContainer}>
              <GlassCard intensity={40} style={styles.mainTicket}>
                {/* Notches */}
                <View style={styles.notchLeft} />
                <View style={styles.notchRight} />

                {/* Status Section */}
                <View style={styles.statusBox}>
                  <View style={styles.pulseContainer}>
                    <Animated.View style={[styles.statusPulse, pulseStyle]} />
                    <View style={[styles.statusDot, { backgroundColor: isIncome ? Colors.success : Colors.cyan }]} />
                  </View>
                  <Text style={[styles.statusText, { color: isIncome ? Colors.success : Colors.cyan }]}>
                    SETTLED & VERIFIED
                  </Text>
                </View>

                {/* Amount Section */}
                <View style={styles.amountSection}>
                  <Text style={styles.amountLabel}>NET SETTLEMENT</Text>
                  <View style={styles.amountRow}>
                    <Text style={[styles.currency, Typography.threeD]}>PKR</Text>
                    <Text style={[styles.amount, Typography.threeD]}>{amount.toString().replace('-', '')}</Text>
                    <Text style={styles.decimals}>.00</Text>
                  </View>
                  <Text style={styles.dateText}>{date}</Text>
                </View>

                {/* Dashed Divider */}
                <View style={styles.dividerWrapper}>
                   <View style={styles.dashedLine} />
                </View>

                {/* Breakdown List */}
                <View style={styles.breakdownSection}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service Base Fare</Text>
                    <Text style={styles.breakdownValue}>Rs. 4,200.00</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Quantum Platform Fee</Text>
                    <Text style={styles.breakdownValue}>Rs. 250.00</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Energy Tax (VAT)</Text>
                    <Text style={styles.breakdownValue}>Rs. 50.00</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>TOTAL FLOW</Text>
                    <Text style={styles.totalValue}>Rs. {amount.toString().replace('-', '')}.00</Text>
                  </View>
                </View>

                {/* Payment Origin */}
                <GlassCard intensity={15} style={styles.originCard}>
                  <View style={styles.originIcon}>
                     <Zap size={18} color={Colors.primary} fill={Colors.primary} />
                  </View>
                  <View style={styles.originInfo}>
                    <Text style={styles.originLabel}>SETTLEMENT ORIGIN</Text>
                    <Text style={styles.originValue}>{title}</Text>
                  </View>
                  <CheckCircle2 size={20} color={Colors.success} />
                </GlassCard>

                {/* Security Seal */}
                <View style={styles.sealContainer}>
                  <Animated.View style={[styles.sealWrapper, sealAnimatedStyle]}>
                    <ShieldCheck size={40} color="rgba(255,255,255,0.15)" strokeWidth={1} />
                  </Animated.View>
                  <View style={styles.securityInfo}>
                    <Text style={styles.securityText}>ENCRYPTED BY APNAUSTAD</Text>
                    <Text style={styles.hashText}>Hash: 0x82f...a12c</Text>
                  </View>
                </View>
              </GlassCard>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.actionSection}>
             <TouchableOpacity style={styles.mainAction}>
                <LinearGradient
                  colors={[Colors.primary, Colors.purple]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.actionGradient}
                >
                  <Download size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.actionText}>EXPORT AS DIGITAL ASSET</Text>
                </LinearGradient>
             </TouchableOpacity>

             <View style={styles.secondaryActions}>
                <TouchableOpacity style={styles.subAction}>
                   <Copy size={20} color="rgba(255,255,255,0.6)" />
                   <Text style={styles.subActionText}>Copy ID</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subAction}>
                   <Info size={20} color="rgba(255,255,255,0.6)" />
                   <Text style={styles.subActionText}>Report</Text>
                </TouchableOpacity>
             </View>
          </Animated.View>
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  ticketContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 20,
  },
  mainTicket: {
    borderRadius: 30,
    padding: 24,
    paddingTop: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notchLeft: {
    position: 'absolute',
    left: -15,
    top: '55%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000', // Matches background wrapper somewhat
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  notchRight: {
    position: 'absolute',
    right: -15,
    top: '55%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  pulseContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    position: 'absolute',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  amountLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '900',
    marginRight: 6,
  },
  amount: {
    fontSize: 48,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -1,
  },
  decimals: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '900',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginTop: 10,
  },
  dividerWrapper: {
    height: 1,
    width: '100%',
    marginVertical: 40,
  },
  dashedLine: {
    height: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  breakdownSection: {
    gap: 16,
    marginBottom: 40,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  totalLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 18,
    color: Colors.cyan,
    fontWeight: '900',
  },
  originCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 40,
  },
  originIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(30,144,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originInfo: {
    flex: 1,
    marginLeft: 15,
  },
  originLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  originValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  sealContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  sealWrapper: {
    marginBottom: 15,
  },
  securityInfo: {
    alignItems: 'center',
  },
  securityText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  hashText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'Courier',
    marginTop: 4,
  },
  actionSection: {
    marginTop: 30,
    gap: 20,
  },
  mainAction: {
    width: '100%',
  },
  actionGradient: {
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 20,
  },
  subAction: {
    alignItems: 'center',
    gap: 6,
  },
  subActionText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
  }
});
