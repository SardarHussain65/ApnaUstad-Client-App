import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { alpha, BorderRadius, Spacing, useTheme, useThemeTypography } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const theme = useTheme();
  const typography = useThemeTypography();

  // Dynamic Theme
  const themeColor = (params.color as string) || theme.colors.brand.primary;
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
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.default,
              },
            ]}
            onPress={() => router.back()}
          >
            <ChevronLeft color={theme.colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>{title.toUpperCase()}</Text>
          <View style={styles.placeholderBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Hero Text & Graphic */}
          <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.heroSection}>
            <View style={[
              styles.glowingOrb,
              {
                shadowColor: themeColor,
                borderColor: theme.isDark ? alpha(themeColor, 0.55) : themeColor,
                backgroundColor: theme.isDark ? alpha(themeColor, 0.22) : alpha(themeColor, 0.16),
              }
            ]}>
              <Sparkles color={themeColor} size={40} />
            </View>
            <Text style={[styles.heroSub, { color: theme.colors.text.secondary }]}>{t('categoryDetails.selectMethod')}</Text>
            <Text style={[styles.heroTitle, typography.threeD, { color: theme.colors.text.primary }]}>{title.toUpperCase()}</Text>
            {params.description ? (
              <Text style={[styles.categoryDescription, { color: theme.colors.text.secondary }]}>{params.description}</Text>
            ) : (
              <Text style={[styles.categoryDescription, { color: theme.colors.text.secondary }]}>{t('categoryDetails.selectMethodDesc')}</Text>
            )}
          </Animated.View>

          {/* Post a Job & Browse Ustads Cards */}
          <View style={styles.mainOptionsGrid}>
            {/* Option 1: Post a Job */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={[styles.optionWrapper, pulseStyle]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.mainOption,
                  {
                    borderColor: theme.isDark ? theme.colors.brand.primary : '#3B82F6',
                    backgroundColor: theme.isDark ? theme.colors.surface.card : '#EFF6FF',
                  },
                ]}
                onPress={() => handleRouteToJob('instant')}
              >
                <LinearGradient
                  colors={[alpha(theme.colors.brand.primary, 0.16), 'transparent']}
                  style={styles.optionGradient}
                />
                <View style={[styles.optionIconBox, { backgroundColor: theme.isDark ? alpha(theme.colors.brand.primary, 0.18) : '#DBEAFE', borderColor: theme.isDark ? alpha(theme.colors.brand.primary, 0.45) : '#60A5FA' }]}>
                  <FileText size={28} color={theme.colors.brand.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]} adjustsFontSizeToFit minimumFontScale={0.8}>{t('categoryDetails.postJob')}</Text>
                  <Text style={[styles.optionSub, { color: theme.colors.text.secondary }]}>{t('categoryDetails.getBids')}</Text>
                </View>
                <View style={[styles.deployHint, { backgroundColor: theme.colors.brand.primary, shadowColor: theme.colors.brand.primary }]}>
                  <Text style={[styles.deployHintText, { color: theme.colors.button.primaryText }]}>{t('categoryDetails.postNow')}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Option 2: Choose Ustad */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.optionWrapper, pulseStyle]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.mainOption,
                  {
                    borderColor: theme.isDark ? theme.colors.brand.worker : '#EA580C',
                    backgroundColor: theme.isDark ? theme.colors.surface.card : '#FFF7ED',
                  },
                ]}
                onPress={handleBrowseWorkers}
              >
                <LinearGradient
                  colors={[alpha(theme.colors.brand.worker, 0.16), 'transparent']}
                  style={styles.optionGradient}
                />
                <View style={[styles.optionIconBox, { backgroundColor: theme.isDark ? alpha(theme.colors.brand.worker, 0.18) : '#FFEDD5', borderColor: theme.isDark ? alpha(theme.colors.brand.worker, 0.45) : '#FB923C' }]}>
                  <Users size={28} color={theme.colors.brand.worker} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]} adjustsFontSizeToFit minimumFontScale={0.8}>{t('categoryDetails.chooseUstad')}</Text>
                  <Text style={[styles.optionSub, { color: theme.colors.text.secondary }]}>{t('categoryDetails.hireDirectly')}</Text>
                </View>
                <View style={[styles.deployHint, { backgroundColor: theme.colors.brand.worker, shadowColor: theme.colors.brand.worker }]}>
                  <Text style={[styles.deployHintText, { color: theme.colors.button.primaryText }]}>{t('categoryDetails.browse')}</Text>
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
  },
  placeholderBtn: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1.5,
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
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
    fontSize: 14.5,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
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
    height: 216,
    borderRadius: 24,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  optionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  optionIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  optionTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
  },
  optionSub: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  deployHint: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  deployHintText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});