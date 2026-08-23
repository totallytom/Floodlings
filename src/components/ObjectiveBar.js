import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { LOW_MOVES_THRESHOLD } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';

const NORMAL_HEIGHT = 5;
const URGENT_HEIGHT = 12;
const CALM_OPACITY = 0.55;
const TRACK_WIDTH = Dimensions.get('window').width - 32;

export default function ObjectiveBar({ levelScore, targetScore, movesLeft }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(NORMAL_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(CALM_OPACITY)).current;
  const pulseLoopRef = useRef(null);

  const isUrgent = movesLeft <= LOW_MOVES_THRESHOLD;
  const fraction = Math.min(1, levelScore / targetScore);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fraction]);

  useEffect(() => {
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }

    Animated.timing(height, {
      toValue: isUrgent ? URGENT_HEIGHT : NORMAL_HEIGHT,
      duration: 250,
      useNativeDriver: false,
    }).start();

    if (isUrgent && !reduceMotion) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 350, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: false }),
        ])
      );
      pulseLoopRef.current = loop;
      loop.start();
    } else {
      // Reduce Motion: skip the pulse and just hold it fully opaque so urgency is
      // still conveyed (taller + solid) without the rhythmic flashing.
      Animated.timing(opacity, { toValue: isUrgent ? 1 : CALM_OPACITY, duration: 250, useNativeDriver: false }).start();
    }

    return () => {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
    };
  }, [isUrgent, reduceMotion]);

  const width = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 1],
    outputRange: [0, TRACK_WIDTH * 0.25, TRACK_WIDTH * 0.5, TRACK_WIDTH],
  });

  const backgroundColor = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 1],
    outputRange: ['#FF2D55', '#FF2D55', '#FF9F0A', '#30D158'],
  });

  return (
    <View style={styles.container}>
      {/* The bar's accessibilityLabel below already carries these numbers to
          screen readers - this Text is the same info made visible for sighted
          players, who otherwise only had the fill's proportion to go on. */}
      <Text accessible={false} style={styles.progressText} maxFontSizeMultiplier={1.5}>
        {levelScore.toLocaleString()} / {targetScore.toLocaleString()}
      </Text>
      <Animated.View
        style={[styles.track, { height, opacity }]}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={`${levelScore.toLocaleString()} of ${targetScore.toLocaleString()} points`}
        accessibilityValue={{ min: 0, max: targetScore, now: Math.min(levelScore, targetScore) }}
      >
        <Animated.View accessible={false} style={[styles.fill, { width, backgroundColor }]} />
      </Animated.View>
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginTop: 4,
    },
    progressText: {
      fontFamily: 'BadUnicorn',
      fontSize: 14,
      color: theme.textSecondary,
      alignSelf: 'flex-end',
      marginBottom: 3,
    },
    track: {
      backgroundColor: '#1C1C2E',
      borderRadius: 6,
      marginVertical: 4,
      overflow: 'hidden',
    },
    fill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: 6,
    },
  });
}
