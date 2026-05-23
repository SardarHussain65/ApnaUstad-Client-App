/**
 * WorkerSkeletonLoader.tsx
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Spacing } from '../../constants/Theme';
import { SkeletonBox, useShimmerTranslateX } from './HomeSkeletonLoader';

export function WorkerSkeletonLoader() {
  const { width } = useWindowDimensions();
  const translateX = useShimmerTranslateX();

  return (
    <View style={skStyles.container}>
      {/* Dual Status Card Skeletons */}
      <View style={skStyles.dualRow}>
        <SkeletonBox width="48%" height={100} borderRadius={24} translateX={translateX} />
        <SkeletonBox width="48%" height={100} borderRadius={24} translateX={translateX} />
      </View>

      {/* Stats Card Skeleton */}
      <View style={skStyles.section}>
        <SkeletonBox width="100%" height={180} borderRadius={30} translateX={translateX} />
      </View>

      {/* Section Title */}
      <View style={skStyles.sectionHeader}>
        <SkeletonBox width={150} height={24} borderRadius={8} translateX={translateX} />
        <SkeletonBox width={60} height={14} borderRadius={6} translateX={translateX} />
      </View>

      {/* Jobs Feed Skeleton */}
      <View style={skStyles.jobsList}>
        {[1, 2, 3].map(i => (
          <SkeletonBox key={i} width="100%" height={100} borderRadius={24} translateX={translateX} />
        ))}
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.m,
    marginBottom: 16,
  },
  dualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.m,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginTop: 24,
    marginBottom: 16,
  },
  jobsList: {
    paddingHorizontal: Spacing.l,
    gap: 12,
  },
});
