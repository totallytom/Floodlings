import en from './locales/en';
import ja from './locales/ja';
import de from './locales/de';
import ko from './locales/ko';
import es from './locales/es';
import pt from './locales/pt';

const LOCALES = { en, ja, de, ko, es, pt };

// Shown in the Settings language picker. Each name is written in its own
// language, so players can find theirs whatever the app is currently set to.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
];

// The device language, used when the player hasn't picked one in Settings.
// expo-localization is the reliable source; Intl is the fallback for a dev
// build made before that native module was added.
export function deviceLanguage() {
  try {
    const { getLocales } = require('expo-localization');
    for (const locale of getLocales()) {
      if (LOCALES[locale.languageCode]) return locale.languageCode;
    }
    return 'en';
  } catch {
    try {
      const code = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
      return LOCALES[code] ? code : 'en';
    } catch {
      return 'en';
    }
  }
}

let language = deviceLanguage();

export function getLanguage() {
  return language;
}

// `code` is a supported language, or null to follow the device. Only the
// language provider in App calls this - it also loads the matching font and
// re-renders the screens so the change shows everywhere at once.
export function setActiveLanguage(code) {
  language = LOCALES[code] ? code : deviceLanguage();
}

// Looks up `key` in the active language (falling back to English). A string
// value has its {name} placeholders filled from `params`; a function value is
// called with `params` - used where grammar depends on the values (plurals,
// articles, particles), which each language handles its own way. Call it at
// render time, never at module level, so a language switch takes effect.
export function t(key, params = {}) {
  const value = LOCALES[language].strings[key] ?? en.strings[key];
  if (value === undefined) return key;
  if (typeof value === 'function') return value(params);
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
