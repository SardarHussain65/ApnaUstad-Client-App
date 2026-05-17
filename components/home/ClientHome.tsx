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
import { Zap, CheckCircle, ChevronRight, Search } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useMyBookings, useMyJobPosts } from '../../hooks';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../../constants/Theme';
import { getIconForCategory } from '../../constants/IconRegistry';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { GlassCard } from './GlassCard';
import { CosmicCircle } from './CosmicCircle';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import { HomeSkeletonLoader } from './HomeSkeletonLoader';
import { ClientToast, ToastState } from './ClientToast';
import { RecentBookingCard } from './RecentBookingCard';
import { ClientActiveMissionCard } from './ClientActiveMissionCard';
import { ActiveBiddingBanner } from './ActiveBiddingBanner';
import { useAuth } from '../../context/AuthContext';
import { Booking, JobPost } from '../../hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_GAP = 12;
const DEFAULT_GRADIENT: [string, string] = ['#6366f1', '#a855f7'];
const INITIAL_CATEGORY_LIMIT = 9;
const RECENT_BOOKINGS_LIMIT = 3;

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

// ─── StatChip ─────────────────────────────────────────────────────────────────

const StatChip = React.memo(
  ({ value, label }: { value: number | string; label: string }) => (
    <View style={styles.statChip}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLab}>{label}</Text>
    </View>
  )
);

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
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Responsive grid dimensions
  const numColumns = windowWidth > 600 ? 4 : 3;

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
    data: bookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useMyBookings();

  const {
    data: jobPosts = [],
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useMyJobPosts();

  // Show skeleton only on the very first load, not during pull-to-refresh
  const isInitialLoading = (categoriesLoading || bookingsLoading || jobsLoading) && !isRefreshing;

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
  }, [categoriesError]);

  useEffect(() => {
    if (bookingsError) showToast('Could not load your bookings. Pull down to retry.');
  }, [bookingsError]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchCategories(), refetchBookings(), refetchJobs()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchCategories, refetchBookings, refetchJobs]);

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

  const recentBookings = useMemo<Booking[]>(
    () =>
      [...bookings]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, RECENT_BOOKINGS_LIMIT),
    [bookings]
  );

  const activeMissions = useMemo<JobPost[]>(
    () =>
      jobPosts.filter(job => ['open', 'reviewing'].includes(job.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [jobPosts]
  );

  const activeInstantJob = useMemo<JobPost | undefined>(
    () => activeMissions.find(job => job.urgency === 'instant'),
    [activeMissions]
  );

  const stats = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed').length;
    const active = bookings.filter(b =>
      ['accepted', 'ongoing'].includes(b.status)
    ).length;
    const total = bookings.length;
    const successRate = total > 0 ? completed / total : 0;

    return {
      total,
      active,
      completed,
      successRate,
      successRateLabel: total > 0 ? `${Math.round(successRate * 100)}%` : '—',
      rating: (user as any)?.rating ?? 0,
    };
  }, [bookings, user]);

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

  const handlePostJob = useCallback(() => {
    router.push('/job-creation' as any);
  }, [router]);

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

        {isInitialLoading ? (
          <HomeSkeletonLoader />
        ) : (
          <>
   

          {/* ── Services Section ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, Typography.threeD]}>
                  Services
                </Text>
                <Text style={styles.sectionSub}>
                  What do you need help with?
                </Text>
              </View>

              {!searchQuery && categories.length > INITIAL_CATEGORY_LIMIT && (
                <TouchableOpacity
                  onPress={handleToggleServices}
                  hitSlop={styles.hitSlop}
                >
                  <Text style={styles.viewAll}>
                    {showAllServices ? 'SHOW LESS' : 'VIEW ALL'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search services..."
              variant="section"
            />

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
          </View>

          {/* ── Activity Dashboard ── */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(700)}
            style={styles.dashboardSection}
          >
            <Text style={[styles.sectionTitle, Typography.threeD, styles.dashboardLabel]}>
              Your Activity
            </Text>

            <GlassCard
              intensity={50}
              glowColor={Colors.cyan}
              style={styles.dashboardCard}
            >
              {/* Row layout: circle on left, stats on right */}
              <View style={styles.dashboardContent}>
                <CosmicCircle
                  value={stats.successRate}
                  label={stats.successRateLabel}
                  subLabel="SUCCESS RATE"
                  size={150}
                />

                <View style={styles.insightStats}>
                  <StatChip value={stats.total} label="Total Jobs" />
                  <StatChip value={stats.active} label="Active" />
                  <StatChip value={stats.completed} label="Completed" />
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ── Active Missions (Missions awaiting bids or review) ── */}
          {activeMissions.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(200).duration(700)}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, Typography.threeD]}>
                    Active Missions
                  </Text>
                  <Text style={styles.sectionSub}>Bids received for your scheduled jobs</Text>
                </View>
              </View>

              {activeMissions.map((job, index) => (
                <ClientActiveMissionCard
                  key={job._id}
                  job={job}
                  index={index}
                  onPress={(j) => {
                    if (j.urgency === 'instant' && ['open', 'reviewing'].includes(j.status)) {
                      router.push({ pathname: '/finding-worker', params: { jobId: j._id } });
                    } else {
                      router.push({ pathname: '/job-details', params: { id: j._id } });
                    }
                  }}
                />
              ))}
            </Animated.View>
          )}

          {/* ── Recent Bookings ── */}
          <Animated.View
            entering={FadeInDown.delay(220).duration(700)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, Typography.threeD]}>
                  Recent Bookings
                </Text>
                <Text style={styles.sectionSub}>Your latest activity</Text>
              </View>

              {bookings.length > RECENT_BOOKINGS_LIMIT && (
                <TouchableOpacity
                  onPress={handleViewAllBookings}
                  hitSlop={styles.hitSlop}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.viewAll}>SEE ALL</Text>
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
                  No bookings yet. Book a service to get started!
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={{ height: activeInstantJob ? 180 : 120 }} />
          </>
        )}
      </ScrollView>

      {activeInstantJob && (
        <ActiveBiddingBanner
          job={activeInstantJob}
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
  dashboardCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 28,
  },
  // Row layout: CosmicCircle on left, stats on right
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  insightStats: {
    flex: 1,
    gap: 10,
  },
  statChip: {
    backgroundColor: 'rgba(0,245,255,0.07)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  statLab: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 3,
    textTransform: 'uppercase',
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