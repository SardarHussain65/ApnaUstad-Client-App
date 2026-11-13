/**
 * ClientHome.tsx — Redesigned Customer Experience
 *
 * Streamlined UI & Design System alignment:
 * - Removed heavy Activity Dashboard ("Total Paid / Completion Rate" KPI card) from Home;
 *   financial metrics belong in ClientWalletView.
 * - Added elevated State-Aware Top Dynamic Hero Card:
 *   1. Active Ustad Tracking (when a booking is accepted or in-progress)
 *   2. Offers Ready (when Ustads have submitted bids on client's custom job)
 *   3. Live Radar Searching (real-time worker search for pending job)
 * - Streamlined Popular Services Grid with instant keyword filtering
 * - Added prominent "Need a Custom Job?" action card
 * - Streamlined Recent Bookings & Trust & Safety Assurance banner
 * - Removed bottom floating banner overlap
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
import {
  ChevronRight,
  ChevronUp,
  Search,
  MapPin,
  ArrowRight,
  Radio,
  Zap,
  CheckCircle2,
  Clock,
  Banknote,
  LayoutGrid,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useCategories, useClientHomeSummary, useMyJobPosts, useRefreshOnFocus, type Booking, type JobPost } from '../../hooks';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography, getCategoryTilePalette } from '../../constants/Theme';
import { getIconForCategory } from '../../constants/IconRegistry';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { GlassCard } from './GlassCard';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import { useShimmerTranslateX, CategoriesSkeleton, BookingCardSkeleton } from './HomeSkeletonLoader';
import { ClientToast, ToastState } from './ClientToast';
import { RecentBookingCard } from './RecentBookingCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_GAP = 12;
const INITIAL_CATEGORY_LIMIT = 6;
const RECENT_BOOKINGS_LIMIT = 3;

// ─── CategoryCard ─────────────────────────────────────────────────────────────

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
  animate?: boolean;
}

const CategoryCard = React.memo(({ cat, index, onPress, animate = true }: CategoryCardProps) => {
  const theme = useTheme();
  const Icon = getIconForCategory(cat);
  const palette = useMemo(
    () => getCategoryTilePalette(theme, cat.name, index, false),
    [theme, cat.name, index]
  );

  const card = (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
        },
      ]}
      onPress={() => onPress(cat)}
      activeOpacity={0.82}
    >
      <View style={styles.categoryItemContent}>
        <View style={[styles.categoryIconBox, { backgroundColor: palette.iconBoxBg }]}>
          <Icon size={27} color={palette.iconColor} strokeWidth={2.2} />
        </View>
        <Text
          style={[styles.categoryTitle, { color: palette.titleColor }]}
          numberOfLines={2}
        >
          {cat.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!animate) {
    return (
      <View style={styles.categoryCardWrapper}>
        {card}
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(350)}
      style={styles.categoryCardWrapper}
    >
      {card}
    </Animated.View>
  );
});
CategoryCard.displayName = 'CategoryCard';

// ─── ViewAllCard ──────────────────────────────────────────────────────────────

interface ViewAllCardProps {
  remainingCount: number;
  index: number;
  onPress: () => void;
  animate?: boolean;
}

const ViewAllCard = React.memo(({ remainingCount, index, onPress, animate = true }: ViewAllCardProps) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const palette = useMemo(
    () => getCategoryTilePalette(theme, '', index, true),
    [theme, index]
  );

  const card = (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.categoryItemContent}>
        <View style={[styles.categoryIconBox, { backgroundColor: palette.iconBoxBg }]}>
          <LayoutGrid size={25} color={palette.iconColor} strokeWidth={2.3} />
        </View>
        <Text
          style={[styles.categoryTitle, { color: palette.titleColor }]}
          numberOfLines={1}
        >
          {t('home.client.viewAll', 'View all')}
        </Text>
        <Text
          style={[
            styles.viewAllCardCount,
            { color: palette.subtitleColor || theme.colors.text.muted },
          ]}
          numberOfLines={1}
        >
          {`+${remainingCount} more`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!animate) {
    return (
      <View style={styles.categoryCardWrapper}>
        {card}
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(350)}
      style={styles.categoryCardWrapper}
    >
      {card}
    </Animated.View>
  );
});
ViewAllCard.displayName = 'ViewAllCard';

// ─── EmptyServiceState ────────────────────────────────────────────────────────

const EmptyServiceState = ({ isSearching }: { isSearching: boolean }) => {
  const theme = useTheme();
  return (
    <View style={styles.emptyState}>
      <Search size={32} color={theme.colors.text.muted} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text.muted }]}>
        {isSearching ? 'No results found' : 'No services available'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.text.muted }]}>
        {isSearching
          ? 'Try a different keyword'
          : 'Pull down to refresh'}
      </Text>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientHome() {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

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

  // Auto-refresh when ClientHome regains focus (switching tabs / returning to home)
  useRefreshOnFocus(handleRefresh);

  // Explicitly refetch on screen focus so returning from job-creation or live-radar immediately displays updated state
  useFocusEffect(
    useCallback(() => {
      void refetchJobs();
      void refetchHomeSummary();
    }, [refetchJobs, refetchHomeSummary])
  );

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(q) ||
      Boolean(cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Active Booking (assigned Ustad on the way, ongoing work, or work completed awaiting cash payment)
  const activeBooking = useMemo(() => {
    if (homeSummary?.activeBooking) return homeSummary.activeBooking;
    const recent = homeSummary?.recentBookings ?? [];
    return (
      recent.find(b =>
        ['accepted', 'ongoing'].includes(b.status) ||
        (b.status === 'completed' && b.paymentStatus !== 'paid')
      ) || null
    );
  }, [homeSummary]);

  const isPaymentDue = Boolean(
    activeBooking &&
    activeBooking.status === 'completed' &&
    activeBooking.paymentStatus !== 'paid'
  );

  const dueAmount = useMemo(() => {
    if (!activeBooking) return 0;
    return Number(
      (activeBooking.cardMeta?.financial as any)?.cashDue ??
      activeBooking.cardMeta?.financial?.amount ??
      activeBooking.totalAmount ??
      0
    );
  }, [activeBooking]);

  // Active Custom Job Post (open or reviewing without an accepted bid or assigned booking)
  const activeMissions = useMemo<JobPost[]>(() => {
    const recent = homeSummary?.recentBookings ?? [];
    const bookedJobPostIds = new Set<string>();

    recent.forEach((b: any) => {
      if (b.status !== 'cancelled' && b.jobPost) {
        bookedJobPostIds.add(String(b.jobPost?._id || b.jobPost));
      }
    });

    if (activeBooking && (activeBooking as any).jobPost) {
      bookedJobPostIds.add(String((activeBooking as any).jobPost?._id || (activeBooking as any).jobPost));
    }

    return jobPosts
      .filter((job: any) => {
        // Must be open or reviewing
        const status = String(job.status || '').toLowerCase();
        if (!['open', 'reviewing'].includes(status)) return false;

        // If it already has an accepted bid or booking linked, it is not searching
        if (job.acceptedBid || job.hasAcceptedBid || job.cardMeta?.bidSummary?.hasAcceptedBid) return false;
        if (job.bookingId || job.detailMeta?.bookingId) return false;

        // If an existing non-cancelled booking explicitly references this job post
        if (bookedJobPostIds.has(String(job._id))) return false;

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobPosts, homeSummary?.recentBookings, activeBooking]);
  const activeSearchJob = activeMissions[0] || null;
  const proposalCount = activeSearchJob?.pendingBidCount ?? activeSearchJob?.bidCount ?? 0;

  // Recent completed/past bookings (excluding activeBooking to prevent duplicate cards)
  const recentBookings: Booking[] = useMemo(() => {
    const list = homeSummary?.recentBookings ?? [];
    if (activeBooking) {
      return list.filter(b => b._id !== activeBooking._id).slice(0, RECENT_BOOKINGS_LIMIT);
    }
    return list.slice(0, RECENT_BOOKINGS_LIMIT);
  }, [homeSummary?.recentBookings, activeBooking]);

  const totalBookingsCount = homeSummary?.stats?.total ?? (homeSummary?.recentBookings?.length ?? 0);

  // If there are ongoing or recent jobs below, keep categories compact (6 cards = 2 rows).
  // If there is no activity below, show one more row (9 cards = 3 rows) so the screen looks balanced.
  const hasBottomActivity = recentBookings.length > 0;
  const baseCategoryLimit = hasBottomActivity ? INITIAL_CATEGORY_LIMIT : 9;

  const shouldShowViewAllCard = useMemo(() => {
    if (searchQuery.trim() || showAllServices) return false;
    return filteredCategories.length > baseCategoryLimit;
  }, [searchQuery, showAllServices, filteredCategories.length, baseCategoryLimit]);

  const displayedCategories = useMemo(() => {
    if (searchQuery.trim() || showAllServices) return filteredCategories;
    if (shouldShowViewAllCard) {
      return filteredCategories.slice(0, baseCategoryLimit - 1);
    }
    return filteredCategories.slice(0, baseCategoryLimit);
  }, [filteredCategories, showAllServices, searchQuery, baseCategoryLimit, shouldShowViewAllCard]);

  const remainingCategoryCount = useMemo(() => {
    return Math.max(0, filteredCategories.length - (baseCategoryLimit - 1));
  }, [filteredCategories.length, baseCategoryLimit]);

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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <BackgroundWrapper>
      {/* Toast floats above all content */}
      <ClientToast toast={toast} onDismiss={dismissToast} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top },
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
        <HomeHeader />

        {/* ── 1. Top Dynamic Hero Card (State-Aware) ── */}
        {activeBooking ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.heroSection}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => router.push({ pathname: '/transaction-details', params: { id: activeBooking._id } })}
            >
              <GlassCard
                intensity={35}
                padding={18}
                hasGlow
                glowColor={isPaymentDue ? colors.orange : colors.success}
                style={[
                  styles.heroCard,
                  { borderColor: alpha(isPaymentDue ? colors.orange : colors.success, 0.45) }
                ]}
              >
                <View style={styles.heroTopRow}>
                  <View
                    style={[
                      styles.heroStatusPill,
                      { backgroundColor: alpha(isPaymentDue ? colors.orange : colors.success, 0.14) }
                    ]}
                  >
                    <View
                      style={[
                        styles.pulseDot,
                        { backgroundColor: isPaymentDue ? colors.orange : colors.success }
                      ]}
                    />
                    <Text
                      style={[
                        styles.heroStatusText,
                        { color: isPaymentDue ? colors.orange : colors.success }
                      ]}
                    >
                      {isPaymentDue
                        ? t('home.client.paymentDueBadge', 'WORK DONE • CASH PAYMENT DUE')
                        : t('home.client.ustadActive', 'USTAD ON THE WAY / IN PROGRESS')}
                    </Text>
                  </View>
                  <Text style={[styles.heroTimeText, { color: theme.colors.text.muted }]}>
                    {activeBooking.bookingType === 'instant' ? '⚡ Urgent' : '📅 Scheduled'}
                  </Text>
                </View>

                <Text style={[styles.heroJobTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                  {activeBooking.category || (activeBooking as any).serviceName || 'Service Request'}
                </Text>

                <View style={styles.heroCustomerRow}>
                  <Text style={[styles.heroCustomerName, { color: theme.colors.text.secondary }]}>
                    {t('common.ustad', 'Ustad')}: {activeBooking.worker?.fullName || activeBooking.cardMeta?.counterParty?.fullName || 'Assigned Ustad'}
                  </Text>
                  {activeBooking.address ? (
                    <View style={styles.heroLocationRow}>
                      <MapPin size={12} color={theme.colors.text.muted} />
                      <Text style={[styles.heroAddressText, { color: theme.colors.text.muted }]} numberOfLines={1}>
                        {activeBooking.address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[
                    styles.heroCtaBtn,
                    { backgroundColor: isPaymentDue ? colors.orange : colors.success }
                  ]}
                  onPress={() => router.push({ pathname: '/transaction-details', params: { id: activeBooking._id } })}
                  activeOpacity={0.84}
                >
                  {isPaymentDue ? (
                    <Banknote size={16} color="#000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  ) : (
                    <MapPin size={16} color="#000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.heroCtaBtnText, { color: '#000' }]}>
                    {isPaymentDue
                      ? t('home.client.payCashBtn', { amount: dueAmount.toLocaleString(), defaultValue: `Pay Cash to Ustad (Rs. ${dueAmount.toLocaleString()})` })
                      : t('home.client.trackUstadBtn', 'Track on Map & View Status')}
                  </Text>
                  <ArrowRight size={16} color="#000" strokeWidth={2.5} />
                </TouchableOpacity>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {activeSearchJob ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.heroSection}>
            {proposalCount > 0 ? (
              <GlassCard
                intensity={35}
                padding={18}
                hasGlow
                glowColor={colors.orange}
                style={[styles.heroCard, { borderColor: alpha(colors.orange, 0.45) }]}
              >
                <View style={styles.heroTopRow}>
                  <View style={[styles.heroStatusPill, { backgroundColor: alpha(colors.orange, 0.14) }]}>
                    <Zap size={11} color={colors.orange} strokeWidth={2.5} />
                    <Text style={[styles.heroStatusText, { color: colors.orange }]}>
                      {t('home.client.offersReadyBadge', 'OFFERS RECEIVED')}
                    </Text>
                  </View>
                  <Text style={[styles.heroTimeText, { color: theme.colors.text.muted }]}>
                    {activeSearchJob.urgency === 'instant' ? '⚡ Urgent' : '📅 Scheduled'}
                  </Text>
                </View>

                <Text style={[styles.heroJobTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                  {activeSearchJob.signalMeta?.title || activeSearchJob.category || 'Custom Request'}
                </Text>

                <Text style={[styles.heroSubDesc, { color: theme.colors.text.secondary }]}>
                  {t('home.client.offersReadyDesc', { count: proposalCount })}
                </Text>

                <TouchableOpacity
                  style={[styles.heroCtaBtn, { backgroundColor: colors.orange }]}
                  onPress={() => router.push({ pathname: '/finding-worker', params: { jobId: activeSearchJob._id } })}
                  activeOpacity={0.84}
                >
                  <Text style={[styles.heroCtaBtnText, { color: '#000' }]}>
                    {t('home.client.reviewOffersBtn', { count: proposalCount })}
                  </Text>
                  <ArrowRight size={16} color="#000" strokeWidth={2.5} />
                </TouchableOpacity>
              </GlassCard>
            ) : (
              <GlassCard
                intensity={35}
                padding={18}
                hasGlow
                glowColor={colors.cyan}
                style={[styles.heroCard, { borderColor: alpha(colors.cyan, 0.45) }]}
              >
                <View style={styles.heroTopRow}>
                  <View style={[styles.heroStatusPill, { backgroundColor: alpha(colors.cyan, 0.14) }]}>
                    <Radio size={11} color={colors.cyan} strokeWidth={2.5} />
                    <Text style={[styles.heroStatusText, { color: colors.cyan }]}>
                      {t('home.client.radarSearchingBadge', 'FINDING USTADS NEARBY')}
                    </Text>
                  </View>
                  <Text style={[styles.heroTimeText, { color: theme.colors.text.muted }]}>
                    {activeSearchJob.urgency === 'instant' ? '⚡ Urgent' : '📅 Scheduled'}
                  </Text>
                </View>

                <Text style={[styles.heroJobTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                  {activeSearchJob.signalMeta?.title || activeSearchJob.category || 'Service Request'}
                </Text>

                <Text style={[styles.heroSubDesc, { color: theme.colors.text.secondary }]}>
                  {t('home.client.findingUstadsDesc', 'Alerting qualified Ustads near your area in real-time...')}
                </Text>

                <TouchableOpacity
                  style={[styles.heroCtaBtn, { backgroundColor: colors.cyan }]}
                  onPress={() => router.push({ pathname: '/finding-worker', params: { jobId: activeSearchJob._id } })}
                  activeOpacity={0.84}
                >
                  <Radio size={16} color="#000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={[styles.heroCtaBtnText, { color: '#000' }]}>
                    {t('home.client.viewLiveRadarBtn', 'View Live Radar')}
                  </Text>
                  <ArrowRight size={16} color="#000" strokeWidth={2.5} />
                </TouchableOpacity>
              </GlassCard>
            )}
          </Animated.View>
        ) : null}

        {/* ── 2. Popular Services Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                {t('home.client.services', 'Services')}
              </Text>
              <Text style={[styles.sectionSub, { color: theme.colors.text.muted }]}>
                {t('home.client.whatHelp', 'What work do you need done?')}
              </Text>
            </View>
          </View>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('home.client.searchPlaceholder', 'Search electrician, plumber...')}
            variant="section"
          />

          {categoriesLoading && !isRefreshing ? (
            <CategoriesSkeleton translateX={translateX} numColumns={numColumns} />
          ) : (
            <View>
              <View style={styles.categoriesGrid}>
                {displayedCategories.length > 0 ? (
                  <>
                    {displayedCategories.map((cat, index) => (
                      <CategoryCard
                        key={cat._id}
                        cat={cat}
                        index={index}
                        onPress={handleCategoryPress}
                        animate={!searchQuery.trim()}
                      />
                    ))}
                    {shouldShowViewAllCard && (
                      <ViewAllCard
                        remainingCount={remainingCategoryCount}
                        index={displayedCategories.length}
                        onPress={handleToggleServices}
                        animate={!searchQuery.trim()}
                      />
                    )}
                  </>
                ) : (
                  <EmptyServiceState isSearching={!!searchQuery.trim()} />
                )}
              </View>

              {showAllServices && !searchQuery.trim() && filteredCategories.length > baseCategoryLimit && (
                <TouchableOpacity
                  style={[
                    styles.showLessButton,
                    {
                      borderColor: alpha(theme.colors.brand.primary, 0.35),
                      backgroundColor: alpha(theme.colors.brand.primary, 0.1),
                    }
                  ]}
                  onPress={handleToggleServices}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.showLessText, { color: theme.colors.brand.primary }]}>
                    {t('home.client.showLess', 'Show less')}
                  </Text>
                  <ChevronUp size={15} color={theme.colors.brand.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── 3. Recent Bookings ── */}
        {homeSummaryLoading && !isRefreshing ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  {t('home.client.recentBookings', 'Recent jobs')}
                </Text>
                <Text style={[styles.sectionSub, { color: theme.colors.text.muted }]}>
                  {t('home.client.latestActivity', 'Your recent requests and bookings')}
                </Text>
              </View>
            </View>
            <BookingCardSkeleton translateX={translateX} />
            <BookingCardSkeleton translateX={translateX} />
          </View>
        ) : recentBookings.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  {t('home.client.recentBookings', 'Recent jobs')}
                </Text>
                <Text style={[styles.sectionSub, { color: theme.colors.text.muted }]}>
                  {t('home.client.latestActivity', 'Your recent requests and bookings')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleViewAllBookings}
                hitSlop={styles.hitSlop}
                style={styles.seeAllBtn}
              >
                <Text style={[styles.viewAll, { color: theme.colors.brand.primary }]}>
                  {t('home.client.seeAll', 'See all')}
                </Text>
              </TouchableOpacity>
            </View>

            {recentBookings.map(booking => (
              <RecentBookingCard
                key={booking._id}
                booking={booking}
                onPress={() => handleBookingPress(booking._id)}
              />
            ))}
          </Animated.View>
        ) : null}

        {/* Clean bottom padding to scroll nicely above tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },

  // ── Dynamic Hero Card
  heroSection: {
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.l,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroJobTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 14,
  },
  heroCustomerRow: {
    marginBottom: 14,
  },
  heroCustomerName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroAddressText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.m,
  },
  heroCtaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 3,
  },
  viewAll: {
    fontSize: 16,
    fontWeight: '700',
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
    height: 134,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.8,
    overflow: 'hidden',
  },
  categoryItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  categoryIconBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  viewAllCardCount: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  showLessButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginTop: 16,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  showLessText: {
    fontSize: 13.5,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});
