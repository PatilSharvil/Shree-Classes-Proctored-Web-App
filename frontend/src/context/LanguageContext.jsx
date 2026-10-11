import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  // Primary default language is Marathi ('mr')
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('app_language');
    return saved === 'en' || saved === 'mr' ? saved : 'mr';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang) => {
    if (lang === 'mr' || lang === 'en') {
      setLanguageState(lang);
    }
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'mr' ? 'en' : 'mr'));
  };

  /**
   * Helper function to translate keys, e.g. t('landing.heroTag')
   */
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const parts = path.split('.');

    let current = translations[language];
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (current !== undefined && typeof current === 'string') {
      return current;
    }

    // Fallback to English if not found in current language
    let fallbackVal = translations.en;
    for (const part of parts) {
      if (fallbackVal && typeof fallbackVal === 'object' && part in fallbackVal) {
        fallbackVal = fallbackVal[part];
      } else {
        fallbackVal = undefined;
        break;
      }
    }

    if (fallbackVal !== undefined && typeof fallbackVal === 'string') {
      return fallbackVal;
    }

    return fallback || path;
  };

  const value = {
    language,
    isMarathi: language === 'mr',
    setLanguage,
    toggleLanguage,
    t,
    currentTranslations: translations[language] || translations.mr,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
