import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COMBO_LABELS, LOW_MOVES_THRESHOLD } from '../constants';
import { useTheme } from '../hooks/useTheme';

export default function HUD({ mode = 'levels', level, score, movesLeft, combo, paused, onPause }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Reuses the same per-theme-adjusted colors as hsValue/titleAccent/movesOver
  // elsewhere - the plain brand orange/red/purple all fail AA against the light
  // game-screen background at this text size, same issue those had.
  const comboColors = ['#FFFFFF', theme.accentOrange, theme.dangerText, theme.accentPurpleText];
  const lowMoves = movesLeft <= LOW_MOVES_THRESHOLD;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label} maxFontSizeMultiplier={1.5}>{mode === 'free' ? 'MODE' : 'LEVEL'}</Text>
          <Text style={styles.value} maxFontSizeMultiplier={1.5}>{mode === 'free' ? 'FREE' : level}</Text>
        </View>

        <View style={styles.center}>
          {combo > 0 ? (
            <Text
              style={[styles.comboText, { color: comboColors[combo] }]}
              accessibilityLiveRegion="polite"
              accessibilityLabel={COMBO_LABELS[combo]}
              maxFontSizeMultiplier={1.5}
            >
              {COMBO_LABELS[combo]}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <TouchableOpacity
            onPress={onPause}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
            accessibilityHint={paused ? 'Resumes the game' : 'Pauses the game'}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.pauseIcon} allowFontScaling={false}>{paused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
          <View accessible={true} accessibilityLabel={`Score: ${score.toLocaleString()}`}>
            <Text accessible={false} style={[styles.label, styles.labelRight]} maxFontSizeMultiplier={1.5}>SCORE</Text>
            <Text accessible={false} style={styles.value} maxFontSizeMultiplier={1.5}>{score.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {mode !== 'free' && (
        <View style={styles.movesRow}>
          <Text
            style={[styles.movesText, lowMoves && styles.movesOver]}
            accessibilityLabel={`${movesLeft} moves left`}
            maxFontSizeMultiplier={1.5}
          >
            {movesLeft} moves left
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'BadUnicorn',
    color: theme.textSecondary,
    fontSize: 20,
    letterSpacing: 1.5,
  },
  value: {
    fontFamily: 'BadUnicorn',
    // Was a fixed #FFFFFF - failed WCAG AA (1.48:1) against the light-lavender
    // game screen background. hudValue flips to white for dark mode instead.
    color: theme.hudValue,
    fontSize: 24,
  },
  center: {
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  labelRight: {
    textAlign: 'right',
  },
  pauseIcon: {
    fontSize: 20,
    color: theme.textSecondary,
  },
  comboText: {
    fontFamily: 'BadUnicorn',
    fontSize: 13,
    letterSpacing: 1,
  },
  movesRow: {
    alignItems: 'center',
  },
  movesText: {
    fontFamily: 'BadUnicorn',
    color: theme.textSecondary,
    fontSize: 20,
  },
  movesOver: {
    // Underline is the non-color cue (WCAG 1.4.1) - red alone wasn't enough.
    // (Was a bolder fontWeight, but a single-weight custom display font can't
    // synthesize a bold variant reliably, so this cue no longer depends on weight.)
    // dangerText is a darkened red for light mode (plain #FF2D55 fails AA there);
    // dark mode uses the full-vibrant brand red instead.
    color: theme.dangerText,
    textDecorationLine: 'underline',
  },
  });
}
