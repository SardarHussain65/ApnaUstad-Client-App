import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G, RadialGradient } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  DerivedValue,
  withSequence
} from 'react-native-reanimated';
import { Colors, Typography, Shadows } from '../../constants/Theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CosmicCircleProps {
  value: number;
  label: string;
  subLabel: string;
  size?: number;
}

export function CosmicCircle({
  value,
  label,
  subLabel,
  size = SCREEN_WIDTH * 0.55
}: CosmicCircleProps) {
  const radius = (size - 40) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(500, withSpring(value, { damping: 12, stiffness: 50 }));
    pulseScale.value = withRepeat(withSequence(
      withTiming(1.05, { duration: 1500 }),
      withTiming(1, { duration: 1500 })
    ), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 10000 }), -1, false);
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const satelliteStyle = useAnimatedStyle(() => {
    const angle = progress.value * 360 - 90;
    const x = (size / 2) + radius * Math.cos((angle * Math.PI) / 180);
    const y = (size / 2) + radius * Math.sin((angle * Math.PI) / 180);

    return {
      position: 'absolute',
      left: x - 6,
      top: y - 6,
      opacity: progress.value > 0.01 ? 1 : 0,
    };
  });

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }]
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>

      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="cosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.cyan} />
            <Stop offset="50%" stopColor={Colors.primary} />
            <Stop offset="100%" stopColor={Colors.purple} />
          </LinearGradient>
          <RadialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="70%" stopColor="transparent" stopOpacity="0" />
            <Stop offset="100%" stopColor={Colors.cyan} stopOpacity="0.1" />
          </RadialGradient>
        </Defs>

        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Subtle Outer Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.03)"
            strokeWidth="12"
            fill="transparent"
          />

          {/* Inner Glow Aura */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 8}
            fill="url(#innerGlow)"
          />

          {/* Neon Soft Glow Layer */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.cyan}
            strokeWidth="14"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            fill="transparent"
            opacity={0.15}
          />

          {/* Primary High-Precision Stroke */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#cosmicGrad)"
            strokeWidth="8"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            fill="transparent"
          />
        </G>
      </Svg>

      {/* Satellite Orbit Dot */}
      <Animated.View style={[styles.satellite, satelliteStyle]}>
        <View style={styles.satelliteCore} />
        <View style={styles.satelliteGlow} />
      </Animated.View>

      <Animated.View style={[styles.textContainer, { maxWidth: size - 45 }, centerStyle]}>
        <Text style={[styles.label, Typography.threeD]} adjustsFontSizeToFit numberOfLines={1}>{label}</Text>
        <Text style={styles.subLabel} adjustsFontSizeToFit numberOfLines={1}>{subLabel}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  auraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  mainAura: {
    backgroundColor: Colors.primary + '08',
    borderWidth: 1,
    borderColor: Colors.primary + '15',
    ...Shadows.glow,
  },
  satellite: {
    width: 12,
    height: 12,
    zIndex: 10,
  },
  satelliteCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.cyan,
  },
  satelliteGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.cyan,
    borderRadius: 6,
    opacity: 0.6,
    transform: [{ scale: 1.8 }],
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    width: '100%',
    paddingHorizontal: 15,
  },
  label: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '900',
    marginBottom: 2,
    textAlign: 'center',
  },
  subLabel: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
