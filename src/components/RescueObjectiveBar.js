import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { LOW_MOVES_THRESHOLD } from '../constants';
import { iconForType, nameForType } from '../animals';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';

const NORMAL_HEIGHT = 5;
const URGENT_HEIGHT = 12;
const CALM_OPACITY = 0.55;
const TRACK_WIDTH = Dimensions.get('window').width - 32;

// Same progress-bar treatment as ObjectiveBar, but counting rescued animals of a
// specific species instead of points - Species Rescue's objective is "how many",
// not "how much".
export default function RescueObjectiveBar({ rescueCount, targetCount, targetType, movesLeft }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(NORMAL_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(CALM_OPACITY)).current;
  const pulseLoopRef = useRef(null);

  const isUrgent = movesLeft <= LOW_MOVES_THRESHOLD;
  const fraction = Math.min(1, rescueCount / targetCount);
  const animalName = nameForType(targetType);

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
      <View style={styles.headerRow}>
        <Image source={iconForType(targetType)} style={styles.animalIcon} />
        <Text accessible={false} style={styles.progressText} maxFontSizeMultiplier={1.5}>
          {rescueCount} / {targetCount} {animalName}s
        </Text>
      </View>
      <Animated.View
        style={[styles.track, { height, opacity }]}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={`${rescueCount} of ${targetCount} ${animalName}s rescued`}
        accessibilityValue={{ min: 0, max: targetCount, now: Math.min(rescueCount, targetCount) }}
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      marginBottom: 3,
    },
    animalIcon: {
      width: 18,
      height: 18,
      resizeMode: 'contain',
    },
    progressText: {
      fontFamily: 'BadUnicorn',
      fontSize: 14,
      color: theme.textSecondary,
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
