/**
 * ClientHome.tsx — Fully Refactored
 *
 * Changes from previous version:
 * - Sub-components extracted to separate files (Toast, Skeleton, RecentBookingCard)
 * - Dead code removed (handleRetryBookings, Elite Talents section, no-op Expand button)
 * - Pull-to-refresh added (RefreshControl)
 * - "Quick Actions" row added (Post a Job + My Bookings)
 * - "Recent Bookings" section added below dashboard
 * - Dashboard layout changed to row (matches WorkerHome, better use of space)
 * - Section labels renamed to user-friendly strings
 * - Toast correctly colors success green / error red
 * - Skeleton safe-area aware via topInset prop
 * - Shared shimmer (one loop, not one per SkeletonBox)
 * - MOCK_RATING removed — unrated users show 0
 * - All dead imports removed
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { ChevronRight, Search, CreditCard, Clock, CheckCircle2, Star, Briefcase } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useCategories, useClientHomeSummary, useMyJobPosts, type Booking, type JobPost } from '../../hooks';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../../constants/Theme';
import { getIconForCategory } from '../../constants/IconRegistry';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { GlassCard } from './GlassCard';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import { useShimmerTranslateX, CategoriesSkeleton, DashboardSkeleton, ListSkeleton, BookingCardSkeleton } from './HomeSkeletonLoader';
import { ClientToast, ToastState } from './ClientToast';
import { RecentBookingCard } from './RecentBookingCard';
import { ActiveBiddingBanner } from './ActiveBiddingBanner';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_GAP = 12;
const DEFAULT_GRADIENT: [string, string] = ['#6366f1', '#a855f7'];
const INITIAL_CATEGORY_LIMIT = 9;
const RECENT_BOOKINGS_LIMIT = 3;
const EMPTY_HOME_STATS = {
  total: 0,
  active: 0,
  completed: 0,
  successRate: 0,
  successRateLabel: '100%',
  totalSpent: 0,
};

// ─── CategoryCard ─────────────────────────────────────────────────────────────
// Extracted so React keeps a stable identity across parent re-renders.

interface CategoryItem {
  _id: string;
  name: string;
  color?: string;
  icon: string;
  description?: string;
}

interface CategoryCardProps {
  cat: CategoryItem;
  index: number;
  onPress: (cat: CategoryItem) => void;
}

const CategoryCard = React.memo(({ cat, index, onPress }: CategoryCardProps) => {
  const Icon = getIconForCategory(cat);
  const gradient: [string, string] = cat.color
    ? [cat.color, `${cat.color}40`]
    : DEFAULT_GRADIENT;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400)}
      style={styles.categoryCardWrapper}
    >
      <GlassCard
        style={styles.categoryItem}
        contentStyle={styles.categoryItemContent}
        onPress={() => onPress(cat)}
        gradient={gradient}
        padding={0}
      >
        <View style={styles.categoryIconBox}>
          <Icon size={22} color="#fff" strokeWidth={2} />
        </View>
        <Text style={styles.categoryTitle} numberOfLines={2}>
          {cat.name}
        </Text>
      </GlassCard>
    </Animated.View>
  );
});
CategoryCard.displayName = 'CategoryCard';




// ─── EmptyServiceState ────────────────────────────────────────────────────────

const EmptyServiceState = ({ isSearching }: { isSearching: boolean }) => (
  <View style={styles.emptyState}>
    <Search size={32} color={Colors.textDim} strokeWidth={1.5} />
    <Text style={styles.emptyTitle}>
      {isSearching ? 'No results found' : 'No services available'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {isSearching
        ? 'Try a different keyword'
        : 'Pull down to refresh'}
    </Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientHome() {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Responsive grid dimensions
  const numColumns = windowWidth > 600 ? 4 : 3;
  const translateX = useShimmerTranslateX();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'error',
  });

  // ── Data fetching ────────────────────────────────────────────────────────

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  const {
    data: homeSummary,
    isLoading: homeSummaryLoading,
    error: homeSummaryError,
    refetch: refetchHomeSummary,
  } = useClientHomeSummary();

  const {
    data: jobPosts = [],
    refetch: refetchJobs,
  } = useMyJobPosts();

  // ── Toast helpers ────────────────────────────────────────────────────────

  const showToast = useCallback(
    (message: string, type: 'error' | 'success' = 'error') => {
      setToast({ visible: true, message, type });
    },
    []
  );

  const dismissToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (categoriesError) showToast('Could not load services. Pull down to retry.');
  }, [categoriesError, showToast]);

  useEffect(() => {
    if (homeSummaryError) showToast('Could not load your activity. Pull down to retry.');
  }, [homeSummaryError, showToast]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchCategories(), refetchHomeSummary(), refetchJobs()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchCategories, refetchHomeSummary, refetchJobs]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(cat => cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const displayedCategories = useMemo(() => {
    if (searchQuery.trim() || showAllServices) return filteredCategories;
    return filteredCategories.slice(0, INITIAL_CATEGORY_LIMIT);
  }, [filteredCategories, showAllServices, searchQuery]);

  const stats = homeSummary?.stats ?? EMPTY_HOME_STATS;
  const recentBookings: Booking[] = homeSummary?.recentBookings ?? [];
  const successPercent = stats.total > 0 ? Math.round(stats.successRate * 100) : 0;
  const completedSummary = `${stats.completed}/${stats.total || 0} ${t('common.completed').toLowerCase()}`;
  const activeSummary = stats.active > 0
    ? `${stats.active} ${t('home.client.active').toLowerCase()}`
    : t('home.client.noBookings');

  const activeMissions = useMemo<JobPost[]>(
    () =>
      jobPosts.filter(job => ['open', 'reviewing'].includes(job.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [jobPosts]
  );

  const activeSearchJob = activeMissions[0];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleServices = useCallback(() => {
    setShowAllServices(prev => !prev);
  }, []);

  const handleCategoryPress = useCallback(
    (cat: CategoryItem) => {
      router.push({
        pathname: '/category-details' as any,
        params: {
          id: cat._id,
          title: cat.name,
          color: cat.color ?? '#fff',
          description: cat.description,
        },
      });
    },
    [router]
  );

  const handleBookingPress = useCallback(
    (bookingId: string) => {
      router.push({ pathname: '/transaction-details' as any, params: { id: bookingId } });
    },
    [router]
  );

  const handleViewAllBookings = useCallback(() => {
    router.push('/(tabs)/bookings' as any);
  }, [router]);

  const handleResumeRadar = useCallback(
    (jobId: string) => {
      router.push({ pathname: '/finding-worker', params: { jobId } });
    },
    [router]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <BackgroundWrapper>
      {/* Toast floats above all content */}
      <ClientToast toast={toast} onDismiss={dismissToast} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.cyan}
            colors={[Colors.cyan]}
          />
        }
      >
        <HomeHeader />

        {/* ── Services Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, Typography.threeD]}>
                {t('home.client.services')}
              </Text>
              <Text style={styles.sectionSub}>
                {t('home.client.whatHelp')}
              </Text>
            </View>

            {!searchQuery && categories.length > INITIAL_CATEGORY_LIMIT && (
              <TouchableOpacity
                onPress={handleToggleServices}
                hitSlop={styles.hitSlop}
              >
                <Text style={styles.viewAll}>
                  {showAllServices ? t('home.client.showLess') : t('home.client.viewAll')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('home.client.searchPlaceholder')}
            variant="section"
          />

          {categoriesLoading && !isRefreshing ? (
            <CategoriesSkeleton translateX={translateX} numColumns={numColumns} />
          ) : (
            <View style={styles.categoriesGrid}>
              {displayedCategories.length > 0 ? (
                displayedCategories.map((cat, index) => (
                  <CategoryCard
                    key={cat._id}
                    cat={cat}
                    index={index}
                    onPress={handleCategoryPress}
                  />
                ))
              ) : (
                <EmptyServiceState isSearching={!!searchQuery.trim()} />
              )}
            </View>
          )}
        </View>

        {/* ── Activity Dashboard ── */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(700)}
          style={styles.dashboardSection}
        >
          <Text style={[styles.sectionTitle, Typography.threeD, styles.dashboardLabel]}>
            {t('home.client.yourActivity')}
          </Text>

          {homeSummaryLoading && !isRefreshing ? (
            <DashboardSkeleton translateX={translateX} />
          ) : (
            <GlassCard
              intensity={42}
              glowColor={Colors.cyan}
              gradient={['rgba(0,245,255,0.16)', 'rgba(191,90,242,0.12)', 'rgba(5,5,16,0.98)']}
              padding={0}
              style={styles.activityDashboardCard}
              contentStyle={styles.activityDashboardContent}
            >
              <View style={styles.activityGlowOne} />
              <View style={styles.activityGlowTwo} />

              <View style={styles.activityTopRow}>
                <View style={styles.spentCluster}>
                  <View style={styles.heroIconBox}>
                    <CreditCard size={22} color={Colors.cyan} strokeWidth={2.5} />
                  </View>
                  <View style={styles.heroTextContainer}>
                    <Text style={styles.heroLabel}>{t('home.client.totalSpent')}</Text>
                    <Text style={[styles.heroValue, Typography.threeD]}>
                      Rs. {stats.totalSpent.toLocaleString()}
                    </Text>
                    <Text style={styles.heroSubText}>{activeSummary}</Text>
                  </View>
                </View>

                <View style={styles.successBadge}>
                  <Star size={14} color="#facc15" fill="#facc15" strokeWidth={2.4} />
                  <View>
                    <Text style={styles.successPercent}>{successPercent}%</Text>
                    <Text style={styles.successLabel}>{t('common.success')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>{t('home.client.completionRate')}</Text>
                  <Text style={styles.progressValue}>{completedSummary}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${successPercent}%` }]} />
                </View>
              </View>

              <View style={styles.activityStatsRow}>
                <View style={styles.activityStatTile}>
                  <View style={[styles.statIconBubble, { backgroundColor: 'rgba(0,245,255,0.1)' }]}>
                    <Clock size={14} color={Colors.cyan} />
                  </View>
                  <Text style={styles.subStatVal}>{stats.active}</Text>
                  <Text style={styles.subStatLab}>{t('home.client.active')}</Text>
                </View>

                <View style={styles.activityStatTile}>
                  <View style={[styles.statIconBubble, { backgroundColor: 'rgba(0,255,127,0.1)' }]}>
                    <CheckCircle2 size={14} color={Colors.green} />
                  </View>
                  <Text style={styles.subStatVal}>{stats.completed}</Text>
                  <Text style={styles.subStatLab}>{t('home.client.completed')}</Text>
                </View>

                <View style={styles.activityStatTile}>
                  <View style={[styles.statIconBubble, { backgroundColor: 'rgba(191,90,242,0.12)' }]}>
                    <Briefcase size={14} color={Colors.purple} />
                  </View>
                  <Text style={styles.subStatVal}>{stats.total}</Text>
                  <Text style={styles.subStatLab}>{t('home.client.totalJobs')}</Text>
                </View>
              </View>
            </GlassCard>
          )}
        </Animated.View>

        {/* ── Recent Bookings ── */}
        {homeSummaryLoading && !isRefreshing ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, Typography.threeD]}>
                  Recent Bookings
                </Text>
                <Text style={styles.sectionSub}>Your latest activity</Text>
              </View>
            </View>
            <BookingCardSkeleton translateX={translateX} />
            <BookingCardSkeleton translateX={translateX} />
          </View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(220).duration(700)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, Typography.threeD]}>
                  {t('home.client.recentBookings')}
                </Text>
                <Text style={styles.sectionSub}>{t('home.client.latestActivity')}</Text>
              </View>

              {stats.total > RECENT_BOOKINGS_LIMIT && (
                <TouchableOpacity
                  onPress={handleViewAllBookings}
                  hitSlop={styles.hitSlop}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.viewAll}>{t('home.client.seeAll')}</Text>
                  <ChevronRight size={12} color={Colors.cyan} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>

            {recentBookings.length > 0 ? (
              recentBookings.map(booking => (
                <RecentBookingCard
                  key={booking._id}
                  booking={booking}
                  onPress={() => handleBookingPress(booking._id)}
                />
              ))
            ) : (
              <View style={styles.emptyBookings}>
                <Text style={styles.emptyBookingsText}>
                  {t('home.client.noBookings')}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: activeSearchJob ? 190 : 120 }} />
      </ScrollView>

      {activeSearchJob && (
        <ActiveBiddingBanner
          job={activeSearchJob}
          activeCount={activeMissions.length}
          onPress={handleResumeRadar}
        />
      )}
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.xl,
    marginTop: Spacing.s,
  },
  quickActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cyan,
    paddingVertical: 13,
    borderRadius: BorderRadius.l,
    ...Shadows.glow,
  },
  quickActionPrimaryText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quickActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,245,255,0.08)',
    paddingVertical: 13,
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.25)',
  },
  quickActionSecondaryText: {
    color: Colors.cyan,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Section layout
  section: {
    marginBottom: Spacing.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.m,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hitSlop: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },

  // ── Categories grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: Spacing.l,
  },
  categoryCardWrapper: {
    width: '30.5%',
  },
  categoryItem: {
    height: 120,
    width: '100%',
  },
  categoryItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  categoryIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadows.depth,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Empty state (no categories / no search results)
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textDim,
    fontWeight: '500',
  },

  // ── Activity dashboard
  dashboardSection: {
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.l,
  },
  dashboardLabel: {
    marginBottom: Spacing.m,
  },
  activityDashboardCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
    marginBottom: Spacing.m,
  },
  activityDashboardContent: {
    position: 'relative',
    overflow: 'hidden',
    padding: 16,
  },
  activityGlowOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -72,
    right: -45,
    backgroundColor: 'rgba(0,245,255,0.14)',
  },
  activityGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -70,
    left: -42,
    backgroundColor: 'rgba(191,90,242,0.15)',
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  spentCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBox: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.24)',
  },
  heroTextContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  heroSubText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(250,204,21,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  },
  successPercent: {
    color: '#facc15',
    fontSize: 14,
    fontWeight: '900',
  },
  successLabel: {
    color: 'rgba(250,204,21,0.76)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressBlock: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 11,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  progressTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  progressValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.green,
  },
  activityStatsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  activityStatTile: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    padding: 11,
    backgroundColor: 'rgba(6,8,24,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  statIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  subStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  subStatLab: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginTop: 2,
  },

  // ── Recent bookings empty state
  emptyBookings: {
    marginHorizontal: Spacing.l,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyBookingsText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.l,
    lineHeight: 20,
  },
  missionCard: {
    marginHorizontal: Spacing.l,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  missionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  missionDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  bidCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bidCountText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
