import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { COMBO_CALLOUT_COLORS } from '../constants';
import { DISPLAY_FONT } from '../fonts';

const PARTICLES_PER_CELL = 5;
// Per cascade step - a huge clear thins out to fewer sparks per tile instead of
// spawning hundreds of animated views at once on low-end devices.
const MAX_PARTICLES = 48;
const PARTICLE_MS = 520;
const POPUP_MS = 900;

// One spark flying out from a popped tile. Angle/distance are fixed at mount
// (useRef) so re-renders of the parent don't re-roll them mid-flight.
function Particle({ x, y, color, size }) {
  const progress = useRef(new Animated.Value(0)).current;
  const motion = useRef({
    angle: Math.random() * Math.PI * 2,
    dist: size * (0.7 + Math.random() * 0.9),
    dot: 4 + Math.random() * 5,
  }).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: PARTICLE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const dx = Math.cos(motion.angle) * motion.dist;
  // Extra downward drift reads as the spark "falling" rather than just
  // stopping in mid-air.
  const dy = Math.sin(motion.angle) * motion.dist + size * 0.35;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: x - motion.dot / 2,
          top: y - motion.dot / 2,
          width: motion.dot,
          height: motion.dot,
          borderRadius: motion.dot / 2,
          backgroundColor: color,
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
            { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.3, 0.2] }) },
            { rotate: '45deg' },
          ],
        },
      ]}
    />
  );
}

// "+540" that floats up from where a match cleared. Higher cascade steps are
// bigger and use the same tier colors as the center callouts.
function ScorePopup({ x, y, value, cascadeIndex, reduceMotion }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: POPUP_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const fontSize = 22 + Math.min(cascadeIndex, 4) * 5;
  const color = COMBO_CALLOUT_COLORS[Math.min(cascadeIndex + 1, COMBO_CALLOUT_COLORS.length - 1)];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.popupWrap,
        {
          left: x - 80,
          top: y - fontSize,
          opacity: progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -fontSize * 2.2] }) },
            { scale: reduceMotion ? 1 : progress.interpolate({ inputRange: [0, 0.2, 0.35, 1], outputRange: [0.5, 1.35, 1, 1] }) },
          ],
        },
      ]}
    >
      <Text
        style={[styles.popupText, { fontFamily: DISPLAY_FONT, fontSize, color }]}
        allowFontScaling={false}
        accessible={false}
      >
        +{value.toLocaleString()}
      </Text>
    </Animated.View>
  );
}

// One cascade step's worth of effects: sparks from every cleared tile plus a
// score popup at the centroid. `cells` are { x, y, color } tile centers in
// board pixel space.
export default function MatchBurst({ cells, value, cascadeIndex, tileSize, reduceMotion }) {
  const cx = cells.reduce((sum, c) => sum + c.x, 0) / cells.length;
  const cy = cells.reduce((sum, c) => sum + c.y, 0) / cells.length;
  const perCell = Math.max(2, Math.min(PARTICLES_PER_CELL, Math.floor(MAX_PARTICLES / cells.length)));

  return (
    <>
      {!reduceMotion && cells.flatMap((c, i) =>
        Array.from({ length: perCell }, (_, j) => (
          <Particle key={`${i}-${j}`} x={c.x} y={c.y} color={c.color} size={tileSize} />
        ))
      )}
      <ScorePopup x={cx} y={cy} value={value} cascadeIndex={cascadeIndex} reduceMotion={reduceMotion} />
    </>
  );
}

export const MATCH_FX_LIFETIME_MS = Math.max(PARTICLE_MS, POPUP_MS) + 50;

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
  popupWrap: {
    position: 'absolute',
    width: 160,
    alignItems: 'center',
    zIndex: 20,
  },
  // fontFamily is applied inline at render, so it follows a language switch.
  popupText: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
