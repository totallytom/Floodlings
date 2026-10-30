import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { FREE_MODE_SECONDS, FREE_MODE_URGENT_THRESHOLD } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';
import { modePalette, FREE_EMBER } from '../modeThemes';
import { t } from '../i18n';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Free Mode's "time attack" panel: a digital clock pill plus a burning-fuse
// bar. One row, so it's shorter than the old stacked clock + bar - the board
// is height-bound on phones, so that's room handed back to the tiles.
export default function FreeModeTimer({ freeTimeLeft }) {
  const theme = useTheme();
  const palette = modePalette('free', theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const tick = useRef(new Animated.Value(1)).current;
  const urgentPulse = useRef(new Animated.Value(0)).current;

  const isUrgent = freeTimeLeft <= FREE_MODE_URGENT_THRESHOLD;
  const fraction = Math.max(0, freeTimeLeft / FREE_MODE_SECONDS);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction,
      duration: 350,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [fraction]);

  // In the final stretch the clock thumps on every second.
  useEffect(() => {
    if (!isUrgent || reduceMotion || freeTimeLeft === 0) return;
    tick.setValue(1.25);
    Animated.spring(tick, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
  }, [freeTimeLeft]);

  useEffect(() => {
    if (!isUrgent || reduceMotion) {
      // Reduce Motion: hold the red outline solid instead of pulsing it.
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

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const fuseColor = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 1],
    outputRange: ['#FF2D55', '#FF2D55', FREE_EMBER, '#FFD60A'],
  });

  return (
    <View style={styles.panel}>
      <Animated.View pointerEvents="none" style={[styles.urgentRing, { opacity: urgentPulse }]} />
      <View style={[styles.clock, isUrgent && styles.clockUrgent]}>
        <Text style={styles.clockIcon} allowFontScaling={false}>⏱️</Text>
        <Animated.Text
          accessible={false}
          style={[styles.clockText, isUrgent && styles.clockTextUrgent, { transform: [{ scale: tick }] }]}
          maxFontSizeMultiplier={1.3}
        >
          {formatTime(freeTimeLeft)}
        </Animated.Text>
      </View>
      <View style={styles.body}>
        <Text accessible={false} style={styles.label} maxFontSizeMultiplier={1.3}>
          {isUrgent ? t('free.hurry') : `⚡ ${t('free.badge')}`}
        </Text>
        <View
          style={styles.track}
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityLabel={t('free.secondsA11y', { n: freeTimeLeft })}
          accessibilityValue={{ min: 0, max: FREE_MODE_SECONDS, now: freeTimeLeft }}
        >
          <Animated.View style={[styles.fill, { width, backgroundColor: fuseColor }]}>
            <View style={styles.fillShine} />
          </Animated.View>
          {/* Spark burning down the end of the fuse. */}
          <Animated.Text accessible={false} allowFontScaling={false} style={[styles.spark, { left: width }]}>
            🔥
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
      paddingHorizontal: 8,
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
    clock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#000000',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: FREE_EMBER,
      paddingHorizontal: 10,
      paddingVertical: 2,
      minWidth: 104,
    },
    clockUrgent: {
      borderColor: '#FF2D55',
    },
    clockIcon: {
      fontSize: 16,
    },
    clockText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 28,
      lineHeight: lineHeightFor(28),
      color: '#FFD60A',
      letterSpacing: 2,
      textShadowColor: 'rgba(255, 159, 10, 0.8)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    },
    clockTextUrgent: {
      color: '#FF4D6D',
      textShadowColor: 'rgba(255, 45, 85, 0.9)',
    },
    body: {
      flex: 1,
      gap: 5,
    },
    // Panel fills are dark in both modes, so light text is fixed here.
    label: {
      fontFamily: DISPLAY_FONT,
      fontSize: 12,
      lineHeight: lineHeightFor(12),
      color: '#FFD3A8',
      letterSpacing: 2,
    },
    track: {
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
    spark: {
      position: 'absolute',
      marginLeft: -9,
      fontSize: 16,
    },
  });
}
