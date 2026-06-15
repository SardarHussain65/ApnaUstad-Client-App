import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Hourglass,
  Image as ImageIcon,
  MapPin,
  Radio,
  ShieldCheck,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react-native';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { alpha, BorderRadius, Colors, Shadows, Spacing, Typography, useTheme, useThemeColors, useThemeTypography, useThemeShadows } from '../constants/Theme';
import { useJobDetails, useWorkerBids } from '../hooks';
import { useWithdrawBidMutation } from '../hooks/mutations/useMutations';
import { useAuth } from '../context/AuthContext';
import { JobEvidenceGallery, buildJobEvidenceItems } from '../components/common/JobEvidenceGallery';

const P = {
  surface: 'rgba(8, 10, 30, 0.9)',
  surfaceStrong: 'rgba(8, 10, 30, 0.97)',
  border: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(0,245,255,0.26)',
  cyanMuted: 'rgba(0,245,255,0.1)',
  orangeMuted: 'rgba(255,140,0,0.12)',
  greenMuted: 'rgba(0,255,127,0.1)',
  redMuted: 'rgba(255,59,48,0.1)',
  textMuted: '#9BA3B4',
  textDim: '#646B7E',
};

function statusColor(specialty: any, theme: ReturnType<typeof useTheme>) {
  if (specialty.approvalStatus === 'pending') return theme.legacy.yellow;
  if (specialty.approvalStatus === 'rejected' || specialty.subscriptionStatus === 'expired') return theme.colors.status.error;
  if (specialty.subscriptionStatus === 'payment_due') return theme.colors.brand.worker;
  return theme.colors.status.success;
}

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

const formatDate = (value?: string, t?: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return t ? t('common.today') : 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatMoney = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString()}`;

const formatSubmittedAt = (value?: string, t?: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return t ? t('pendingBidDetails.recentlySubmitted') : 'Recently submitted';

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return t ? t('pendingBidDetails.submittedJustNow') : 'Submitted just now';
  if (minutes < 60) return t ? t('pendingBidDetails.submittedMinutesAgo', { count: minutes }) : `Submitted ${minutes}m ago`;
  if (minutes < 24 * 60) return t ? t('pendingBidDetails.submittedHoursAgo', { count: Math.floor(minutes / 60) }) : `Submitted ${Math.floor(minutes / 60)}h ago`;
  return t ? t('pendingBidDetails.submittedDate', { date: formatDate(value, t) }) : `Submitted ${formatDate(value)}`;
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

function DetailPill({
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
    <View style={styles.detailPill}>
      <View style={[styles.detailPillIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={14} color={color} strokeWidth={2.4} />
      </View>
      <View style={styles.detailPillCopy}>
        <Text style={styles.detailPillLabel}>{label}</Text>
        <Text style={styles.detailPillValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export default function PendingBidDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = theme.legacy;
  const shadows = useThemeShadows();
  const params = useLocalSearchParams<{ id?: string; pendingBidId?: string }>();
  const { data: bids, isLoading: isLoadingBids, refetch: refetchBids } = useWorkerBids();
  const bid = bids?.find(item => item._id === params.pendingBidId);
  const bidJob = bid?.jobPost && typeof bid.jobPost === 'object' ? bid.jobPost : null;
  const jobId = params.id || (typeof bid?.jobPost === 'string' ? bid.jobPost : bidJob?._id);
  const { data: job, isLoading: isLoadingJob } = useJobDetails(jobId);
  const { mutate: withdrawBid, isPending: isWithdrawing } = useWithdrawBidMutation();
  const { user } = useAuth();
  const workerPerson = bid?.worker && typeof bid.worker === 'object' ? bid.worker : null;

  const displayJob = job || bidJob;
  const meta = bid?.cardMeta;
  const customer = displayJob?.customer && typeof displayJob.customer === 'object' ? displayJob.customer : null;
  const clientMeta = meta?.counterParty || displayJob?.clientMeta || customer;

  const media = useMemo(() => {
    const images = Array.isArray(meta?.media?.images)
      ? meta.media.images
      : Array.isArray(displayJob?.media?.images)
        ? displayJob.media.images
        : compactUrls([displayJob?.imageUrl, ...(displayJob?.imageUrls || [])]);
    const videos = Array.isArray(meta?.media?.videos)
      ? meta.media.videos
      : Array.isArray(displayJob?.media?.videos)
        ? displayJob.media.videos
        : compactUrls([displayJob?.videoUrl, ...(displayJob?.videoUrls || [])]);
    const audios = Array.isArray(meta?.media?.audios)
      ? meta.media.audios
      : Array.isArray(displayJob?.media?.audios)
        ? displayJob.media.audios
        : compactUrls(displayJob?.audioUrls || []);

    return buildJobEvidenceItems({ images, videos, audios });
  }, [
    displayJob?.imageUrl,
    displayJob?.imageUrls,
    displayJob?.media?.images,
    displayJob?.media?.audios,
    displayJob?.media?.videos,
    displayJob?.audioUrls,
    displayJob?.videoUrl,
    displayJob?.videoUrls,
    meta?.media?.images,
    meta?.media?.audios,
    meta?.media?.videos,
  ]);

  if (isLoadingBids || (jobId && isLoadingJob)) {
    return (
      <BackgroundWrapper>
        <View style={styles.centeredFill}>
          <View style={styles.loadingIcon}>
            <Hourglass size={26} color={colors.worker} strokeWidth={2.2} />
          </View>
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.loadingText}>{t('pendingBidDetails.loading')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!displayJob) {
    return (
      <BackgroundWrapper>
        <View style={[styles.centeredFill, styles.emptyState]}>
          <View style={styles.emptyIcon}>
            <FileText size={27} color={colors.worker} strokeWidth={2.1} />
          </View>
          <Text style={styles.emptyTitle}>{t('pendingBidDetails.unavailable')}</Text>
          <Text style={styles.emptyText}>{t('pendingBidDetails.unavailableDesc')}</Text>
          <TouchableOpacity style={[styles.backHomeButton, { backgroundColor: theme.colors.brand.primary }]} onPress={() => router.back()} activeOpacity={0.82}>
            <ChevronLeft size={17} color="#001014" strokeWidth={2.8} />
            <Text style={styles.backHomeText}>{t('pendingBidDetails.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  const isInstant = (meta?.missionKind || displayJob.urgency) === 'instant';
  const MissionIcon = isInstant ? Zap : CalendarDays;
  const title = meta?.title || displayJob.category || t('jobDetails.defaultTitle');
  const description = meta?.description || displayJob.description || t('jobDetails.defaultDescription');
  const missionKindLabel = meta?.missionKindLabel || (isInstant ? t('transactionDetails.instantVisit') : t('transactionDetails.scheduledVisit'));
  const dateLabel = meta?.schedule?.dateLabel || formatDate(displayJob.scheduledDate, t);
  const timeLabel = meta?.schedule?.timeLabel || displayJob.scheduledTime || t('common.asap');
  const locationLabel = meta?.location?.address || displayJob.address || t('pendingBidDetails.serviceLocationNotShared');
  const quoteText = meta?.financial?.amountText || formatMoney(bid?.proposedPrice || displayJob.amount);
  const clientName = clientMeta?.fullName || t('common.client');
  const clientImage = clientMeta?.profileImage || '';
  const clientJobs = Number((clientMeta as any)?.completedJobs || (clientMeta as any)?.totalJobs || 0);
  const clientId = clientMeta?._id || customer?._id;
  const submittedText = formatSubmittedAt(meta?.submittedAt || bid?.createdAt, t);
  const estimatedTime = Number(bid?.estimatedDays || 0) > 0
    ? t('pendingBidDetails.daysCount', { count: bid?.estimatedDays })
    : t('common.flexible');
  const handleWithdraw = () => {
    if (!bid || isWithdrawing) return;

    Alert.alert(
      t('pendingBidDetails.withdrawConfirmTitle'),
      t('pendingBidDetails.withdrawConfirmMsg'),
      [
        { text: t('pendingBidDetails.keepProposal'), style: 'cancel' },
        {
          text: t('pendingBidDetails.withdraw'),
          style: 'destructive',
          onPress: () => {
            withdrawBid(
              { bidId: bid._id },
              {
                onSuccess: () => {
                  refetchBids();
                  router.back();
                },
                onError: () => Alert.alert(t('pendingBidDetails.unableWithdraw'), t('pendingBidDetails.tryAgain')),
              }
            );
          },
        },
      ]
    );
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
            <ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>{t('pendingBidDetails.activeBid')}</Text>
            <Text style={styles.headerTitle}>{t('pendingBidDetails.proposalDetails')}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 126 }]}
        >
          <Animated.View entering={FadeInDown.duration(460)}>
            <GlassCard
              padding={0}
              intensity={50}
              hasGlow
              glowColor={colors.worker}
              style={styles.heroCard}
              contentStyle={styles.heroContent}
            >
              <LinearGradient
                colors={['rgba(255,140,0,0.2)', 'rgba(8,10,30,0.94)', 'rgba(0,245,255,0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroAccent} />

              <View style={styles.heroTopRow}>
                <View style={styles.pendingBadge}>
                  <Hourglass size={12} color={colors.worker} strokeWidth={2.4} />
                  <Text style={styles.pendingBadgeText}>{t('pendingBidDetails.awaitingClient')}</Text>
                </View>
                <View style={styles.submittedBadge}>
                  <Radio size={11} color={colors.cyan} strokeWidth={2.4} />
                  <Text style={styles.submittedBadgeText}>{submittedText}</Text>
                </View>
              </View>

              <View style={styles.heroTitleRow}>
                <View style={styles.heroIcon}>
                  <BriefcaseBusiness size={24} color={colors.cyan} strokeWidth={2.2} />
                </View>
                <View style={styles.heroTitleCopy}>
                  <Text style={styles.heroLabel}>{t('pendingBidDetails.proposalSent')}</Text>
                  <Text style={[styles.heroTitle, Typography.threeD]} numberOfLines={1}>{title}</Text>
                  <Text style={styles.heroDescription} numberOfLines={3}>{description}</Text>
                </View>
              </View>

              <View style={styles.heroBottomRow}>
                <View>
                  <Text style={styles.heroValueLabel}>{t('pendingBidDetails.yourQuotedValue')}</Text>
                  <Text style={styles.heroValue}>{quoteText}</Text>
                </View>
                <View style={styles.heroStatusNote}>
                  <ShieldCheck size={14} color={colors.green} strokeWidth={2.5} />
                  <Text style={styles.heroStatusText}>{t('pendingBidDetails.offerActive')}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(70).duration(460)} style={styles.section}>
            <SectionHeader
              icon={Clock3}
              title={t('pendingBidDetails.visitOverview')}
              subtitle={t('pendingBidDetails.visitOverviewDesc')}
            />
            <View style={styles.detailGrid}>
              <DetailPill icon={MissionIcon} label={t('pendingBidDetails.visitType')} value={missionKindLabel} color={isInstant ? colors.worker : colors.cyan} />
              <DetailPill icon={CalendarDays} label={t('pendingBidDetails.date')} value={dateLabel} />
              <DetailPill icon={Clock3} label={t('pendingBidDetails.time')} value={timeLabel} color={colors.worker} />
            </View>
             <GlassCard padding={14} intensity={35} style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MapPin size={17} color={colors.green} strokeWidth={2.5} />
                </View>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationLabel}>{t('pendingBidDetails.serviceLocation')}</Text>
                  <Text style={styles.locationValue}>{locationLabel}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(460)} style={styles.section}>
            <SectionHeader
              icon={UserRound}
              title={t('pendingBidDetails.client')}
              subtitle={t('pendingBidDetails.clientDesc')}
              color={colors.worker}
            />
            <TouchableOpacity onPress={openClientProfile} disabled={!clientId} activeOpacity={0.84}>
              <GlassCard
                padding={14}
                intensity={38}
                hasGlow
                glowColor={colors.worker}
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
                    <Text style={styles.clientRole}>{t('pendingBidDetails.serviceClient')}</Text>
                    <Text style={[styles.clientName, Typography.threeD]} numberOfLines={1}>{clientName}</Text>
                    <Text style={styles.clientHistory}>
                      {clientJobs > 0 
                        ? (clientJobs === 1 ? t('pendingBidDetails.completedServiceRequests_one') : t('pendingBidDetails.completedServiceRequests_other', { count: clientJobs }))
                        : t('pendingBidDetails.newApnaUstadClient')}
                    </Text>
                  </View>
                  {clientId ? (
                    <View style={styles.profileCue}>
                      <Eye size={14} color={colors.cyan} strokeWidth={2.4} />
                      <ChevronRight size={15} color={colors.cyan} strokeWidth={2.6} />
                    </View>
                  ) : null}
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>

          {media.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(210).duration(460)} style={styles.section}>
              <SectionHeader
                icon={ImageIcon}
                title={t('pendingBidDetails.workEvidence')}
                subtitle={media.length === 1 ? t('pendingBidDetails.attachmentsCount_one') : t('pendingBidDetails.attachmentsCount_other', { count: media.length })}
                color={colors.purple}
              />
              <JobEvidenceGallery items={media} />
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(280).duration(460)} style={styles.section}>
            <SectionHeader
              icon={FileText}
              title={t('pendingBidDetails.yourProposal')}
              subtitle={t('pendingBidDetails.yourProposalDesc')}
              color={colors.green}
            />
            <GlassCard padding={0} intensity={38} style={styles.proposalCard}>
              <View style={styles.proposalStats}>
                <View style={styles.proposalStat}>
                  <View style={[styles.proposalIcon, { backgroundColor: P.greenMuted }]}>
                    <Banknote size={18} color={colors.green} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.proposalLabel}>{t('pendingBidDetails.yourQuote')}</Text>
                  <Text style={[styles.proposalValue, { color: colors.green }]}>{quoteText}</Text>
                </View>
                <View style={styles.proposalDivider} />
                <View style={styles.proposalStat}>
                  <View style={[styles.proposalIcon, { backgroundColor: P.orangeMuted }]}>
                    <Clock3 size={18} color={colors.worker} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.proposalLabel}>{t('pendingBidDetails.estimatedTime')}</Text>
                  <Text style={[styles.proposalValue, { color: colors.worker }]}>{estimatedTime}</Text>
                </View>
              </View>

              <View style={styles.messageArea}>
                <Text style={styles.messageLabel}>{t('pendingBidDetails.messageToClient')}</Text>
                <Text style={styles.messageText}>{bid?.message || t('pendingBidDetails.noMessage')}</Text>
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>

        {bid ? (
          <View style={[styles.bottomDock, { paddingBottom: insets.bottom + 12 }]}>
            <LinearGradient
              colors={['rgba(5,5,16,0)', 'rgba(5,5,16,0.96)', 'rgba(5,5,16,1)']}
              style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity
              style={[styles.withdrawButton, isWithdrawing && styles.buttonDisabled]}
              onPress={handleWithdraw}
              disabled={isWithdrawing}
              activeOpacity={0.82}
            >
              {isWithdrawing ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <View style={styles.withdrawIcon}>
                    <Trash2 size={17} color={colors.error} strokeWidth={2.5} />
                  </View>
                  <View style={styles.withdrawCopy}>
                    <Text style={styles.withdrawTitle}>{t('pendingBidDetails.withdrawProposal')}</Text>
                    <Text style={styles.withdrawSubtitle}>{t('pendingBidDetails.removeOffer')}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.error} strokeWidth={2.6} />
                </>
              )}
            </TouchableOpacity>
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
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.orangeMuted,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.32)',
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
  backHomeButton: {
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backHomeText: {
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
    color: Colors.worker,
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
  headerSpacer: {
    width: 44,
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
    backgroundColor: Colors.worker,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.34)',
    backgroundColor: P.orangeMuted,
  },
  pendingBadgeText: {
    color: Colors.worker,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  submittedBadge: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
  },
  submittedBadgeText: {
    flexShrink: 1,
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'right',
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
    backgroundColor: P.cyanMuted,
    borderWidth: 1,
    borderColor: P.borderStrong,
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
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 16,
    paddingTop: 14,
  },
  heroValueLabel: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroValue: {
    color: Colors.green,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },
  heroStatusNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.25)',
    backgroundColor: P.greenMuted,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  heroStatusText: {
    color: Colors.green,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  detailPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    justifyContent: 'center',
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(8,10,30,0.72)',
    padding: 9,
  },
  detailPillIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  detailPillCopy: {
    minWidth: 0,
  },
  detailPillLabel: {
    color: P.textDim,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailPillValue: {
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
    width: 38,
    height: 38,
    borderRadius: 13,
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
    borderColor: P.borderStrong,
    backgroundColor: P.cyanMuted,
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
    backgroundColor: 'rgba(191,90,242,0.1)',
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
  proposalCard: {
    borderRadius: BorderRadius.xl,
  },
  proposalStats: {
    flexDirection: 'row',
    padding: 14,
  },
  proposalStat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  proposalIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  proposalLabel: {
    color: P.textDim,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  proposalValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },
  proposalDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  messageArea: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  messageLabel: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messageText: {
    color: P.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 7,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.m,
    paddingTop: 24,
  },
  withdrawButton: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    overflow: 'hidden',
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.34)',
    backgroundColor: 'rgba(28,8,18,0.96)',
    paddingHorizontal: 14,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    ...Shadows.bevel,
  },
  buttonDisabled: {
    opacity: 0.64,
  },
  withdrawIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: P.redMuted,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
  },
  withdrawCopy: {
    flex: 1,
  },
  withdrawTitle: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  withdrawSubtitle: {
    color: 'rgba(255,59,48,0.65)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});
