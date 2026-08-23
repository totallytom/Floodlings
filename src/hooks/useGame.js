import { useState, useEffect, useCallback, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { generateBoard, isAdjacent, swapCells, wouldMatch, resolveBoard } from '../gameLogic';
import { getLevelConfig, getFreeModeConfig, FREE_MODE_SECONDS, starsForScore, COMBO_LABELS, LOW_MOVES_THRESHOLD } from '../constants';
import { useGameSounds } from './useGameSounds';
import { useAds } from './useAds';

const HS_KEY = 'cf_highscore';
const FREE_HS_KEY = 'cf_free_highscore';

// accessibilityLiveRegion (used elsewhere for the same announcements) is Android-only;
// iOS VoiceOver needs an explicit announcement instead. Android already gets these via
// the live-region props in JSX, so this only fires on iOS to avoid double-announcing.
function announceIOS(message) {
  if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
}

export default function useGame({ soundEnabled = true, adsReady = false } = {}) {
  const { playSwap, playCombo, playClear, playFailed, playLowMoves } = useGameSounds(soundEnabled);
  const { trackLevelClear, showInterstitial, showRewarded, rewLoaded } = useAds({ adsReady });
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState('levels'); // levels | free
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(null);
  const [movesLeft, setMovesLeft] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [phase, setPhase] = useState('playing'); // intro | playing | resolving | cleared | failed
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [freeBestScore, setFreeBestScore] = useState(0);
  const [freeTimeLeft, setFreeTimeLeft] = useState(FREE_MODE_SECONDS);
  const [canContinue, setCanContinue] = useState(true);
  const [levelStats, setLevelStats] = useState({ stars: 3 });
  const [pendingResolution, setPendingResolution] = useState(null);

  // Refs to break stale closures in callbacks
  const modeRef = useRef('levels');
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const boardRef = useRef(null);
  const movesLeftRef = useRef(0);
  const levelScoreRef = useRef(0);
  const freeTimeLeftRef = useRef(FREE_MODE_SECONDS);
  const configRef = useRef(getLevelConfig(1));

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { movesLeftRef.current = movesLeft; }, [movesLeft]);
  useEffect(() => { levelScoreRef.current = levelScore; }, [levelScore]);
  useEffect(() => { freeTimeLeftRef.current = freeTimeLeft; }, [freeTimeLeft]);

  useEffect(() => {
    AsyncStorage.getItem(HS_KEY).then(val => {
      if (val) setHighScore(parseInt(val, 10));
    });
    AsyncStorage.getItem(FREE_HS_KEY).then(val => {
      if (val) setFreeBestScore(parseInt(val, 10));
    });
  }, []);

  const saveHighScore = useCallback(async (newScore) => {
    const raw = await AsyncStorage.getItem(HS_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (newScore > current) {
      await AsyncStorage.setItem(HS_KEY, String(newScore));
      setHighScore(newScore);
    }
  }, []);

  const saveFreeBestScore = useCallback(async (newScore) => {
    const raw = await AsyncStorage.getItem(FREE_HS_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (newScore > current) {
      await AsyncStorage.setItem(FREE_HS_KEY, String(newScore));
      setFreeBestScore(newScore);
    }
  }, []);

  const startNewLevel = useCallback((lvl) => {
    const cfg = getLevelConfig(lvl);
    configRef.current = cfg;
    const newBoard = generateBoard(cfg.rows, cfg.cols, cfg.numTypes);
    setLevel(lvl);
    setBoard(newBoard);
    setMovesLeft(cfg.moves);
    setLevelScore(0);
    setCombo(0);
    // 'intro' holds the board (Board.js only accepts swipes during 'playing')
    // until the player has seen this level's target score/move count and taps
    // Start - levels vary a lot in what they demand, so that's worth reading
    // before the timer on your attention starts.
    setPhase('intro');
    setPendingResolution(null);
  }, []);

  const startPlaying = useCallback(() => {
    setPhase('playing');
  }, []);

  const startFreeGame = useCallback(() => {
    const cfg = getFreeModeConfig();
    configRef.current = cfg;
    const newBoard = generateBoard(cfg.rows, cfg.cols, cfg.numTypes);
    setMode('free');
    setBoard(newBoard);
    setScore(0);
    setLevelScore(0);
    setCombo(0);
    setFreeTimeLeft(FREE_MODE_SECONDS);
    // Same 'intro' hold as startNewLevel - see the target/moves comment there;
    // here it's so the player sees the 3:30 budget and their best before it starts.
    setPhase('intro');
    setPendingResolution(null);
    setPaused(false);
    setScreen('game');
  }, []);

  const endGame = useCallback(() => {
    saveHighScore(scoreRef.current);
    setScreen('gameover');
  }, [saveHighScore]);

  const endFreeGame = useCallback(() => {
    saveFreeBestScore(scoreRef.current);
    showInterstitial(() => setScreen('gameover'));
  }, [saveFreeBestScore, showInterstitial]);

  const handleFreeTimeUp = useCallback(() => {
    playFailed();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPhase('failed');
    announceIOS("Time's up!");
    setTimeout(() => endFreeGame(), 1500);
  }, [endFreeGame, playFailed]);

  // Free Mode countdown - only ticks while actually playing a free-mode session.
  useEffect(() => {
    if (mode !== 'free' || screen !== 'game' || phase !== 'playing' || paused) return;
    const interval = setInterval(() => {
      setFreeTimeLeft(t => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, screen, phase, paused]);

  useEffect(() => {
    if (mode === 'free' && freeTimeLeft === 0 && phase === 'playing' && screen === 'game') {
      handleFreeTimeUp();
    }
  }, [freeTimeLeft, mode, phase, screen, handleFreeTimeUp]);

  const startGame = useCallback(() => {
    setMode('levels');
    setScore(0);
    setCanContinue(true);
    setPaused(false);
    startNewLevel(1);
    setScreen('game');
  }, [startNewLevel]);

  const onContinue = useCallback(() => {
    setCanContinue(false);
    showRewarded(() => {
      setPaused(false);
      startNewLevel(levelRef.current);
      setScreen('game');
    });
  }, [startNewLevel, showRewarded]);

  const togglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  const returnToMenu = useCallback(() => {
    if (modeRef.current === 'free') saveFreeBestScore(scoreRef.current);
    else saveHighScore(scoreRef.current);
    setPaused(false);
    setScreen('home');
  }, [saveHighScore, saveFreeBestScore]);

  const finishResolution = useCallback(() => {
    setPendingResolution(null);

    if (modeRef.current === 'free') {
      // No target/moves gate in Free Mode - the countdown effect above is the
      // only thing that ends a session, so every resolved swap just returns to
      // 'playing'.
      setPhase('playing');
      return;
    }

    const cfg = configRef.current;

    if (levelScoreRef.current >= cfg.targetScore) {
      const stars = starsForScore(levelScoreRef.current, cfg.targetScore);
      setLevelStats({ stars });
      setPhase('cleared');
      playClear();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      announceIOS(`Level complete! ${stars} out of 3 stars.`);
      setTimeout(() => {
        trackLevelClear(() => startNewLevel(levelRef.current + 1));
      }, 1200);
    } else if (movesLeftRef.current <= 0) {
      playFailed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPhase('failed');
      announceIOS('Out of moves!');
      setTimeout(() => endGame(), 1500);
    } else {
      setPhase('playing');
      if (movesLeftRef.current === LOW_MOVES_THRESHOLD) playLowMoves();
    }
  }, [startNewLevel, trackLevelClear, endGame, playClear, playFailed, playLowMoves]);

  const attemptSwap = useCallback((a, b) => {
    const currentBoard = boardRef.current;
    if (!currentBoard || phase !== 'playing' || paused || !isAdjacent(a, b)) return false;

    if (!wouldMatch(currentBoard, a, b)) {
      playFailed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return false;
    }

    const cfg = configRef.current;
    const swapped = swapCells(currentBoard, a, b);
    const newMovesLeft = movesLeftRef.current - 1;
    setMovesLeft(newMovesLeft);
    setPhase('resolving');

    const { finalBoard, steps, totalScore, maxCascade } = resolveBoard(swapped, cfg.numTypes);
    const comboTier = Math.min(3, Math.max(0, maxCascade - 1));
    setCombo(comboTier);
    setScore(s => s + totalScore);
    setLevelScore(s => s + totalScore);
    setBoard(finalBoard);
    setPendingResolution({ swappedBoard: swapped, steps, finalBoard });

    if (comboTier > 0) {
      playCombo();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      announceIOS(COMBO_LABELS[comboTier]);
    } else {
      playSwap();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    return true;
  }, [phase, paused, playSwap, playCombo, playFailed]);

  const config = mode === 'free' ? configRef.current : getLevelConfig(level);

  return {
    screen, setScreen,
    mode, level, score, board,
    movesLeft, levelScore, combo,
    phase, highScore, freeBestScore, freeTimeLeft,
    config, levelStats, pendingResolution,
    startGame, startFreeGame, startPlaying, attemptSwap, finishResolution,
    togglePause, returnToMenu,
    paused, canContinue, onContinue, rewLoaded,
  };
}

