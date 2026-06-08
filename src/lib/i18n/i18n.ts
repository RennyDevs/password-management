import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

// Detect language from navigator
function detectLanguage(): string {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language;
    if (lang && lang.startsWith('es')) {
      return 'es';
    }
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already handles escaping
  },
});

export default i18n;
