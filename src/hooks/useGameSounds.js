import { useRef, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

export function useGameSounds(soundEnabled) {
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const swap     = useAudioPlayer(require('../../assets/audio/match.mp3'));
  const combo    = useAudioPlayer(require('../../assets/sounds/combo.mp3'));
  const clear    = useAudioPlayer(require('../../assets/sounds/clear.mp3'));
  const failed   = useAudioPlayer(require('../../assets/sounds/timeup.mp3'));
  const lowMoves = useAudioPlayer(require('../../assets/sounds/tick.mp3'));

  function fire(player) {
    if (!soundEnabledRef.current) return;
    try { player.seekTo(0); player.play(); } catch {}
  }

  return {
    playSwap:     () => fire(swap),
    playCombo:    () => fire(combo),
    playClear:    () => fire(clear),
    playFailed:   () => fire(failed),
    playLowMoves: () => fire(lowMoves),
  };
}
