// Per-mode look for the game screen, layered over the app theme so each mode
// feels like its own place: Levels keeps the default purple zoo, Species Rescue
// is a green jungle, Zen a calm misty-blue garden, Free a fiery orange time
// attack. Split light/dark the same way useTheme is - the HUD keeps using theme
// text colors, so each background here is checked against that mode's
// hudValue/textSecondary. Panels are dark in both modes and carry fixed light
// text.
const PALETTES = {
  rescue: {
    light: { background: '#BCD8A6', frame: '#86B06B', frameBorder: '#3F5E2C', panel: '#2F5A3D', panelBorder: '#1D3A27' },
    dark: { background: '#0D2A1F', frame: '#16402F', frameBorder: '#2E6B4A', panel: '#143A2B', panelBorder: '#2E6B4A' },
  },
  zen: {
    light: { background: '#CFE3EA', frame: '#A9CBD6', frameBorder: '#4F7F8F', panel: '#2E5866', panelBorder: '#1F3F4A' },
    dark: { background: '#0F1E2E', frame: '#16304A', frameBorder: '#3D6E8F', panel: '#16304A', panelBorder: '#3D6E8F' },
  },
  free: {
    light: { background: '#FFD6A5', frame: '#F4A261', frameBorder: '#9C4A12', panel: '#3A1A08', panelBorder: '#1F0D03' },
    dark: { background: '#24120A', frame: '#3A1E0E', frameBorder: '#C2410C', panel: '#3A1E0E', panelBorder: '#C2410C' },
  },
};

// Backdrop variant (see GameBackdrop) per mode.
export const MODE_BACKDROPS = { levels: 'zoo', rescue: 'jungle', zen: 'garden', free: 'arcade' };

// Shared accents - always used on the dark panel/card fills, so fixed values
// work in both modes.
export const RESCUE_GOLD = '#FFD60A';
export const RESCUE_VINE = '#30D158';
export const ZEN_MIST = '#9FD8E8';
export const FREE_EMBER = '#FF9F0A';

// null for Levels, which keeps the default theme surfaces.
export function modePalette(mode, theme) {
  const p = PALETTES[mode];
  if (!p) return null;
  return theme.mode === 'dark' ? p.dark : p.light;
}

export function rescuePalette(theme) {
  return modePalette('rescue', theme);
}
