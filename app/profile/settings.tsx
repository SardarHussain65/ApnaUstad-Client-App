import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { changeAppLanguage } from '../../i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const handleLanguageChange = async (lang: 'en' | 'ur') => {
    if (currentLanguage === lang) return;
    await changeAppLanguage(lang);
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <ProfileHeader title={t('settings.title')} />

        <View style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.iconGlow} />
            <View style={styles.iconCircle}>
              <Globe size={28} color="#fff" />
            </View>
          </View>
          <Text style={[styles.title, Typography.threeD]}>{t('settings.language')}</Text>
          <Text style={styles.subtitle}>{t('settings.selectLanguage')}</Text>
        </View>

        <GlassCard style={styles.languagesCard} intensity={20} padding={Spacing.m}>
          <Pressable 
            style={[styles.languageItem, currentLanguage === 'en' && styles.languageItemActive]} 
            onPress={() => handleLanguageChange('en')}
          >
            <View style={styles.languageTextContainer}>
              <Text style={styles.languageName}>{t('settings.english')}</Text>
            </View>
            {currentLanguage === 'en' && (
              <View style={styles.checkIcon}>
                <Check size={16} color="#00F5FF" strokeWidth={3} />
              </View>
            )}
          </Pressable>

          <View style={styles.divider} />

          <Pressable 
            style={[styles.languageItem, currentLanguage === 'ur' && styles.languageItemActive]} 
            onPress={() => handleLanguageChange('ur')}
          >
            <View style={styles.languageTextContainer}>
              <Text style={[styles.languageName, styles.urduFont]}>{t('settings.urdu')}</Text>
            </View>
            {currentLanguage === 'ur' && (
              <View style={styles.checkIcon}>
                <Check size={16} color="#00F5FF" strokeWidth={3} />
              </View>
            )}
          </Pressable>
        </GlassCard>

        <Text style={styles.infoText}>{t('settings.saveReload')}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  languagesCard: {
    borderRadius: BorderRadius.l,
    ...Shadows.glow,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.m,
  },
  languageItemActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  urduFont: {
    textAlign: 'left',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: Spacing.m,
  },
  infoText: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 24,
  },
});
