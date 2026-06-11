import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

import en from './locales/en.json';
import ur from './locales/ur.json';

const LANGUAGE_KEY = 'user-language';

// Custom language change helper that handles RTL switching & reloads app
export const changeAppLanguage = async (lang: 'en' | 'ur') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
    
    const isRTL = lang === 'ur';
    
    // Check if direction needs to change
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      
      // Reload app to apply RTL layout mirroring
      setTimeout(() => {
        Updates.reloadAsync();
      }, 150);
    }
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
        // Apply saved language RTL settings on launch if not matching
        const isRTL = savedLanguage === 'ur';
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
          // Wait briefly, then reload to apply mirroring
          Updates.reloadAsync();
        }
        return callback(savedLanguage);
      }
      
      // If no saved language, use system language
      const locales = Localization.getLocales();
      const locale = locales[0]?.languageCode || 'en';
      const initialLang = locale === 'ur' ? 'ur' : 'en';
      
      const isSystemRTL = initialLang === 'ur';
      if (I18nManager.isRTL !== isSystemRTL) {
        I18nManager.allowRTL(isSystemRTL);
        I18nManager.forceRTL(isSystemRTL);
        Updates.reloadAsync();
      }
      
      callback(initialLang);
    } catch (error) {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: () => {},
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
