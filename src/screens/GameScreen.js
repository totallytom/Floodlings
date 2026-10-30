import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Board from '../components/Board';
import HUD from '../components/HUD';
import ObjectiveBar from '../components/ObjectiveBar';
import RescueObjectiveBar from '../components/RescueObjectiveBar';
import FreeModeTimer from '../components/FreeModeTimer';
import GameBackdrop from '../components/GameBackdrop';
import { LOW_MOVES_THRESHOLD, FREE_MODE_SECONDS, FREE_MODE_URGENT_THRESHOLD, COMBO_CALLOUT_COLORS, ZEN_BLOOM_POINTS } from '../constants';
import { iconForType, colorForType } from '../animals';
import { t } from '../i18n';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';
import { modePalette, MODE_BACKDROPS, RESCUE_GOLD, ZEN_MIST, FREE_EMBER } from '../modeThemes';
import ZenBloomBar from '../components/ZenBloomBar';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

// Single source of truth for the boardFrame's padding/border - both the style
// below and the size math in GameScreen read from these, so they can't drift
// out of sync with each other.
const FRAME_PADDING = 26;
const FRAME_BORDER = 2;

function TopBar({ styles, mode, level, score, movesLeft, combo, streak, paused, onPause }) {
  return (
    <View style={styles.topBar}>
      <HUD
        mode={mode}
        level={level}
        score={score}
        movesLeft={movesLeft}
        combo={combo}
        streak={streak}
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
        <Text accessibilityRole="header" style={styles.pausedTitle}>{t('pause.title')}</Text>
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={onResume}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('pause.resumeA11y')}
          accessibilityHint={t('pause.resumeHint')}
        >
          <Text style={styles.resumeText}>{t('pause.resume')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onMenu}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('pause.menuA11y')}
          accessibilityHint={t('pause.menuHint')}
        >
          <Text style={styles.menuText}>{t('pause.menu')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Per-mode intro card looks - each a fixed dark fill with its own trim, so all
// text on them uses fixed light colors in both themes.
const INTRO_LOOKS = {
  rescue: { card: '#143A2B', trim: RESCUE_GOLD, badgeText: '#3A2A00', chipValue: RESCUE_GOLD, soft: '#BFE5C9', btn: '#30D158', btnLip: '#1E8E3E', btnText: '#0A2E14' },
  zen: { card: '#16304A', trim: ZEN_MIST, badgeText: '#0D2433', chipValue: ZEN_MIST, soft: '#CDEAF2', btn: ZEN_MIST, btnLip: '#5FA8BE', btnText: '#0D2433' },
  free: { card: '#2A1206', trim: FREE_EMBER, badgeText: '#2A1206', chipValue: '#FFD60A', soft: '#FFD3A8', btn: FREE_EMBER, btnLip: '#B86F00', btnText: '#2A1206' },
};

// Shared shell for the Rescue/Zen/Free intros: a badge on the top edge, a
// title, a hero (portrait or big emoji), stat chips, a hint and a start
// button, all in the mode's colors - so each mode opens with its own identity
// instead of the generic level card Levels uses.
function ModeIntroCard({ styles, look, badge, title, hero, chips, chipsLabel, hint, buttonText, buttonLabel, buttonHint, onStart }) {
  const reduceMotion = useReduceMotion();
  // Card and hero are both visible from the first frame and only bounce in
  // scale. They used to fade in from invisible (the hero on its own delayed
  // spring), and since this card mounts while the board's ~100 tiles are
  // mounting, those animations started late - the portrait/emoji looked like
  // it was slow to load.
  const cardBounce = useRef(new Animated.Value(reduceMotion ? 1 : 0.92)).current;
  const heroBounce = useRef(new Animated.Value(reduceMotion ? 1 : 0.6)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.spring(cardBounce, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }).start();
    Animated.spring(heroBounce, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.briefingCard, { backgroundColor: look.card, borderColor: look.trim, transform: [{ scale: cardBounce }] }]}>
        <View style={[styles.briefingBadge, { backgroundColor: look.trim }]}>
          <Text style={[styles.briefingBadgeText, { color: look.badgeText }]} maxFontSizeMultiplier={1.3}>{badge}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.briefingTitle} maxFontSizeMultiplier={1.3}>{title}</Text>
        <Animated.View style={[styles.briefingPortraitHalo, { backgroundColor: `${look.trim}2E`, transform: [{ scale: heroBounce }] }]}>
          {hero}
        </Animated.View>
        <View style={styles.briefingChips} accessible accessibilityLabel={chipsLabel}>
          {chips.map(chip => (
            <View key={chip.key} style={styles.briefingChip}>
              <Text accessible={false} style={[styles.briefingChipValue, { color: look.chipValue }]}>{chip.value}</Text>
              <Text accessible={false} style={[styles.briefingChipLabel, { color: look.soft }]}>{chip.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.briefingHint, { color: look.soft }]} maxFontSizeMultiplier={1.3}>{hint}</Text>
        <TouchableOpacity
          style={[styles.briefingBtn, { backgroundColor: look.btn, borderBottomColor: look.btnLip }]}
          onPress={onStart}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          accessibilityHint={buttonHint}
        >
          <Text style={[styles.briefingBtnText, { color: look.btnText }]}>{buttonText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function IntroOverlay({ styles, mode, level, config, freeBestScore, zenBestScore, onStart }) {
  if (mode === 'zen') {
    return (
      <ModeIntroCard
        styles={styles}
        look={INTRO_LOOKS.zen}
        badge={`🌙 ${t('zen.badge')}`}
        title={t('zen.title')}
        hero={<Text style={styles.briefingHeroEmoji} allowFontScaling={false}>🌸</Text>}
        chips={[
          { key: 'limits', value: '∞', label: t('zen.noLimits') },
          { key: 'best', value: zenBestScore.toLocaleString(), label: t('common.best') },
        ]}
        chipsLabel={t('zen.chipsA11y', { score: zenBestScore.toLocaleString() })}
        hint={t('zen.hint', { points: ZEN_BLOOM_POINTS.toLocaleString() })}
        buttonText={t('zen.begin')}
        buttonLabel={t('zen.startA11y')}
        buttonHint={t('zen.startHint', { score: zenBestScore.toLocaleString() })}
        onStart={onStart}
      />
    );
  }

  if (mode === 'rescue') {
    const goal = { n: level, count: config.targetCount, type: config.targetType, moves: config.moves };
    return (
      <ModeIntroCard
        styles={styles}
        look={INTRO_LOOKS.rescue}
        badge={`🎖️ ${t('rescue.badge', { n: level })}`}
        title={t('rescue.title', goal)}
        hero={(
          <View style={[styles.briefingPortrait, { borderColor: colorForType(config.targetType) }]}>
            <Image source={iconForType(config.targetType)} style={styles.briefingPortraitIcon} />
          </View>
        )}
        chips={[
          { key: 'target', value: `🎯 ${config.targetCount}`, label: t('rescue.toRescue') },
          { key: 'moves', value: `👣 ${config.moves}`, label: t('common.moves') },
        ]}
        chipsLabel={t('rescue.goalA11y', goal)}
        hint={t('rescue.hint', goal)}
        buttonText={t('rescue.start')}
        buttonLabel={t('rescue.startA11y')}
        buttonHint={t('rescue.startHint', goal)}
        onStart={onStart}
      />
    );
  }

  if (mode === 'free') {
    const timeLabel = `${Math.floor(FREE_MODE_SECONDS / 60)}:${String(FREE_MODE_SECONDS % 60).padStart(2, '0')}`;
    return (
      <ModeIntroCard
        styles={styles}
        look={INTRO_LOOKS.free}
        badge={`⚡ ${t('free.badge')}`}
        title={t('free.title')}
        hero={<Text style={styles.briefingHeroEmoji} allowFontScaling={false}>⏱️</Text>}
        chips={[
          { key: 'time', value: timeLabel, label: t('free.onTheClock') },
          { key: 'best', value: freeBestScore.toLocaleString(), label: t('common.best') },
        ]}
        chipsLabel={t('free.chipsA11y', { time: timeLabel, score: freeBestScore.toLocaleString() })}
        hint={t('free.hint')}
        buttonText={t('free.go')}
        buttonLabel={t('free.startA11y')}
        buttonHint={t('free.startHint', { time: timeLabel, score: freeBestScore.toLocaleString() })}
        onStart={onStart}
      />
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        <Text accessibilityRole="header" style={styles.introTitle}>{t('common.levelN', { n: level })}</Text>
        <View
          style={styles.introStatsRow}
          accessible
          accessibilityLabel={t('intro.levelsA11y', { score: config.targetScore.toLocaleString(), moves: config.moves })}
        >
          <View style={styles.introStat}>
            <Text accessible={false} style={styles.introStatLabel}>{t('intro.target')}</Text>
            <Text accessible={false} style={styles.introStatValue}>{config.targetScore.toLocaleString()}</Text>
          </View>
          <View style={styles.introStat}>
            <Text accessible={false} style={styles.introStatLabel}>{t('common.moves')}</Text>
            <Text accessible={false} style={styles.introStatValue}>{config.moves}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={onStart}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('intro.startLevel')}
          accessibilityHint={t('intro.startLevelHint', { n: level, score: config.targetScore.toLocaleString(), moves: config.moves })}
        >
          <Text style={styles.resumeText}>{t('common.start')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Earned stars slam in one after another; unearned ones just fade in dim.
function AnimatedStar({ styles, earned, index, reduceMotion }) {
  const anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.delay(250 + index * 220),
      earned
        ? Animated.spring(anim, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true })
        : Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.star,
        !earned && styles.starEmpty,
        {
          opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: earned
            ? [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [2.6, 1] }) },
                { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
              ]
            : [],
        },
      ]}
      maxFontSizeMultiplier={1.3}
    >★</Animated.Text>
  );
}

function Stars({ styles, count, reduceMotion }) {
  return (
    <View style={styles.starsRow} accessible accessibilityLabel={t('end.starsA11y', { count })}>
      {[0, 1, 2].map(i => (
        <AnimatedStar key={i} styles={styles} earned={i < count} index={i} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}

// Big "GREAT!"-style word that bursts over the board for each cascade step.
// Keyed by nonce in the parent so each step remounts and replays it.
function ComboCallout({ styles, tier, streak, reduceMotion }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      reduceMotion
        ? Animated.timing(anim, { toValue: 1, duration: 1, useNativeDriver: true })
        : Animated.spring(anim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.delay(450),
      Animated.timing(anim, { toValue: 2, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const word = t(`combo.callout.${Math.min(tier, COMBO_CALLOUT_COLORS.length - 1)}`);
  const color = COMBO_CALLOUT_COLORS[Math.min(tier, COMBO_CALLOUT_COLORS.length - 1)];
  // Alternate the tilt so back-to-back callouts don't look identical.
  const tilt = tier % 2 === 0 ? '-6deg' : '5deg';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.calloutWrap,
        {
          opacity: anim.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, reduceMotion ? 1 : 1.25] }) },
            { rotate: reduceMotion ? '0deg' : tilt },
          ],
        },
      ]}
    >
      <Text
        style={[styles.calloutText, { color, fontSize: 40 + Math.min(tier, 5) * 4, textShadowColor: color }]}
        allowFontScaling={false}
        accessible={false}
      >
        {word}
      </Text>
      {streak >= 2 && (
        <Text style={styles.calloutStreak} allowFontScaling={false}>🔥 {t('common.streak', { n: streak })}</Text>
      )}
    </Animated.View>
  );
}

// Streak tiers for the board frame's glow ring - none below 2.
const STREAK_GLOW_COLORS = ['#FF9F0A', '#FF2D55', '#BF5AF2'];
function streakGlowColor(streak) {
  if (streak >= 6) return STREAK_GLOW_COLORS[2];
  if (streak >= 4) return STREAK_GLOW_COLORS[1];
  return STREAK_GLOW_COLORS[0];
}

export default function GameScreen({
  mode, level, score, board, movesLeft, levelScore, rescueCount,
  freeTimeLeft, freeBestScore, zenBestScore,
  combo, streak, phase, config, pendingResolution,
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
  // Insets come from the provider's initialWindowMetrics (App.js), so they're
  // correct on the very first frame - unlike the SafeAreaView component, whose
  // padding can land a frame late and shrink the board after its first layout.
  const insets = useSafeAreaInsets();
  const boardReveal = useRef(new Animated.Value(0)).current;
  const boardRevealedRef = useRef(false);
  const boardSettleTimer = useRef(null);
  const [callout, setCallout] = useState(null);
  const calloutNonce = useRef(0);
  const shakeX = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const streakGlow = useRef(new Animated.Value(0)).current;
  const zenBreath = useRef(new Animated.Value(0.25)).current;

  // Zen's board frame slowly "breathes" - a 4-second glow in and out, about the
  // pace of a calm breath. Reduce Motion holds it at a steady soft glow.
  useEffect(() => {
    if (mode !== 'zen' || reduceMotion) {
      zenBreath.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zenBreath, { toValue: 0.9, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(zenBreath, { toValue: 0.15, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mode, reduceMotion]);

  // Fired by Board as each cascade step starts popping. Step 0 (the swap's own
  // match) only earns a callout for a 4+ match; every chained step gets one,
  // escalating NICE! -> LEGENDARY!, plus a flash and (from step 2) a shake.
  const onCascadeStep = useCallback((step) => {
    const bigMatch = step.runs.some(r => r.length >= 4);
    if (step.cascadeIndex === 0 && !bigMatch) return;
    calloutNonce.current += 1;
    setCallout({ nonce: calloutNonce.current, tier: step.cascadeIndex });

    if (reduceMotion) return;
    flash.setValue(Math.min(0.15 + step.cascadeIndex * 0.08, 0.4));
    Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    if (step.cascadeIndex >= 2) {
      const mag = Math.min(4 + step.cascadeIndex * 2, 12);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: mag, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -mag, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: mag / 2, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [reduceMotion]);

  useEffect(() => {
    Animated.timing(streakGlow, { toValue: streak >= 2 ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [streak >= 2]);

  // The board stays invisible until its container has stopped resizing, then
  // fades in already at its final size - otherwise any late layout change
  // (panels above it settling) re-sizes the tiles on screen and every row
  // visibly jumps into place. Once shown it's never hidden again.
  const onBoardContainerLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setBoardArea({ width, height });
    if (boardRevealedRef.current) return;
    clearTimeout(boardSettleTimer.current);
    boardSettleTimer.current = setTimeout(() => {
      boardRevealedRef.current = true;
      Animated.timing(boardReveal, { toValue: 1, duration: reduceMotion ? 1 : 180, useNativeDriver: true }).start();
    }, 120);
  }, [reduceMotion]);

  useEffect(() => () => clearTimeout(boardSettleTimer.current), []);

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

    // Zen has no moves/time budget to ever run low on - movesLeft just sits at
    // whatever it was left at by a previous session, so without this explicit
    // false it could misread as "urgent" and pulse the vignette for no reason.
    const isUrgent = mode === 'free'
      ? freeTimeLeft <= FREE_MODE_URGENT_THRESHOLD
      : mode === 'zen'
        ? false
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
  const isRescue = mode === 'rescue';
  const palette = modePalette(mode, theme);

  return (
    <View
      style={[
        styles.safe,
        palette && { backgroundColor: palette.background },
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <GameBackdrop variant={MODE_BACKDROPS[mode]} />
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
          streak={streak}
          paused={paused}
          onPause={togglePause}
        />

        {mode === 'free' ? (
          <FreeModeTimer freeTimeLeft={freeTimeLeft} />
        ) : mode === 'zen' ? (
          <ZenBloomBar score={score} />
        ) : mode === 'rescue' ? (
          <RescueObjectiveBar
            rescueCount={rescueCount}
            targetCount={config.targetCount}
            targetType={config.targetType}
            movesLeft={movesLeft}
          />
        ) : (
          <ObjectiveBar levelScore={levelScore} targetScore={config.targetScore} movesLeft={movesLeft} />
        )}

        <View style={styles.boardContainer} onLayout={onBoardContainerLayout}>
          {boardArea.width > 0 && boardArea.height > 0 && (
            <Animated.View
              style={[
                styles.boardFrame,
                palette && { backgroundColor: palette.frame, borderColor: palette.frameBorder },
                { opacity: boardReveal, transform: [{ translateX: shakeX }] },
              ]}
            >
              {mode === 'zen' && (
                <Animated.View pointerEvents="none" style={[styles.zenBreath, { opacity: zenBreath }]} />
              )}
              <Animated.View
                pointerEvents="none"
                style={[styles.streakRing, { borderColor: streakGlowColor(streak), shadowColor: streakGlowColor(streak), opacity: streakGlow }]}
              />
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
                onCascadeStep={onCascadeStep}
                highlightType={isRescue ? config.targetType : null}
              />
              <Animated.View pointerEvents="none" style={[styles.boardFlash, { opacity: flash }]} />
            </Animated.View>
          )}
          {callout && (
            <ComboCallout
              key={callout.nonce}
              styles={styles}
              tier={callout.tier}
              streak={streak}
              reduceMotion={reduceMotion}
            />
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
          zenBestScore={zenBestScore}
          onStart={startPlaying}
        />
      )}

      {phase === 'cleared' && !paused && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {isRescue ? (
              <>
                <Image source={iconForType(config.targetType)} style={styles.introAnimalIcon} />
                <Text
                  style={[styles.overlayText, styles.clearText]}
                  accessibilityLiveRegion="assertive"
                  accessibilityLabel={t('rescue.clearedA11y', { type: config.targetType })}
                >{t('rescue.cleared', { type: config.targetType })}</Text>
              </>
            ) : (
              <Text
                style={[styles.overlayText, styles.clearText]}
                accessibilityLiveRegion="assertive"
                accessibilityLabel={t('end.levelCompleteA11y')}
              >{t('end.levelComplete')}</Text>
            )}
            <Stars styles={styles} count={levelStats.stars} reduceMotion={reduceMotion} />
          </View>
        </View>
      )}
      {phase === 'failed' && !paused && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text
              style={[styles.overlayText, styles.failText]}
              accessibilityLiveRegion="assertive"
              accessibilityLabel={mode === 'free' ? t('end.timesUpA11y') : t('end.outOfMovesA11y')}
            >{mode === 'free' ? t('end.timesUp') : t('end.outOfMoves')}</Text>
          </View>
        </View>
      )}
    </View>
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
  // Mode intro cards (Rescue/Zen/Free): colors come from INTRO_LOOKS.
  briefingCard: {
    alignItems: 'center',
    gap: 14,
    minWidth: 290,
    maxWidth: '88%',
    borderRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 6,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  briefingBadge: {
    position: 'absolute',
    top: -16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  briefingBadgeText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    letterSpacing: 2,
  },
  briefingTitle: {
    fontFamily: DISPLAY_FONT,
    fontSize: 26,
    lineHeight: lineHeightFor(26),
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  briefingPortraitHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefingPortrait: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefingPortraitIcon: {
    width: 66,
    height: 66,
    resizeMode: 'contain',
  },
  briefingChips: {
    flexDirection: 'row',
    gap: 12,
  },
  briefingChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 104,
  },
  briefingHeroEmoji: {
    fontSize: 60,
  },
  briefingChipValue: {
    fontFamily: DISPLAY_FONT,
    fontSize: 24,
    lineHeight: lineHeightFor(24),
  },
  briefingChipLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    letterSpacing: 2,
  },
  briefingHint: {
    fontFamily: DISPLAY_FONT,
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    textAlign: 'center',
  },
  briefingBtn: {
    borderBottomWidth: 4,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 240,
    alignItems: 'center',
  },
  // Dark text on every mode's bright button - white on these fails AA.
  briefingBtnText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    letterSpacing: 4,
  },
  zenBreath: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: ZEN_MIST,
    shadowColor: ZEN_MIST,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  streakRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 3,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  boardFlash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  calloutWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  calloutText: {
    fontFamily: DISPLAY_FONT,
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  calloutStreak: {
    fontFamily: DISPLAY_FONT,
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    fontFamily: DISPLAY_FONT,
    fontSize: 36,
    lineHeight: lineHeightFor(36),
    color: theme.textOnCard,
    letterSpacing: 4,
  },
  introStatsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  introAnimalIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  introStat: {
    alignItems: 'center',
    gap: 2,
  },
  introStatLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    color: theme.textSecondary,
    letterSpacing: 2,
  },
  introStatValue: {
    fontFamily: DISPLAY_FONT,
    fontSize: 26,
    lineHeight: lineHeightFor(26),
    color: theme.accentOrange,
  },
  pausedTitle: {
    fontFamily: DISPLAY_FONT,
    fontSize: 48,
    lineHeight: lineHeightFor(48),
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
    fontFamily: DISPLAY_FONT,
    fontSize: 18,
    lineHeight: lineHeightFor(18),
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
    fontFamily: DISPLAY_FONT,
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    color: '#f3f3fa',
    letterSpacing: 2,

  },
  overlayText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 42,
    lineHeight: lineHeightFor(42),
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
