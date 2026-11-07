import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Briefcase,
  MapPin,
  Zap,
  Calendar,
  ChevronRight,
  Search,
  RotateCw,
  SlidersHorizontal,
  Flame,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { useNearbyJobs, useUserLocation, useWorkerBids, cleanAddressString } from '../../hooks';
import { socketService } from '../../services/socketService';
import { useIsRTL } from '../../context/LanguageContext';
import { useIncomingJob } from '../../context/IncomingJobContext';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

type UrgencyFilter = 'all' | 'instant' | 'scheduled';

export default function WorkerJobsTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { openIncomingJobModal } = useIncomingJob();
  const { openJobId } = useLocalSearchParams<{ openJobId?: string }>();

  const { location } = useUserLocation();
  const { data: rawJobs = [], isLoading, refetch } = useNearbyJobs(
    location?.longitude,
    location?.latitude
  );
  const { data: workerBids = [], refetch: refetchBids } = useWorkerBids();

  const handledOpenJobIdRef = useRef<string | null>(null);

  // If navigated from push notification with openJobId, open modal automatically (once only)
  useEffect(() => {
    if (openJobId && handledOpenJobIdRef.current !== openJobId) {
      handledOpenJobIdRef.current = openJobId;
      // Clear param from route so it doesn't trigger repeatedly on focus or query invalidations
      router.setParams({ openJobId: '' });

      const targetJob = rawJobs.find((j: any) => (j._id || j.id) === openJobId);
      if (targetJob) {
        if (targetJob.status === 'open') {
          openIncomingJobModal(targetJob);
        } else {
          Toast.show({
            type: 'info',
            text1: t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
            text2: t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
          });
        }
      } else {
        // Fetch to verify before opening hollow modal
        api.get(`/jobs/${openJobId}`)
          .then((res) => {
            if (res.data?.data && res.data.data.status === 'open') {
              openIncomingJobModal(res.data.data);
            } else {
              Toast.show({
                type: 'info',
                text1: t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
                text2: t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
              });
            }
          })
          .catch(() => {
            Toast.show({
              type: 'info',
              text1: t('realtimeAlerts.jobTakenTitle', 'Job Taken'),
              text2: t('realtimeAlerts.jobTakenDesc', 'This mission has already been accepted or closed.'),
            });
          });
      }
    }
  }, [openJobId, rawJobs, openIncomingJobModal, router, t]);

  // Set of job IDs where this worker has already sent an offer
  const bidJobIds = useMemo(() => {
    return new Set(
      workerBids
        .map((b) => (typeof b.jobPost === 'string' ? b.jobPost : b.jobPost?._id))
        .filter(Boolean)
    );
  }, [workerBids]);

  useEffect(() => {
    const unsub = socketService.on('job:new', () => {
      refetch();
    });
    return () => {
      unsub();
    };
  }, [refetch]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
      refetchBids();
    }, [refetch, refetchBids])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchBids()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return rawJobs.filter((job) => {
      // Exclude jobs where worker has already sent an offer
      if (bidJobIds.has(job._id)) return false;

      // Urgency filter
      if (urgencyFilter !== 'all') {
        const isUrgent = job.urgency === 'instant';
        if (urgencyFilter === 'instant' && !isUrgent) return false;
        if (urgencyFilter === 'scheduled' && isUrgent) return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const categoryMatch = job.category?.toLowerCase().includes(query);
        const descMatch = job.description?.toLowerCase().includes(query);
        const addressMatch = job.address?.toLowerCase().includes(query);
        if (!categoryMatch && !descMatch && !addressMatch) return false;
      }
      return true;
    });
  }, [rawJobs, bidJobIds, urgencyFilter, searchQuery]);

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          entering={SlideInDown.duration(350)}
          style={[styles.header, { paddingTop: insets.top + Spacing.m }]}
        >
          <View style={styles.headerTitleRow}>
            <View>
              <View style={styles.titleBadgeRow}>
                <View style={[styles.radarDot, { backgroundColor: colors.cyan }]} />
                <Text style={[styles.screenEyebrow, { color: colors.cyan }]}>
                  {t('jobsNearby.radarLive', 'LIVE RADAR')}
                </Text>
              </View>
              <Text style={[styles.screenTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                {t('jobsNearby.title', 'Available Jobs')}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.refreshIconBtn,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.default,
                },
              ]}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <RotateCw size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.default,
              },
            ]}
          >
            <Search size={18} color={theme.colors.text.muted} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text.primary }]}
              placeholder={t('jobsNearby.searchPlaceholder', 'Search by service, title, or area...')}
              placeholderTextColor={theme.colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={[styles.clearBtn, { color: theme.colors.text.muted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.default,
                },
                urgencyFilter === 'all' && [
                  styles.filterPillActive,
                  { backgroundColor: colors.cyan, borderColor: colors.cyan },
                ],
              ]}
              onPress={() => setUrgencyFilter('all')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  urgencyFilter === 'all'
                    ? { color: theme.isDark ? '#0F172A' : '#FFFFFF', fontWeight: '800' }
                    : { color: theme.colors.text.secondary },
                ]}
              >
                {t('common.all', 'All Jobs')} ({rawJobs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.default,
                },
                urgencyFilter === 'instant' && [
                  styles.filterPillActive,
                  { backgroundColor: alpha(colors.error, 0.2), borderColor: colors.error },
                ],
              ]}
              onPress={() => setUrgencyFilter('instant')}
            >
              <Zap
                size={14}
                color={urgencyFilter === 'instant' ? colors.error : theme.colors.text.secondary}
              />
              <Text
                style={[
                  styles.filterPillText,
                  urgencyFilter === 'instant'
                    ? { color: colors.error, fontWeight: '800' }
                    : { color: theme.colors.text.secondary },
                ]}
              >
                {t('jobsNearby.urgentOnly', 'Urgent')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.default,
                },
                urgencyFilter === 'scheduled' && [
                  styles.filterPillActive,
                  { backgroundColor: alpha(colors.worker, 0.2), borderColor: colors.worker },
                ],
              ]}
              onPress={() => setUrgencyFilter('scheduled')}
            >
              <Calendar
                size={14}
                color={urgencyFilter === 'scheduled' ? colors.worker : theme.colors.text.secondary}
              />
              <Text
                style={[
                  styles.filterPillText,
                  urgencyFilter === 'scheduled'
                    ? { color: colors.worker, fontWeight: '800' }
                    : { color: theme.colors.text.secondary },
                ]}
              >
                {t('jobsNearby.scheduledOnly', 'Scheduled')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Content List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.cyan}
              colors={[colors.cyan]}
            />
          }
        >
          {isLoading && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.cyan} size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>
                {t('jobsNearby.scanningLocalFrequency', 'Scanning for nearby jobs...')}
              </Text>
            </View>
          ) : filteredJobs.length > 0 ? (
            <View style={styles.list}>
              {filteredJobs.map((job, index) => {
                const isUrgent = job.urgency === 'instant';
                return (
                  <Animated.View
                    key={job._id}
                    entering={FadeInDown.delay(index * 70).duration(450)}
                  >
                    <GlassCard
                      style={styles.jobCard}
                      borderColor={theme.colors.border.default}
                      hasGlow={isUrgent}
                      glowColor={isUrgent ? colors.cyan : colors.worker}
                      onPress={() => {
                        if (isUrgent) {
                          openIncomingJobModal(job);
                        } else {
                          router.push({
                            pathname: '/bid-submission',
                            params: {
                              jobId: job._id,
                              title: job.category,
                              urgency: job.urgency,
                            },
                          });
                        }
                      }}
                    >
                      <View style={styles.jobRow}>
                        {/* Left urgency pill cluster */}
                        <View
                          style={[
                            styles.typeCluster,
                            { borderRightColor: theme.colors.border.default },
                          ]}
                        >
                          {isUrgent ? (
                            <>
                              <View
                                style={[
                                  styles.iconBubble,
                                  { backgroundColor: alpha(colors.error, 0.16) },
                                ]}
                              >
                                <Zap size={18} color={colors.error} />
                              </View>
                              <Text style={[styles.jobTypeLabel, { color: colors.error }]}>
                                {t('jobsNearby.urgentBadge', 'URGENT')}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View
                                style={[
                                  styles.iconBubble,
                                  { backgroundColor: alpha(colors.worker, 0.16) },
                                ]}
                              >
                                <Calendar size={18} color={colors.worker} />
                              </View>
                              <Text style={[styles.jobTypeLabel, { color: colors.worker }]}>
                                {t('jobsNearby.scheduledBadge', 'LATER')}
                              </Text>
                            </>
                          )}
                        </View>

                        {/* Middle job description */}
                        <View style={styles.jobMain}>
                          <Text
                            style={[
                              styles.jobTitle,
                              typography.threeD,
                              { color: theme.colors.text.primary },
                            ]}
                          >
                            {job.category}
                          </Text>
                          <Text
                            style={[styles.jobDesc, { color: theme.colors.text.secondary }]}
                            numberOfLines={2}
                          >
                            {job.description || t('jobsNearby.noDescription', 'Client posted a service request')}
                          </Text>

                          <View style={styles.jobMeta}>
                            <MapPin size={13} color={theme.colors.text.muted} />
                            <Text
                              style={[styles.metaText, { color: theme.colors.text.muted }]}
                              numberOfLines={1}
                            >
                              {cleanAddressString(job.address) || t('common.nearby', 'Nearby')}
                            </Text>
                            {(job.budget || job.amount || job.signalMeta?.amount) ? (
                              <>
                                <View
                                  style={[
                                    styles.dot,
                                    { backgroundColor: theme.colors.border.default },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.budgetText,
                                    { color: colors.success, fontWeight: '800' },
                                  ]}
                                >
                                  Rs. {Number(job.budget || job.amount || job.signalMeta?.amount).toLocaleString()}
                                </Text>
                              </>
                            ) : null}
                          </View>
                        </View>

                        {/* Right Action */}
                        <View style={styles.actionArea}>
                          <View
                            style={[
                              styles.bidCtaPill,
                              {
                                backgroundColor: isUrgent ? alpha(colors.error, 0.18) : alpha(colors.cyan, 0.18),
                                borderColor: isUrgent ? alpha(colors.error, 0.5) : alpha(colors.cyan, 0.45),
                              },
                            ]}
                          >
                            <Text style={[styles.bidCtaText, { color: isUrgent ? colors.error : colors.cyan }]}>
                              {isUrgent ? t('jobsNearby.claimBtn', 'ACCEPT') : t('jobsNearby.bidBtn', 'BID')}
                            </Text>
                            <ChevronRight size={14} color={isUrgent ? colors.error : colors.cyan} />
                          </View>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconContainer,
                  {
                    backgroundColor: theme.colors.surface.card,
                    borderColor: theme.colors.border.default,
                  },
                ]}
              >
                <Briefcase size={44} color={theme.colors.text.muted} />
              </View>
              <Text
                style={[styles.emptyTitle, typography.threeD, { color: theme.colors.text.primary }]}
              >
                {t('jobsNearby.noMissionsFound', 'No Open Jobs Right Now')}
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>
                {t(
                  'jobsNearby.emptyRadarHelp',
                  'Your radar is active! Keep your status Online, and you will receive instant audio and notification alerts the moment a client posts a job.'
                )}
              </Text>
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: colors.cyan }]}
                onPress={handleRefresh}
              >
                <Text style={[styles.refreshBtnText, { color: theme.isDark ? '#0F172A' : '#FFFFFF' }]}>
                  {t('jobsNearby.refreshScan', 'Scan Again')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  radarDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  screenEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  refreshIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 15,
    paddingHorizontal: 6,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.6,
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
  },
  loadingContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  jobCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1.8,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  typeCluster: {
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1.5,
    minWidth: 66,
    gap: 4,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTypeLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jobMain: {
    flex: 1,
    paddingHorizontal: 12,
  },
  jobTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  jobDesc: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  budgetText: {
    fontSize: 12.5,
  },
  actionArea: {
    paddingLeft: 4,
  },
  bidCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  bidCtaText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  refreshBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

