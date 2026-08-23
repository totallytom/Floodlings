import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { FREE_MODE_SECONDS, FREE_MODE_URGENT_THRESHOLD } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';

const NORMAL_HEIGHT = 5;
const URGENT_HEIGHT = 12;
const CALM_OPACITY = 0.55;
const TRACK_WIDTH = Dimensions.get('window').width - 32;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FreeModeTimer({ freeTimeLeft }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const height = useRef(new Animated.Value(NORMAL_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(CALM_OPACITY)).current;
  const pulseLoopRef = useRef(null);

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
      <Text accessible={false} style={styles.timeText} maxFontSizeMultiplier={1.5}>
        {formatTime(freeTimeLeft)}
      </Text>
      <Animated.View
        style={[styles.track, { height, opacity }]}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={`${freeTimeLeft} seconds remaining`}
        accessibilityValue={{ min: 0, max: FREE_MODE_SECONDS, now: freeTimeLeft }}
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
    timeText: {
      fontFamily: 'BadUnicorn',
      fontSize: 32,
      color: theme.textSecondary,
      alignSelf: 'center',
      letterSpacing: 2,
      marginBottom: 4,
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
