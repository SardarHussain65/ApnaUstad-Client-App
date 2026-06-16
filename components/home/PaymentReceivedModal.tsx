import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme, useThemeColors } from '../../constants/Theme';
import { GlassCard } from './GlassCard';
import { useThemeShadows } from '../../constants/Theme';

const { width } = Dimensions.get('window');

interface PaymentReceivedModalProps {
  visible: boolean;
  booking: any;
  onClose: () => void;
}

export function PaymentReceivedModal({ visible, booking, onClose }: PaymentReceivedModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();

  if (!booking) return null;

  const handleAcknowledge = () => {
    onClose();
    router.replace('/(tabs)');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: theme.colors.modal.backdrop }]}>
        <Animated.View entering={ZoomIn.duration(500)} style={styles.container}>
          <GlassCard
            intensity={50}
            style={styles.card}
            padding={0}
            contentStyle={styles.glassContent}
          >
            <LinearGradient
              colors={[alpha(colors.cyan, 0.1), 'transparent']}
              style={StyleSheet.absoluteFill}
            />

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={alpha(theme.colors.text.primary, 0.4)} />
            </TouchableOpacity>

            <View style={styles.innerContent}>
              <View style={styles.iconWrapper}>
                <View style={[styles.glow, { backgroundColor: alpha(colors.cyan, 0.15), shadowColor: colors.cyan }]} />
                <CheckCircle2 size={54} color={colors.cyan} strokeWidth={2.5} />
              </View>

              <Text style={[styles.eyebrow, { color: alpha(theme.colors.text.primary, 0.3) }]}>{t('paymentReceivedModal.eyebrow', 'PAYMENT RECEIVED ✅')}</Text>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>{t('paymentReceivedModal.title', 'PAYMENT RECEIVED')}</Text>

              <View style={styles.amountBox}>
                <Text style={[styles.currency, { color: colors.cyan }]}>{t('paymentReceivedModal.currency', 'PKR')}</Text>
                <Text style={[styles.amount, { color: theme.colors.text.primary }]}>{booking.totalAmount || booking.amount || '—'}</Text>
              </View>

              <Text style={[styles.category, { color: alpha(theme.colors.text.primary, 0.85) }]}>{booking.category || t('jobDetails.defaultTitle', 'Service request')}</Text>
              <Text style={[styles.subtitle, { color: alpha(theme.colors.text.primary, 0.4) }]}>{t('paymentReceivedModal.subtitle', 'Payment has been verified and deposited into your wallet.')}</Text>

              <View style={styles.footerRow}>
                <ShieldCheck size={14} color={colors.cyan} />
                <Text style={[styles.securityTxt, { color: colors.cyan }]}>{t('paymentReceivedModal.verifiedBy', 'VERIFIED BY APNAUSTAD')}</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAcknowledge}
                style={styles.cta}
              >
                <LinearGradient
                  colors={[colors.cyan, alpha(theme.colors.brand.secondary, 0.7)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={[styles.ctaText, { color: theme.colors.text.onBrand }]}>{t('paymentReceivedModal.gotIt', 'GOT IT')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 350,
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContent: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  glow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 25,
    textAlign: 'center',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 18,
  },
  currency: {
    fontSize: 16,
    fontWeight: '800',
  },
  amount: {
    fontSize: 40,
    fontWeight: '900',
  },
  category: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 35,
    paddingHorizontal: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 35,
    opacity: 0.7,
  },
  securityTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cta: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});