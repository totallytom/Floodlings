import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';

const TIGER = require('../../assets/img/zoo/tiger.png');
const PANDA = require('../../assets/img/zoo/panda.png');
const FLAMINGO = require('../../assets/img/zoo/flaming.png');
const PEACOCK = require('../../assets/img/zoo/peacock.png');
const ZEBRA = require('../../assets/img/zoo/zebra.png');
const CHAMELEON = require('../../assets/img/zoo/chameleon.png');

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const ANIMALS = [
  { source: TIGER, top: SCREEN_H * 0.08, left: SCREEN_W * 0.02, size: 92, duration: 2600, driftX: 10 },
  { source: PANDA, top: SCREEN_H * 0.14, right: SCREEN_W * 0.03, size: 84, duration: 3100, driftX: 8 },
  { source: FLAMINGO, top: SCREEN_H * 0.40, left: SCREEN_W * 0.01, size: 80, duration: 2900, driftX: 12 },
  { source: PEACOCK, top: SCREEN_H * 0.44, right: SCREEN_W * 0.02, size: 88, duration: 2400, driftX: 9 },
  { source: ZEBRA, top: SCREEN_H * 0.68, left: SCREEN_W * 0.02, size: 84, duration: 3300, driftX: 11 },
  { source: CHAMELEON, top: SCREEN_H * 0.72, right: SCREEN_W * 0.02, size: 88, duration: 2700, driftX: 10 },
];

function FloatingAnimal({ config, reduceMotion }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return; // leave the animals static instead of bobbing/drifting
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: config.duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: config.duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-config.driftX, config.driftX] });

  return (
    <Animated.Image
      source={config.source}
      resizeMode="contain"
      style={[
        styles.animal,
        {
          top: config.top,
          left: config.left,
          right: config.right,
          width: config.size,
          height: config.size,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
}

export default function FloatingAnimals() {
  const reduceMotion = useReduceMotion();

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {ANIMALS.map((a, i) => (
        <FloatingAnimal key={i} config={a} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  animal: {
    position: 'absolute',
    opacity: 0.5,
  },
});
