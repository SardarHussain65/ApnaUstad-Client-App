import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MapPin, Phone, Mail, Award, Zap, Briefcase, Star, TrendingUp, BadgeCheck } from 'lucide-react-native';
import { BeautifulModal } from './BeautifulModal';
import { useWorker } from '../../hooks';
import { Spacing, Typography, alpha, getAccessibleColor, isLightColor, useTheme, useThemeColors } from '../../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface WorkerDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  workerId: string | null;
  category?: string;
  themeColor?: string;
  onDeploy?: (worker: any) => void;
}

export function WorkerDetailsModal({
  visible,
  onClose,
  workerId,
  category,
  themeColor,
  onDeploy,
}: WorkerDetailsModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const modalThemeColor = themeColor || colors.cyan;
  const accessibleColor = getAccessibleColor(modalThemeColor, theme.isDark);
  const isBtnLight = isLightColor(modalThemeColor);
  const btnTextColor = isBtnLight ? '#0A0A1F' : '#FFFFFF';
  const starColor = theme.isDark ? '#FFD700' : '#D97706';
  const statusSuccessColor = theme.isDark ? '#00E5A0' : theme.colors.status.success;
  const statusBusyColor = theme.isDark ? '#FF4C6A' : theme.colors.status.error;
  const { data: worker, isLoading } = useWorker(workerId || undefined, category);
  const [imageError, setImageError] = React.useState(false);

  if (!visible) return null;

  const isValidImage = worker?.profileImage && worker.profileImage !== 'null' && worker.profileImage !== 'undefined' && worker.profileImage.trim() !== '';
  const avatarUri = (isValidImage && !imageError)
    ? worker.profileImage
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(worker?.fullName || 'W')}&background=0d0d1a&color=fff&size=200&bold=true`;

  return (
    <BeautifulModal
      visible={visible}
      onClose={onClose}
      title={t('workerDetailsModal.title', 'Ustad Details')}
      height="85%"
      glowColor={themeColor}
      showCloseButton
    >
      {isLoading || !worker ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accessibleColor} />
          <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.fetchingProfile', 'Fetching profile...')}</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Header / Avatar Section */}
            <View style={styles.headerSection}>
              <View style={[styles.avatarRing, { borderColor: alpha(accessibleColor, 0.4) }]}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  onError={() => setImageError(true)}
                />
              </View>
              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <Text style={[styles.fullName, { color: theme.colors.text.primary }]}>{worker.fullName}</Text>
                  {worker.isVerified && <BadgeCheck size={18} color={accessibleColor} />}
                </View>
                <Text style={[styles.categoryText, { color: accessibleColor }]}>{worker.category.toUpperCase()}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: worker.isAvailable ? statusSuccessColor : statusBusyColor }]} />
                  <Text style={[styles.statusText, { color: worker.isAvailable ? statusSuccessColor : statusBusyColor }]}>
                    {worker.isAvailable ? t('common.availableNow', 'AVAILABLE NOW') : t('common.busyNow', 'BUSY NOW')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                <TrendingUp size={17} color={accessibleColor} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{worker.totalJobs ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.jobsDone', 'Jobs Done')}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                <Award size={17} color={accessibleColor} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{t('workerDetailsModal.experienceYears', '{{count}}yr', { count: worker.experience ?? 0 })}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.experience', 'Experience')}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                <Star size={17} color={starColor} fill={starColor} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{(worker.rating ?? 5.0).toFixed(1)}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.reviewsCount', '{{count}} Reviews', { count: worker.totalReviews ?? 0 })}</Text>
              </View>
            </View>

            {/* Contact Info */}
            <View style={[styles.section, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.contactDetails', 'CONTACT DETAILS')}</Text>
              <View style={styles.infoRow}>
                <Phone size={15} color={theme.colors.text.muted} />
                <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>{worker.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Mail size={15} color={theme.colors.text.muted} />
                <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>{worker.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin size={15} color={theme.colors.text.muted} />
                <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>{worker.address}, {worker.city}</Text>
              </View>
            </View>

            {/* Bio */}
            {!!worker.bio && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.profileData', 'PROFILE DATA')}</Text>
                <Text style={[styles.bioText, { color: theme.colors.text.secondary }]}>{worker.bio}</Text>
              </View>
            )}

            {/* Skills */}
            {(worker.skills?.length ?? 0) > 0 && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.skills', 'SKILLS')}</Text>
                <View style={styles.skillsRow}>
                  {worker.skills?.map((skill) => (
                    <View
                      key={skill}
                      style={[
                        styles.skillPill,
                        {
                          borderColor: theme.isDark ? modalThemeColor + '48' : alpha(accessibleColor, 0.35),
                          backgroundColor: theme.isDark ? theme.colors.surface.card : alpha(accessibleColor, 0.1),
                        },
                      ]}
                    >
                      <Text style={[styles.skillText, { color: accessibleColor }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Fixed Footer: Rate and Deploy */}
          <View style={[styles.footer, { borderColor: theme.colors.border.default }]}>
            <View style={styles.rateBlock}>
              <Text style={[styles.rateLabel, { color: theme.colors.text.muted }]}>{t('workerDetailsModal.hourlyRate', 'Hourly Rate')}</Text>
              <Text style={[styles.rateValue, { color: theme.colors.text.primary }]}>{t('common.rupeesFormat', 'Rs. {{amount}}', { amount: worker.hourlyRate ?? '—' })}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.deployBtn,
                !theme.isDark && isBtnLight && {
                  borderWidth: 1,
                  borderColor: alpha(accessibleColor, 0.3),
                },
              ]}
              activeOpacity={0.8}
              onPress={() => onDeploy?.(worker)}
            >
              <LinearGradient
                colors={[modalThemeColor, modalThemeColor + 'E6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.deployBtnGradient}
              >
                <Zap size={16} color={btnTextColor} fill={btnTextColor} />
                <Text style={[styles.deployBtnText, { color: btnTextColor }]}>{t('workerDetailsModal.hireUstad', 'HIRE USTAD')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </BeautifulModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 2,
    padding: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullName: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  bioText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  skillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1.5,
    marginTop: 'auto',
  },
  rateBlock: {
    gap: 4,
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rateValue: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },
  deployBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  deployBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  deployBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
