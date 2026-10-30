import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { ZEN_BLOOM_POINTS } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';
import { modePalette, ZEN_MIST } from '../modeThemes';
import { t } from '../i18n';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

// Zen Mode's panel: a slim meter that fills with points and "blooms" a flower
// each time it completes. Derived purely from score, so there's no extra game
// state. Deliberately the slimmest of the mode panels - Zen used to have no
// panel at all, and every pixel here comes out of the (height-bound) board.
export default function ZenBloomBar({ score }) {
  const theme = useTheme();
  const palette = modePalette('zen', theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reduceMotion = useReduceMotion();
  const blooms = Math.floor(score / ZEN_BLOOM_POINTS);
  const fraction = (score % ZEN_BLOOM_POINTS) / ZEN_BLOOM_POINTS;
  const progress = useRef(new Animated.Value(fraction)).current;
  const bloomPop = useRef(new Animated.Value(1)).current;
  const prevBloomsRef = useRef(blooms);

  useEffect(() => {
    const bloomed = blooms > prevBloomsRef.current;
    prevBloomsRef.current = blooms;
    if (reduceMotion) {
      progress.setValue(fraction);
      return;
    }
    if (bloomed) {
      // Fill to the end, then start over from empty - instead of visibly
      // draining backwards to the new, smaller remainder.
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(progress, { toValue: fraction, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start();
      bloomPop.setValue(0.3);
      Animated.spring(bloomPop, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: fraction, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }
  }, [score, reduceMotion]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      style={styles.panel}
      accessible
      accessibilityLabel={t('zen.bloomA11y', { blooms, percent: Math.round(fraction * 100) })}
    >
      <Animated.View style={[styles.bloomCount, { transform: [{ scale: bloomPop }] }]}>
        <Text style={styles.bloomIcon} allowFontScaling={false}>🌸</Text>
        <Text style={styles.bloomText} maxFontSizeMultiplier={1.3}>×{blooms}</Text>
      </Animated.View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>
      <Text style={styles.label} maxFontSizeMultiplier={1.3}>{t('zen.nextBloom')}</Text>
    </View>
  );
}

function createStyles(palette) {
  return StyleSheet.create({
    panel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginTop: 4,
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: palette.panel,
      borderWidth: 1,
      borderColor: palette.panelBorder,
    },
    bloomCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    bloomIcon: {
      fontSize: 18,
      lineHeight: lineHeightFor(18),
    },
    // Panel fills are dark in both modes, so light text is fixed here.
    bloomText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 16,
      lineHeight: lineHeightFor(16),
      color: '#FFFFFF',
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: ZEN_MIST,
    },
    label: {
      fontFamily: DISPLAY_FONT,
      fontSize: 11,
      lineHeight: lineHeightFor(11),
      color: '#CDEAF2',
      letterSpacing: 1.5,
    },
  });
}
