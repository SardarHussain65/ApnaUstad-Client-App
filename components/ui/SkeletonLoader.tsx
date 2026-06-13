import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  LinearTransition,
} from 'react-native-reanimated';
import { Spacing, useTheme } from '../../constants/Theme';

const { width } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
  width: skeletonWidth = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [shimmerValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.5 + shimmerValue.value * 0.3,
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: skeletonWidth as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.skeleton.base,
          borderColor: theme.colors.border.subtle,
        },
        animatedStyle,
        style,
      ] as any}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.skeletonCard,
        {
          backgroundColor: theme.colors.surface.cardMuted,
          borderColor: theme.colors.border.subtle,
        },
        style,
      ] as any}
    >
      {/* Header skeleton */}
      <View style={styles.skeletonHeader}>
        <SkeletonLoader width={50} height={50} borderRadius={25} />
        <View style={{ gap: 8, flex: 1 }}>
          <SkeletonLoader width="70%" height={16} />
          <SkeletonLoader width="50%" height={12} />
        </View>
      </View>

      {/* Content skeleton */}
      <View style={styles.skeletonContent}>
        {Array(lines)
          .fill(0)
          .map((_, i) => (
            <SkeletonLoader
              key={i}
              width={i === lines - 1 ? '60%' : '100%'}
              height={12}
              style={{ marginBottom: i === lines - 1 ? 0 : 12 }}
            />
          ))}
      </View>

      {/* Footer skeleton */}
      <View style={styles.skeletonFooter}>
        <SkeletonLoader width="30%" height={14} />
        <SkeletonLoader width="25%" height={14} />
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  cardStyle?: StyleProp<ViewStyle>;
}

export function SkeletonList({ count = 3, cardStyle }: SkeletonListProps) {
  return (
    <View style={styles.skeletonList}>
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <SkeletonCard key={i} style={[styles.listItem, cardStyle] as any} />
        ))}
    </View>
  );
}

interface SkeletonGridProps {
  count?: number;
  columns?: 2 | 3 | 4;
}

export function SkeletonGrid({ count = 6, columns = 3 }: SkeletonGridProps) {
  const itemWidth = (width - Spacing.l * 2 - (columns - 1) * 8) / columns;

  return (
    <View style={styles.skeletonGrid}>
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <View
            key={i}
            style={{
              width: itemWidth,
              gap: 8,
            }}
          >
            <SkeletonLoader
              width="100%"
              height={itemWidth}
              borderRadius={12}
            />
            <SkeletonLoader width="80%" height={12} />
            <SkeletonLoader width="60%" height={10} />
          </View>
        ))}
    </View>
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
}: SkeletonTextProps) {
  return (
    <View style={styles.skeletonText}>
      {Array(lines)
        .fill(0)
        .map((_, i) => (
          <SkeletonLoader
            key={i}
            width={i === lines - 1 ? lastLineWidth : '100%'}
            height={12}
            style={{ marginBottom: i === lines - 1 ? 0 : 8 }}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderWidth: 1,
  },
  skeletonCard: {
    borderRadius: 16,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    borderWidth: 1,
  },
  skeletonHeader: {
    flexDirection: 'row',
    gap: Spacing.m,
    marginBottom: Spacing.m,
    alignItems: 'center',
  },
  skeletonContent: {
    marginBottom: Spacing.m,
    gap: 8,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.m,
  },
  skeletonList: {
    gap: Spacing.m,
  },
  listItem: {
    marginBottom: 0,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.l,
  },
  skeletonText: {
    gap: 8,
  },
});
