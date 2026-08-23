import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_KEY = 'cf_sound';

export function useSettings() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY).then(val => {
      if (val !== null) setSoundEnabled(val === 'true');
    });
  }, []);

  function toggleSound() {
    setSoundEnabled(v => {
      const next = !v;
      AsyncStorage.setItem(SOUND_KEY, String(next));
      return next;
    });
  }

  return { soundEnabled, toggleSound };
}
