import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet } from 'react-native';
import { LOW_MOVES_THRESHOLD } from '../constants';
import { iconForType, colorForType } from '../animals';
import { t } from '../i18n';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';
import { rescuePalette, RESCUE_GOLD, RESCUE_VINE } from '../modeThemes';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

const PORTRAIT = 42;

// Species Rescue's "mission panel": the target animal's portrait, a count of
// how many have been rescued, and a vine-style progress bar. Kept to roughly
// the same height as the plain ObjectiveBar - the board is height-bound on
// phones, so a taller panel here would shrink every tile.
export default function RescueObjectiveBar({ rescueCount, targetCount, targetType, movesLeft }) {
  const theme = useTheme();
  const palette = rescuePalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const urgentPulse = useRef(new Animated.Value(0)).current;
  const portraitBounce = useRef(new Animated.Value(1)).current;
  const gainAnim = useRef(new Animated.Value(0)).current;
  const [gain, setGain] = useState(0);
  const prevCountRef = useRef(rescueCount);

  const isUrgent = movesLeft <= LOW_MOVES_THRESHOLD;
  const fraction = Math.min(1, rescueCount / targetCount);
  const complete = rescueCount >= targetCount;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction,
      duration: reduceMotion ? 1 : 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fraction, reduceMotion]);

  // Each rescue: the portrait hops and a "+N" floats off it. A drop in count
  // means a new level started, which just resets silently.
  useEffect(() => {
    const delta = rescueCount - prevCountRef.current;
    prevCountRef.current = rescueCount;
    if (delta <= 0) return;
    setGain(delta);
    if (reduceMotion) return;
    portraitBounce.setValue(1.35);
    Animated.spring(portraitBounce, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
    gainAnim.setValue(0);
    Animated.timing(gainAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [rescueCount]);

  useEffect(() => {
    if (!isUrgent || reduceMotion) {
      // Reduce Motion: hold the red border solid instead of pulsing it.
      urgentPulse.setValue(isUrgent ? 1 : 0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(urgentPulse, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(urgentPulse, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isUrgent, reduceMotion]);

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.panel}>
      <Animated.View pointerEvents="none" style={[styles.urgentRing, { opacity: urgentPulse }]} />

      <View>
        <Animated.View
          style={[
            styles.portrait,
            { borderColor: complete ? RESCUE_GOLD : colorForType(targetType), transform: [{ scale: portraitBounce }] },
          ]}
        >
          <Image source={iconForType(targetType)} style={styles.portraitIcon} />
        </Animated.View>
        {!reduceMotion && gain > 0 && (
          <Animated.Text
            pointerEvents="none"
            accessible={false}
            allowFontScaling={false}
            style={[
              styles.gain,
              {
                opacity: gainAnim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateY: gainAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
              },
            ]}
          >
            +{gain}
          </Animated.Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text accessible={false} style={styles.missionLabel} maxFontSizeMultiplier={1.3}>
            {complete ? t('rescue.complete') : t('rescue.mission')}
          </Text>
          <Text accessible={false} style={styles.count} maxFontSizeMultiplier={1.3}>
            <Text style={styles.countNow}>{Math.min(rescueCount, targetCount)}</Text> / {targetCount} {t('rescue.countSuffix', { type: targetType })}
          </Text>
        </View>
        <View
          style={styles.track}
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityLabel={t('rescue.progressA11y', { count: rescueCount, target: targetCount, type: targetType })}
          accessibilityValue={{ min: 0, max: targetCount, now: Math.min(rescueCount, targetCount) }}
        >
          <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: complete ? RESCUE_GOLD : RESCUE_VINE }]}>
            <View style={styles.fillShine} />
          </Animated.View>
          {/* Leaf "knob" riding the end of the vine. */}
          <Animated.Text
            accessible={false}
            allowFontScaling={false}
            style={[styles.leaf, { left: fillWidth }]}
          >
            {complete ? '⭐' : '🍃'}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(palette) {
  return StyleSheet.create({
    panel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginTop: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: palette.panel,
      borderWidth: 1,
      borderColor: palette.panelBorder,
      borderBottomWidth: 3,
    },
    urgentRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#FF2D55',
    },
    portrait: {
      width: PORTRAIT,
      height: PORTRAIT,
      borderRadius: PORTRAIT / 2,
      borderWidth: 3,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    portraitIcon: {
      width: PORTRAIT * 0.72,
      height: PORTRAIT * 0.72,
      resizeMode: 'contain',
    },
    gain: {
      position: 'absolute',
      top: -6,
      right: -14,
      fontFamily: DISPLAY_FONT,
      fontSize: 18,
      lineHeight: lineHeightFor(18),
      color: RESCUE_GOLD,
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    body: {
      flex: 1,
      gap: 5,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    // Panel fills are dark green in both modes, so light text is fixed here.
    missionLabel: {
      fontFamily: DISPLAY_FONT,
      fontSize: 12,
      lineHeight: lineHeightFor(12),
      color: '#BFE5C9',
      letterSpacing: 2,
    },
    count: {
      fontFamily: DISPLAY_FONT,
      fontSize: 14,
      lineHeight: lineHeightFor(14),
      color: '#FFFFFF',
    },
    countNow: {
      fontSize: 18,
      color: RESCUE_GOLD,
    },
    track: {
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
    },
    fill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: 6,
      overflow: 'hidden',
    },
    fillShine: {
      height: '45%',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    leaf: {
      position: 'absolute',
      marginLeft: -9,
      fontSize: 16,
    },
  });
}
