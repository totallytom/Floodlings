import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Mirrors UIAccessibility.isReduceMotionEnabled on iOS (and the Android TalkBack/
// system equivalent). Starts false and flips once the initial check resolves, then
// stays in sync if the user toggles the setting while the app is running.
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
