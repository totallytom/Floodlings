import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// One wallpaper per mode (picked via MODE_BACKDROPS in modeThemes) so each
// reads as a different place at a glance: Levels' zoo, Rescue's dense jungle,
// Zen's sparse, faint garden, Free's busy arcade.
const VARIANTS = {
  zoo: { glyphs: ['🐾', '🍃', '🌿', '🌺', '🦋', '🍀', '🌴', '🦜'], cell: 68, baseOpacity: 0.14 },
  jungle: { glyphs: ['🌿', '🍃', '🌴', '🌱', '🍂', '🌾', '🐾', '🍃'], cell: 56, baseOpacity: 0.18 },
  garden: { glyphs: ['🌸', '🍃', '✨', '🌙', '💧', '🌸', '🐚', '☁️'], cell: 88, baseOpacity: 0.1 },
  arcade: { glyphs: ['⚡', '⏱️', '🔥', '⭐', '💥', '⚡', '🏁', '💫'], cell: 60, baseOpacity: 0.16 },
};

// A colorful, static wallpaper of glyphs behind the game screen - staggered
// rows (brick-pattern offset), a wide glyph palette (not just 2 alternating),
// and per-cell rotation/size/opacity variance so it reads as scattered confetti
// rather than an obvious repeating grid. Purely decorative texture, not motion,
// so it isn't gated behind useReduceMotion the way the animated backdrops are.
function buildPattern({ glyphs, cell, baseOpacity }) {
  const cols = Math.ceil(SCREEN_W / cell) + 1;
  const rows = Math.ceil(SCREEN_H / cell) + 1;
  return Array.from({ length: rows * cols }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowOffset = (row % 2) * (cell / 2);
    const glyphIndex = (row * 31 + col * 17) % glyphs.length;
    const sizeJitter = (row * 13 + col * 29) % 10;
    const opacityJitter = (row * 19 + col * 23) % 10;
    return {
      key: i,
      glyph: glyphs[glyphIndex],
      top: row * cell,
      left: col * cell - cell / 2 + rowOffset,
      rotate: ((row * 37 + col * 53) % 40) - 20,
      fontSize: 26 + sizeJitter,
      opacity: baseOpacity + opacityJitter * 0.012,
    };
  });
}

const PATTERNS = Object.fromEntries(
  Object.entries(VARIANTS).map(([name, variant]) => [name, buildPattern(variant)])
);

export default function GameBackdrop({ variant = 'zoo' }) {
  const pattern = PATTERNS[variant] ?? PATTERNS.zoo;
  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {pattern.map(p => (
        <Text
          key={p.key}
          allowFontScaling={false}
          style={[
            styles.glyph,
            { top: p.top, left: p.left, fontSize: p.fontSize, opacity: p.opacity, transform: [{ rotate: `${p.rotate}deg` }] },
          ]}
        >
          {p.glyph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  glyph: {
    position: 'absolute',
  },
});
