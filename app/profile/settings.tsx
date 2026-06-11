import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { changeAppLanguage } from '../../i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
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

  const isRTL = i18n.language === 'ur';

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

        <GlassCard style={styles.languagesCard} intensity={25} padding={0}>
          {/* English Item */}
          <Pressable
            style={[
              styles.languageItem,
              selectedLang === 'en' && styles.languageItemActive
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedLang('en');
            }}
          >
            <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.langIconCircle, selectedLang === 'en' && styles.langIconCircleActive]}>
                <Globe size={20} color={selectedLang === 'en' ? '#00F5FF' : 'rgba(255,255,255,0.4)'} />
              </View>
              <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.languageName}>English</Text>
                <Text style={styles.languageDetail}>انگریزی</Text>
              </View>
              <View style={[styles.radioButton, selectedLang === 'en' && styles.radioButtonActive]}>
                {selectedLang === 'en' && <View style={styles.radioButtonInner} />}
              </View>
            </View>
          </Pressable>

          <View style={styles.divider} />

          {/* Urdu Item */}
          <Pressable
            style={[
              styles.languageItem,
              selectedLang === 'ur' && styles.languageItemActive
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedLang('ur');
            }}
          >
            <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.langIconCircle, selectedLang === 'ur' && styles.langIconCircleActive]}>
                <Text style={[styles.urduSymbolText, selectedLang === 'ur' && styles.urduSymbolTextActive]}>ع</Text>
              </View>
              <View style={[styles.languageTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.languageName, styles.urduFont]}>اردو</Text>
                <Text style={styles.languageDetail}>Urdu</Text>
              </View>
              <View style={[styles.radioButton, selectedLang === 'ur' && styles.radioButtonActive]}>
                {selectedLang === 'ur' && <View style={styles.radioButtonInner} />}
              </View>
            </View>
          </Pressable>
        </GlassCard>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.applyButton,
            pressed && styles.applyButtonPressed,
          ]}
          onPress={handleApply}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.applyButtonText}>{t('settings.confirmButton')}</Text>
        </Pressable>

        <Text style={styles.infoText}>{t('settings.appliedInstantly')}</Text>
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
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  languageItem: {
    paddingVertical: 18,
    paddingHorizontal: Spacing.m,
  },
  languageItemActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.04)',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langIconCircleActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderColor: 'rgba(0, 245, 255, 0.25)',
  },
  urduSymbolText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
  },
  urduSymbolTextActive: {
    color: '#00F5FF',
  },
  languageTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  languageDetail: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.38)',
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
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: '#00F5FF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: Spacing.m,
  },
  applyButton: {
    height: 54,
    borderRadius: BorderRadius.m,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...Shadows.glow,
  },
  applyButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  applyButtonText: {
    color: '#001014',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoText: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 20,
  },
});
