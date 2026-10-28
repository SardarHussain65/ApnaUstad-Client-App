import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { Globe, Moon, Palette, Smartphone, Sparkles, Sun } from 'lucide-react-native';
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
  ThemePreference,
  useTheme,
  useThemeMode,
} from '../../constants/Theme';
import { changeAppLanguage } from '../../i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { themePreference, setThemePreference } = useThemeMode();
  const currentLanguage = i18n.language === 'ur' ? 'ur' : 'en';

  const handleLanguageSelect = async (lang: 'en' | 'ur') => {
    if (lang === currentLanguage) return;
    try {
      Haptics.selectionAsync();
      await changeAppLanguage(lang);
      Toast.show({
        type: 'success',
        text1: t('settings.title'),
        text2: t('settings.languageUpdated'),
      });
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleThemeSelect = async (nextPref: ThemePreference) => {
    if (nextPref === themePreference) return;
    try {
      Haptics.selectionAsync();
      await setThemePreference(nextPref);
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

  const isRTL = i18n.language === 'ur';
  const themeOptions: {
    id: ThemePreference;
    label: string;
    description: string;
    Icon: typeof Palette;
  }[] = [
    {
      id: 'system',
      label: t('settings.themeSystem', { defaultValue: 'Match Phone (Auto)' }),
      description: t('settings.themeSystemDesc', { defaultValue: 'Follows your phone Light or Dark mode automatically' }),
      Icon: Smartphone,
    },
    {
      id: 'light',
      label: t('settings.themeLight'),
      description: t('settings.themeLightDesc'),
      Icon: Sun,
    },
    {
      id: 'dark',
      label: t('settings.themeDark'),
      description: t('settings.themeDarkDesc'),
      Icon: Moon,
    },
    {
      id: 'current',
      label: t('settings.themeCurrent'),
      description: t('settings.themeCurrentDesc'),
      Icon: Sparkles,
    },
  ];

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <ProfileHeader title={t('settings.title')} />
        <ScrollView
          style={{ marginTop: Spacing.m }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Theme Section */}
          <View style={styles.sectionBlock}>
            <View style={styles.themeHeader}>
              <Palette size={18} color={theme.colors.brand.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('settings.theme')}</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.text.muted }]}>{t('settings.selectTheme')}</Text>
              </View>
            </View>

            <GlassCard style={[styles.themeCard, { borderColor: theme.colors.border.subtle }]} intensity={18} padding={0}>
              {themeOptions.map((option, index) => {
                const selected = themePreference === option.id;
                const Icon = option.Icon;
                return (
                  <React.Fragment key={option.id}>
                    <Pressable
                      style={[
                        styles.themeItem,
                        selected && { backgroundColor: alpha(theme.colors.brand.primary, 0.08) },
                      ]}
                      onPress={() => handleThemeSelect(option.id)}
                    >
                      <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View
                          style={[
                            styles.langIconCircle,
                            {
                              backgroundColor: selected ? alpha(theme.colors.brand.primary, 0.12) : theme.colors.surface.subtle,
                              borderColor: selected ? alpha(theme.colors.brand.primary, 0.3) : theme.colors.border.subtle,
                            },
                          ]}
                        >
                          <Icon size={20} color={selected ? theme.colors.brand.primary : theme.colors.text.dim} />
                        </View>
                        <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                          <Text style={[styles.languageName, { color: theme.colors.text.primary }]}>{option.label}</Text>
                          <Text style={[styles.languageDetail, { color: theme.colors.text.muted }]}>{option.description}</Text>
                        </View>
                        <View style={[styles.radioButton, { borderColor: selected ? theme.colors.brand.primary : theme.colors.border.strong }]}>
                          {selected && <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.brand.primary }]} />}
                        </View>
                      </View>
                    </Pressable>
                    {index < themeOptions.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />}
                  </React.Fragment>
                );
              })}
            </GlassCard>
          </View>

          {/* Language Section */}
          <View style={styles.themeSection}>
            <View style={styles.themeHeader}>
              <Globe size={18} color={theme.colors.brand.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('settings.language')}</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.text.muted }]}>{t('settings.selectLanguage')}</Text>
              </View>
            </View>

            <GlassCard style={[styles.languagesCard, { borderColor: theme.colors.border.subtle }]} intensity={25} padding={0}>
              {/* English Item */}
              <Pressable
                style={[
                  styles.languageItem,
                  currentLanguage === 'en' && { backgroundColor: alpha(theme.colors.brand.primary, 0.08) },
                ]}
                onPress={() => handleLanguageSelect('en')}
              >
                <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View
                    style={[
                      styles.langIconCircle,
                      {
                        backgroundColor: currentLanguage === 'en' ? alpha(theme.colors.brand.primary, 0.12) : theme.colors.surface.subtle,
                        borderColor: currentLanguage === 'en' ? alpha(theme.colors.brand.primary, 0.3) : theme.colors.border.subtle,
                      },
                    ]}
                  >
                    <Globe size={20} color={currentLanguage === 'en' ? theme.colors.brand.primary : theme.colors.text.dim} />
                  </View>
                  <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.languageName, { color: theme.colors.text.primary }]}>English</Text>
                    <Text style={[styles.languageDetail, { color: theme.colors.text.dim }]}>انگریزی</Text>
                  </View>
                  <View style={[styles.radioButton, { borderColor: currentLanguage === 'en' ? theme.colors.brand.primary : theme.colors.border.strong }]}>
                    {currentLanguage === 'en' && <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.brand.primary }]} />}
                  </View>
                </View>
              </Pressable>

              <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />

              {/* Urdu Item */}
              <Pressable
                style={[
                  styles.languageItem,
                  currentLanguage === 'ur' && { backgroundColor: alpha(theme.colors.brand.primary, 0.08) },
                ]}
                onPress={() => handleLanguageSelect('ur')}
              >
                <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View
                    style={[
                      styles.langIconCircle,
                      {
                        backgroundColor: currentLanguage === 'ur' ? alpha(theme.colors.brand.primary, 0.12) : theme.colors.surface.subtle,
                        borderColor: currentLanguage === 'ur' ? alpha(theme.colors.brand.primary, 0.3) : theme.colors.border.subtle,
                      },
                    ]}
                  >
                    <Text style={[styles.urduSymbolText, { color: currentLanguage === 'ur' ? theme.colors.brand.primary : theme.colors.text.dim }]}>اردو</Text>
                  </View>
                  <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.languageName, styles.urduFont, { color: theme.colors.text.primary }]}>اردو</Text>
                    <Text style={[styles.languageDetail, { color: theme.colors.text.dim }]}>Urdu</Text>
                  </View>
                  <View style={[styles.radioButton, { borderColor: currentLanguage === 'ur' ? theme.colors.brand.primary : theme.colors.border.strong }]}>
                    {currentLanguage === 'ur' && <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.brand.primary }]} />}
                  </View>
                </View>
              </Pressable>
            </GlassCard>
          </View>

          <Text style={[styles.infoText, { color: theme.colors.text.dim }]}>{t('settings.appliedInstantly')}</Text>
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
  sectionBlock: {
    marginTop: 6,
  },
  iconWrap: {
    width: 88,
    height: 88,
    marginBottom: 16,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    opacity: 0.35,
  },
  iconCircle: {
    flex: 1,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  languagesCard: {
    borderRadius: BorderRadius.l,
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  languageItem: {
    paddingVertical: 18,
    paddingHorizontal: Spacing.m,
  },
  rowContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  langIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urduSymbolText: {
    fontSize: 16,
    fontWeight: '800',
  },
  languageTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  languageDetail: {
    fontSize: 11,
    fontWeight: '600',
  },
  urduFont: {
    fontSize: 17,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.m,
  },
  themeSection: {
    marginTop: 22,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  themeCard: {
    borderRadius: BorderRadius.l,
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  themeItem: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.m,
  },
  applyButton: {
    height: 54,
    borderRadius: BorderRadius.m,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 15,
  },
  applyButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 20,
  },
});
