import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme, useThemeColors, useThemeShadows } from '../../constants/Theme';
import { GlassCard } from './GlassCard';

const { width } = Dimensions.get('window');

interface JobAssignedSuccessModalProps {
  visible: boolean;
  booking: any;
  onClose: () => void;
  onContinue: () => void;
}

export function JobAssignedSuccessModal({ visible, booking, onClose, onContinue }: JobAssignedSuccessModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();

  if (!booking) return null;

  const clientName = booking.customer?.fullName || booking.clientMeta?.fullName || 'Client';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.modal.backdrop }]}>
        <Animated.View entering={ZoomIn.duration(500)} style={styles.container}>
          <GlassCard
            intensity={50}
            style={[styles.card, { borderColor: theme.isDark ? 'rgba(0, 255, 127, 0.3)' : 'rgba(0, 168, 107, 0.25)' }]}
            padding={0}
            contentStyle={styles.glassContent}
          >
            <LinearGradient
              colors={theme.isDark 
                ? [alpha(colors.cyan, 0.1), 'transparent'] 
                : ['rgba(0, 168, 107, 0.08)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={alpha(theme.colors.text.primary, 0.4)} />
            </TouchableOpacity>

            <View style={styles.innerContent}>
              <View style={styles.iconWrapper}>
                <View style={[
                  styles.glow, 
                  { 
                    backgroundColor: theme.isDark ? 'rgba(0, 255, 127, 0.15)' : 'rgba(0, 168, 107, 0.12)', 
                    shadowColor: theme.isDark ? '#00FF7F' : '#00A86B' 
                  }
                ]} />
                <CheckCircle2 size={54} color={theme.isDark ? '#00FF7F' : '#00A86B'} strokeWidth={2.5} />
              </View>

              <Text style={[styles.eyebrow, { color: theme.isDark ? '#00FF7F' : '#00A86B' }]}>
                {t('jobAssignedModal.eyebrow', 'JOB SECURED! 🎉')}
              </Text>
              
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                {t('jobAssignedModal.title', 'JOB ASSIGNED TO YOU')}
              </Text>

              <Text style={[styles.subtitle, { color: alpha(theme.colors.text.primary, 0.8) }]}>
                {t('jobAssignedModal.desc', 'This job has been assigned to you by {{clientName}} at your offered price!', { clientName })}
              </Text>

              <View style={[
                styles.detailsBox,
                {
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
                }
              ]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: alpha(theme.colors.text.primary, 0.4) }]}>SERVICE CATEGORY:</Text>
                  <Text style={[styles.detailVal, { color: theme.colors.text.primary }]}>{booking.category || 'Service request'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: alpha(theme.colors.text.primary, 0.4) }]}>AGREED PRICE:</Text>
                  <Text style={[styles.detailVal, { color: theme.isDark ? '#00F5FF' : '#007AFF', fontWeight: '900' }]}>
                    Rs. {Number(booking.totalAmount || booking.amount || booking.subtotal || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <ShieldCheck size={14} color={theme.isDark ? '#00FF7F' : '#00A86B'} />
                <Text style={[styles.securityTxt, { color: theme.isDark ? '#00FF7F' : '#00A86B' }]}>
                  {t('jobAssignedModal.verifiedBy', 'CONFIRMED BY APNAUSTAD')}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onContinue}
                style={styles.cta}
              >
                <LinearGradient
                  colors={theme.isDark ? ['#00FF7F', '#00F5FF'] : ['#00A86B', '#007AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={[styles.ctaText, { color: theme.colors.text.onBrand }]}>
                    {t('jobAssignedModal.continue', 'CONTINUE TO BOOKING')}
                  </Text>
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
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  detailsBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 25,
    opacity: 0.8,
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
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
