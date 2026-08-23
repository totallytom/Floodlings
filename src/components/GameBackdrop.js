import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GLYPHS = ['🐾', '🍃', '🌿', '🌺', '🦋', '🍀', '🌴', '🦜'];
const CELL = 68;

const COLS = Math.ceil(SCREEN_W / CELL) + 1;
const ROWS = Math.ceil(SCREEN_H / CELL) + 1;

// A colorful, static wallpaper of zoo/jungle glyphs behind the game screen -
// staggered rows (brick-pattern offset), a wide glyph palette (not just 2
// alternating), and per-cell rotation/size/opacity variance so it reads as
// scattered confetti rather than an obvious repeating grid. Purely decorative
// texture, not motion, so it isn't gated behind useReduceMotion the way the
// animated backdrops are.
const PATTERN = Array.from({ length: ROWS * COLS }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const rowOffset = (row % 2) * (CELL / 2);
  const glyphIndex = (row * 31 + col * 17) % GLYPHS.length;
  const sizeJitter = (row * 13 + col * 29) % 10;
  const opacityJitter = (row * 19 + col * 23) % 10;
  return {
    key: i,
    glyph: GLYPHS[glyphIndex],
    top: row * CELL,
    left: col * CELL - CELL / 2 + rowOffset,
    rotate: ((row * 37 + col * 53) % 40) - 20,
    fontSize: 26 + sizeJitter,
    opacity: 0.14 + opacityJitter * 0.012,
  };
});

export default function GameBackdrop() {
  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {PATTERN.map(p => (
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
