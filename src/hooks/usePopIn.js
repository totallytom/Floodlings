import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Pops a block in (scale + rise + fade) after `delay`, replaying every time
// `visible` turns true - used for the staggered entrances in the Stats and
// Settings modals. Reduce Motion shows it immediately. Spread the result into
// an Animated.View's style.
export function usePopIn(visible, delay, reduceMotion) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [visible, reduceMotion]);
  return {
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  };
}
