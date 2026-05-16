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
import { Spacing } from '../../constants/Theme';

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
});
