import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap,
  Calendar,
  MapPin,
  X,
  Check,
  Banknote,
  Radio,
  Image as ImageIcon,
  PlayCircle,
  UserRound,
  Star,
  ChevronRight,
} from 'lucide-react-native';
import { alpha, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';

interface WorkerAlertJobCardProps {
  job: any;
  index: number;
  onAccept: (job: any) => void;
  onDismiss: (jobId: string) => void;
  isAccepting?: boolean;
}

export const WorkerAlertJobCard = React.memo(
  function WorkerAlertJobCard({ job, index, onAccept, onDismiss, isAccepting }: WorkerAlertJobCardProps) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const theme = useTheme();
    const colors = useThemeColors();
    const typography = useThemeTypography();
    const workerLoc = (user as any)?.address || (user as any)?.city || '';
    const isInstant = job.urgency === 'instant';
    const accentColor = isInstant ? colors.cyan : colors.worker;
    const accentDim = isInstant ? alpha(colors.cyan, 0.12) : alpha(colors.worker, 0.12);

    const gradientColors: [string, string, ...string[]] = isInstant
      ? [alpha(theme.colors.background.screen, 0.9), alpha(theme.colors.brand.primary, 0.8), alpha(theme.colors.background.screen, 0.7)]
      : [alpha(colors.worker, 0.7), alpha(theme.colors.background.screen, 0.8), alpha(theme.colors.surface.card, 0.7)];

    const borderColor = isInstant ? alpha(colors.cyan, 0.35) : alpha(colors.worker, 0.35);
    const media = useMemo(() => {
      const images = Array.isArray(job.media?.images)
        ? job.media.images
        : [job.imageUrl, ...(Array.isArray(job.imageUrls) ? job.imageUrls : [])].filter(Boolean);
      const videos = Array.isArray(job.media?.videos)
        ? job.media.videos
        : [job.videoUrl, ...(Array.isArray(job.videoUrls) ? job.videoUrls : [])].filter(Boolean);
      return {
        images,
        videos,
        coverUrl: job.media?.coverUrl || images[0] || '',
        totalCount: Number(job.media?.totalCount || images.length + videos.length),
      };
    }, [job]);
    const client = job.clientMeta || (typeof job.customer === 'object' ? job.customer : null);
    const amount = Number(job.signalMeta?.amount || job.amount || job.hourlyRate || 0);
    const amountText = job.signalMeta?.amountText || (amount > 0 ? `Rs. ${amount.toLocaleString()}` : t('incomingJobModal.openBudget', 'Open Bid'));

    const timeAgo = useMemo(() => {
      if (!job.createdAt) return t('incomingJobModal.newSignal', 'Recent');
      const diff = Date.now() - new Date(job.createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return t('incomingJobModal.postedJustNow', 'Just now');
      if (mins < 60) return t('incomingJobModal.postedMinutesAgo', '{{count}}m ago', { count: mins });
      return t('incomingJobModal.postedHoursAgo', '{{count}}h ago', { count: Math.floor(mins / 60) });
    }, [job.createdAt, t]);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 80).duration(500).springify()}
        exiting={FadeOutLeft.duration(300)}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: accentDim, borderColor: alpha(accentColor, 0.25) }]}>
              <View style={[styles.pulseDot, { backgroundColor: accentColor }]} />
              {isInstant ? (
                <Zap size={11} color={accentColor} fill={accentColor} />
              ) : (
                <Calendar size={11} color={accentColor} />
              )}
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {isInstant ? t('home.worker.instant', 'INSTANT') : t('home.worker.scheduled', 'SCHEDULED')}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Radio size={10} color={alpha(accentColor, 0.6)} />
              <Text style={[styles.timeText, { color: alpha(accentColor, 0.65) }]}>{timeAgo}</Text>
            </View>
          </View>

          {media.coverUrl ? (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: media.coverUrl }} style={styles.mediaImage} />
              <LinearGradient
                colors={[alpha(theme.colors.background.screen, 0.02), alpha(theme.colors.background.screen, 0.6)]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.mediaBadge, { borderColor: alpha(accentColor, 0.35), backgroundColor: accentDim }]}>
                <ImageIcon size={11} color={accentColor} />
                <Text style={[styles.mediaBadgeText, { color: accentColor }]}>
                  {t('incomingJobModal.evidenceLabel', '{{count}} Evidence', { count: media.totalCount })}
                </Text>
              </View>
              {media.videos.length > 0 && (
                <View style={[styles.videoBadge, { backgroundColor: alpha(theme.colors.background.screen, 0.4), borderColor: alpha(theme.colors.text.primary, 0.1) }]}>
                  <PlayCircle size={11} color={theme.colors.text.primary} />
                  <Text style={[styles.videoBadgeText, { color: theme.colors.text.primary }]}>{t('incomingJobModal.video', 'Video')}</Text>
                </View>
              )}
            </View>
          ) : media.totalCount > 0 ? (
            <View style={[styles.noImageEvidence, { borderColor: alpha(accentColor, 0.15) }]}>
              <PlayCircle size={16} color={accentColor} />
              <Text style={[styles.noImageEvidenceText, { color: accentColor }]}>
                {t('incomingJobModal.attachmentsLabelCount', '{{count}} evidence files attached', { count: media.totalCount })}
              </Text>
            </View>
          ) : null}

          <View style={styles.body}>
            <View style={styles.infoCol}>
              <Text style={[styles.category, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {job.category || t('home.worker.newJob', 'New Job')}
              </Text>
              {job.description ? (
                <Text style={[styles.description, { color: alpha(theme.colors.text.primary, 0.55) }]} numberOfLines={2}>
                  {job.description}
                </Text>
              ) : null}
              {client ? (
                <View style={styles.clientRow}>
                  {client.profileImage ? (
                    <Image source={{ uri: client.profileImage }} style={[styles.clientAvatar, { borderColor: alpha(theme.colors.text.primary, 0.25) }]} />
                  ) : (
                    <View style={[styles.clientAvatarFallback, { borderColor: alpha(accentColor, 0.25), backgroundColor: alpha(theme.colors.text.primary, 0.03) }]}>
                      <UserRound size={12} color={accentColor} />
                    </View>
                  )}
                  <View style={styles.clientTextWrap}>
                    <Text style={[styles.clientName, { color: theme.colors.text.primary }]} numberOfLines={1}>{client.fullName || t('common.client', 'Client')}</Text>
                    <View style={styles.clientMetaRow}>
                      <Star size={9} color="#FFD700" fill="#FFD700" />
                      <Text style={[styles.clientMetaText, { color: alpha(theme.colors.text.primary, 0.48) }]}>
                        {client.rating ? t('incomingJobModal.clientRating', '{{rating}} rating', { rating: Number(client.rating).toFixed(1) }) : t('incomingJobModal.jobsCount', '{{count}} jobs', { count: client.completedJobs || client.totalJobs || 0 })}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={[styles.budgetBadge, { backgroundColor: alpha(colors.success, 0.1), borderColor: alpha(colors.success, 0.15) }]}>
              <Banknote size={13} color={colors.success} />
              <Text style={[styles.budgetText, { color: colors.success }]}>
                {isInstant ? amountText : amount > 0 ? amountText : t('incomingJobModal.openBudget', 'Open Bid')}
              </Text>
            </View>
          </View>

          {job.address ? (
            <View style={styles.locationRow}>
              <MapPin size={11} color={alpha(theme.colors.text.primary, 0.4)} />
              <Text style={[styles.locationText, { color: alpha(theme.colors.text.primary, 0.45) }]} numberOfLines={1}>{job.address}</Text>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: alpha(accentColor, 0.13) }]} />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.dismissBtn, { borderColor: alpha(theme.colors.text.primary, 0.1), backgroundColor: alpha(theme.colors.text.primary, 0.03) }]}
              onPress={() => onDismiss(job._id)}
              disabled={isAccepting}
              activeOpacity={0.7}
            >
              <X size={16} color={alpha(theme.colors.text.primary, 0.5)} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptWrapper}
              onPress={() => onAccept(job)}
              disabled={isAccepting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isInstant
                    ? [colors.cyan, alpha(theme.colors.brand.secondary, 0.8), '#0055FF']
                    : [colors.worker, alpha(colors.worker, 0.8), alpha(colors.worker, 0.6)]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptBtn}
              >
                {isAccepting ? (
                  <ActivityIndicator color={theme.colors.text.primary} size="small" />
                ) : (
                  <>
                    <Check size={15} color={theme.colors.text.primary} strokeWidth={3} />
                    <Text style={[styles.acceptText, { color: theme.colors.text.primary }]}>{t('home.worker.viewDetails', 'VIEW DETAILS')}</Text>
                    <ChevronRight size={15} color={theme.colors.text.primary} strokeWidth={3} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mediaPreview: {
    height: 118,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: alpha('#fff', 0.08),
    backgroundColor: alpha('#fff', 0.025),
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  videoBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  noImageEvidence: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noImageEvidenceText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  infoCol: {
    flex: 1,
  },
  category: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  clientAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  clientAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: 12,
    fontWeight: '800',
  },
  clientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  clientMetaText: {
    fontSize: 10,
    fontWeight: '700',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetText: {
    fontWeight: '900',
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  dismissBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});