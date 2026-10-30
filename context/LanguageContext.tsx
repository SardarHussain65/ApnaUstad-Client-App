import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import i18n from '../i18n';

export const LANGUAGE_STORAGE_KEY = 'user-language';

export const isUrduLanguage = (lang?: string | null): boolean => {
  if (!lang) return false;
  const normalized = lang.toLowerCase().trim();
  return normalized === 'ur' || normalized.startsWith('ur-') || normalized.startsWith('ur_');
};

interface LanguageContextType {
  language: 'en' | 'ur';
  isRTL: boolean;
  setLanguage: (lang: 'en' | 'ur') => Promise<void>;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isRTL: false,
  setLanguage: async () => {},
  isReady: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<'en' | 'ur'>('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        let activeLang: 'en' | 'ur' = 'en';
        if (saved) {
          activeLang = isUrduLanguage(saved) ? 'ur' : 'en';
        } else {
          const locales = Localization.getLocales();
          const code = locales[0]?.languageCode || locales[0]?.languageTag || 'en';
          activeLang = isUrduLanguage(code) ? 'ur' : 'en';
        }

        await i18n.changeLanguage(activeLang);
        const rtl = activeLang === 'ur';
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);

        if (isMounted) {
          setLanguageState(activeLang);
          setIsReady(true);
        }
      } catch (err) {
        console.warn('Failed to load saved language:', err);
        if (isMounted) setIsReady(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (newLang: 'en' | 'ur') => {
    try {
      const activeLang = isUrduLanguage(newLang) ? 'ur' : 'en';
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, activeLang);
      await i18n.changeLanguage(activeLang);
      const rtl = activeLang === 'ur';
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      setLanguageState(activeLang);
    } catch (err) {
      console.error('Failed to set language:', err);
    }
  }, []);

  const isRTL = useMemo(() => language === 'ur', [language]);

  const value = useMemo(() => ({
    language,
    isRTL,
    setLanguage,
    isReady,
  }), [language, isRTL, setLanguage, isReady]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useIsRTL() {
  return useContext(LanguageContext).isRTL;
}

