import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Board from '../components/Board';
import HUD from '../components/HUD';
import ObjectiveBar from '../components/ObjectiveBar';
import FreeModeTimer from '../components/FreeModeTimer';
import GameBackdrop from '../components/GameBackdrop';
import { LOW_MOVES_THRESHOLD, FREE_MODE_SECONDS, FREE_MODE_URGENT_THRESHOLD } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';

// Single source of truth for the boardFrame's padding/border - both the style
// below and the size math in GameScreen read from these, so they can't drift
// out of sync with each other.
const FRAME_PADDING = 26;
const FRAME_BORDER = 2;

function TopBar({ styles, mode, level, score, movesLeft, combo, paused, onPause }) {
  return (
    <View style={styles.topBar}>
      <HUD
        mode={mode}
        level={level}
        score={score}
        movesLeft={movesLeft}
        combo={combo}
        paused={paused}
        onPause={onPause}
      />
    </View>
  );
}

function PauseOverlay({ styles, onResume, onMenu }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        <Text accessibilityRole="header" style={styles.pausedTitle}>PAUSED</Text>
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={onResume}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Resume"
          accessibilityHint="Continues the game"
        >
          <Text style={styles.resumeText}>RESUME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onMenu}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Return to menu"
          accessibilityHint="Ends the current game and returns to the home screen"
        >
          <Text style={styles.menuText}>RETURN TO MENU</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IntroOverlay({ styles, mode, level, config, freeBestScore, onStart }) {
  if (mode === 'free') {
    const timeLabel = `${Math.floor(FREE_MODE_SECONDS / 60)}:${String(FREE_MODE_SECONDS % 60).padStart(2, '0')}`;
    return (
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text accessibilityRole="header" style={styles.introTitle}>FREE MODE</Text>
          <Text style={styles.introSubtitle}>
            No target, no move limit - just match as many animals as you can before time runs out and try to beat your best.
          </Text>
          <View
            style={styles.introStatsRow}
            accessible
            accessibilityLabel={`${timeLabel} on the clock. Your best is ${freeBestScore.toLocaleString()} points.`}
          >
            <View style={styles.introStat}>
              <Text accessible={false} style={styles.introStatLabel}>TIME</Text>
              <Text accessible={false} style={styles.introStatValue}>{timeLabel}</Text>
            </View>
            <View style={styles.introStat}>
              <Text accessible={false} style={styles.introStatLabel}>BEST</Text>
              <Text accessible={false} style={styles.introStatValue}>{freeBestScore.toLocaleString()}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={onStart}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start free mode"
            accessibilityHint={`Starts a ${timeLabel} free mode session. Your best is ${freeBestScore} points.`}
          >
            <Text style={styles.resumeText}>START</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        <Text accessibilityRole="header" style={styles.introTitle}>LEVEL {level}</Text>
        <View
          style={styles.introStatsRow}
          accessible
          accessibilityLabel={`Reach ${config.targetScore.toLocaleString()} points in ${config.moves} moves`}
        >
          <View style={styles.introStat}>
            <Text accessible={false} style={styles.introStatLabel}>TARGET</Text>
            <Text accessible={false} style={styles.introStatValue}>{config.targetScore.toLocaleString()}</Text>
          </View>
          <View style={styles.introStat}>
            <Text accessible={false} style={styles.introStatLabel}>MOVES</Text>
            <Text accessible={false} style={styles.introStatValue}>{config.moves}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={onStart}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Start level"
          accessibilityHint={`Starts level ${level}. Reach ${config.targetScore} points in ${config.moves} moves.`}
        >
          <Text style={styles.resumeText}>START</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stars({ styles, count }) {
  return (
    <View style={styles.starsRow} accessible accessibilityLabel={`${count} out of 3 stars`}>
      {[0, 1, 2].map(i => (
        <Text key={i} style={[styles.star, i >= count && styles.starEmpty]} maxFontSizeMultiplier={1.3}>★</Text>
      ))}
    </View>
  );
}

export default function GameScreen({
  mode, level, score, board, movesLeft, levelScore,
  freeTimeLeft, freeBestScore,
  combo, phase, config, pendingResolution,
  startPlaying, attemptSwap, finishResolution,
  paused, togglePause, returnToMenu,
  levelStats,
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);
  const [boardArea, setBoardArea] = useState({ width: 0, height: 0 });

  const onBoardContainerLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setBoardArea({ width, height });
  }, []);

  // Board.js fits its actual row/col count into these two budgets independently
  // (it's a rectangle, taller than wide) rather than being capped to a square by
  // whichever of width/height is smaller.
  const frameChrome = FRAME_PADDING * 2 + FRAME_BORDER * 2;
  const boardMaxWidth = Math.max(0, boardArea.width - frameChrome);
  const boardMaxHeight = Math.max(0, boardArea.height - frameChrome);

  useEffect(() => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current = null;
    }

    const isUrgent = mode === 'free'
      ? freeTimeLeft <= FREE_MODE_URGENT_THRESHOLD
      : movesLeft <= LOW_MOVES_THRESHOLD;
    const urgentAndPlaying = isUrgent && phase === 'playing' && !paused;

    if (urgentAndPlaying && !reduceMotion) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(vignetteOpacity, { toValue: 0.28, duration: 450, useNativeDriver: true }),
          Animated.timing(vignetteOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      // Reduce Motion: hold the vignette at its peak instead of pulsing, so the
      // low-moves/low-time cue still shows without the rhythmic flashing.
      Animated.timing(vignetteOpacity, { toValue: urgentAndPlaying ? 0.28 : 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [mode, movesLeft <= LOW_MOVES_THRESHOLD, freeTimeLeft <= FREE_MODE_URGENT_THRESHOLD, phase, paused, reduceMotion]);

  const isDisabled = phase !== 'playing' || paused;

  return (
    <SafeAreaView style={styles.safe}>
      <GameBackdrop />
      {/* Pause/cleared/failed overlays below cover this content visually but don't
          unmount it - hide it from the accessibility tree too while that's true, so
          VoiceOver/Switch Control can't land on the board or score currently hidden
          underneath. */}
      <View
        style={styles.gameContent}
        importantForAccessibility={isDisabled ? 'no-hide-descendants' : 'yes'}
        accessibilityElementsHidden={isDisabled}
      >
        <TopBar
          styles={styles}
          mode={mode}
          level={level}
          score={score}
          movesLeft={movesLeft}
          combo={combo}
          paused={paused}
          onPause={togglePause}
        />

        {mode === 'free' ? (
          <FreeModeTimer freeTimeLeft={freeTimeLeft} />
        ) : (
          <ObjectiveBar levelScore={levelScore} targetScore={config.targetScore} movesLeft={movesLeft} />
        )}

        <View style={styles.boardContainer} onLayout={onBoardContainerLayout}>
          {boardArea.width > 0 && boardArea.height > 0 && (
            <View style={styles.boardFrame}>
              <Board
                board={board}
                maxWidth={boardMaxWidth}
                maxHeight={boardMaxHeight}
                movesLeft={movesLeft}
                phase={phase}
                paused={paused}
                pendingResolution={pendingResolution}
                onSwap={attemptSwap}
                onResolutionDone={finishResolution}
              />
            </View>
          )}
        </View>
      </View>

      <Animated.View
        style={[styles.vignette, { opacity: vignetteOpacity }]}
        pointerEvents="none"
      />

      {paused && <PauseOverlay styles={styles} onResume={togglePause} onMenu={returnToMenu} />}

      {phase === 'intro' && !paused && (
        <IntroOverlay
          styles={styles}
          mode={mode}
          level={level}
          config={config}
          freeBestScore={freeBestScore}
          onStart={startPlaying}
        />
      )}

      {phase === 'cleared' && !paused && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text
              style={[styles.overlayText, styles.clearText]}
              accessibilityLiveRegion="assertive"
              accessibilityLabel="Level complete!"
            >LEVEL COMPLETE!</Text>
            <Stars styles={styles} count={levelStats.stars} />
          </View>
        </View>
      )}
      {phase === 'failed' && !paused && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text
              style={[styles.overlayText, styles.failText]}
              accessibilityLiveRegion="assertive"
              accessibilityLabel={mode === 'free' ? "Time's up!" : 'Out of moves!'}
            >{mode === 'free' ? "TIME'S UP!" : 'OUT OF MOVES!'}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  gameContent: {
    flex: 1,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardFrame: {
    alignSelf: 'center',
    backgroundColor: theme.cardAlt,
    borderRadius: 20,
    borderWidth: FRAME_BORDER,
    borderColor: theme.border,
    padding: FRAME_PADDING,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  vignette: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FF2D55',
    zIndex: 5,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 10,
  },
  modalCard: {
    alignItems: 'center',
    gap: 20,
    minWidth: 280,
    maxWidth: '85%',
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 32,
    paddingHorizontal: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  introTitle: {
    fontFamily: 'BadUnicorn',
    fontSize: 36,
    color: theme.textOnCard,
    letterSpacing: 4,
  },
  introSubtitle: {
    fontFamily: 'BadUnicorn',
    fontSize: 20,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  introStatsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  introStat: {
    alignItems: 'center',
    gap: 2,
  },
  introStatLabel: {
    fontFamily: 'BadUnicorn',
    fontSize: 13,
    color: theme.textSecondary,
    letterSpacing: 2,
  },
  introStatValue: {
    fontFamily: 'BadUnicorn',
    fontSize: 26,
    color: theme.accentOrange,
  },
  pausedTitle: {
    fontFamily: 'BadUnicorn',
    fontSize: 48,
    color: '#FFFFFF',
    letterSpacing: 8,
    marginBottom: 8,
  },
  resumeBtn: {
    backgroundColor: '#BF5AF2',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#FF2D55',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    minWidth: 240,
    alignItems: 'center',
  },
  resumeText: {
    fontFamily: 'BadUnicorn',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  menuBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 240,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    borderRadius: 14,
    backgroundColor: '#554e4e'
  },
  menuText: {
    fontFamily: 'BadUnicorn',
    fontSize: 15,
    color: '#f3f3fa',
    letterSpacing: 2,

  },
  overlayText: {
    fontFamily: 'BadUnicorn',
    fontSize: 42,
    letterSpacing: 4,
  },
  clearText: {
    color: '#30D158',
    fontSize: 28,
    textAlign: 'center',
  },
  failText: {
    color: '#FF2D55',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 40,
    color: '#FFD60A',
  },
  starEmpty: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  statsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  });
}
