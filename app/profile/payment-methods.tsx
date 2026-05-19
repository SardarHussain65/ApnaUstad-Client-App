import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Banknote, ChevronRight, History, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';

export default function PaymentMethodsScreen() {
  return (
    <BackgroundWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader title="Payment Method" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <GlassCard style={styles.walletCard} intensity={34} padding={Spacing.xl} hasGlow glowColor={Colors.worker}>
            <View style={styles.iconOrbit}>
              <Banknote size={34} color={Colors.worker} />
            </View>
            <Text style={[styles.title, Typography.threeD]}>Cash Only</Text>
            <Text style={styles.subtitle}>
              This version records cash settlements after the client pays the Ustad directly.
            </Text>
            <View style={styles.statusPill}>
              <ShieldCheck size={14} color={Colors.success} />
              <Text style={styles.statusText}>Ledger history enabled</Text>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320)} style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement Flow</Text>
          <GlassCard intensity={20} padding={Spacing.m} style={styles.flowCard}>
            <FlowRow label="1" title="Worker completes mission" />
            <FlowRow label="2" title="Client pays cash directly" />
            <FlowRow label="3" title="Client confirms cash paid in app" />
            <FlowRow label="4" title="Wallet and admin ledger update" isLast />
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(440)} style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          <TouchableOpacity activeOpacity={0.85}>
            <GlassCard style={styles.historyCard} intensity={20} padding={Spacing.m}>
              <View style={styles.historyContent}>
                <View style={styles.historyIconBox}>
                  <History size={20} color={Colors.primary} />
                </View>
                <View style={styles.historyCopy}>
                  <Text style={styles.historyLabel}>Cash Settlement History</Text>
                  <Text style={styles.historySub}>Available from the Wallet tab</Text>
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

function FlowRow({ label, title, isLast }: { label: string; title: string; isLast?: boolean }) {
  return (
    <View style={[styles.flowRow, isLast && styles.flowRowLast]}>
      <View style={styles.flowNumber}>
        <Text style={styles.flowNumberText}>{label}</Text>
      </View>
      <Text style={styles.flowTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 34,
  },
  walletCard: {
    alignItems: 'center',
    ...Shadows.glow,
  },
  iconOrbit: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  statusPill: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.26)',
  },
  statusText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginLeft: 4,
    marginBottom: 12,
  },
  flowCard: {
    borderRadius: 22,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  flowRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  flowNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.25)',
  },
  flowNumberText: {
    color: Colors.cyan,
    fontWeight: '900',
    fontSize: 12,
  },
  flowTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  historyCard: {
    borderRadius: 18,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,245,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCopy: {
    flex: 1,
  },
  historyLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  historySub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
});
