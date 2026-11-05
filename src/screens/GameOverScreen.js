import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, Platform, findNodeHandle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { CONTINUE_EXTRA_MOVES } from '../constants';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

export default function GameOverScreen({ mode = 'levels', score, highScore, level, onPlayAgain, onHome, onContinue, canContinue }) {
  const styles = useMemo(createStyles, []);
  const isNewRecord = score > 0 && score >= highScore;
  // Levels/Rescue keep a checkpoint, so "again" means this level, not level 1.
  const isLevelBased = mode === 'levels' || mode === 'rescue';
  const headingRef = useRef(null);

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);

    // accessibilityLiveRegion on the "New record" text below is Android-only; iOS needs
    // an explicit announcement. Delayed slightly so it doesn't collide with VoiceOver
    // reading the "GAME OVER" heading focused just above.
    if (isNewRecord && Platform.OS === 'ios') {
      const timer = setTimeout(() => AccessibilityInfo.announceForAccessibility(t('over.newRecordA11y')), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text ref={headingRef} accessibilityRole="header" style={styles.title}>
          {mode === 'free' ? t('over.timesUp') : t('over.gameOver')}
        </Text>

        {isNewRecord && (
          <Text
            style={styles.newRecord}
            accessibilityLiveRegion="assertive"
            accessibilityLabel={t('over.newRecordA11y')}
          >{t('over.newRecord')}</Text>
        )}

        <View style={styles.statsBox}>
          <View accessible={true} accessibilityLabel={t('a11y.score', { score: score.toLocaleString() })} style={styles.stat}>
            <Text accessible={false} style={styles.statLabel}>{t('common.score')}</Text>
            <Text accessible={false} style={[styles.statValue, styles.statAccent]}>{score.toLocaleString()}</Text>
          </View>
          <View accessible={false} style={styles.divider} />
          {(mode === 'levels' || mode === 'rescue') && (
            <>
              <View accessible={true} accessibilityLabel={t('over.levelReachedA11y', { n: level })} style={styles.stat}>
                <Text accessible={false} style={styles.statLabel}>{t('over.levelReached')}</Text>
                <Text accessible={false} style={styles.statValue}>{level}</Text>
              </View>
              <View accessible={false} style={styles.divider} />
            </>
          )}
          <View accessible={true} accessibilityLabel={t('a11y.bestScore', { score: highScore.toLocaleString() })} style={styles.stat}>
            <Text accessible={false} style={styles.statLabel}>{t('common.bestScore')}</Text>
            <Text accessible={false} style={styles.statValue}>{highScore.toLocaleString()}</Text>
          </View>
        </View>

        {canContinue && (
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={onContinue}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('over.continueA11y', { n: CONTINUE_EXTRA_MOVES })}
            accessibilityHint={t('over.continueHint', { n: CONTINUE_EXTRA_MOVES })}
          >
            <Text style={styles.restoreText}>{t('over.continue')}</Text>
            <Text style={styles.restoreSubtext}>{t('over.continueSub', { n: CONTINUE_EXTRA_MOVES })}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.playAgainBtn}
          onPress={onPlayAgain}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isLevelBased ? t('over.tryAgainA11y', { n: level }) : t('over.playAgainA11y')}
          accessibilityHint={isLevelBased ? t('over.tryAgainHint') : t('over.playAgainHint')}
        >
          <Text style={styles.playAgainText}>{isLevelBased ? t('over.tryAgain', { n: level }) : t('over.playAgain')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={onHome}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('over.homeA11y')}
          accessibilityHint={t('over.homeHint')}
          hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
        >
          <Text style={styles.homeText}>{t('over.home')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Built per mount, not at module load, so it picks up the font of the language
// active at the time (see fonts.js).
function createStyles() {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1B0E33',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: DISPLAY_FONT,
    fontSize: 56,
    color: '#FF2D55',
    letterSpacing: 6,
    textAlign: 'center',
    // No fixed lineHeight - see the same note on HomeScreen's title style.
    shadowColor: '#FF2D55',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  newRecord: {
    fontFamily: DISPLAY_FONT,
    fontSize: 16,
    lineHeight: lineHeightFor(16),
    color: '#FF9F0A',
    letterSpacing: 4,
  },
  statsBox: {
    backgroundColor: '#111120',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E1E35',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E1E35',
    marginVertical: 2,
  },
  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: DISPLAY_FONT,
    // Was #444455 - failed WCAG AA badly (1.96:1) against the near-black stats card.
    color: '#9A9AB0',
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    letterSpacing: 2,
  },
  statValue: {
    fontFamily: DISPLAY_FONT,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: lineHeightFor(22),
  },
  statAccent: {
    fontFamily: DISPLAY_FONT,
    color: '#FF9F0A',
    fontSize: 32,
    lineHeight: lineHeightFor(32),
  },
  restoreBtn: {
    backgroundColor: '#1C1C2E',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9F0A',
    gap: 4,
  },
  restoreText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    color: '#FF9F0A',
    letterSpacing: 5,
  },
  restoreSubtext: {
    fontFamily: DISPLAY_FONT,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    color: '#886600',
    letterSpacing: 1,
  },
  playAgainBtn: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#FF2D55',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    width: '100%',
    alignItems: 'center',
  },
  playAgainText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    color: '#FFFFFF',
    letterSpacing: 5,
  },
  homeBtn: {
    paddingVertical: 10,
  },
  homeText: {
    fontFamily: DISPLAY_FONT,
    // Was #444455 - failed WCAG AA (2.07:1) against the near-black background.
    color: '#9A9AB0',
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    letterSpacing: 4,
  },
});
}
