import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LANGUAGES, getLanguage, setActiveLanguage } from '../i18n';
import { loadDisplayFont } from '../fonts';

const LANGUAGE_KEY = 'cf_language';
const isSupported = code => SUPPORTED_LANGUAGES.some(l => l.code === code);

// The player's language choice from Settings (null = follow the device),
// remembered across launches. `ready` stays false until the saved choice and
// its font are loaded, so the first screen never flashes in the wrong
// language or font. `active` is the language actually in use - App keys the
// screens on it, so a switch remounts them with fresh text and styles.
export function useLanguage() {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState(null);
  const [active, setActive] = useState(getLanguage());

  const apply = useCallback(async (code) => {
    setActiveLanguage(code);
    try {
      await loadDisplayFont();
    } catch {
      // Font failed to load: text still renders in the previous/system font.
    }
    setChoice(code);
    setActive(getLanguage());
  }, []);

  useEffect(() => {
    (async () => {
      let saved = null;
      try {
        saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      } catch {}
      await apply(isSupported(saved) ? saved : null);
      setReady(true);
    })();
  }, [apply]);

  const changeLanguage = useCallback(async (code) => {
    const next = isSupported(code) ? code : null;
    try {
      if (next) await AsyncStorage.setItem(LANGUAGE_KEY, next);
      else await AsyncStorage.removeItem(LANGUAGE_KEY);
    } catch {}
    await apply(next);
  }, [apply]);

  return { ready, active, choice, changeLanguage };
}
