import * as Font from 'expo-font';
import { getLanguage } from './i18n';

// Every display-text style uses DISPLAY_FONT; which font backs it depends on
// the active language, so Japanese/Korean get a hand-drawn face with their own
// script instead of falling back to the system font. All three are Google
// Fonts under the SIL Open Font License (free for commercial use):
// - Patrick Hand: Latin incl. the accents German/Spanish/Portuguese need
// - Yomogi: Japanese + Latin
// - Gaegu Bold: Korean + basic Latin (a few symbols like × and · fall back to
//   the system font per glyph, which iOS/Android do automatically)
const FONTS = {
  latin: { family: 'Display', source: require('@expo-google-fonts/patrick-hand/400Regular/PatrickHand_400Regular.ttf') },
  ja: { family: 'Display-ja', source: require('@expo-google-fonts/yomogi/400Regular/Yomogi_400Regular.ttf') },
  ko: { family: 'Display-ko', source: require('@expo-google-fonts/gaegu/700Bold/Gaegu_700Bold.ttf') },
};
const fontFor = lang => FONTS[lang] ?? FONTS.latin;

// A live binding: switching language reassigns it, and styles pick up the new
// value when they're next created (the screens remount on a language switch).
export let DISPLAY_FONT = fontFor(getLanguage()).family;

// Loads the active language's font (only that one - the CJK files are several
// MB each) and points DISPLAY_FONT at it. Already-loaded fonts resolve at once.
export async function loadDisplayFont() {
  const { family, source } = fontFor(getLanguage());
  await Font.loadAsync({ [family]: source });
  DISPLAY_FONT = family;
}

// The fonts' built-in line boxes are much taller than their letters (Patrick
// Hand reserves 1.35em; its tallest-to-lowest ink, Ó to q, is only 1.19em),
// which made every label ~35% taller than with the old font and pushed the
// home screen past one screen. Each ratio is the smallest that still clears
// the ink of every character the app shows in that language. RN scales
// lineHeight along with Dynamic Type, so this doesn't clip at larger sizes.
const LINE_RATIO = { ja: 1.1, ko: 1.1 };
export const lineHeightFor = fontSize => Math.round(fontSize * (LINE_RATIO[getLanguage()] ?? 1.2));
