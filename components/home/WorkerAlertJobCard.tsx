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
import { Colors } from '../../constants/Theme';
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
    const workerLoc = (user as any)?.address || (user as any)?.city || '';
    const isInstant = job.urgency === 'instant';
    const accentColor = isInstant ? '#00F0FF' : '#FF8C00';
    const accentDim = isInstant ? 'rgba(0,240,255,0.12)' : 'rgba(255,140,0,0.12)';

    const gradientColors: [string, string, ...string[]] = isInstant
      ? ['#001A1A', '#001030', '#000A20']
      : ['#1A0A00', '#200D00', '#0F0700'];

    const borderColor = isInstant ? 'rgba(0,240,255,0.35)' : 'rgba(255,140,0,0.35)';
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
    const amountText = job.signalMeta?.amountText || (amount > 0 ? `Rs. ${amount.toLocaleString()}` : 'Open Bid');

    const timeAgo = useMemo(() => {
      if (!job.createdAt) return 'Recent';
      const diff = Date.now() - new Date(job.createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins / 60)}h ago`;
    }, [job.createdAt]);

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
          {/* Top row: badge + time */}
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: accentDim, borderColor: accentColor + '40' }]}>
              <View style={[styles.pulseDot, { backgroundColor: accentColor }]} />
              {isInstant ? (
                <Zap size={11} color={accentColor} fill={accentColor} />
              ) : (
                <Calendar size={11} color={accentColor} />
              )}
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {isInstant ? 'INSTANT' : 'SCHEDULED'}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Radio size={10} color={accentColor + '99'} />
              <Text style={[styles.timeText, { color: accentColor + 'AA' }]}>{timeAgo}</Text>
            </View>
          </View>

          {media.coverUrl ? (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: media.coverUrl }} style={styles.mediaImage} />
              <LinearGradient
                colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.78)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.mediaBadge, { borderColor: accentColor + '55', backgroundColor: accentDim }]}>
                <ImageIcon size={11} color={accentColor} />
                <Text style={[styles.mediaBadgeText, { color: accentColor }]}>
                  {media.totalCount} Evidence
                </Text>
              </View>
              {media.videos.length > 0 && (
                <View style={styles.videoBadge}>
                  <PlayCircle size={11} color="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>Video</Text>
                </View>
              )}
            </View>
          ) : media.totalCount > 0 ? (
            <View style={[styles.noImageEvidence, { borderColor: accentColor + '25' }]}>
              <PlayCircle size={16} color={accentColor} />
              <Text style={[styles.noImageEvidenceText, { color: accentColor }]}>
                {media.totalCount} evidence file{media.totalCount === 1 ? '' : 's'} attached
              </Text>
            </View>
          ) : null}

          {/* Category + description + budget */}
          <View style={styles.body}>
            <View style={styles.infoCol}>
              <Text style={styles.category} numberOfLines={1}>
                {job.category || 'New Mission'}
              </Text>
              {job.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {job.description}
                </Text>
              ) : null}
              {client ? (
                <View style={styles.clientRow}>
                  {client.profileImage ? (
                    <Image source={{ uri: client.profileImage }} style={styles.clientAvatar} />
                  ) : (
                    <View style={[styles.clientAvatarFallback, { borderColor: accentColor + '35' }]}>
                      <UserRound size={12} color={accentColor} />
                    </View>
                  )}
                  <View style={styles.clientTextWrap}>
                    <Text style={styles.clientName} numberOfLines={1}>{client.fullName || 'Client'}</Text>
                    <View style={styles.clientMetaRow}>
                      <Star size={9} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.clientMetaText}>
                        {client.rating ? `${Number(client.rating).toFixed(1)} rating` : `${client.completedJobs || client.totalJobs || 0} jobs`}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={[styles.budgetBadge, { backgroundColor: 'rgba(0,255,127,0.1)', borderColor: 'rgba(0,255,127,0.25)' }]}>
              <Banknote size={13} color={Colors.green} />
              <Text style={styles.budgetText}>
                {isInstant ? amountText : amount > 0 ? amountText : 'Open Bid'}
              </Text>
            </View>
          </View>

          {/* Location */}
          {job.address ? (
            <View style={styles.locationRow}>
              <MapPin size={11} color="rgba(255,255,255,0.4)" />
              <Text style={styles.locationText} numberOfLines={1}>{job.address}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: accentColor + '20' }]} />

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.dismissBtn, { borderColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => onDismiss(job._id)}
              disabled={isAccepting}
              activeOpacity={0.7}
            >
              <X size={16} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
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
                    ? ['#00F0FF', '#008FFF', '#0055FF']
                    : ['#FF8C00', '#FF5E00', '#FF3D00']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptBtn}
              >
                {isAccepting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Check size={15} color="#000" strokeWidth={3} />
                    <Text style={styles.acceptText}>VIEW DETAILS</Text>
                    <ChevronRight size={15} color="#000" strokeWidth={3} />
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
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
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
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  videoBadgeText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
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
    borderColor: 'rgba(255,255,255,0.25)',
  },
  clientAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  clientTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    color: '#FFFFFF',
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
    color: 'rgba(255,255,255,0.48)',
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
    color: Colors.green,
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
    color: 'rgba(255,255,255,0.45)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    color: '#000',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});
