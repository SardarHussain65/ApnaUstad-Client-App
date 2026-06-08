/**
 * HomeSkeletonLoader.tsx
 *
 * KEY FIX: previously every SkeletonBox created its own Animated.Value loop.
 * Now one shared translateX is created at the loader level and passed as a prop,
 * so only ONE animation loop runs for the entire skeleton screen.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated as RNAnimated,
  useWindowDimensions,
} from 'react-native';
import { Spacing, BorderRadius } from '../../constants/Theme';

const GRID_GAP = 12;

// ─── Shared shimmer hook ──────────────────────────────────────────────────────

export function useShimmerTranslateX(): RNAnimated.AnimatedInterpolation<string | number> {
  const { width } = useWindowDimensions();
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(anim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });
}

// ─── SkeletonBox ──────────────────────────────────────────────────────────────

interface SkeletonBoxProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
}

export function SkeletonBox({
  width: w,
  height: h,
  borderRadius = 8,
  style,
  translateX,
}: SkeletonBoxProps) {
  return (
    <View style={[skStyles.base, { width: w, height: h, borderRadius }, style]}>
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius }]}>
        <RNAnimated.View
          style={[skStyles.shimmer, { transform: [{ translateX }] }]}
        />
      </View>
    </View>
  );
}

// ─── Full page skeleton ───────────────────────────────────────────────────────

interface HomeSkeletonLoaderProps {}

export function HomeSkeletonLoader(_props: HomeSkeletonLoaderProps) {
  const { width } = useWindowDimensions();
  const translateX = useShimmerTranslateX();

  const numColumns = width > 600 ? 4 : width > 300 ? 3 : 2;
  const itemWidth =
    (width - Spacing.l * 2 - GRID_GAP * (numColumns - 1)) / numColumns;

  return (
    <View style={skStyles.container}>
      {/* Quick actions */}
      <View style={skStyles.quickActions}>
        <SkeletonBox width={(width - Spacing.l * 2 - 12) / 2} height={44} borderRadius={14} translateX={translateX} />
        <SkeletonBox width={(width - Spacing.l * 2 - 12) / 2} height={44} borderRadius={14} translateX={translateX} />
      </View>

      {/* Section title + search */}
      <View style={skStyles.sectionHeader}>
        <SkeletonBox width={120} height={20} borderRadius={8} translateX={translateX} />
        <SkeletonBox width={60} height={14} borderRadius={6} translateX={translateX} />
      </View>
      <SkeletonBox
        width={width - Spacing.l * 2}
        height={48}
        borderRadius={16}
        style={skStyles.searchBar}
        translateX={translateX}
      />

      {/* Category grid — height: 120 matches real categoryItem */}
      <View style={skStyles.grid}>
        {Array.from({ length: numColumns * 2 }).map((_, i) => (
          <View
            key={i}
            style={skStyles.categoryCell}
          >
            <SkeletonBox width={50} height={50} borderRadius={16} translateX={translateX} />
            <SkeletonBox
              width="70%"
              height={10}
              borderRadius={5}
              style={{ marginTop: 8 }}
              translateX={translateX}
            />
          </View>
        ))}
      </View>

      {/* Dashboard card */}
      <View style={skStyles.dashCard}>
        <SkeletonBox width="100%" height={150} borderRadius={24} translateX={translateX} />
      </View>
    </View>
  );
}

// ─── Modular Sub-Skeletons ───────────────────────────────────────────────────

interface CategoriesSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
  numColumns?: number;
}

export function CategoriesSkeleton({ translateX, numColumns = 3 }: CategoriesSkeletonProps) {
  return (
    <View style={skStyles.grid}>
      {Array.from({ length: numColumns * 2 }).map((_, i) => (
        <View key={i} style={skStyles.categoryCell}>
          <SkeletonBox width={50} height={50} borderRadius={16} translateX={translateX} />
          <SkeletonBox
            width="70%"
            height={10}
            borderRadius={5}
            style={{ marginTop: 8 }}
            translateX={translateX}
          />
        </View>
      ))}
    </View>
  );
}

interface DashboardSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
}

export function DashboardSkeleton({ translateX }: DashboardSkeletonProps) {
  return (
    <View style={skStyles.dashCard}>
      <SkeletonBox width="100%" height={150} borderRadius={24} translateX={translateX} />
    </View>
  );
}

interface ListSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
  count?: number;
  height?: number;
}

export function ListSkeleton({ translateX, count = 2, height = 100 }: ListSkeletonProps) {
  return (
    <View style={skStyles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} width="100%" height={height} borderRadius={20} translateX={translateX} />
      ))}
    </View>
  );
}

interface BookingCardSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
}

export function BookingCardSkeleton({ translateX }: BookingCardSkeletonProps) {
  return (
    <View style={skStyles.bookingCard}>
      {/* Top Row: Avatar + Name Block + Status Badge */}
      <View style={skStyles.bookingTopRow}>
        <SkeletonBox width={48} height={48} borderRadius={18} translateX={translateX} />
        <View style={skStyles.bookingIdentityBlock}>
          <SkeletonBox width={50} height={10} borderRadius={5} translateX={translateX} />
          <SkeletonBox width={120} height={16} borderRadius={6} style={{ marginTop: 6 }} translateX={translateX} />
        </View>
        <SkeletonBox width={86} height={26} borderRadius={999} translateX={translateX} />
      </View>

      {/* Service Row */}
      <View style={skStyles.bookingServiceRow}>
        <SkeletonBox width={38} height={38} borderRadius={14} translateX={translateX} />
        <View style={skStyles.bookingServiceCopy}>
          <SkeletonBox width={140} height={16} borderRadius={6} translateX={translateX} />
          <SkeletonBox width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} translateX={translateX} />
        </View>
      </View>

      {/* Meta Grid (3 pills) */}
      <View style={skStyles.bookingMetaGrid}>
        <SkeletonBox width="31%" height={34} borderRadius={13} translateX={translateX} />
        <SkeletonBox width="31%" height={34} borderRadius={13} translateX={translateX} />
        <SkeletonBox width="31%" height={34} borderRadius={13} translateX={translateX} />
      </View>

      {/* Location Row */}
      <View style={skStyles.bookingLocationRow}>
        <SkeletonBox width="100%" height={34} borderRadius={13} translateX={translateX} />
      </View>

      {/* Footer Row */}
      <View style={skStyles.bookingFooterRow}>
        <SkeletonBox width={100} height={36} borderRadius={14} translateX={translateX} />
        <SkeletonBox width={120} height={26} borderRadius={13} translateX={translateX} />
      </View>
    </View>
  );
}

// ─── Worker Stats Card Skeleton ──────────────────────────────────────────────
interface WorkerStatsCardSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
}

export function WorkerStatsCardSkeleton({ translateX }: WorkerStatsCardSkeletonProps) {
  return (
    <View style={skStyles.statsCard}>
      <View style={skStyles.statsTopRow}>
        <View style={skStyles.statsEarningsCluster}>
          <SkeletonBox width={58} height={58} borderRadius={21} translateX={translateX} />
          <View style={skStyles.statsHeroText}>
            <SkeletonBox width={80} height={10} borderRadius={5} translateX={translateX} />
            <SkeletonBox width={140} height={24} borderRadius={6} translateX={translateX} />
            <SkeletonBox width={120} height={12} borderRadius={5} translateX={translateX} />
          </View>
        </View>
        <SkeletonBox width={54} height={38} borderRadius={16} translateX={translateX} />
      </View>

      <View style={skStyles.statsProgressBlock}>
        <View style={skStyles.statsProgressHeader}>
          <SkeletonBox width={90} height={10} borderRadius={5} translateX={translateX} />
          <SkeletonBox width={70} height={10} borderRadius={5} translateX={translateX} />
        </View>
        <View style={skStyles.statsProgressTrack}>
          <SkeletonBox width="60%" height={8} borderRadius={4} translateX={translateX} />
        </View>
      </View>

      <View style={skStyles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={skStyles.statsTile}>
            <SkeletonBox width={28} height={28} borderRadius={11} translateX={translateX} />
            <SkeletonBox width={30} height={18} borderRadius={5} translateX={translateX} />
            <SkeletonBox width={45} height={10} borderRadius={5} translateX={translateX} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Worker Alert Job Card Skeleton ──────────────────────────────────────────
interface WorkerAlertJobCardSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
}

export function WorkerAlertJobCardSkeleton({ translateX }: WorkerAlertJobCardSkeletonProps) {
  return (
    <View style={skStyles.alertCard}>
      <View style={skStyles.alertTopRow}>
        <SkeletonBox width={90} height={20} borderRadius={10} translateX={translateX} />
        <SkeletonBox width={50} height={12} borderRadius={6} translateX={translateX} />
      </View>

      <View style={skStyles.alertBody}>
        <View style={skStyles.alertInfoCol}>
          <SkeletonBox width={140} height={20} borderRadius={6} translateX={translateX} />
          <SkeletonBox width="90%" height={12} borderRadius={4} translateX={translateX} />
          <View style={skStyles.alertClientRow}>
            <SkeletonBox width={30} height={30} borderRadius={15} translateX={translateX} />
            <View style={skStyles.alertClientText}>
              <SkeletonBox width={70} height={10} borderRadius={5} translateX={translateX} />
              <SkeletonBox width={50} height={8} borderRadius={4} translateX={translateX} />
            </View>
          </View>
        </View>
        <SkeletonBox width={80} height={28} borderRadius={12} translateX={translateX} />
      </View>

      <View style={skStyles.alertLocationRow}>
        <SkeletonBox width={12} height={12} borderRadius={6} translateX={translateX} />
        <SkeletonBox width="75%" height={11} borderRadius={5} translateX={translateX} />
      </View>

      <View style={skStyles.alertDivider} />

      <View style={skStyles.alertFooter}>
        <SkeletonBox width={40} height={40} borderRadius={12} translateX={translateX} />
        <SkeletonBox width="85%" height={40} borderRadius={14} style={{ flex: 1 }} translateX={translateX} />
      </View>
    </View>
  );
}

// ─── Worker Pending Bid Card Skeleton ────────────────────────────────────────
interface WorkerPendingBidCardSkeletonProps {
  translateX: RNAnimated.AnimatedInterpolation<string | number>;
}

export function WorkerPendingBidCardSkeleton({ translateX }: WorkerPendingBidCardSkeletonProps) {
  return (
    <View style={skStyles.bidCard}>
      <View style={skStyles.bidTopRow}>
        <SkeletonBox width={50} height={50} borderRadius={18} translateX={translateX} />
        <View style={skStyles.bidIdentityBlock}>
          <SkeletonBox width={40} height={8} borderRadius={4} translateX={translateX} />
          <SkeletonBox width={90} height={15} borderRadius={6} translateX={translateX} />
          <SkeletonBox width={110} height={10} borderRadius={5} translateX={translateX} />
        </View>
        <SkeletonBox width={110} height={26} borderRadius={13} translateX={translateX} />
      </View>

      <View style={skStyles.bidServiceRow}>
        <SkeletonBox width={38} height={38} borderRadius={14} translateX={translateX} />
        <View style={skStyles.bidServiceCopy}>
          <SkeletonBox width={130} height={16} borderRadius={6} translateX={translateX} />
          <SkeletonBox width="90%" height={12} borderRadius={4} translateX={translateX} />
        </View>
      </View>

      <View style={skStyles.bidMetaGrid}>
        <SkeletonBox width="31%" height={34} borderRadius={13} translateX={translateX} />
        <SkeletonBox width="31%" height={34} borderRadius={13} translateX={translateX} />
        <SkeletonBox width="31%" height={34} borderRadius={13} translateX={translateX} />
      </View>

      <View style={skStyles.bidLocationRow}>
        <SkeletonBox width={14} height={14} borderRadius={7} translateX={translateX} />
        <SkeletonBox width="70%" height={11} borderRadius={5} translateX={translateX} />
      </View>

      <View style={skStyles.bidOfferRow}>
        <SkeletonBox width={110} height={38} borderRadius={15} translateX={translateX} />
        <SkeletonBox width={100} height={30} borderRadius={15} translateX={translateX} />
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  container: { flex: 1 },
  base: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: 12,
  },
  locationPill: {
    marginHorizontal: Spacing.l,
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.l,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: 12,
  },
  searchBar: {
    marginHorizontal: Spacing.l,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: Spacing.l,
  },
  categoryCell: {
    // Must match ClientHome's categoryItem height exactly
    width: '30.5%',
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  dashCard: {
    paddingHorizontal: Spacing.l,
    marginTop: 24,
  },
  listContainer: {
    paddingHorizontal: Spacing.l,
    gap: 12,
  },
  bookingCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    marginHorizontal: Spacing.l,
    padding: 14,
    backgroundColor: 'rgba(8,10,30,0.6)',
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },
  bookingIdentityBlock: {
    flex: 1,
    minWidth: 0,
  },
  bookingServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  bookingServiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  bookingMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
    marginBottom: 9,
  },
  bookingLocationRow: {
    marginBottom: 11,
  },
  bookingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.15)',
    padding: 16,
    backgroundColor: 'rgba(5,5,16,0.6)',
    marginTop: 14,
  },
  statsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  statsEarningsCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsHeroText: {
    flex: 1,
    gap: 6,
  },
  statsProgressBlock: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 11,
    marginTop: 16,
  },
  statsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  statsProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  statsTile: {
    flex: 1,
    height: 82,
    borderRadius: 18,
    padding: 11,
    backgroundColor: 'rgba(6,8,24,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  statsTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 11,
  },
  alertCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.18)',
    backgroundColor: 'rgba(15,7,0,0.5)',
    padding: 14,
    marginBottom: 12,
  },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  alertInfoCol: {
    flex: 1,
    gap: 6,
  },
  alertClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  alertClientText: {
    flex: 1,
    gap: 4,
  },
  alertLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  alertDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bidCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    padding: 14,
    backgroundColor: 'rgba(8,10,30,0.6)',
  },
  bidTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },
  bidIdentityBlock: {
    flex: 1,
    gap: 4,
  },
  bidServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  bidServiceCopy: {
    flex: 1,
    gap: 6,
  },
  bidMetaGrid: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 9,
  },
  bidLocationRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  bidOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
  },
});
