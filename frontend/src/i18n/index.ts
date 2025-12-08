import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import jaTranslation from './locales/ja.json';
import enTranslation from './locales/en.json';

const LANGUAGE_KEY = 'app-language';

// Get saved language or default to Japanese
function getInitialLanguage(): string {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved && ['ja', 'en'].includes(saved)) {
    return saved;
  }
  return 'ja';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ja: {
        translation: jaTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_KEY, lng);
});

export default i18n;
