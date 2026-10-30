import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Globe, Moon, Palette, Sparkles, Sun, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import {
  alpha,
  BorderRadius,
  Spacing,
  ThemeId,
  useTheme,
  useThemeMode,
  useThemeShadows,
  useThemeTypography,
} from '../../constants/Theme';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const themedTypography = useThemeTypography();
  const themedShadows = useThemeShadows();
  const { themeId, setThemeId } = useThemeMode();
  const { language: currentLanguage, isRTL, setLanguage } = useLanguage();

  const handleLanguageSelect = async (lang: 'en' | 'ur') => {
    if (currentLanguage === lang) return;
    try {
      Haptics.selectionAsync();
      await setLanguage(lang);
      Toast.show({
        type: 'success',
        text1: lang === 'ur' ? 'زبان تبدیل ہو گئی' : 'Language Changed',
        text2: lang === 'ur' ? 'اردو منتخب کی گئی ہے' : 'English is now active',
      });
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleThemeSelect = async (nextThemeId: ThemeId) => {
    if (themeId === nextThemeId) return;
    try {
      Haptics.selectionAsync();
      await setThemeId(nextThemeId);
      Toast.show({
        type: 'success',
        text1: t('settings.themeUpdatedTitle'),
        text2: t('settings.themeUpdatedMessage'),
      });
    } catch (error) {
      console.error('Failed to change theme:', error);
      Toast.show({
        type: 'error',
        text1: t('settings.themeUpdateFailedTitle'),
        text2: t('settings.themeUpdateFailedMessage'),
      });
    }
  };

  const themeOptions: {
    id: ThemeId;
    label: string;
    description: string;
    Icon: typeof Palette;
    previewColors: [string, string];
  }[] = [
      {
        id: 'current',
        label: t('settings.themeCurrent'),
        description: t('settings.themeCurrentDesc'),
        Icon: Sparkles,
        previewColors: ['#00F5FF', '#090E24'],
      },
      {
        id: 'light',
        label: t('settings.themeLight'),
        description: t('settings.themeLightDesc'),
        Icon: Sun,
        previewColors: ['#FFFFFF', '#0284C7'],
      },
      {
        id: 'dark',
        label: t('settings.themeDark'),
        description: t('settings.themeDarkDesc'),
        Icon: Moon,
        previewColors: ['#121620', '#00F5FF'],
      },
    ];

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <ProfileHeader title={t('settings.title')} />
        <ScrollView style={{ marginTop: Spacing.s }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Section 1: App Language */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconRing, { backgroundColor: alpha(theme.colors.brand.primary, 0.12), borderColor: alpha(theme.colors.brand.primary, 0.3) }]}>
              <Globe size={18} color={theme.colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('settings.language')}</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text.muted }]}>{t('settings.selectLanguage')}</Text>
            </View>
            <View style={[styles.currentPill, { backgroundColor: alpha(theme.colors.brand.primary, 0.1), borderColor: alpha(theme.colors.brand.primary, 0.25) }]}>
              <Text style={[styles.currentPillText, { color: theme.colors.brand.primary }]}>
                {currentLanguage === 'ur' ? 'اردو' : 'English'}
              </Text>
            </View>
          </View>

          <GlassCard style={[styles.cardContainer, { borderColor: theme.colors.border.subtle }]} intensity={25} padding={0}>
            {/* English Item */}
            <Pressable
              style={({ pressed }) => [
                styles.itemRow,
                currentLanguage === 'en' && { backgroundColor: alpha(theme.colors.brand.primary, 0.08) },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleLanguageSelect('en')}
            >
              <View style={styles.rowContent}>
                <View
                  style={[
                    styles.itemIconCircle,
                    {
                      backgroundColor: currentLanguage === 'en' ? alpha(theme.colors.brand.primary, 0.18) : theme.colors.surface.subtle,
                      borderColor: currentLanguage === 'en' ? theme.colors.brand.primary : theme.colors.border.subtle,
                    },
                  ]}
                >
                  <Globe size={19} color={currentLanguage === 'en' ? theme.colors.brand.primary : theme.colors.text.dim} />
                </View>

                <View style={styles.itemTextContainer}>
                  <Text style={[styles.itemName, { color: theme.colors.text.primary }]}>English</Text>
                  <Text style={[styles.itemDetail, { color: theme.colors.text.muted }]}>انگریزی • Default</Text>
                </View>

                <View style={[styles.checkCircle, { borderColor: currentLanguage === 'en' ? theme.colors.brand.primary : theme.colors.border.strong, backgroundColor: currentLanguage === 'en' ? theme.colors.brand.primary : 'transparent' }]}>
                  {currentLanguage === 'en' && <Check size={13} color={theme.colors.button.primaryText} strokeWidth={3} />}
                </View>
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />

            {/* Urdu Item */}
            <Pressable
              style={({ pressed }) => [
                styles.itemRow,
                currentLanguage === 'ur' && { backgroundColor: alpha(theme.colors.brand.primary, 0.08) },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleLanguageSelect('ur')}
            >
              <View style={styles.rowContent}>
                <View
                  style={[
                    styles.itemIconCircle,
                    {
                      backgroundColor: currentLanguage === 'ur' ? alpha(theme.colors.brand.primary, 0.18) : theme.colors.surface.subtle,
                      borderColor: currentLanguage === 'ur' ? theme.colors.brand.primary : theme.colors.border.subtle,
                    },
                  ]}
                >
                  <Text style={[styles.urduSymbolText, { color: currentLanguage === 'ur' ? theme.colors.brand.primary : theme.colors.text.dim }]}>ع</Text>
                </View>

                <View style={styles.itemTextContainer}>
                  <Text style={[styles.itemName, styles.urduFont, { color: theme.colors.text.primary }]}>اردو</Text>
                  <Text style={[styles.itemDetail, { color: theme.colors.text.muted }]}>Urdu • قومی زبان</Text>
                </View>

                <View style={[styles.checkCircle, { borderColor: currentLanguage === 'ur' ? theme.colors.brand.primary : theme.colors.border.strong, backgroundColor: currentLanguage === 'ur' ? theme.colors.brand.primary : 'transparent' }]}>
                  {currentLanguage === 'ur' && <Check size={13} color={theme.colors.button.primaryText} strokeWidth={3} />}
                </View>
              </View>
            </Pressable>
          </GlassCard>

          {/* Section 2: Screen Style / Theme */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <View style={[styles.sectionIconRing, { backgroundColor: alpha(theme.colors.brand.secondary, 0.12), borderColor: alpha(theme.colors.brand.secondary, 0.3) }]}>
              <Palette size={18} color={theme.colors.brand.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('settings.theme')}</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text.muted }]}>{t('settings.selectTheme')}</Text>
            </View>
            <View style={[styles.currentPill, { backgroundColor: alpha(theme.colors.brand.secondary, 0.1), borderColor: alpha(theme.colors.brand.secondary, 0.25) }]}>
              <Text style={[styles.currentPillText, { color: theme.colors.brand.secondary }]}>
                {themeOptions.find(o => o.id === themeId)?.label || 'Theme'}
              </Text>
            </View>
          </View>

          <GlassCard style={[styles.cardContainer, { borderColor: theme.colors.border.subtle }]} intensity={20} padding={0}>
            {themeOptions.map((option, index) => {
              const selected = themeId === option.id;
              const Icon = option.Icon;
              return (
                <React.Fragment key={option.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.itemRow,
                      selected && { backgroundColor: alpha(theme.colors.brand.primary, 0.08) },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleThemeSelect(option.id)}
                  >
                    <View style={styles.rowContent}>
                      <View
                        style={[
                          styles.itemIconCircle,
                          {
                            backgroundColor: selected ? alpha(theme.colors.brand.primary, 0.18) : theme.colors.surface.subtle,
                            borderColor: selected ? theme.colors.brand.primary : theme.colors.border.subtle,
                          },
                        ]}
                      >
                        <Icon size={19} color={selected ? theme.colors.brand.primary : theme.colors.text.dim} />
                      </View>

                      <View style={styles.itemTextContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.itemName, { color: theme.colors.text.primary }]}>{option.label}</Text>
                          {/* Mini swatch preview dots */}
                          <View style={styles.swatchWrap}>
                            <View style={[styles.swatchDot, { backgroundColor: option.previewColors[0] }]} />
                            <View style={[styles.swatchDot, { backgroundColor: option.previewColors[1], marginStart: -4 }]} />
                          </View>
                        </View>
                        <Text style={[styles.itemDetail, { color: theme.colors.text.muted }]}>{option.description}</Text>
                      </View>

                      <View style={[styles.checkCircle, { borderColor: selected ? theme.colors.brand.primary : theme.colors.border.strong, backgroundColor: selected ? theme.colors.brand.primary : 'transparent' }]}>
                        {selected && <Check size={13} color={theme.colors.button.primaryText} strokeWidth={3} />}
                      </View>
                    </View>
                  </Pressable>
                  {index < themeOptions.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />}
                </React.Fragment>
              );
            })}
          </GlassCard>

          {/* Instant Apply Notice Pill */}
          <View style={[styles.instantNotice, { backgroundColor: alpha(theme.colors.surface.card, 0.6), borderColor: theme.colors.border.subtle }]}>
            <Sparkles size={14} color={theme.colors.brand.primary} />
            <Text style={[styles.instantNoticeText, { color: theme.colors.text.muted }]}>
              {t('settings.appliedInstantly', { defaultValue: 'Changes apply immediately across all screens.' })}
            </Text>
          </View>
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 10,
  },
  sectionIconRing: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  currentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  currentPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardContainer: {
    borderRadius: BorderRadius.l,
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  itemRow: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.m,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  itemIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urduSymbolText: {
    fontSize: 17,
    fontWeight: '900',
  },
  itemTextContainer: {
    flex: 1,
    marginHorizontal: 14,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  urduFont: {
    fontSize: 17,
    fontWeight: '700',
  },
  swatchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.m,
  },
  instantNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  instantNoticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
