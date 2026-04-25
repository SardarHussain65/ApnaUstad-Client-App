import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
} from 'react-native-reanimated';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants/Theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
  glowColor?: string;
  hasGlow?: boolean;
  gradient?: [string, string, ...string[]];
  padding?: number; // Added padding prop
  contentStyle?: StyleProp<ViewStyle>; // Added contentStyle prop
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({ 
  children, 
  style, 
  onPress, 
  intensity = 40,
  glowColor = Colors.cyan,
  hasGlow = false,
  gradient,
  padding = Spacing.l, // Default to standard padding
  contentStyle
}: GlassCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const CardContent = (
    <Animated.View 
      style={[
        styles.card,
        Shadows.card,
        Shadows.bevel, // Added 3D Bevel
        hasGlow && { 
          borderColor: glowColor + '60',
          shadowColor: glowColor,
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 15
        },
        style,
        animatedStyle
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill}>
          {gradient && (
            <LinearGradient
              colors={gradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} // Increased opacity
            />
          )}
          <View style={styles.highlight} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 31, 0.6)' }]}>
           {gradient && (
            <LinearGradient
              colors={gradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} // Increased opacity
            />
          )}
          <View style={styles.highlight} />
        </View>
      )}
      <View style={[styles.content, { padding: padding }, contentStyle]}>
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {CardContent}
      </AnimatedPressable>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  }
});
