import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { CreditCard, Plus, Wallet, History, ChevronRight, Dot } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';

export default function PaymentMethodsScreen() {
  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title="Payment Methods" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <GlassCard style={styles.walletCard} intensity={30} padding={Spacing.xl}>
            <View style={styles.walletHeader}>
              <View style={styles.walletIconBox}>
                <Wallet size={24} color={Colors.primary} />
              </View>
              <Text style={styles.walletLabel}>Cosmic Wallet</Text>
            </View>
            <Text style={[styles.balanceAmount, Typography.threeD]}>$4,280.50</Text>
            <TouchableOpacity style={styles.addFundsBtn}>
              <Text style={styles.addFundsText}>+ REFUEL BALANCE</Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Digital Assets</Text>
            <TouchableOpacity style={styles.addCardMini}>
              <Plus size={16} color={Colors.primary} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <CosmicCard 
            type="VISA" 
            number="•••• 4820" 
            expiry="12/26" 
            color={[Colors.primary, Colors.secondary]} 
            delay={400} 
            isActive 
          />
          <CosmicCard 
            type="MASTERCARD" 
            number="•••• 9105" 
            expiry="08/25" 
            color={['#FF9500', '#FF3B30']} 
            delay={500} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantum Ledger</Text>
          <TouchableOpacity style={styles.historyBtn}>
            <GlassCard style={styles.historyCard} intensity={20} padding={Spacing.m}>
              <View style={styles.historyContent}>
                <View style={styles.historyIconBox}>
                  <History size={20} color={Colors.primary} />
                </View>
                <Text style={styles.historyLabel}>Full Transaction History</Text>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <Animated.View entering={FadeInDown.delay(700)}>
          <TouchableOpacity style={styles.addNewBtn}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.addNewGradient}
            >
              <Plus size={20} color={Colors.primary} strokeWidth={3} />
              <Text style={styles.addNewText}>Register New Payment Protocol</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface CosmicCardProps {
  type: string;
  number: string;
  expiry: string;
  color: [string, string, ...string[]];
  delay: number;
  isActive?: boolean;
}

function CosmicCard({ type, number, expiry, color, delay, isActive }: CosmicCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity style={styles.cardContainer}>
        <LinearGradient
          colors={color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <CreditCard size={28} color="#fff" opacity={0.8} />
            <Text style={styles.cardType}>{type}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardNumber}>{number}</Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardExpiry}>{expiry}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>DEFAULT</Text>
              </View>
            )}
          </View>
          <View style={styles.cardPattern} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 40,
  },
  walletCard: {
    alignItems: 'center',
    ...Shadows.glow,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  walletIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 24,
  },
  addFundsBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  addFundsText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginLeft: 4,
  },
  addCardMini: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    marginBottom: 16,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    ...Shadows.depth,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardType: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardBody: {
    marginVertical: 10,
  },
  cardNumber: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardExpiry: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardPattern: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  historyBtn: {
    marginBottom: 8,
  },
  historyCard: {
    ...Shadows.card,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addNewBtn: {
    marginTop: 10,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  addNewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  addNewText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
