/**
 * ClientHome.tsx — Refactored with Best Practices
 *
 * KEY IMPROVEMENTS:
 * 1. Skeleton loading instead of blank screen
 * 2. Toast notifications for errors (no jarring inline error blocks)
 * 3. useCallback for stable function references
 * 4. Extracted sub-components to avoid re-renders
 * 5. Proper TypeScript types
 * 6. Constants extracted outside component
 * 7. Animated skeleton using interpolate + loop
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated as RNAnimated, // RN's built-in Animated (for skeleton shimmer)
  Platform,
  useWindowDimensions,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useMyBookings } from '../../hooks';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import { getIconForCategory } from '../../constants/IconRegistry';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { GlassCard } from './GlassCard';
import { CosmicCircle } from './CosmicCircle';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import { useAuth } from '../../context/AuthContext';

// ─── Constants (outside component = created once, never re-created) ──────────

// Remove static width constant and move to component with useWindowDimensions
const GRID_GAP = 12;
const DEFAULT_GRADIENT: [string, string] = ['#6366f1', '#a855f7'];
const INITIAL_CATEGORY_LIMIT = 9; // 3 rows × 3 columns (default)
const MOCK_RATING = 4.8;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  message: string;
  type: 'error' | 'success';
}

// ─── Toast Component (extracted so it never causes ClientHome to re-render) ──

interface ToastProps {
  toast: ToastState;
  onDismiss: () => void;
}

/**
 * WHY a separate component?
 * When Toast's animation state changes, only Toast re-renders — not the
 * entire ClientHome tree. This is the "component extraction" performance trick.
 */
const Toast = React.memo(({ toast, onDismiss }: ToastProps) => {
  // RNAnimated.Value: a mutable animated number. Starting at 0 means "hidden".
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!toast.visible) return;

    // Sequence: fade in → wait → fade out → call onDismiss
    RNAnimated.sequence([
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true, // runs on native thread → 60fps, no JS jank
      }),
      RNAnimated.delay(3000),
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss()); // callback fires after the whole sequence ends
  }, [toast.visible, toast.message]);

  if (!toast.visible) return null;

  return (
    // RNAnimated.View: a View whose style properties can be driven by Animated values
    <RNAnimated.View style={[styles.toast, { opacity }]}>
      <AlertCircle size={16} color="#fff" />
      <Text style={styles.toastText}>{toast.message}</Text>
    </RNAnimated.View>
  );
});

// ─── Skeleton Components ──────────────────────────────────────────────────────

/**
 * useShimmer: custom hook that creates a looping shimmer animation.
 *
 * interpolate() maps one range to another:
 *   shimmerAnim 0→1  becomes  translateX  -width → +width
 * This creates the "light sweeping across" effect.
 */
const useShimmer = () => {
  const { width } = useWindowDimensions();
  const shimmerAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return translateX;
};

/**
 * SkeletonBox: a single shimmering placeholder rectangle.
 *
 * The shimmer layer is absolutely positioned on top of a dark base,
 * and its translateX animates from left to right creating the gleam.
 */
const SkeletonBox = ({
  width: w,
  height: h,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) => {
  const translateX = useShimmer();

  return (
    <View
      style={[
        styles.skeletonBase,
        { width: w, height: h, borderRadius },
        style,
      ]}
    >
      {/* overflow: 'hidden' clips the shimmer so it doesn't bleed outside */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius }]}>
        <RNAnimated.View
          style={[
            styles.shimmerLayer,
            { transform: [{ translateX }] },
          ]}
        />
      </View>
    </View>
  );
};

/** Skeleton for a single category card */
const CategorySkeleton = () => (
  <View style={[styles.categoryWrap, styles.categoryItem, styles.skeletonCard]}>
    <SkeletonBox width={50} height={50} borderRadius={16} />
    <SkeletonBox width="70%" height={10} borderRadius={6} style={{ marginTop: 12 }} />
    <SkeletonBox width="50%" height={8} borderRadius={6} style={{ marginTop: 6 }} />
  </View>
);

/** Full page skeleton rendered while data loads */
const HomeSkeletonLoader = () => {
  const { width } = useWindowDimensions();
  const numColumns = width > 500 ? 4 : (width > 340 ? 3 : 2);
  const itemWidth = (width - Spacing.l * 2 - GRID_GAP * (numColumns - 1)) / numColumns;

  return (
    <View style={styles.skeletonContainer}>
      {/* Header skeleton */}
      <View style={styles.skeletonHeader}>
        <SkeletonBox width={140} height={24} borderRadius={8} />
        <SkeletonBox width={44} height={44} borderRadius={22} />
      </View>

      {/* Section title + search bar */}
      <SkeletonBox width={160} height={20} borderRadius={8} style={{ marginHorizontal: Spacing.l, marginBottom: 12 }} />
      <SkeletonBox width={width - Spacing.l * 2} height={44} borderRadius={14} style={{ marginHorizontal: Spacing.l, marginBottom: 20 }} />

      {/* Category grid skeletons */}
      <View style={styles.categoriesGrid}>
        {Array.from({ length: numColumns * 3 }).map((_, i) => (
          <View key={i} style={{ width: itemWidth }}>
             <CategorySkeleton />
          </View>
        ))}
      </View>

      {/* Dashboard card skeleton */}
      <View style={[styles.dashboardSection, { marginTop: 32 }]}>
        <SkeletonBox width="100%" height={260} borderRadius={28} />
      </View>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientHome() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Dynamic Grid Settings
  const numColumns = windowWidth > 500 ? 4 : (windowWidth > 340 ? 3 : 2);
  const itemWidth = (windowWidth - Spacing.l * 2 - GRID_GAP * (numColumns - 1)) / numColumns - 0.5; // -0.5 for subpixel safety

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);

  // Toast state — one object instead of multiple booleans
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'error',
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useMyBookings();

  // Combined loading flag — true if EITHER query is still fetching
  const isLoading = categoriesLoading || bookingsLoading;

  // ── Error → Toast ──────────────────────────────────────────────────────────

  /**
   * showToast: useCallback ensures this function reference never changes,
   * so it won't cause unnecessary re-renders in child components that receive it.
   */
  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * useEffect with error dependencies:
   * Runs whenever categoriesError or bookingsError changes.
   * This decouples "data fetching" from "UI side-effects" cleanly.
   */
  useEffect(() => {
    if (categoriesError) showToast('Failed to load services. Please try again.');
  }, [categoriesError]);

  useEffect(() => {
    if (bookingsError) showToast('Failed to load your bookings. Check your connection.');
  }, [bookingsError]);

  // ── Derived / Memoized Data ────────────────────────────────────────────────

  /**
   * useMemo: only recalculates when [categories, searchQuery] change.
   * Without this, the filter runs on EVERY render — even unrelated ones.
   */
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(cat => cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  /**
   * slice(0, 9) limits to first 9 when not showing all.
   * trim() is important — "  " (spaces) should count as empty.
   */
  const displayedCategories = React.useMemo(() => {
    if (searchQuery.trim() || showAllServices) return filteredCategories;
    return filteredCategories.slice(0, INITIAL_CATEGORY_LIMIT);
  }, [filteredCategories, showAllServices, searchQuery]);

  const { user } = useAuth();

  const stats = React.useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed');
    const totalJobs = bookings.length;
    
    // Calculate trust score based on completed jobs, or default to 87.1%
    let trustScoreValue = 0.871;
    if (totalJobs > 0) {
      trustScoreValue = Math.max(0.5, completed.length / totalJobs);
    }

    return { 
      jobs: totalJobs, 
      rating: (user as any)?.rating || MOCK_RATING,
      trustScore: trustScoreValue,
      trustScoreLabel: `${(trustScoreValue * 100).toFixed(1)}%`
    };
  }, [bookings, user]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * useCallback prevents a new function being created every render.
   * Important here because this is passed to TouchableOpacity's onPress.
   */
  const handleToggleServices = useCallback(() => {
    setShowAllServices(prev => !prev); // functional update: never reads stale state
  }, []);

  const handleCategoryPress = useCallback(
    (cat: typeof categories[number]) => {
      router.push({
        pathname: '/category-details',
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

  const handleRetryBookings = useCallback(() => {
    refetchBookings();
  }, [refetchBookings]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <BackgroundWrapper>
      {/* Toast lives outside ScrollView so it floats on top of everything */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {isLoading ? (
        /**
         * Show skeleton while loading.
         * paddingTop: insets.top handles the status bar notch on iOS/Android.
         */
        <HomeSkeletonLoader />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        >
          <HomeHeader />

          {/* ── Categories Section ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, Typography.threeD]}>Meta-Services</Text>

              {/* Only show VIEW ALL if not searching AND there are more than 9 categories */}
              {!searchQuery && categories.length > INITIAL_CATEGORY_LIMIT && (
                <TouchableOpacity onPress={handleToggleServices} hitSlop={styles.hitSlop}>
                  {/* hitSlop enlarges the tap area without changing the visual size */}
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
                displayedCategories.map((cat, index) => {
                  const Icon = getIconForCategory(cat);
                  // Nullish coalescing (??) is safer than || for falsy strings
                  const gradient: [string, string, ...string[]] = cat.color
                    ? [cat.color, `${cat.color}40`]
                    : DEFAULT_GRADIENT;

                  return (
                    /**
                     * Animated.View with entering:
                     * FadeInDown.delay(n): staggered entrance — each card fades
                     * in after the previous one. index * 60 keeps total delay sane.
                     * key={cat._id}: always use stable unique IDs, not array index.
                     */
                    <Animated.View
                      key={cat._id}
                      entering={FadeInDown.delay(index * 60).duration(500)}
                      style={[styles.categoryWrap, { width: itemWidth }]}
                    >
                      <GlassCard
                        style={styles.categoryItem}
                        contentStyle={styles.categoryItemContent}
                        onPress={() => handleCategoryPress(cat)}
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
                })
              ) : (
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No services match your search' : 'No categories available'}
                </Text>
              )}
            </View>
          </View>

          {/* ── Cosmic Insights Dashboard ── */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(800)}
            style={styles.dashboardSection}
          >
            <GlassCard intensity={50} glowColor={Colors.cyan} style={styles.dashboardCard}>
              <View style={styles.dashboardTop}>
                <View style={styles.dashboardTitleBox}>
                  <Text style={[styles.dashboardTitle, Typography.threeD]}>COSMIC</Text>
                  <Text style={[styles.dashboardTitle, Typography.threeD]}>INSIGHTS</Text>
                  <Text style={styles.dashboardSub}>Trust Dimension</Text>
                </View>
                <TouchableOpacity style={styles.expandBtn} hitSlop={styles.hitSlop}>
                  <Text style={styles.expandText}>Expand</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dashboardContent}>
                <CosmicCircle
                  value={stats.trustScore}
                  label={stats.trustScoreLabel}
                  subLabel="TRUST SCORE"
                  size={170}
                />
                <View style={styles.insightStats}>
                  <StatChip value={stats.jobs} label="Orbits" />
                  <StatChip value={stats.rating} label="Stars" />
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ── Elite Talents ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, Typography.threeD, styles.eliteSectionTitle]}>
              Elite Talents
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.placeholderText}>No elite talents available currently.</Text>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </BackgroundWrapper>
  );
}

// ─── StatChip (extracted to avoid inline object creation in render) ───────────

/**
 * Extracting StatChip:
 * If defined inline inside ClientHome, a new function component is created every
 * render, forcing React to unmount + remount it. As a named component, React
 * recognizes it as stable and only re-renders it when its props change.
 */
const StatChip = React.memo(({ value, label }: { value: number; label: string }) => (
  <View style={styles.statChip}>
    <Text style={styles.statVal}>{value}</Text>
    <Text style={styles.statLab}>{label}</Text>
  </View>
));

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Skeleton
  skeletonContainer: {
    flex: 1,
    paddingTop: 60,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: 28,
  },
  skeletonBase: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  shimmerLayer: {
    ...StyleSheet.absoluteFillObject,
    // Gradient-like shimmer using a semi-transparent white band
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: 80,
  },

  // ── Toast
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: Spacing.l,
    right: Spacing.l,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    zIndex: 999, // float above everything
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // ── Layout
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginVertical: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.l,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  eliteSectionTitle: {
    marginBottom: 20,
    paddingHorizontal: Spacing.l,
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  // hitSlop: enlarges tap area by 10pt on each side (no visual change)
  hitSlop: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },

  // ── Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: Spacing.l,
  },
  categoryWrap: {
    // Width is now handled dynamically in the component
  },
  categoryItem: {
    height: 130,
    width: '100%',
  },
  categoryItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 18,
    paddingHorizontal: 8,
  },
  categoryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Shadows.depth,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 14,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: Spacing.l,
    width: '100%',
  },

  // ── Dashboard
  dashboardSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.xl,
    marginBottom: Spacing.m,
  },
  dashboardCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 28,
  },
  dashboardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  dashboardTitleBox: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    lineHeight: 24,
  },
  dashboardSub: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  expandBtn: {
    backgroundColor: 'rgba(0,245,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.3)',
    minWidth: 90,
    alignItems: 'center',
  },
  expandText: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '800',
  },
  dashboardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  insightStats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(0,245,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  statLab: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    marginLeft: Spacing.l,
    marginTop: 20,
  },
});