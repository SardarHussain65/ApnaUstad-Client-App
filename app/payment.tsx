import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Dimensions, ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { 
  ChevronLeft, CreditCard, Wallet, Banknote, 
  ShieldCheck, CheckCircle2, Lock, ArrowRight
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { usePayBookingMutation } from '../hooks';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Credit / Debit Card',
    icon: CreditCard,
    color: '#00F5FF',
    desc: 'Secure payment via Stripe gateway',
  },
  {
    id: 'easypaisa',
    label: 'Easypaisa / JazzCash',
    icon: Wallet,
    color: '#34C759',
    desc: 'Mobile wallet instant transfer',
  },
  {
    id: 'cash',
    label: 'Cash Payment',
    icon: Banknote,
    color: '#FF8C00',
    desc: 'Pay directly to the Ustad',
  }
];

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId, amount } = useLocalSearchParams<{ bookingId: string, amount: string }>();
  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { mutate: payBooking } = usePayBookingMutation();

  const handlePayment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    // Simulate payment gateway processing
    setTimeout(() => {
      payBooking({
        bookingId: bookingId as string,
        paymentMethod: selectedMethod as any
      }, {
        onSuccess: () => {
          setIsProcessing(false);
          setIsSuccess(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 2500);
        },
        onError: () => {
          setIsProcessing(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      });
    }, 2000);
  };

  if (isSuccess) {
    return (
      <BackgroundWrapper>
        <View style={styles.successContainer}>
          <Animated.View entering={ZoomIn.duration(600)}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <CheckCircle2 size={60} color={Colors.success} strokeWidth={2.5} />
              </View>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(300)}>
            <Text style={styles.successTitle}>SETTLEMENT COMPLETE</Text>
            <Text style={styles.successSubtitle}>Your mission payment has been processed successfully.</Text>
          </Animated.View>
          <View style={styles.successFooter}>
             <ShieldCheck size={14} color={Colors.success} />
             <Text style={styles.successSecurityText}>SECURE TRANSACTION ID: #USTAD-{Math.floor(Math.random()*100000)}</Text>
          </View>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MISSION SETTLEMENT</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Amount Summary */}
          <Animated.View entering={FadeInDown.duration(600)}>
            <GlassCard intensity={20} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL PAYABLE AMOUNT</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currency}>PKR</Text>
                <Text style={styles.amount}>{amount}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.lockRow}>
                <Lock size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.lockText}>ENCRYPTED PAYMENT PROTOCOL</Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Text style={styles.sectionTitle}>SELECT SETTLEMENT METHOD</Text>

          {/* Payment Methods */}
          <View style={styles.methodsGrid}>
            {PAYMENT_METHODS.map((method, index) => {
              const isSelected = selectedMethod === method.id;
              const Icon = method.icon;
              
              return (
                <Animated.View key={method.id} entering={FadeInDown.delay(index * 100).duration(600)}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedMethod(method.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <GlassCard
                      intensity={isSelected ? 40 : 15}
                      style={[
                        styles.methodCard,
                        isSelected && { borderColor: method.color, borderWidth: 1.5 }
                      ]}
                      padding={Spacing.m}
                    >
                      <View style={styles.methodHeader}>
                        <View style={[styles.iconBox, { backgroundColor: method.color + '20' }]}>
                          <Icon size={24} color={method.color} strokeWidth={2} />
                        </View>
                        <View style={styles.radioOuter}>
                          {isSelected && <View style={[styles.radioInner, { backgroundColor: method.color }]} />}
                        </View>
                      </View>
                      <Text style={[styles.methodLabel, isSelected && { color: method.color }]}>
                        {method.label}
                      </Text>
                      <Text style={styles.methodDesc}>{method.desc}</Text>
                    </GlassCard>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer CTA */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
           <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePayment}
              disabled={isProcessing}
              style={styles.payBtn}
           >
             <LinearGradient
               colors={['#00F5FF', '#00B8C0']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 0 }}
               style={styles.payGradient}
             >
               {isProcessing ? (
                 <ActivityIndicator color="#000" />
               ) : (
                 <>
                   <Text style={styles.payBtnText}>CONFIRM SETTLEMENT</Text>
                   <ArrowRight size={18} color="#000" strokeWidth={2.5} />
                 </>
               )}
             </LinearGradient>
           </TouchableOpacity>
        </View>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  summaryCard: {
    alignItems: 'center',
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  currency: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
  },
  amount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 15,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockText: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginBottom: 20,
  },
  methodsGrid: {
    gap: 16,
  },
  methodCard: {
    borderRadius: 20,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  methodLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    backgroundColor: 'rgba(5, 5, 16, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 15,
  },
  payBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  payGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  successIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  successIconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  successFooter: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.6,
  },
  successSecurityText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.success,
    letterSpacing: 1.5,
  }
});
