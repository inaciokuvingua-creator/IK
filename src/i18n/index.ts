import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Inline resources — loaded eagerly (no network latency, caches with bundle)
import pt from './locales/pt.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'pt', name: 'Português',  nativeName: 'Português',  flag: '🇦🇴', dir: 'ltr' },
  { code: 'en', name: 'English',    nativeName: 'English',    flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', name: 'Français',   nativeName: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', name: 'Español',    nativeName: 'Español',    flag: '🇪🇸', dir: 'ltr' },
  { code: 'zh', name: '中文',        nativeName: '简体中文',    flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: '日本語',      nativeName: '日本語',      flag: '🇯🇵', dir: 'ltr' },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map(l => l.code);
const FALLBACK = 'pt';

function detectBestLang(): LangCode {
  const saved = localStorage.getItem('ik_lang');
  if (saved && SUPPORTED_CODES.includes(saved as LangCode)) return saved as LangCode;

  const browserLangs = navigator.languages ?? [navigator.language];
  for (const bl of browserLangs) {
    const code = bl.split('-')[0].toLowerCase();
    if (SUPPORTED_CODES.includes(code as LangCode)) return code as LangCode;
  }
  return FALLBACK;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      zh: { translation: zh },
      ja: { translation: ja },
    },
    lng: detectBestLang(),
    fallbackLng: FALLBACK,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export function changeLang(code: LangCode) {
  i18n.changeLanguage(code);
  localStorage.setItem('ik_lang', code);
  // Update <html lang> for accessibility + SEO
  document.documentElement.lang = code;
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  if (lang) document.documentElement.dir = lang.dir;
}

// Set initial html lang
document.documentElement.lang = i18n.language;

export default i18n;
