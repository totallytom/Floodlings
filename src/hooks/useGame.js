import { useState, useEffect, useCallback, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { generateBoard, isAdjacent, swapCells, wouldMatch, resolveBoard } from '../gameLogic';
import { getLevelConfig, getFreeModeConfig, getZenModeConfig, getRescueLevelConfig, FREE_MODE_SECONDS, starsForScore, COMBO_LABELS, LOW_MOVES_THRESHOLD, isGreatMove } from '../constants';
import { useGameSounds } from './useGameSounds';
import { useAds } from './useAds';

const HS_KEY = 'cf_highscore';
const FREE_HS_KEY = 'cf_free_highscore';
const ZEN_HS_KEY = 'cf_zen_highscore';
const RESCUE_HS_KEY = 'cf_rescue_highscore';
const BEST_LEVEL_KEY = 'cf_best_level';
const RESCUE_BEST_LEVEL_KEY = 'cf_rescue_best_level';
// Checkpoints for the two level-based modes: the level the player is on and the
// run score they had when it started, so Continue picks up exactly there.
const LEVELS_PROGRESS_KEY = 'cf_levels_progress';
const RESCUE_PROGRESS_KEY = 'cf_rescue_progress';
// Best star rating per level number, e.g. { "1": 3, "2": 1 }.
const LEVELS_STARS_KEY = 'cf_levels_stars';
const RESCUE_STARS_KEY = 'cf_rescue_stars';
const START_PROGRESS = { level: 1, score: 0 };

function parseJSON(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

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
  const [mode, setMode] = useState('levels'); // levels | free | zen | rescue
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(null);
  const [movesLeft, setMovesLeft] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [rescueCount, setRescueCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [levelsProgress, setLevelsProgress] = useState(START_PROGRESS);
  const [rescueProgress, setRescueProgress] = useState(START_PROGRESS);
  const [levelsStars, setLevelsStars] = useState({});
  const [rescueStars, setRescueStars] = useState({});
  const [phase, setPhase] = useState('playing'); // intro | playing | resolving | cleared | failed
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [freeBestScore, setFreeBestScore] = useState(0);
  const [zenBestScore, setZenBestScore] = useState(0);
  const [rescueBestScore, setRescueBestScore] = useState(0);
  const [bestLevel, setBestLevel] = useState(1);
  const [rescueBestLevel, setRescueBestLevel] = useState(1);
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
  const rescueCountRef = useRef(0);
  const freeTimeLeftRef = useRef(FREE_MODE_SECONDS);
  const streakRef = useRef(0);
  const starsRef = useRef({ levels: {}, rescue: {} });
  const configRef = useRef(getLevelConfig(1));

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { movesLeftRef.current = movesLeft; }, [movesLeft]);
  useEffect(() => { levelScoreRef.current = levelScore; }, [levelScore]);
  useEffect(() => { rescueCountRef.current = rescueCount; }, [rescueCount]);
  useEffect(() => { freeTimeLeftRef.current = freeTimeLeft; }, [freeTimeLeft]);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  useEffect(() => {
    AsyncStorage.getItem(HS_KEY).then(val => {
      if (val) setHighScore(parseInt(val, 10));
    });
    AsyncStorage.getItem(FREE_HS_KEY).then(val => {
      if (val) setFreeBestScore(parseInt(val, 10));
    });
    AsyncStorage.getItem(ZEN_HS_KEY).then(val => {
      if (val) setZenBestScore(parseInt(val, 10));
    });
    AsyncStorage.getItem(RESCUE_HS_KEY).then(val => {
      if (val) setRescueBestScore(parseInt(val, 10));
    });
    AsyncStorage.getItem(BEST_LEVEL_KEY).then(val => {
      if (val) setBestLevel(parseInt(val, 10));
    });
    AsyncStorage.getItem(RESCUE_BEST_LEVEL_KEY).then(val => {
      if (val) setRescueBestLevel(parseInt(val, 10));
    });
    // Players from before checkpoints existed only have cf_best_level (saved on
    // every level start, so it's the level they were on) - resume them there.
    AsyncStorage.multiGet([LEVELS_PROGRESS_KEY, BEST_LEVEL_KEY, RESCUE_PROGRESS_KEY, RESCUE_BEST_LEVEL_KEY, LEVELS_STARS_KEY, RESCUE_STARS_KEY])
      .then(([[, lp], [, bl], [, rp], [, rbl], [, ls], [, rs]]) => {
        setLevelsProgress(parseJSON(lp, null) ?? { level: bl ? parseInt(bl, 10) : 1, score: 0 });
        setRescueProgress(parseJSON(rp, null) ?? { level: rbl ? parseInt(rbl, 10) : 1, score: 0 });
        starsRef.current = { levels: parseJSON(ls, {}), rescue: parseJSON(rs, {}) };
        setLevelsStars(starsRef.current.levels);
        setRescueStars(starsRef.current.rescue);
      });
  }, []);

  const saveProgress = useCallback((which, lvl, runScore) => {
    const progress = { level: lvl, score: runScore };
    if (which === 'rescue') {
      setRescueProgress(progress);
      AsyncStorage.setItem(RESCUE_PROGRESS_KEY, JSON.stringify(progress));
    } else {
      setLevelsProgress(progress);
      AsyncStorage.setItem(LEVELS_PROGRESS_KEY, JSON.stringify(progress));
    }
  }, []);

  // Keeps the best rating per level - replaying a level for fewer stars never
  // lowers it.
  const saveStars = useCallback((which, lvl, stars) => {
    const current = starsRef.current[which];
    if ((current[lvl] || 0) >= stars) return;
    const next = { ...current, [lvl]: stars };
    starsRef.current = { ...starsRef.current, [which]: next };
    if (which === 'rescue') {
      setRescueStars(next);
      AsyncStorage.setItem(RESCUE_STARS_KEY, JSON.stringify(next));
    } else {
      setLevelsStars(next);
      AsyncStorage.setItem(LEVELS_STARS_KEY, JSON.stringify(next));
    }
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

  const saveZenBestScore = useCallback(async (newScore) => {
    const raw = await AsyncStorage.getItem(ZEN_HS_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (newScore > current) {
      await AsyncStorage.setItem(ZEN_HS_KEY, String(newScore));
      setZenBestScore(newScore);
    }
  }, []);

  const saveRescueBestScore = useCallback(async (newScore) => {
    const raw = await AsyncStorage.getItem(RESCUE_HS_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (newScore > current) {
      await AsyncStorage.setItem(RESCUE_HS_KEY, String(newScore));
      setRescueBestScore(newScore);
    }
  }, []);

  const saveBestLevel = useCallback(async (lvl) => {
    const raw = await AsyncStorage.getItem(BEST_LEVEL_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (lvl > current) {
      await AsyncStorage.setItem(BEST_LEVEL_KEY, String(lvl));
      setBestLevel(lvl);
    }
  }, []);

  const saveRescueBestLevel = useCallback(async (lvl) => {
    const raw = await AsyncStorage.getItem(RESCUE_BEST_LEVEL_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (lvl > current) {
      await AsyncStorage.setItem(RESCUE_BEST_LEVEL_KEY, String(lvl));
      setRescueBestLevel(lvl);
    }
  }, []);

  const startNewLevel = useCallback((lvl, runScore = scoreRef.current) => {
    const cfg = getLevelConfig(lvl);
    configRef.current = cfg;
    const newBoard = generateBoard(cfg.rows, cfg.cols, cfg.numTypes);
    setLevel(lvl);
    setBoard(newBoard);
    setMovesLeft(cfg.moves);
    setLevelScore(0);
    setCombo(0);
    setStreak(0);
    // 'intro' holds the board (Board.js only accepts swipes during 'playing')
    // until the player has seen this level's target score/move count and taps
    // Start - levels vary a lot in what they demand, so that's worth reading
    // before the timer on your attention starts.
    setPhase('intro');
    setPendingResolution(null);
    saveBestLevel(lvl);
    saveProgress('levels', lvl, runScore);
  }, [saveBestLevel, saveProgress]);

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
    setStreak(0);
    setFreeTimeLeft(FREE_MODE_SECONDS);
    // Same 'intro' hold as startNewLevel - see the target/moves comment there;
    // here it's so the player sees the 3:30 budget and their best before it starts.
    setPhase('intro');
    setPendingResolution(null);
    setPaused(false);
    setScreen('game');
  }, []);

  const startZenGame = useCallback(() => {
    const cfg = getZenModeConfig();
    configRef.current = cfg;
    const newBoard = generateBoard(cfg.rows, cfg.cols, cfg.numTypes);
    setMode('zen');
    setBoard(newBoard);
    setScore(0);
    setLevelScore(0);
    setCombo(0);
    setStreak(0);
    // Zen has no clock and no fail state - the only way out is Return to Menu
    // (via the pause overlay), which saves the score same as any other mode.
    setPhase('intro');
    setPendingResolution(null);
    setPaused(false);
    setScreen('game');
  }, []);

  const startRescueLevel = useCallback((lvl, runScore = scoreRef.current) => {
    const cfg = getRescueLevelConfig(lvl);
    configRef.current = cfg;
    const newBoard = generateBoard(cfg.rows, cfg.cols, cfg.numTypes);
    setLevel(lvl);
    setBoard(newBoard);
    setMovesLeft(cfg.moves);
    setLevelScore(0);
    setRescueCount(0);
    setCombo(0);
    setStreak(0);
    // Same 'intro' hold as startNewLevel - lets the player see which animal and
    // how many they need before the move count starts ticking down.
    setPhase('intro');
    setPendingResolution(null);
    saveRescueBestLevel(lvl);
    saveProgress('rescue', lvl, runScore);
  }, [saveRescueBestLevel, saveProgress]);

  // Resumes from the saved checkpoint (level 1 on a fresh install).
  const startRescueGame = useCallback(() => {
    setMode('rescue');
    setScore(rescueProgress.score);
    setCanContinue(true);
    setPaused(false);
    startRescueLevel(rescueProgress.level, rescueProgress.score);
    setScreen('game');
  }, [startRescueLevel, rescueProgress]);

  const restartRescueGame = useCallback(() => {
    setMode('rescue');
    setScore(0);
    setCanContinue(true);
    setPaused(false);
    startRescueLevel(1, 0);
    setScreen('game');
  }, [startRescueLevel]);

  // A failed run keeps its level but not its score - Try Again (or Continue from
  // home) replays that same level from 0, while the rewarded-ad Continue keeps the
  // score (it's still in memory and gets re-checkpointed by startNewLevel).
  const endGame = useCallback(() => {
    saveHighScore(scoreRef.current);
    saveProgress('levels', levelRef.current, 0);
    setScreen('gameover');
  }, [saveHighScore, saveProgress]);

  const endFreeGame = useCallback(() => {
    saveFreeBestScore(scoreRef.current);
    showInterstitial(() => setScreen('gameover'));
  }, [saveFreeBestScore, showInterstitial]);

  const endRescueGame = useCallback(() => {
    saveRescueBestScore(scoreRef.current);
    saveProgress('rescue', levelRef.current, 0);
    setScreen('gameover');
  }, [saveRescueBestScore, saveProgress]);

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

  // Resumes from the saved checkpoint (level 1 on a fresh install).
  const startGame = useCallback(() => {
    setMode('levels');
    setScore(levelsProgress.score);
    setCanContinue(true);
    setPaused(false);
    startNewLevel(levelsProgress.level, levelsProgress.score);
    setScreen('game');
  }, [startNewLevel, levelsProgress]);

  const restartGame = useCallback(() => {
    setMode('levels');
    setScore(0);
    setCanContinue(true);
    setPaused(false);
    startNewLevel(1, 0);
    setScreen('game');
  }, [startNewLevel]);

  const onContinue = useCallback(() => {
    setCanContinue(false);
    showRewarded(() => {
      setPaused(false);
      // Mode-aware: Rescue mode's fail state can reach here too, and it needs its
      // own starter (Rescue's config/board shape), not Levels'.
      if (modeRef.current === 'rescue') startRescueLevel(levelRef.current);
      else startNewLevel(levelRef.current);
      setScreen('game');
    });
  }, [startNewLevel, startRescueLevel, showRewarded]);

  const togglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  const returnToMenu = useCallback(() => {
    if (modeRef.current === 'zen') {
      // Zen has no timer and no fail state, so Return to Menu is the only point
      // in a session that can ever show an ad - without this, a Zen session
      // (how ever long) would generate zero ad revenue.
      saveZenBestScore(scoreRef.current);
      setPaused(false);
      showInterstitial(() => setScreen('home'));
      return;
    }
    if (modeRef.current === 'free') saveFreeBestScore(scoreRef.current);
    else if (modeRef.current === 'rescue') saveRescueBestScore(scoreRef.current);
    else saveHighScore(scoreRef.current);
    setPaused(false);
    setScreen('home');
  }, [saveHighScore, saveFreeBestScore, saveZenBestScore, saveRescueBestScore, showInterstitial]);

  const finishResolution = useCallback(() => {
    setPendingResolution(null);

    if (modeRef.current === 'free' || modeRef.current === 'zen') {
      // No target/moves gate in Free or Zen Mode - Free's countdown effect (or,
      // for Zen, nothing at all) is the only thing that ends a session, so every
      // resolved swap just returns to 'playing'.
      setPhase('playing');
      return;
    }

    const cfg = configRef.current;

    if (modeRef.current === 'rescue') {
      if (rescueCountRef.current >= cfg.targetCount) {
        const stars = starsForScore(rescueCountRef.current, cfg.targetCount);
        setLevelStats({ stars });
        saveStars('rescue', levelRef.current, stars);
        // Checkpoint the next level now rather than when it starts, so quitting
        // during the clear celebration or the ad doesn't lose this clear.
        saveProgress('rescue', levelRef.current + 1, scoreRef.current);
        setPhase('cleared');
        playClear();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        announceIOS(`Level complete! ${stars} out of 3 stars.`);
        setTimeout(() => {
          trackLevelClear(() => startRescueLevel(levelRef.current + 1));
        }, 1200);
      } else if (movesLeftRef.current <= 0) {
        playFailed();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPhase('failed');
        announceIOS('Out of moves!');
        setTimeout(() => endRescueGame(), 1500);
      } else {
        setPhase('playing');
        if (movesLeftRef.current === LOW_MOVES_THRESHOLD) playLowMoves();
      }
      return;
    }

    if (levelScoreRef.current >= cfg.targetScore) {
      const stars = starsForScore(levelScoreRef.current, cfg.targetScore);
      setLevelStats({ stars });
      saveStars('levels', levelRef.current, stars);
      saveProgress('levels', levelRef.current + 1, scoreRef.current);
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
  }, [startNewLevel, startRescueLevel, trackLevelClear, endGame, endRescueGame, saveStars, saveProgress, playClear, playFailed, playLowMoves]);

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

    const { finalBoard, steps, totalScore, maxCascade, totalTypeCounts } = resolveBoard(swapped, cfg.numTypes);
    const comboTier = Math.min(3, Math.max(0, maxCascade - 1));
    // Great moves (cascade or 4+ match) build the streak; any plain move breaks it.
    const newStreak = isGreatMove(steps) ? streakRef.current + 1 : 0;
    streakRef.current = newStreak;
    setStreak(newStreak);
    setCombo(comboTier);
    setScore(s => s + totalScore);
    setLevelScore(s => s + totalScore);
    if (modeRef.current === 'rescue') {
      const rescued = totalTypeCounts[cfg.targetType] || 0;
      if (rescued > 0) setRescueCount(c => c + rescued);
    }
    setBoard(finalBoard);
    setPendingResolution({ swappedBoard: swapped, steps, finalBoard, streak: newStreak });

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

  // Free/Zen configs are set once at session start and don't change per-render,
  // so the ref is fine there. Levels/Rescue re-derive from `level` (reactive
  // state) each render instead, same as the original Levels behavior, rather
  // than relying on a ref for something the UI needs to react to.
  const config = mode === 'free' || mode === 'zen'
    ? configRef.current
    : mode === 'rescue'
      ? getRescueLevelConfig(level)
      : getLevelConfig(level);

  return {
    screen, setScreen,
    mode, level, score, board,
    movesLeft, levelScore, rescueCount, combo, streak,
    levelsProgress, rescueProgress, levelsStars, rescueStars,
    phase, highScore, freeBestScore, zenBestScore, rescueBestScore, freeTimeLeft,
    bestLevel, rescueBestLevel,
    config, levelStats, pendingResolution,
    startGame, restartGame, startFreeGame, startZenGame, startRescueGame, restartRescueGame, startPlaying, attemptSwap, finishResolution,
    togglePause, returnToMenu,
    paused, canContinue, onContinue, rewLoaded,
  };
}

