import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  Share2,
  X,
  FileCheck2,
  MapPin,
  HeartHandshake,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha, BorderRadius, Spacing } from '../../constants/Theme';
import { cleanAddressString } from '../../hooks';

interface SafetyShieldModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  partnerName: string;
  partnerCategory?: string;
  isPartnerVerified?: boolean;
  address?: string;
  isWorker: boolean;
}

export function SafetyShieldModal({
  visible,
  onClose,
  bookingId,
  partnerName,
  partnerCategory,
  isPartnerVerified = true,
  address,
  isWorker,
}: SafetyShieldModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleCallEmergency = (number: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void Linking.openURL(`tel:${number}`);
  };

  const cleanedAddress = cleanAddressString(address || '');

  const handleShareTrip = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const roleLabel = isWorker ? 'client' : 'Ustad';
      const shareMessage = `🛡️ Apna Ustad Live Mission Tracking\n\n` +
        `I am currently in an active service session with ${partnerName} (${roleLabel}).\n` +
        (partnerCategory ? `Service: ${partnerCategory}\n` : '') +
        (cleanedAddress ? `Location: ${cleanedAddress}\n` : '') +
        `Booking Ref: #${bookingId.slice(-6).toUpperCase()}\n\n` +
        `Shared via Apna Ustad Safety Shield.`;

      await Share.share({
        message: shareMessage,
        title: 'Apna Ustad Active Service Safety Tracking',
      });
    } catch (err) {
      console.warn('Could not share safety link:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <BlurView
          intensity={theme.isDark ? 50 : 25}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.shieldBadge, { backgroundColor: alpha(theme.colors.brand.primary, 0.14), borderWidth: 1.5, borderColor: alpha(theme.colors.brand.primary, 0.35) }]}>
                <ShieldCheck size={24} color={theme.colors.brand.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                  {t('safety.shieldTitle', 'Safety & Emergency Shield')}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                  {t('safety.shieldDesc', 'Your safety is our highest priority')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}
              hitSlop={8}
            >
              <X size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Identity Verification Badge */}
            <View
              style={[
                styles.identityCard,
                {
                  backgroundColor: theme.colors.surface.subtle,
                  borderColor: theme.colors.border.default,
                },
              ]}
            >
              <View style={styles.partnerRow}>
                <FileCheck2 size={22} color={theme.colors.status.success} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.partnerName, { color: theme.colors.text.primary }]}>
                    {partnerName}
                  </Text>
                  <Text style={[styles.partnerStatus, { color: theme.colors.status.success }]}>
                    ✓ {t('safety.verifiedGovt', 'Government CNIC & Profile Verified')}
                  </Text>
                </View>
              </View>
              {cleanedAddress ? (
                <View style={[styles.addressRow, { borderTopColor: theme.colors.border.subtle }]}>
                  <MapPin size={14} color={theme.colors.text.secondary} />
                  <Text style={[styles.addressText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                    {cleanedAddress}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Quick Share Live Status */}
            <TouchableOpacity
              style={[styles.shareCard, { backgroundColor: alpha(theme.colors.brand.primary, 0.1), borderColor: alpha(theme.colors.brand.primary, 0.45) }]}
              onPress={handleShareTrip}
              activeOpacity={0.8}
            >
              <Share2 size={20} color={theme.colors.brand.primary} />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.shareTitle, { color: theme.colors.text.primary }]}>
                  {t('safety.shareTripTitle', 'Share Mission with Family')}
                </Text>
                <Text style={[styles.shareSubtitle, { color: theme.colors.text.secondary }]}>
                  {t('safety.shareTripDesc', 'Send live details & coordinates via WhatsApp or SMS')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Emergency Hotline Buttons */}
            <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
              {t('safety.emergencyHotlines', 'EMERGENCY HOTLINES (PAKISTAN)')}
            </Text>

            <View style={styles.hotlineGrid}>
              <TouchableOpacity
                style={[styles.emergencyBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => handleCallEmergency('15')}
                activeOpacity={0.85}
              >
                <PhoneCall size={18} color="#FFFFFF" />
                <Text style={styles.emergencyBtnText}>Police (15)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.emergencyBtn, { backgroundColor: '#D97706' }]}
                onPress={() => handleCallEmergency('1122')}
                activeOpacity={0.85}
              >
                <AlertTriangle size={18} color="#FFFFFF" />
                <Text style={styles.emergencyBtnText}>Rescue (1122)</Text>
              </TouchableOpacity>
            </View>

            {/* Support Helpline */}
            <TouchableOpacity
              style={[
                styles.supportRow,
                {
                  backgroundColor: theme.colors.surface.subtle,
                  borderColor: theme.colors.border.default,
                },
              ]}
              onPress={() => handleCallEmergency('+923000000000')}
              activeOpacity={0.8}
            >
              <HeartHandshake size={20} color={theme.colors.brand.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.supportTitle, { color: theme.colors.text.primary }]}>
                  {t('safety.apnaUstadSupport', 'Apna Ustad Safety Desk')}
                </Text>
                <Text style={[styles.supportSub, { color: theme.colors.text.secondary }]}>
                  {t('safety.supportSub', '24/7 dedicated dispute & incident assistance')}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 28,
    borderWidth: 1.8,
    padding: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollArea: {
    maxHeight: 460,
  },
  identityCard: {
    borderRadius: 18,
    padding: 15,
    borderWidth: 1.6,
    marginBottom: 14,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  partnerStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.6,
    padding: 15,
    marginBottom: 18,
  },
  shareTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  shareSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  hotlineGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  emergencyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emergencyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 18,
    borderWidth: 1.6,
    marginBottom: 10,
  },
  supportTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  supportSub: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
});

