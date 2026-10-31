import React, { useState, useMemo, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
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
import { useNearbyJobs, useUserLocation } from '../../hooks';
import { socketService } from '../../services/socketService';
import { useIsRTL } from '../../context/LanguageContext';

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

  const { location } = useUserLocation();
  const { data: rawJobs = [], isLoading, refetch } = useNearbyJobs(
    location?.longitude,
    location?.latitude
  );

  useEffect(() => {
    const unsub = socketService.on('job:new', () => {
      refetch();
    });
    return () => {
      unsub();
    };
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return rawJobs.filter((job) => {
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
  }, [rawJobs, urgencyFilter, searchQuery]);

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
                  backgroundColor: alpha(theme.colors.surface.card, 0.4),
                  borderColor: theme.colors.border.subtle,
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
                backgroundColor: alpha(theme.colors.surface.card, 0.35),
                borderColor: theme.colors.border.subtle,
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
                    ? { color: '#000', fontWeight: '800' }
                    : { color: theme.colors.text.muted },
                ]}
              >
                {t('common.all', 'All Jobs')} ({rawJobs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                urgencyFilter === 'instant' && [
                  styles.filterPillActive,
                  { backgroundColor: alpha(colors.error, 0.2), borderColor: colors.error },
                ],
              ]}
              onPress={() => setUrgencyFilter('instant')}
            >
              <Zap
                size={13}
                color={urgencyFilter === 'instant' ? colors.error : theme.colors.text.muted}
              />
              <Text
                style={[
                  styles.filterPillText,
                  urgencyFilter === 'instant'
                    ? { color: colors.error, fontWeight: '800' }
                    : { color: theme.colors.text.muted },
                ]}
              >
                {t('jobsNearby.urgentOnly', 'Urgent')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                urgencyFilter === 'scheduled' && [
                  styles.filterPillActive,
                  { backgroundColor: alpha(colors.worker, 0.2), borderColor: colors.worker },
                ],
              ]}
              onPress={() => setUrgencyFilter('scheduled')}
            >
              <Calendar
                size={13}
                color={urgencyFilter === 'scheduled' ? colors.worker : theme.colors.text.muted}
              />
              <Text
                style={[
                  styles.filterPillText,
                  urgencyFilter === 'scheduled'
                    ? { color: colors.worker, fontWeight: '800' }
                    : { color: theme.colors.text.muted },
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
                      borderColor={theme.colors.border.subtle}
                      hasGlow={isUrgent}
                      glowColor={isUrgent ? colors.cyan : colors.worker}
                      onPress={() =>
                        router.push({
                          pathname: '/bid-submission',
                          params: {
                            jobId: job._id,
                            title: job.category,
                            urgency: job.urgency,
                          },
                        })
                      }
                    >
                      <View style={styles.jobRow}>
                        {/* Left urgency pill cluster */}
                        <View
                          style={[
                            styles.typeCluster,
                            { borderRightColor: theme.colors.border.subtle },
                          ]}
                        >
                          {isUrgent ? (
                            <>
                              <View
                                style={[
                                  styles.iconBubble,
                                  { backgroundColor: alpha(colors.error, 0.15) },
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
                                  { backgroundColor: alpha(colors.worker, 0.15) },
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
                            <MapPin size={12} color={theme.colors.text.muted} />
                            <Text
                              style={[styles.metaText, { color: theme.colors.text.muted }]}
                              numberOfLines={1}
                            >
                              {job.address || t('common.nearby', 'Nearby')}
                            </Text>
                            {job.budget ? (
                              <>
                                <View
                                  style={[
                                    styles.dot,
                                    { backgroundColor: theme.colors.border.subtle },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.budgetText,
                                    { color: colors.success, fontWeight: '700' },
                                  ]}
                                >
                                  Rs. {Number(job.budget).toLocaleString()}
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
                                backgroundColor: alpha(colors.cyan, 0.15),
                                borderColor: alpha(colors.cyan, 0.35),
                              },
                            ]}
                          >
                            <Text style={[styles.bidCtaText, { color: colors.cyan }]}>
                              {t('jobsNearby.bidBtn', 'BID')}
                            </Text>
                            <ChevronRight size={14} color={colors.cyan} />
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
                    backgroundColor: alpha(theme.colors.surface.card, 0.5),
                    borderColor: theme.colors.border.subtle,
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
                <Text style={styles.refreshBtnText}>
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 14,
    paddingHorizontal: 6,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  jobCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  typeCluster: {
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    minWidth: 64,
    gap: 4,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTypeLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jobMain: {
    flex: 1,
    paddingHorizontal: 12,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  jobDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    maxWidth: 140,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  budgetText: {
    fontSize: 11,
  },
  actionArea: {
    paddingLeft: 4,
  },
  bidCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  bidCtaText: {
    fontSize: 11,
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
    borderWidth: 1,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  refreshBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
});

