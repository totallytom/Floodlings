import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Brand accent colors stay fixed across both themes - only neutral surfaces/text
// flip. Reuses colors already established elsewhere in the app (the dark tokens
// below are the same ones GameOverScreen/modals already used; the light tokens
// are the same ones Home/Game screens already used, including the WCAG-AA-fixed
// variants of orange/purple text from the contrast pass).
const BRAND = {
  purple: '#BF5AF2',
  pink: '#FF2D55',
  yellow: '#FFD60A',
  green: '#30D158',
};

const LIGHT = {
  mode: 'light',
  ...BRAND,
  background: '#d4c69f',
  card: '#76768a',
  cardAlt: '#a2a2b6',
  border: '#1E1E35',
  textPrimary: '#000000',
  textSecondary: '#444455',
  textMuted: '#555566',
  textOnCard: '#FFFFFF',
  hudValue: '#1E1E35',
  accentOrange: '#7A4200',
  accentPurpleText: '#7A1FA8',
  // Darkened red for text-on-light (a plain #FF2D55 fails AA against light
  // backgrounds); dark mode can use the full-vibrant brand red instead.
  dangerText: '#B0102E',
  // Subtle recessed-panel overlays (badges etc.) - darken on light backgrounds,
  // lighten on dark ones, so the panel stays visibly distinct either way.
  overlaySubtle: 'rgba(0, 0, 0, 0.08)',
  overlayMedium: 'rgba(0, 0, 0, 0.12)',
};

const DARK = {
  mode: 'dark',
  ...BRAND,
  background: '#1B0E33',
  card: '#1C1C2E',
  cardAlt: '#111120',
  border: '#2A2A3E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9AB0',
  textMuted: '#8A8AA0',
  textOnCard: '#FFFFFF',
  hudValue: '#FFFFFF',
  accentOrange: '#FF9F0A',
  accentPurpleText: '#BF5AF2',
  dangerText: '#FF2D55',
  overlaySubtle: 'rgba(255, 255, 255, 0.10)',
  overlayMedium: 'rgba(255, 255, 255, 0.14)',
};

const THEME_MODE_KEY = 'cf_theme_mode';

const ThemeModeContext = createContext(null);

// Manual light/dark choice from Settings overrides the OS scheme once set, and is
// remembered across launches; before that override exists (first launch, or before
// AsyncStorage resolves) the OS scheme decides.
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then(val => {
      if (val === 'light' || val === 'dark') setOverride(val);
    });
  }, []);

  const mode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = useCallback(() => {
    setOverride(current => {
      const currentMode = current ?? (systemScheme === 'dark' ? 'dark' : 'light');
      const next = currentMode === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_MODE_KEY, next);
      return next;
    });
  }, [systemScheme]);

  const value = useMemo(() => ({
    theme: mode === 'dark' ? DARK : LIGHT,
    mode,
    toggleTheme,
  }), [mode, toggleTheme]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeModeContext);
  return ctx ? ctx.theme : LIGHT;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  return ctx ? { mode: ctx.mode, toggleTheme: ctx.toggleTheme } : { mode: 'light', toggleTheme: () => {} };
}
