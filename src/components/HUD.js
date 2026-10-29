import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { COMBO_LABELS, LOW_MOVES_THRESHOLD } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { useReduceMotion } from '../hooks/useReduceMotion';

const COUNT_UP_MS = 450;

// Ticks the displayed number up to `value` instead of jumping, with a small
// scale bump each time it grows.
function CountUpScore({ value, style }) {
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const bump = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const from = shownRef.current;
    // Drops (new game/level) and Reduce Motion snap straight to the value.
    if (value <= from || reduceMotion) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    Animated.sequence([
      Animated.timing(bump, { toValue: 1.25, duration: 110, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    const start = Date.now();
    let frame;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      shownRef.current = Math.round(from + (value - from) * eased);
      setShown(shownRef.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return (
    <Animated.Text
      accessible={false}
      style={[style, { transform: [{ scale: bump }] }]}
      maxFontSizeMultiplier={1.5}
    >
      {shown.toLocaleString()}
    </Animated.Text>
  );
}

// Fire badge for a running streak (2+ great moves in a row). Pops in on every
// increase and, from 4 up, keeps a gentle pulsing glow going.
function StreakBadge({ streak, styles }) {
  const reduceMotion = useReduceMotion();
  const pop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const visible = streak >= 2;

  useEffect(() => {
    if (!visible) {
      Animated.timing(pop, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0.4);
    Animated.spring(pop, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  }, [streak, visible, reduceMotion]);

  const hot = streak >= 4;
  useEffect(() => {
    if (!hot || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hot, reduceMotion]);

  return (
    <Animated.View
      style={[styles.streakBadge, hot && styles.streakBadgeHot, { opacity: pop, transform: [{ scale: pop }] }]}
      accessible={visible}
      accessibilityLiveRegion="polite"
      accessibilityLabel={visible ? `Streak ${streak}` : undefined}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.streakGlow, { opacity: pulse }]}
      />
      <Text style={styles.streakFire} allowFontScaling={false}>🔥</Text>
      <View>
        <Text style={styles.streakText} maxFontSizeMultiplier={1.3}>STREAK ×{Math.max(streak, 2)}</Text>
        <Text style={styles.streakBonus} maxFontSizeMultiplier={1.3}>{hot ? 'ON FIRE!' : 'HEATING UP'}</Text>
      </View>
    </Animated.View>
  );
}

export default function HUD({ mode = 'levels', level, score, movesLeft, combo, streak = 0, paused, onPause }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const lowMoves = movesLeft <= LOW_MOVES_THRESHOLD;
  // Levels and Rescue are both move-limited, numbered progressions; Free and Zen
  // are both un-numbered sessions (timed vs untimed) - same split the moves row
  // below uses.
  const isLevelBased = mode === 'levels' || mode === 'rescue';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label} maxFontSizeMultiplier={1.5}>{isLevelBased ? 'LEVEL' : 'MODE'}</Text>
          <Text style={styles.value} maxFontSizeMultiplier={1.5}>{isLevelBased ? level : (mode === 'zen' ? 'ZEN' : 'FREE')}</Text>
        </View>

        {/* The big per-cascade callouts over the board replaced the small combo
            label that used to sit here; this hidden text keeps Android's
            live-region announcement of the combo tier (iOS gets it from useGame). */}
        <View style={styles.center}>
          <StreakBadge streak={streak} styles={styles} />
          {combo > 0 ? (
            <Text
              style={styles.srOnly}
              accessibilityLiveRegion="polite"
              accessibilityLabel={COMBO_LABELS[combo]}
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
            <CountUpScore value={score} style={styles.value} />
          </View>
        </View>
      </View>

      {isLevelBased && (
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
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: '#3A1300',
    borderWidth: 2,
    borderColor: '#FF9F0A',
    shadowColor: '#FF9F0A',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  streakBadgeHot: {
    borderColor: '#FF2D55',
    shadowColor: '#FF2D55',
  },
  streakGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 45, 85, 0.45)',
  },
  streakFire: {
    fontSize: 20,
  },
  // Always on the badge's own dark fill, so fixed light colors are fine in
  // both themes.
  streakText: {
    fontFamily: 'BadUnicorn',
    fontSize: 15,
    color: '#FFD60A',
    letterSpacing: 1,
  },
  streakBonus: {
    fontFamily: 'BadUnicorn',
    fontSize: 11,
    color: '#FFFFFF',
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
