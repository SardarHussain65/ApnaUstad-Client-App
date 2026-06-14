import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Moon, Palette, Sparkles, Sun } from 'lucide-react-native';
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
import { changeAppLanguage } from '../../i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const themedTypography = useThemeTypography();
  const themedShadows = useThemeShadows();
  const { themeId, setThemeId } = useThemeMode();
  const currentLanguage = i18n.language;

  const [selectedLang, setSelectedLang] = React.useState<'en' | 'ur'>(
    (currentLanguage === 'ur' ? 'ur' : 'en')
  );

  React.useEffect(() => {
    setSelectedLang(currentLanguage === 'ur' ? 'ur' : 'en');
  }, [currentLanguage]);

  const handleApply = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await changeAppLanguage(selectedLang);
      Toast.show({
        type: 'success',
        text1: t('settings.title'),
        text2: t('settings.languageUpdated'),
      });
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleThemeSelect = async (nextThemeId: ThemeId) => {
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

  const isRTL = i18n.language === 'ur';
  const themeOptions: {
    id: ThemeId;
    label: string;
    description: string;
    Icon: typeof Palette;
  }[] = [
    {
      id: 'current',
      label: t('settings.themeCurrent'),
      description: t('settings.themeCurrentDesc'),
      Icon: Sparkles,
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
  ];

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <ProfileHeader title={t('settings.title')} />

        <View style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={theme.colors.gradients.primary} style={styles.iconGlow} />
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: theme.colors.surface.subtle,
                  borderColor: theme.colors.border.strong,
                },
              ]}
            >
              <Globe size={28} color={theme.colors.text.primary} />
            </View>
          </View>
          <Text style={[styles.title, themedTypography.threeD, { color: theme.colors.text.primary }]}>{t('settings.language')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>{t('settings.selectLanguage')}</Text>
        </View>

        <GlassCard style={[styles.languagesCard, { borderColor: theme.colors.border.subtle }]} intensity={25} padding={0}>
          {/* English Item */}
          <Pressable
            style={[
              styles.languageItem,
              selectedLang === 'en' && { backgroundColor: alpha(theme.colors.brand.primary, 0.06) },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedLang('en');
            }}
          >
            <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.langIconCircle,
                  {
                    backgroundColor: selectedLang === 'en' ? alpha(theme.colors.brand.primary, 0.1) : theme.colors.surface.subtle,
                    borderColor: selectedLang === 'en' ? alpha(theme.colors.brand.primary, 0.25) : theme.colors.border.subtle,
                  },
                ]}
              >
                <Globe size={20} color={selectedLang === 'en' ? theme.colors.brand.primary : theme.colors.text.dim} />
              </View>
              <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.languageName, { color: theme.colors.text.primary }]}>English</Text>
                <Text style={[styles.languageDetail, { color: theme.colors.text.dim }]}>انگریزی</Text>
              </View>
              <View style={[styles.radioButton, { borderColor: selectedLang === 'en' ? theme.colors.brand.primary : theme.colors.border.strong }]}>
                {selectedLang === 'en' && <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.brand.primary, shadowColor: theme.colors.brand.primary }]} />}
              </View>
            </View>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />

          {/* Urdu Item */}
          <Pressable
            style={[
              styles.languageItem,
              selectedLang === 'ur' && { backgroundColor: alpha(theme.colors.brand.primary, 0.06) },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedLang('ur');
            }}
          >
            <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.langIconCircle,
                  {
                    backgroundColor: selectedLang === 'ur' ? alpha(theme.colors.brand.primary, 0.1) : theme.colors.surface.subtle,
                    borderColor: selectedLang === 'ur' ? alpha(theme.colors.brand.primary, 0.25) : theme.colors.border.subtle,
                  },
                ]}
              >
                <Text style={[styles.urduSymbolText, { color: selectedLang === 'ur' ? theme.colors.brand.primary : theme.colors.text.dim }]}>ع</Text>
              </View>
              <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.languageName, styles.urduFont, { color: theme.colors.text.primary }]}>اردو</Text>
                <Text style={[styles.languageDetail, { color: theme.colors.text.dim }]}>Urdu</Text>
              </View>
              <View style={[styles.radioButton, { borderColor: selectedLang === 'ur' ? theme.colors.brand.primary : theme.colors.border.strong }]}>
                {selectedLang === 'ur' && <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.brand.primary, shadowColor: theme.colors.brand.primary }]} />}
              </View>
            </View>
          </Pressable>
        </GlassCard>

        <View style={styles.themeSection}>
          <View style={styles.themeHeader}>
            <Palette size={18} color={theme.colors.brand.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('settings.theme')}</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text.muted }]}>{t('settings.selectTheme')}</Text>
            </View>
          </View>

          <GlassCard style={[styles.themeCard, { borderColor: theme.colors.border.subtle }]} intensity={18} padding={0}>
            {themeOptions.map((option, index) => {
              const selected = themeId === option.id;
              const Icon = option.Icon;
              return (
                <React.Fragment key={option.id}>
                  <Pressable
                    style={[
                      styles.themeItem,
                      selected && { backgroundColor: alpha(theme.colors.brand.primary, 0.07) },
                    ]}
                    onPress={() => handleThemeSelect(option.id)}
                  >
                    <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View
                        style={[
                          styles.langIconCircle,
                          {
                            backgroundColor: selected ? alpha(theme.colors.brand.primary, 0.1) : theme.colors.surface.subtle,
                            borderColor: selected ? alpha(theme.colors.brand.primary, 0.25) : theme.colors.border.subtle,
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
                        {selected && <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.brand.primary, shadowColor: theme.colors.brand.primary }]} />}
                      </View>
                    </View>
                  </Pressable>
                  {index < themeOptions.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />}
                </React.Fragment>
              );
            })}
          </GlassCard>
        </View>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.applyButton,
            {
              shadowColor: theme.colors.brand.primary,
              shadowOpacity: themedShadows.glow.shadowOpacity,
            },
            pressed && styles.applyButtonPressed,
          ]}
          onPress={handleApply}
        >
          <LinearGradient
            colors={theme.colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={[styles.applyButtonText, { color: theme.colors.button.primaryText }]}>{t('settings.confirmButton')}</Text>
        </Pressable>

        <Text style={[styles.infoText, { color: theme.colors.text.dim }]}>{t('settings.appliedInstantly')}</Text>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
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
