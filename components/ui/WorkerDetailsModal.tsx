import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MapPin, Phone, Mail, Award, Zap, Briefcase, Star, TrendingUp, BadgeCheck } from 'lucide-react-native';
import { BeautifulModal } from './BeautifulModal';
import { useWorker } from '../../hooks';
import { Colors, Spacing, Typography } from '../../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';

interface WorkerDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  workerId: string | null;
  themeColor?: string;
  onDeploy?: (worker: any) => void;
}

export function WorkerDetailsModal({
  visible,
  onClose,
  workerId,
  themeColor = Colors.cyan,
  onDeploy,
}: WorkerDetailsModalProps) {
  const { data: worker, isLoading } = useWorker(workerId || undefined);
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
      title="Specialist Details"
      height="85%"
      glowColor={themeColor}
      showCloseButton
    >
      {isLoading || !worker ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Fetching network profile...</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Header / Avatar Section */}
            <View style={styles.headerSection}>
              <View style={[styles.avatarRing, { borderColor: themeColor + '60' }]}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  onError={() => setImageError(true)}
                />
              </View>
              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <Text style={styles.fullName}>{worker.fullName}</Text>
                  {worker.isVerified && <BadgeCheck size={18} color={themeColor} />}
                </View>
                <Text style={styles.categoryText}>{worker.category.toUpperCase()}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: worker.isAvailable ? '#00E5A0' : '#FF4C6A' }]} />
                  <Text style={[styles.statusText, { color: worker.isAvailable ? '#00E5A0' : '#FF4C6A' }]}>
                    {worker.isAvailable ? 'AVAILABLE FOR DEPLOYMENT' : 'CURRENTLY ENGAGED'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <TrendingUp size={16} color={themeColor} style={styles.statIcon} />
                <Text style={styles.statValue}>{worker.totalJobs ?? 0}</Text>
                <Text style={styles.statLabel}>Jobs Done</Text>
              </View>
              <View style={styles.statBox}>
                <Award size={16} color={themeColor} style={styles.statIcon} />
                <Text style={styles.statValue}>{worker.experience ?? 0}yr</Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>
              <View style={styles.statBox}>
                <Star size={16} color="#FFD700" style={styles.statIcon} />
                <Text style={styles.statValue}>{(worker.rating ?? 5.0).toFixed(1)}</Text>
                <Text style={styles.statLabel}>{worker.totalReviews ?? 0} Reviews</Text>
              </View>
            </View>

            {/* Contact Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CONTACT PROTOCOLS</Text>
              <View style={styles.infoRow}>
                <Phone size={14} color={Colors.textDim} />
                <Text style={styles.infoText}>{worker.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Mail size={14} color={Colors.textDim} />
                <Text style={styles.infoText}>{worker.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin size={14} color={Colors.textDim} />
                <Text style={styles.infoText}>{worker.address}, {worker.city}</Text>
              </View>
            </View>

            {/* Bio */}
            {!!worker.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFILE DATA</Text>
                <Text style={styles.bioText}>{worker.bio}</Text>
              </View>
            )}

            {/* Skills */}
            {(worker.skills?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AUTHORIZED SKILLS</Text>
                <View style={styles.skillsRow}>
                  {worker.skills?.map((skill) => (
                    <View key={skill} style={[styles.skillPill, { borderColor: themeColor + '35' }]}>
                      <Text style={[styles.skillText, { color: themeColor }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Fixed Footer: Rate and Deploy */}
          <View style={[styles.footer, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <View style={styles.rateBlock}>
              <Text style={styles.rateLabel}>Hourly Rate</Text>
              <Text style={styles.rateValue}>Rs. {worker.hourlyRate ?? '—'}</Text>
            </View>
            <TouchableOpacity
              style={styles.deployBtn}
              activeOpacity={0.8}
              onPress={() => onDeploy?.(worker)}
            >
              <LinearGradient
                colors={[themeColor, themeColor + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.deployBtnGradient}
              >
                <Zap size={16} color="#000" fill="#000" />
                <Text style={styles.deployBtnText}>DEPLOY UNIT</Text>
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
    color: Colors.textDim,
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
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  categoryText: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 9,
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
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
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
    fontSize: 13,
    fontWeight: '500',
  },
  bioText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
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
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  skillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  rateBlock: {
    gap: 4,
  },
  rateLabel: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rateValue: {
    color: '#fff',
    fontSize: 18,
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
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
