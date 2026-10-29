import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import ur from './locales/ur.json';

const LANGUAGE_KEY = 'user-language';

// Helper to reliably check if a language code or tag is Urdu
export const isUrduLanguage = (lang?: string | null): boolean => {
  if (!lang) return false;
  const normalized = lang.toLowerCase().trim();
  return normalized === 'ur' || normalized.startsWith('ur-') || normalized.startsWith('ur_');
};

// Hook to check if current language is Right-to-Left (Urdu)
export const useIsRTL = (): boolean => {
  const { i18n: instance } = useTranslation();
  return isUrduLanguage(instance.language);
};

// Helper to switch language smoothly without jarring app reloads
export const changeAppLanguage = async (lang: 'en' | 'ur') => {
  try {
    const targetLang = isUrduLanguage(lang) ? 'ur' : 'en';
    await AsyncStorage.setItem(LANGUAGE_KEY, targetLang);
    await i18n.changeLanguage(targetLang);

    const isRtl = targetLang === 'ur';
    I18nManager.allowRTL(isRtl);
    I18nManager.forceRTL(isRtl);
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

// Initialize i18n detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        const targetLang = isUrduLanguage(savedLanguage) ? 'ur' : 'en';
        const isRtl = targetLang === 'ur';
        I18nManager.allowRTL(isRtl);
        I18nManager.forceRTL(isRtl);
        return callback(targetLang);
      }

      // If no saved language, detect from system language
      const locales = Localization.getLocales();
      const code = locales[0]?.languageCode || locales[0]?.languageTag || 'en';
      const initialLang = isUrduLanguage(code) ? 'ur' : 'en';

      const isSystemRtl = initialLang === 'ur';
      I18nManager.allowRTL(isSystemRtl);
      I18nManager.forceRTL(isSystemRtl);

      callback(initialLang);
    } catch (error) {
      callback('en');
    }
  },
  init: () => { },
  cacheUserLanguage: () => { },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
