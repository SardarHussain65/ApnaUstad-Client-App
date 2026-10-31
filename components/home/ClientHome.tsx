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
  Search,
  MapPin,
  ArrowRight,
  Radio,
  Zap,
  Sparkles,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useCategories, useClientHomeSummary, useMyJobPosts, type Booking, type JobPost } from '../../hooks';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
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
const DEFAULT_GRADIENT: [string, string] = ['#6366f1', '#a855f7'];
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
}

const CategoryCard = React.memo(({ cat, index, onPress }: CategoryCardProps) => {
  const theme = useTheme();
  const Icon = getIconForCategory(cat);
  const gradient: [string, string] = cat.color
    ? [cat.color, `${cat.color}40`]
    : DEFAULT_GRADIENT;

  const cardBorderColor = cat.color
    ? alpha(cat.color, theme.isDark ? 0.28 : 0.24)
    : theme.colors.border.default;

  const iconBgColor = cat.color
    ? alpha(cat.color, theme.isDark ? 0.20 : 0.15)
    : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)');

  const iconColor = theme.colors.text.primary;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(350)}
      style={styles.categoryCardWrapper}
    >
      <GlassCard
        style={[
          styles.categoryItem,
          {
            borderColor: cardBorderColor,
          }
        ]}
        contentStyle={styles.categoryItemContent}
        onPress={() => onPress(cat)}
        gradient={gradient}
        padding={0}
      >
        <View style={[styles.categoryIconBox, { backgroundColor: iconBgColor }]}>
          <Icon size={22} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={[styles.categoryTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>
          {cat.name}
        </Text>
      </GlassCard>
    </Animated.View>
  );
});
CategoryCard.displayName = 'CategoryCard';

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

  // Active Booking (assigned Ustad on the way or ongoing work)
  const activeBooking = useMemo(() => {
    if (homeSummary?.activeBooking) return homeSummary.activeBooking;
    const recent = homeSummary?.recentBookings ?? [];
    return recent.find(b => ['accepted', 'ongoing'].includes(b.status)) || null;
  }, [homeSummary]);

  // Active Custom Job Post (open or reviewing)
  const activeMissions = useMemo<JobPost[]>(
    () =>
      jobPosts
        .filter(job => ['open', 'reviewing'].includes(job.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [jobPosts]
  );
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
            <GlassCard
              intensity={35}
              padding={18}
              hasGlow
              glowColor={colors.success}
              style={[styles.heroCard, { borderColor: alpha(colors.success, 0.45) }]}
            >
              <View style={styles.heroTopRow}>
                <View style={[styles.heroStatusPill, { backgroundColor: alpha(colors.success, 0.14) }]}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.heroStatusText, { color: colors.success }]}>
                    {t('home.client.ustadActive', 'USTAD ON THE WAY / IN PROGRESS')}
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
                style={[styles.heroCtaBtn, { backgroundColor: colors.success }]}
                onPress={() => router.push({ pathname: '/job-tracking', params: { bookingId: activeBooking._id, id: activeBooking._id } })}
                activeOpacity={0.84}
              >
                <MapPin size={16} color="#000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={[styles.heroCtaBtnText, { color: '#000' }]}>
                  {t('home.client.trackUstadBtn', 'Track on Map & View Status')}
                </Text>
                <ArrowRight size={16} color="#000" strokeWidth={2.5} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        ) : activeSearchJob ? (
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
                  onPress={() => router.push({ pathname: '/bids-list', params: { jobId: activeSearchJob._id } })}
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

            {!searchQuery && categories.length > INITIAL_CATEGORY_LIMIT && (
              <TouchableOpacity
                onPress={handleToggleServices}
                hitSlop={styles.hitSlop}
              >
                <Text style={[styles.viewAll, { color: colors.cyan }]}>
                  {showAllServices ? t('home.client.showLess', 'SHOW LESS') : t('home.client.viewAll', 'VIEW ALL')}
                </Text>
              </TouchableOpacity>
            )}
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

        {/* ── 3. Post a Custom Job Action Banner ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.customJobSection}>
          <GlassCard
            intensity={28}
            padding={16}
            hasGlow
            glowColor={colors.purple}
            style={[styles.customJobCard, { borderColor: alpha(colors.purple, 0.3) }]}
            onPress={() => router.push('/job-creation' as any)}
          >
            <View style={styles.customJobRow}>
              <View style={[styles.customJobIconWrap, { backgroundColor: alpha(colors.purple, 0.16) }]}>
                <Sparkles size={22} color={colors.purple} strokeWidth={2.2} />
              </View>
              <View style={styles.customJobTextWrap}>
                <Text style={[styles.customJobTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                  {t('home.client.customJobTitle', 'Need a Custom Repair or Task?')}
                </Text>
                <Text style={[styles.customJobDesc, { color: theme.colors.text.muted }]}>
                  {t('home.client.customJobDesc', 'Post details with photos & set your budget. Qualified Ustads will bid on it.')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.customJobBtn, { backgroundColor: colors.purple }]}
              onPress={() => router.push('/job-creation' as any)}
              activeOpacity={0.84}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.customJobBtnText}>
                {t('home.client.postJobBtn', 'Post Custom Job')}
              </Text>
              <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* ── 4. Recent Bookings or Trust & Quality Guarantee ── */}
        {homeSummaryLoading && !isRefreshing ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                  {t('home.client.recentBookings', 'Recent Jobs')}
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
                <Text style={[styles.sectionTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                  {t('home.client.recentBookings', 'Recent Jobs')}
                </Text>
                <Text style={[styles.sectionSub, { color: theme.colors.text.muted }]}>
                  {t('home.client.latestActivity', 'Your recent requests and bookings')}
                </Text>
              </View>

              {totalBookingsCount > RECENT_BOOKINGS_LIMIT && (
                <TouchableOpacity
                  onPress={handleViewAllBookings}
                  hitSlop={styles.hitSlop}
                  style={styles.seeAllBtn}
                >
                  <Text style={[styles.viewAll, { color: colors.cyan }]}>
                    {t('home.client.seeAll', 'SEE ALL')}
                  </Text>
                  <ChevronRight size={12} color={colors.cyan} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>

            {recentBookings.map(booking => (
              <RecentBookingCard
                key={booking._id}
                booking={booking}
                onPress={() => handleBookingPress(booking._id)}
              />
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.trustSection}>
            <View style={styles.trustRow}>
              <View style={[styles.trustPill, { backgroundColor: alpha(colors.cyan, 0.08), borderColor: alpha(colors.cyan, 0.22) }]}>
                <ShieldCheck size={16} color={colors.cyan} strokeWidth={2.2} />
                <Text style={[styles.trustPillText, { color: theme.colors.text.primary }]}>
                  {t('home.client.verifiedUstads', '100% Verified Ustads')}
                </Text>
              </View>

              <View style={[styles.trustPill, { backgroundColor: alpha(colors.success, 0.08), borderColor: alpha(colors.success, 0.22) }]}>
                <CheckCircle2 size={16} color={colors.success} strokeWidth={2.2} />
                <Text style={[styles.trustPillText, { color: theme.colors.text.primary }]}>
                  {t('home.client.transparentRates', 'Transparent Rates')}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroJobTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '800',
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
    height: 116,
    width: '100%',
  },
  categoryItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 14,
    paddingHorizontal: 8,
  },
  categoryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
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
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Custom Job Card
  customJobSection: {
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.l,
  },
  customJobCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  customJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  customJobIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customJobTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  customJobTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  customJobDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  customJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.m,
  },
  customJobBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },

  // ── Trust & Quality Guarantee
  trustSection: {
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.l,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trustPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.l,
    borderWidth: 1,
  },
  trustPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
