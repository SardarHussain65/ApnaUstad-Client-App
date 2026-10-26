import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Check,
  Globe,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedButton } from '../components/AnimatedButton';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import {
  alpha,
  BorderRadius,
  Spacing,
  ThemeId,
  useTheme,
  useThemeColors,
  useThemeMode,
  useThemeShadows,
  useThemeTypography,
} from '../constants/Theme';
import { changeAppLanguage } from '../i18n';

const { width } = Dimensions.get('window');

export default function ThemeLanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();
  const { themeId, setThemeId } = useThemeMode();

  const [selectedLang, setSelectedLang] = useState<'en' | 'ur'>(
    i18n.language === 'ur' ? 'ur' : 'en'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectTheme = (id: ThemeId) => {
    Haptics.selectionAsync();
    setThemeId(id);
  };

  const handleSelectLanguage = (lang: 'en' | 'ur') => {
    Haptics.selectionAsync();
    setSelectedLang(lang);
    // Instant text preview
    i18n.changeLanguage(lang);
  };

  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await changeAppLanguage(selectedLang);
      router.replace('/role-selection');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      router.replace('/role-selection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/role-selection');
  };

  const themeOptions: Array<{
    id: ThemeId;
    title: string;
    description: string;
    tag?: string;
    accentColor: string;
    icon: any;
    previewColors: [string, string];
  }> = [
    {
      id: 'current',
      title: t('themeLanguageSetup.themeCosmic'),
      description: t('themeLanguageSetup.themeCosmicDesc'),
      tag: t('themeLanguageSetup.themeCosmicTag'),
      accentColor: colors.cyan,
      icon: Sparkles,
      previewColors: ['#050510', '#0E1A38'],
    },
    {
      id: 'dark',
      title: t('themeLanguageSetup.themeDark'),
      description: t('themeLanguageSetup.themeDarkDesc'),
      accentColor: colors.purple,
      icon: Moon,
      previewColors: ['#0B0B14', '#171728'],
    },
    {
      id: 'light',
      title: t('themeLanguageSetup.themeLight'),
      description: t('themeLanguageSetup.themeLightDesc'),
      accentColor: '#0284C7',
      icon: Sun,
      previewColors: ['#F1F5F9', '#FFFFFF'],
    },
  ];

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image
              source={require('../assets/images/logo_premium.png')}
              style={styles.brandLogo}
            />
            <View>
              <Text style={[styles.brandName, { color: theme.colors.text.primary }]}>
                APNAUSTAD
              </Text>
              <Text style={[styles.brandTagline, { color: colors.cyan }]}>
                SERVICES, MADE SIMPLE
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSkip}
            style={[
              styles.skipButton,
              {
                backgroundColor: alpha(
                  theme.colors.text.primary,
                  theme.id === 'light' ? 0.04 : 0.06
                ),
                borderColor: alpha(
                  theme.colors.text.primary,
                  theme.id === 'light' ? 0.12 : 0.15
                ),
              },
            ]}
          >
            <Text style={[styles.skipText, { color: theme.colors.text.muted }]}>
              {t('common.skip')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: alpha(colors.cyan, 0.1),
                  borderColor: alpha(colors.cyan, 0.35),
                },
              ]}
            >
              <Sparkles size={13} color={colors.cyan} strokeWidth={2.4} />
              <Text style={[styles.badgeText, { color: colors.cyan }]}>
                {t('themeLanguageSetup.eyebrow')}
              </Text>
            </View>

            <Text
              style={[
                styles.title,
                typography.threeD,
                { color: theme.colors.text.primary },
              ]}
            >
              {t('themeLanguageSetup.title')}
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>
              {t('themeLanguageSetup.subtitle')}
            </Text>
          </View>

          {/* Section 1: Themes */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View
                style={[
                  styles.sectionIconBadge,
                  { backgroundColor: alpha(colors.cyan, 0.12) },
                ]}
              >
                <Palette size={16} color={colors.cyan} strokeWidth={2.2} />
              </View>
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {t('themeLanguageSetup.themeSectionTitle')}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: theme.colors.text.muted },
                  ]}
                >
                  {t('themeLanguageSetup.themeSectionSubtitle')}
                </Text>
              </View>
            </View>

            <View style={styles.cardsList}>
              {themeOptions.map((item) => {
                const isSelected = themeId === item.id;
                const IconComponent = item.icon;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => handleSelectTheme(item.id)}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isSelected
                          ? alpha(theme.colors.surface.card, theme.id === 'light' ? 0.95 : 0.85)
                          : alpha(theme.colors.surface.card, theme.id === 'light' ? 0.7 : 0.45),
                        borderColor: isSelected
                          ? colors.cyan
                          : alpha(theme.colors.border.default, 0.3),
                      },
                      isSelected && {
                        shadowColor: colors.cyan,
                        shadowOpacity: theme.id === 'light' ? 0.2 : 0.45,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 8,
                      },
                    ]}
                  >
                    {/* Glowing highlight border on selected */}
                    {isSelected && (
                      <LinearGradient
                        colors={[alpha(colors.cyan, 0.2), 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    )}

                    {/* Mini Swatch / Atmosphere Preview */}
                    <LinearGradient
                      colors={item.previewColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.themePreviewBox,
                        {
                          borderColor: isSelected
                            ? colors.cyan
                            : alpha(theme.colors.border.subtle, 0.3),
                        },
                      ]}
                    >
                      <IconComponent
                        size={20}
                        color={item.accentColor}
                        strokeWidth={2.2}
                      />
                      {item.id === 'current' && (
                        <View
                          style={[
                            styles.cosmicMiniRing,
                            { borderColor: alpha(colors.cyan, 0.6) },
                          ]}
                        />
                      )}
                    </LinearGradient>

                    {/* Text Details */}
                    <View style={styles.cardContent}>
                      <View style={styles.cardTitleRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            {
                              color: isSelected
                                ? colors.cyan
                                : theme.colors.text.primary,
                            },
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.tag && (
                          <View
                            style={[
                              styles.miniTag,
                              {
                                backgroundColor: alpha(colors.cyan, 0.15),
                                borderColor: alpha(colors.cyan, 0.4),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniTagText,
                                { color: colors.cyan },
                              ]}
                            >
                              {item.tag}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.cardDesc,
                          { color: theme.colors.text.muted },
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    </View>

                    {/* Radio Indicator */}
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected
                            ? colors.cyan
                            : alpha(theme.colors.border.strong, 0.5),
                          backgroundColor: isSelected
                            ? colors.cyan
                            : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check size={12} color="#050510" strokeWidth={3.5} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Languages */}
          <View style={[styles.section, { marginTop: Spacing.xl }]}>
            <View style={styles.sectionHeaderRow}>
              <View
                style={[
                  styles.sectionIconBadge,
                  { backgroundColor: alpha(colors.purple, 0.15) },
                ]}
              >
                <Globe size={16} color={colors.purple} strokeWidth={2.2} />
              </View>
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {t('themeLanguageSetup.languageSectionTitle')}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: theme.colors.text.muted },
                  ]}
                >
                  {t('themeLanguageSetup.languageSectionSubtitle')}
                </Text>
              </View>
            </View>

            <View style={styles.langGrid}>
              {/* English Card */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectLanguage('en')}
                style={[
                  styles.langCard,
                  {
                    backgroundColor:
                      selectedLang === 'en'
                        ? alpha(theme.colors.surface.card, theme.id === 'light' ? 0.95 : 0.85)
                        : alpha(theme.colors.surface.card, theme.id === 'light' ? 0.7 : 0.45),
                    borderColor:
                      selectedLang === 'en'
                        ? colors.cyan
                        : alpha(theme.colors.border.default, 0.3),
                  },
                  selectedLang === 'en' && {
                    shadowColor: colors.cyan,
                    shadowOpacity: theme.id === 'light' ? 0.2 : 0.4,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  },
                ]}
              >
                {selectedLang === 'en' && (
                  <LinearGradient
                    colors={[alpha(colors.cyan, 0.18), 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}

                <View style={styles.langTopRow}>
                  <View
                    style={[
                      styles.langBadge,
                      {
                        backgroundColor:
                          selectedLang === 'en'
                            ? alpha(colors.cyan, 0.18)
                            : alpha(theme.colors.text.primary, 0.06),
                        borderColor:
                          selectedLang === 'en'
                            ? colors.cyan
                            : alpha(theme.colors.border.subtle, 0.4),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langBadgeText,
                        {
                          color:
                            selectedLang === 'en'
                              ? colors.cyan
                              : theme.colors.text.primary,
                        },
                      ]}
                    >
                      EN
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          selectedLang === 'en'
                            ? colors.cyan
                            : alpha(theme.colors.border.strong, 0.5),
                        backgroundColor:
                          selectedLang === 'en' ? colors.cyan : 'transparent',
                      },
                    ]}
                  >
                    {selectedLang === 'en' && (
                      <Check size={12} color="#050510" strokeWidth={3.5} />
                    )}
                  </View>
                </View>

                <Text
                  style={[
                    styles.langTitle,
                    {
                      color:
                        selectedLang === 'en'
                          ? colors.cyan
                          : theme.colors.text.primary,
                    },
                  ]}
                >
                  {t('themeLanguageSetup.langEnglish')}
                </Text>
                <Text
                  style={[
                    styles.langDesc,
                    { color: theme.colors.text.muted },
                  ]}
                  numberOfLines={1}
                >
                  {t('themeLanguageSetup.langEnglishSub')}
                </Text>
              </TouchableOpacity>

              {/* Urdu Card */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectLanguage('ur')}
                style={[
                  styles.langCard,
                  {
                    backgroundColor:
                      selectedLang === 'ur'
                        ? alpha(theme.colors.surface.card, theme.id === 'light' ? 0.95 : 0.85)
                        : alpha(theme.colors.surface.card, theme.id === 'light' ? 0.7 : 0.45),
                    borderColor:
                      selectedLang === 'ur'
                        ? colors.cyan
                        : alpha(theme.colors.border.default, 0.3),
                  },
                  selectedLang === 'ur' && {
                    shadowColor: colors.cyan,
                    shadowOpacity: theme.id === 'light' ? 0.2 : 0.4,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  },
                ]}
              >
                {selectedLang === 'ur' && (
                  <LinearGradient
                    colors={[alpha(colors.cyan, 0.18), 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}

                <View style={styles.langTopRow}>
                  <View
                    style={[
                      styles.langBadge,
                      {
                        backgroundColor:
                          selectedLang === 'ur'
                            ? alpha(colors.cyan, 0.18)
                            : alpha(theme.colors.text.primary, 0.06),
                        borderColor:
                          selectedLang === 'ur'
                            ? colors.cyan
                            : alpha(theme.colors.border.subtle, 0.4),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langBadgeText,
                        styles.urduBadgeText,
                        {
                          color:
                            selectedLang === 'ur'
                              ? colors.cyan
                              : theme.colors.text.primary,
                        },
                      ]}
                    >
                      اردو
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          selectedLang === 'ur'
                            ? colors.cyan
                            : alpha(theme.colors.border.strong, 0.5),
                        backgroundColor:
                          selectedLang === 'ur' ? colors.cyan : 'transparent',
                      },
                    ]}
                  >
                    {selectedLang === 'ur' && (
                      <Check size={12} color="#050510" strokeWidth={3.5} />
                    )}
                  </View>
                </View>

                <Text
                  style={[
                    styles.langTitle,
                    {
                      color:
                        selectedLang === 'ur'
                          ? colors.cyan
                          : theme.colors.text.primary,
                    },
                  ]}
                >
                  {t('themeLanguageSetup.langUrdu')}
                </Text>
                <Text
                  style={[
                    styles.langDesc,
                    { color: theme.colors.text.muted },
                  ]}
                  numberOfLines={1}
                >
                  {t('themeLanguageSetup.langUrduSub')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Action Section */}
          <View style={styles.footer}>
            <AnimatedButton
              icon={<ArrowRight size={18} color={colors.cyan} strokeWidth={2.8} />}
              isLoading={isSubmitting}
              onPress={handleContinue}
              style={styles.continueButton}
              title={t('themeLanguageSetup.continue')}
              variant="cyan"
            />
            <Text style={[styles.footerNote, { color: theme.colors.text.dim }]}>
              {t('themeLanguageSetup.footerNote')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.m,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 38,
    height: 38,
    marginRight: 9,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  brandTagline: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 2,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  heroSection: {
    marginTop: Spacing.s,
    marginBottom: Spacing.l,
  },
  badgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.m,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    maxWidth: 340,
  },
  section: {
    marginBottom: Spacing.m,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.m,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  cardsList: {
    gap: 10,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  themePreviewBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  cosmicMiniRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.2,
    borderStyle: 'dashed',
  },
  cardContent: {
    flex: 1,
    marginRight: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  miniTagText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  langCard: {
    flex: 1,
    padding: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  langTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  urduBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  langTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  langDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.s,
    gap: 12,
  },
  continueButton: {
    width: '100%',
  },
  footerNote: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.m,
  },
});
