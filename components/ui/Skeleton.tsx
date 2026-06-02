import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated as RNAnimated,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '../../constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Shared Shimmer Translation Hook ──────────────────────────────────────────
export function useShimmerTranslateX(duration = 1200): RNAnimated.AnimatedInterpolation<string | number> {
  const { width } = useWindowDimensions();
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    ).start();
  }, [anim, duration]);

  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });
}

// ─── Skeleton Props ─────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  translateX?: RNAnimated.AnimatedInterpolation<string | number>;
}

// ─── Core Skeleton Component ──────────────────────────────────────────────────
export function Skeleton({
  width = '100%',
  height,
  borderRadius = 8,
  style,
  translateX: providedTranslateX,
}: SkeletonProps) {
  // If no shared translation is provided, create a local fallback one
  const localTranslateX = useShimmerTranslateX();
  const translateX = providedTranslateX ?? localTranslateX;

  return (
    <View style={[styles.base, { width: width as any, height, borderRadius }, style]}>
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius }]}>
        <RNAnimated.View
          style={[
            styles.shimmerContainer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.0)',
              'rgba(255, 255, 255, 0.08)',
              'rgba(255, 255, 255, 0.0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </RNAnimated.View>
      </View>
    </View>
  );
}

// ─── Skeleton Card Component ──────────────────────────────────────────────────
interface SkeletonCardProps {
  style?: StyleProp<ViewStyle>;
  translateX?: RNAnimated.AnimatedInterpolation<string | number>;
}

export function SkeletonCard({ style, translateX }: SkeletonCardProps) {
  return (
    <View style={[styles.skeletonCard, style]}>
      {/* Header section: avatar and two lines */}
      <View style={styles.cardHeader}>
        <Skeleton
          width={48}
          height={48}
          borderRadius={16}
          translateX={translateX}
        />
        <View style={styles.headerTextGroup}>
          <Skeleton
            width="60%"
            height={16}
            borderRadius={6}
            translateX={translateX}
          />
          <Skeleton
            width="40%"
            height={12}
            borderRadius={4}
            translateX={translateX}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>

      {/* Main body content */}
      <View style={styles.cardBody}>
        <Skeleton
          width="100%"
          height={14}
          borderRadius={6}
          translateX={translateX}
          style={{ marginBottom: 8 }}
        />
        <Skeleton
          width="85%"
          height={14}
          borderRadius={6}
          translateX={translateX}
        />
      </View>

      {/* Footer details row */}
      <View style={styles.cardFooter}>
        <Skeleton
          width={80}
          height={20}
          borderRadius={10}
          translateX={translateX}
        />
        <Skeleton
          width={64}
          height={20}
          borderRadius={10}
          translateX={translateX}
        />
      </View>
    </View>
  );
}

// ─── Skeleton List Component ──────────────────────────────────────────────────
interface SkeletonListProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonList({ count = 3, style }: SkeletonListProps) {
  const translateX = useShimmerTranslateX();

  return (
    <View style={[styles.skeletonList, style]}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard
          key={idx}
          translateX={translateX}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
  },
  skeletonCard: {
    backgroundColor: 'rgba(15, 15, 26, 0.3)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: Spacing.m,
    marginBottom: Spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: Spacing.m,
  },
  cardBody: {
    marginBottom: Spacing.m,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  skeletonList: {
    flex: 1,
    width: '100%',
  },
});
