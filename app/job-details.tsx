import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Hourglass,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Radio,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  XCircle,
  Zap,
} from 'lucide-react-native';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/Theme';
import { useAuth } from '../context/AuthContext';
import {
  useAcceptInstantJobMutation,
  useCancelJobMutation,
  useJobDetails,
  useWorkerWallet,
} from '../hooks';
import { JobEvidenceGallery, buildJobEvidenceItems } from '../components/common/JobEvidenceGallery';

const P = {
  surface: 'rgba(8, 10, 30, 0.9)',
  surfaceStrong: 'rgba(8, 10, 30, 0.97)',
  border: 'rgba(255,255,255,0.1)',
  cyanMuted: 'rgba(0,245,255,0.1)',
  orangeMuted: 'rgba(255,140,0,0.12)',
  greenMuted: 'rgba(0,255,127,0.1)',
  redMuted: 'rgba(255,59,48,0.1)',
  purpleMuted: 'rgba(191,90,242,0.12)',
  textMuted: '#9BA3B4',
  textDim: '#646B7E',
};

const STATUS_CONFIG: Record<string, { label: string; description: string; color: string; Icon: React.ComponentType<any> }> = {
  open: {
    label: 'Open request',
    description: 'Visible to matching Ustads nearby.',
    color: Colors.cyan,
    Icon: Radio,
  },
  reviewing: {
    label: 'Reviewing proposals',
    description: 'The client is comparing available offers.',
    color: Colors.worker,
    Icon: Hourglass,
  },
  assigned: {
    label: 'Ustad assigned',
    description: 'This request has moved into the booking flow.',
    color: Colors.green,
    Icon: ShieldCheck,
  },
  closed: {
    label: 'Closed',
    description: 'This request is no longer accepting responses.',
    color: Colors.textMuted,
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This request was cancelled and no further action is required.',
    color: Colors.error,
    Icon: XCircle,
  },
};

const compactUrls = (urls: (string | undefined | null)[]) =>
  Array.from(new Set(urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)));

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'CL';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const formatMoney = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString()}`;

const formatDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color = Colors.cyan,
}: {
  icon: React.ComponentType<any>;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
        <Icon size={15} color={color} strokeWidth={2.4} />
      </View>
      <View style={styles.sectionHeadingCopy}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function DetailTile({
  icon: Icon,
  label,
  value,
  color = Colors.cyan,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.detailTile}>
      <View style={[styles.detailTileIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={14} color={color} strokeWidth={2.4} />
      </View>
      <Text style={styles.detailTileLabel}>{label}</Text>
      <Text style={styles.detailTileValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PrimaryAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  loading,
  colors = [Colors.cyan, '#007AFF'],
}: {
  icon: React.ComponentType<any>;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  colors?: [string, string];
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryAction, disabled && styles.actionDisabled]}
      onPress={onPress}
      activeOpacity={0.84}
      disabled={disabled || loading}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {loading ? (
        <ActivityIndicator color="#001014" />
      ) : (
        <>
          <Icon size={18} color="#001014" strokeWidth={2.7} />
          <Text style={styles.primaryActionText}>{label}</Text>
          <ChevronRight size={17} color="#001014" strokeWidth={2.8} />
        </>
      )}
    </TouchableOpacity>
  );
}

export default function JobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; bookingId?: string; mode?: string; pendingBidId?: string }>();
  const resolvedId = params.id || params.bookingId;
  const { role } = useAuth();
  const { data: job, isLoading } = useJobDetails(resolvedId);
  const { data: wallet } = useWorkerWallet({ enabled: role === 'worker' });
  const isPendingBidPreview = params.mode === 'pending-bid' || !!params.pendingBidId;

  const { mutate: cancelJob, isPending: isCancelling } = useCancelJobMutation({
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Request cancelled', text2: 'The job post has been closed.' });
      router.replace('/(tabs)' as any);
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Unable to cancel',
        text2: error.response?.data?.message || 'Please try again in a moment.',
      });
    },
  });

  const { mutate: acceptInstantJob, isPending: isAccepting } = useAcceptInstantJobMutation({
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Interest sent', text2: 'The client can now review your response.' });
      router.replace('/(tabs)' as any);
    },
    onError: (error: any) => {
      if (error.response?.status === 402) {
        Toast.show({ type: 'error', text1: 'Top-up required', text2: error.response?.data?.message || 'Recharge your wallet to continue.' });
        router.push('/(tabs)/wallet' as any);
        return;
      }
      Toast.show({ type: 'error', text1: 'Unable to respond', text2: error.response?.data?.message || 'Please try again.' });
    },
  });

  const media = useMemo(() => {
    if (!job) return [];

    const images = Array.isArray(job.detailMeta?.media?.images)
      ? job.detailMeta.media.images
      : Array.isArray(job.media?.images)
        ? job.media.images
        : compactUrls([job.imageUrl, ...(job.imageUrls || [])]);
    const videos = Array.isArray(job.detailMeta?.media?.videos)
      ? job.detailMeta.media.videos
      : Array.isArray(job.media?.videos)
        ? job.media.videos
        : compactUrls([job.videoUrl, ...(job.videoUrls || [])]);
    const audios = Array.isArray(job.detailMeta?.media?.audios)
      ? job.detailMeta.media.audios
      : Array.isArray(job.media?.audios)
        ? job.media.audios
        : compactUrls(job.audioUrls || []);

    return buildJobEvidenceItems({ images, videos, audios });
  }, [job]);

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.centeredFill}>
          <View style={styles.loadingIcon}>
            <BriefcaseBusiness size={27} color={Colors.cyan} strokeWidth={2.2} />
          </View>
          <ActivityIndicator color={Colors.cyan} />
          <Text style={styles.loadingText}>Loading request details</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!job) {
    return (
      <BackgroundWrapper>
        <View style={[styles.centeredFill, styles.emptyState]}>
          <View style={styles.emptyIcon}>
            <FileText size={28} color={Colors.worker} strokeWidth={2.2} />
          </View>
          <Text style={styles.emptyTitle}>Request unavailable</Text>
          <Text style={styles.emptyText}>This job request may have been removed or is no longer accessible.</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()} activeOpacity={0.82}>
            <ChevronLeft size={17} color="#001014" strokeWidth={2.8} />
            <Text style={styles.goBackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  const detailMeta = job.detailMeta;
  const baseStatus = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
  const status = {
    ...baseStatus,
    label: detailMeta?.statusInfo?.label || baseStatus.label,
    color: detailMeta?.statusInfo?.accentColor || baseStatus.color,
  };
  const StatusIcon = status.Icon;
  const isInstant = (detailMeta?.missionKind || job.urgency) === 'instant';
  const MissionIcon = isInstant ? Zap : CalendarDays;
  const title = job.category || 'Service request';
  const description = job.description || 'No additional details were provided.';
  const amountText = detailMeta?.financial?.amountText || formatMoney(job.amount);
  const dateLabel = detailMeta?.schedule?.dateLabel || formatDate(job.scheduledDate);
  const timeLabel = detailMeta?.schedule?.timeLabel || job.scheduledTime || 'ASAP';
  const missionKindLabel = detailMeta?.missionKindLabel || (isInstant ? 'Instant visit' : 'Scheduled visit');
  const locationLabel = detailMeta?.location?.address || job.address || 'Service location not shared';
  const workerObj = job.worker && typeof job.worker === 'object' ? job.worker : null;
  const workerLoc = (workerObj as any)?.address || (workerObj as any)?.city || '';
  const bidSummary = detailMeta?.bidSummary || {
    total: Number(job.bidCount || 0),
    pending: Number(job.pendingBidCount || 0),
    hasAcceptedBid: job.status === 'assigned',
  };
  const client = job.clientMeta || (typeof job.customer === 'object' ? job.customer : null);
  const clientId = client?._id;
  const clientName = client?.fullName || 'Client';
  const clientImage = client?.profileImage || '';
  const clientJobs = Number((client as any)?.completedJobs || (client as any)?.totalJobs || 0);
  const requiredBalance = wallet?.requiredBalance ?? job.signalMeta?.requiredWalletBalance ?? 500;
  const isWalletBlocked = role === 'worker' && !!wallet && wallet.balance < requiredBalance;
  const canWorkerRespond = role === 'worker' && job.status === 'open' && !isPendingBidPreview;
  const canClientManage = role === 'client' && (job.status === 'open' || job.status === 'reviewing');
  const showDock = canWorkerRespond || canClientManage;

  const shareRequest = () => {
    Share.share({ message: `${title} service request - ${status.label} - ${amountText}\n${locationLabel}` });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel request?',
      'Matching workers will no longer be able to respond to this job.',
      [
        { text: 'Keep request', style: 'cancel' },
        { text: 'Cancel request', style: 'destructive', onPress: () => cancelJob({ jobId: job._id }) },
      ]
    );
  };

  const handleWorkerResponse = () => {
    if (isWalletBlocked) {
      Toast.show({
        type: 'error',
        text1: 'Top-up required',
        text2: `Keep at least Rs. ${requiredBalance.toLocaleString()} in your wallet before responding.`,
      });
      router.push('/(tabs)/wallet' as any);
      return;
    }

    if (isInstant) {
      acceptInstantJob(job._id);
      return;
    }

    router.push({
      pathname: '/bid-submission',
      params: { jobId: job._id, title: job.category, urgency: job.urgency },
    });
  };

  const openClientProfile = () => {
    if (!clientId) return;
    router.push({ pathname: '/client-details' as any, params: { id: String(clientId) } });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
            <ChevronLeft size={22} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Service Request</Text>
            <Text style={styles.headerTitle}>Mission Details</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} onPress={shareRequest} activeOpacity={0.8}>
            <Share2 size={19} color={P.textMuted} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (showDock ? 126 : 28) }]}
        >
          <Animated.View entering={FadeInDown.duration(460)}>
            <GlassCard
              padding={0}
              intensity={50}
              hasGlow
              glowColor={status.color}
              style={styles.heroCard}
              contentStyle={styles.heroContent}
            >
              <LinearGradient
                colors={[`${status.color}26`, 'rgba(8,10,30,0.96)', 'rgba(0,245,255,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.heroAccent, { backgroundColor: status.color }]} />

              <View style={styles.heroTopRow}>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}14`, borderColor: `${status.color}40` }]}>
                  <StatusIcon size={12} color={status.color} strokeWidth={2.5} />
                  <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                </View>
                <View style={styles.amountBadge}>
                  <Banknote size={13} color={Colors.green} strokeWidth={2.4} />
                  <Text style={styles.amountBadgeText}>{amountText}</Text>
                </View>
              </View>

              <View style={styles.heroTitleRow}>
                <View style={[styles.heroIcon, { backgroundColor: isInstant ? P.orangeMuted : P.cyanMuted }]}>
                  <MissionIcon size={24} color={isInstant ? Colors.worker : Colors.cyan} strokeWidth={2.3} />
                </View>
                <View style={styles.heroTitleCopy}>
                  <Text style={styles.heroLabel}>{missionKindLabel}</Text>
                  <Text style={[styles.heroTitle, Typography.threeD]} numberOfLines={1}>{title}</Text>
                  <Text style={styles.heroDescription} numberOfLines={3}>{description}</Text>
                </View>
              </View>

              <View style={styles.stateMessage}>
                <View style={[styles.stateDot, { backgroundColor: status.color }]} />
                <Text style={styles.stateMessageText}>{status.description}</Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(70).duration(460)} style={styles.section}>
            <SectionHeader icon={Clock3} title="Visit Overview" subtitle="When and where the service is requested." />
            <View style={styles.detailGrid}>
              <DetailTile icon={MissionIcon} label="Visit type" value={missionKindLabel} color={isInstant ? Colors.worker : Colors.cyan} />
              <DetailTile icon={CalendarDays} label="Date" value={dateLabel} />
              <DetailTile icon={Clock3} label="Time" value={timeLabel} color={Colors.worker} />
            </View>

            <GlassCard padding={14} intensity={35} style={styles.locationCard}>
              <View style={{ gap: 12 }}>
                <View style={styles.locationRow}>
                  <View style={styles.locationIcon}>
                    <MapPin size={18} color={Colors.green} strokeWidth={2.5} />
                  </View>
                  <View style={styles.locationCopy}>
                    <Text style={styles.locationLabel}>Service location</Text>
                    <Text style={styles.locationValue}>{locationLabel}</Text>
                  </View>
                </View>
                {!!workerLoc && (
                  <View style={styles.locationRow}>
                    <View style={[styles.locationIcon, { backgroundColor: 'rgba(0,245,255,0.12)' }]}>
                      <MapPin size={18} color={Colors.cyan} strokeWidth={2.5} />
                    </View>
                    <View style={styles.locationCopy}>
                      <Text style={styles.locationLabel}>Worker location</Text>
                      <Text style={styles.locationValue}>{workerLoc}</Text>
                    </View>
                  </View>
                )}
              </View>
            </GlassCard>
          </Animated.View>

          {media.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(140).duration(460)} style={styles.section}>
              <SectionHeader
                icon={ImageIcon}
                title="Work Evidence"
                subtitle={`${media.length} attachment${media.length === 1 ? '' : 's'} included with this request.`}
                color={Colors.purple}
              />
              <JobEvidenceGallery items={media} />
            </Animated.View>
          ) : null}

          {role === 'worker' ? (
            <Animated.View entering={FadeInDown.delay(210).duration(460)} style={styles.section}>
              <SectionHeader
                icon={UserRound}
                title="Client"
                subtitle="Review the service requester before responding."
                color={Colors.worker}
              />
              <TouchableOpacity onPress={openClientProfile} disabled={!clientId} activeOpacity={0.84}>
                <GlassCard
                  padding={14}
                  intensity={38}
                  hasGlow
                  glowColor={Colors.worker}
                  gradient={['rgba(255,140,0,0.15)', 'rgba(0,245,255,0.06)']}
                >
                  <View style={styles.clientRow}>
                    <View style={styles.avatarShell}>
                      {clientImage ? (
                        <Image source={{ uri: clientImage }} style={styles.avatarImage} />
                      ) : (
                        <LinearGradient colors={['rgba(255,140,0,0.28)', 'rgba(0,245,255,0.18)']} style={styles.avatarFallback}>
                          <Text style={styles.avatarText}>{initialsFor(clientName)}</Text>
                        </LinearGradient>
                      )}
                    </View>
                    <View style={styles.clientCopy}>
                      <Text style={styles.clientRole}>Service client</Text>
                      <Text style={[styles.clientName, Typography.threeD]} numberOfLines={1}>{clientName}</Text>
                      <Text style={styles.clientHistory}>
                        {clientJobs > 0 ? `${clientJobs} completed service request${clientJobs === 1 ? '' : 's'}` : 'New ApnaUstad client'}
                      </Text>
                    </View>
                    {clientId ? (
                      <View style={styles.profileCue}>
                        <Eye size={14} color={Colors.cyan} strokeWidth={2.4} />
                        <ChevronRight size={15} color={Colors.cyan} strokeWidth={2.6} />
                      </View>
                    ) : null}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(210).duration(460)} style={styles.section}>
              <SectionHeader
                icon={Send}
                title="Proposal Activity"
                subtitle="A quick view of worker interest for this request."
                color={Colors.worker}
              />
              <GlassCard
                padding={14}
                intensity={38}
                hasGlow
                glowColor={Colors.worker}
                gradient={['rgba(255,140,0,0.15)', 'rgba(0,245,255,0.05)']}
              >
                <View style={styles.activityStats}>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{bidSummary.total}</Text>
                    <Text style={styles.activityLabel}>Total proposals</Text>
                  </View>
                  <View style={styles.activityDivider} />
                  <View style={styles.activityStat}>
                    <Text style={[styles.activityValue, { color: Colors.worker }]}>{bidSummary.pending}</Text>
                    <Text style={styles.activityLabel}>Awaiting review</Text>
                  </View>
                  <View style={styles.activityDivider} />
                  <View style={styles.activityStat}>
                    <Text style={[styles.activityValue, { color: bidSummary.hasAcceptedBid ? Colors.green : P.textMuted }]}>
                      {bidSummary.hasAcceptedBid ? 'Yes' : 'No'}
                    </Text>
                    <Text style={styles.activityLabel}>Assigned</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(280).duration(460)} style={styles.section}>
            <SectionHeader
              icon={FileText}
              title="Mission Brief"
              subtitle="The complete description provided for this request."
              color={Colors.green}
            />
            <GlassCard padding={14} intensity={34} style={styles.briefCard}>
              <Text style={styles.briefText}>{description}</Text>
            </GlassCard>
          </Animated.View>

          {(job.status === 'cancelled' || job.status === 'closed' || job.status === 'assigned') ? (
            <Animated.View entering={FadeInDown.delay(350).duration(460)} style={styles.section}>
              <View style={[styles.closedNote, { borderColor: `${status.color}34`, backgroundColor: `${status.color}10` }]}>
                <StatusIcon size={17} color={status.color} strokeWidth={2.5} />
                <View style={styles.closedNoteCopy}>
                  <Text style={[styles.closedNoteTitle, { color: status.color }]}>{status.label}</Text>
                  <Text style={styles.closedNoteText}>{status.description}</Text>
                </View>
                {job.status === 'assigned' ? (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/bookings' as any)} style={styles.bookingsCue} activeOpacity={0.82}>
                    <Navigation size={15} color={Colors.green} strokeWidth={2.5} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        {showDock ? (
          <View style={[styles.bottomDock, { paddingBottom: insets.bottom + 12 }]}>
            <LinearGradient
              colors={['rgba(5,5,16,0)', 'rgba(5,5,16,0.96)', 'rgba(5,5,16,1)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.dockRow}>
              {canWorkerRespond ? (
                <>
                  <TouchableOpacity style={styles.secondaryAction} onPress={() => router.back()} activeOpacity={0.82}>
                    <ChevronLeft size={18} color={P.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <View style={styles.primaryActionWrap}>
                    <PrimaryAction
                      icon={isWalletBlocked ? WalletCards : isInstant ? Zap : Send}
                      label={isWalletBlocked ? 'Top up wallet' : isInstant ? 'Accept offer' : 'Create proposal'}
                      onPress={handleWorkerResponse}
                      loading={isAccepting}
                      colors={isWalletBlocked ? [Colors.worker, '#FF5E00'] : [Colors.cyan, '#007AFF']}
                    />
                    <Text style={styles.walletHint}>
                      {isWalletBlocked ? `Wallet requires Rs. ${requiredBalance.toLocaleString()}` : 'Wallet eligibility confirmed by the server'}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.cancelAction, isCancelling && styles.actionDisabled]}
                    onPress={handleCancel}
                    activeOpacity={0.82}
                    disabled={isCancelling}
                  >
                    {isCancelling ? <ActivityIndicator color={Colors.error} /> : <Trash2 size={17} color={Colors.error} strokeWidth={2.5} />}
                  </TouchableOpacity>
                  <PrimaryAction
                    icon={Eye}
                    label={bidSummary.total > 0 ? `View proposals (${bidSummary.total})` : 'View proposals'}
                    onPress={() => router.push({ pathname: '/bids-list', params: { jobId: job._id } })}
                  />
                </>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.cyanMuted,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.3)',
    marginBottom: 4,
  },
  loadingText: {
    color: P.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    paddingHorizontal: 34,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.orangeMuted,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  emptyText: {
    color: P.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  goBackButton: {
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cyan,
  },
  goBackText: {
    color: '#001014',
    fontSize: 14,
    fontWeight: '900',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(5,5,16,0.74)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.m,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.l,
  },
  heroContent: {
    padding: 16,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 0,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '60%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.26)',
    backgroundColor: P.greenMuted,
  },
  amountBadgeText: {
    color: Colors.green,
    fontSize: 11,
    fontWeight: '900',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  heroTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroLabel: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  heroDescription: {
    color: P.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 6,
  },
  stateMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 16,
    paddingTop: 13,
  },
  stateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stateMessageText: {
    flex: 1,
    color: P.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.l,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 11,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    color: P.textDim,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 9,
  },
  detailTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 81,
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(8,10,30,0.72)',
    padding: 9,
  },
  detailTileIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  detailTileLabel: {
    color: P.textDim,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailTileValue: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  locationCard: {
    borderRadius: BorderRadius.l,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.greenMuted,
  },
  locationCopy: {
    flex: 1,
  },
  locationLabel: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  locationValue: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  mediaRail: {
    gap: 10,
  },
  mediaCard: {
    height: 188,
    overflow: 'hidden',
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.34)',
    backgroundColor: P.surfaceStrong,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: P.purpleMuted,
  },
  videoTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  videoHint: {
    color: P.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  mediaFooter: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaIndex: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  mediaTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  mediaTypeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatarShell: {
    width: 56,
    height: 56,
    borderRadius: 19,
    padding: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.52)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  avatarText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  clientCopy: {
    flex: 1,
    minWidth: 0,
  },
  clientRole: {
    color: Colors.worker,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  clientName: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },
  clientHistory: {
    color: P.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  profileCue: {
    height: 36,
    minWidth: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.26)',
    backgroundColor: P.cyanMuted,
  },
  activityStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  activityStat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activityValue: {
    color: Colors.cyan,
    fontSize: 21,
    fontWeight: '900',
  },
  activityLabel: {
    color: P.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  activityDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  briefCard: {
    borderRadius: BorderRadius.l,
  },
  briefText: {
    color: P.textMuted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  closedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    padding: 13,
  },
  closedNoteCopy: {
    flex: 1,
  },
  closedNoteTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  closedNoteText: {
    color: P.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  bookingsCue: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.greenMuted,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.24)',
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.m,
    paddingTop: 24,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  secondaryAction: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelAction: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    backgroundColor: P.redMuted,
  },
  primaryActionWrap: {
    flex: 1,
  },
  primaryAction: {
    flex: 1,
    minHeight: 56,
    overflow: 'hidden',
    borderRadius: BorderRadius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
    ...Shadows.bevel,
  },
  actionDisabled: {
    opacity: 0.62,
  },
  primaryActionText: {
    flexShrink: 1,
    color: '#001014',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  walletHint: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
});
