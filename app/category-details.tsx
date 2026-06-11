import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Zap, Calendar, Users, ArrowRight, Sparkles, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function CategoryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Dynamic Theme
  const themeColor = (params.color as string) || Colors.cyan;
  const title = (params.title as string) || 'Service Hub';

  // Pulsing Animation for affordance
  const pulse = useSharedValue(1);
  const scanPos = useSharedValue(0);
  const shimmer = useSharedValue(-1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );

    shimmer.value = withRepeat(
      withTiming(1, { duration: 2500 }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: withTiming((pulse.value - 1) * 10, { duration: 1500 }),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * (width - 40) }],
  }));

  const scannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scanPos.value }],
  }));

  const handleRouteToJob = (urgency: 'instant' | 'scheduled') => {
    router.push({
      pathname: '/job-creation',
      params: { title, color: themeColor, urgency }
    });
  };

  const handleBrowseWorkers = () => {
    router.push({
      pathname: '/worker-list',
      params: { category: title, color: themeColor, title }
    });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>

        {/* Dynamic Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, Typography.threeD]}>{title.toUpperCase()}</Text>
          <View style={styles.placeholderBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Hero Text & Graphic */}
          <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.heroSection}>
            <View style={[styles.glowingOrb, { shadowColor: themeColor, borderColor: themeColor + '60' }]}>
              <Sparkles color={themeColor} size={40} />
            </View>
            <Text style={styles.heroSub}>SELECT METHOD</Text>
            <Text style={[styles.heroTitle, Typography.threeD]}>{title.toUpperCase()}</Text>
            {params.description ? (
              <Text style={styles.categoryDescription}>{params.description}</Text>
            ) : (
              <Text style={styles.categoryDescription}>Choose how you want to book or connect with your Ustad.</Text>
            )}
          </Animated.View>

          {/* Post a Job & Browse Ustads Cards */}
          <View style={styles.mainOptionsGrid}>
            {/* Option 1: Post a Job */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={[styles.optionWrapper, pulseStyle]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.mainOption, { borderColor: Colors.cyan, backgroundColor: 'rgba(10, 10, 31, 0.75)' }]}
                onPress={() => handleRouteToJob('instant')}
              >
                <LinearGradient
                  colors={['rgba(0,245,255,0.15)', 'transparent']}
                  style={styles.optionGradient}
                />
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(0,245,255,0.12)', borderColor: Colors.cyan + '40' }]}>
                  <FileText size={28} color={Colors.cyan} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: Colors.cyan }]} adjustsFontSizeToFit minimumFontScale={0.8}>POST A JOB</Text>
                  <Text style={styles.optionSub}>GET BIDS NEARBY</Text>
                </View>
                <View style={[styles.deployHint, { backgroundColor: Colors.cyan, shadowColor: Colors.cyan }]}>
                  <Text style={[styles.deployHintText, { color: '#000' }]}>POST NOW</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Option 2: Choose Ustad */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.optionWrapper, pulseStyle]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.mainOption, { borderColor: Colors.worker, backgroundColor: 'rgba(10, 10, 31, 0.75)' }]}
                onPress={handleBrowseWorkers}
              >
                <LinearGradient
                  colors={['rgba(255,107,0,0.15)', 'transparent']}
                  style={styles.optionGradient}
                />
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: Colors.worker + '40' }]}>
                  <Users size={28} color={Colors.worker} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: Colors.worker }]} adjustsFontSizeToFit minimumFontScale={0.8}>CHOOSE USTAD</Text>
                  <Text style={styles.optionSub}>HIRE DIRECTLY</Text>
                </View>
                <View style={[styles.deployHint, { backgroundColor: Colors.worker, shadowColor: Colors.worker }]}>
                  <Text style={[styles.deployHintText, { color: '#000' }]}>BROWSE</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.m,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  placeholderBtn: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: Spacing.l,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: 40,
  },
  heroSub: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 34,
  },
  glowingOrb: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 20,
  },
  categoryDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  mainOptionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  optionWrapper: {
    flex: 1,
  },
  mainOption: {
    height: 205,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 12,
    overflow: 'hidden',
    ...Shadows.card,
  },
  optionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  optionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.depth,
  },
  optionTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
  },
  optionSub: {
    fontSize: 10,
    color: Colors.textDim,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  deployHint: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  deployHintText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cyberWrapper: {
    marginTop: 20,
    marginBottom: 40,
  },
  cyberTouch: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 6,
    ...Shadows.depth,
  },
  cyberCard: {
    minHeight: 100,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cyberContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    ...Shadows.depth,
  },
  infoBox: {
    flex: 1,
    justifyContent: 'center',
  },
  cyberLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textDim,
    letterSpacing: 2,
    marginBottom: 2,
  },
  cyberTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cyberStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cyberStatusText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cyberAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shimmerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ skewX: '-20deg' }],
  },
});

