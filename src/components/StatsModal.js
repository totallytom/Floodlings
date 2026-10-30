import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';
import { usePopIn } from '../hooks/usePopIn';
import { iconForType } from '../animals';
import { t } from '../i18n';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

const COUNT_UP_MS = 900;

// Mode tiles sit on their own saturated fills (white text on each clears WCAG
// AA), so they read the same in light and dark themes. Mascots reuse the board
// animals: tiger/flamingo/panda/peacock = types 0/2/1/3.
const MODES = [
  { key: 'levels', color: '#6B21A8', lip: '#4A1475', mascot: 0 },
  { key: 'free', color: '#C2410C', lip: '#8A2E08', mascot: 2 },
  { key: 'zen', color: '#0F766E', lip: '#0A524C', mascot: 1 },
  { key: 'rescue', color: '#B0102E', lip: '#7A0B20', mascot: 3 },
];

// Counts from 0 to `value` each time the modal opens.
function CountUp({ value, visible, delay, reduceMotion, style }) {
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!visible || reduceMotion || value === 0) {
      setShown(value);
      return;
    }
    setShown(0);
    let frame;
    let start;
    const timer = setTimeout(() => {
      start = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [visible, value, reduceMotion]);

  return <Text accessible={false} style={style} maxFontSizeMultiplier={1.3}>{shown.toLocaleString()}</Text>;
}

// Horizontal bar that grows to `fraction` of its track. Width animates on the
// JS driver (native can't drive layout), which is fine for a one-shot.
function FillBar({ fraction, color, visible, delay, reduceMotion, styles, trackStyle }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    if (reduceMotion) {
      anim.setValue(fraction);
      return;
    }
    Animated.timing(anim, {
      toValue: fraction,
      duration: 800,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, fraction, reduceMotion]);

  return (
    <View style={[styles.barTrack, trackStyle]}>
      <Animated.View
        style={[
          styles.barFill,
          { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

function ModeTile({ mode, best, level, index, visible, reduceMotion, styles }) {
  const pop = usePopIn(visible, 250 + index * 90, reduceMotion);
  const title = t(`stats.mode.${mode.key}`);
  const a11y = level
    ? t('stats.tileLevelA11y', { mode: title, score: best.toLocaleString(), n: level })
    : t('stats.tileA11y', { mode: title, score: best.toLocaleString() });

  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: mode.color, borderBottomColor: mode.lip }, pop]}
      accessible
      accessibilityLabel={a11y}
    >
      {/* Oversized faded mascot bleeding off the corner as a backdrop. */}
      <Image source={iconForType(mode.mascot)} style={styles.tileMascotBg} resizeMode="contain" accessible={false} />
      <View style={styles.tileShine} pointerEvents="none" />
      <View style={styles.tileHeader}>
        <Image source={iconForType(mode.mascot)} style={styles.tileMascot} resizeMode="contain" accessible={false} />
        <Text style={styles.tileTitle} maxFontSizeMultiplier={1.3}>{title}</Text>
      </View>
      <Text style={styles.tileLabel} maxFontSizeMultiplier={1.3}>{t('common.best')}</Text>
      <CountUp
        value={best}
        visible={visible}
        delay={350 + index * 90}
        reduceMotion={reduceMotion}
        style={styles.tileValue}
      />
      {level ? (
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText} maxFontSizeMultiplier={1.3}>{t('stats.lv', { n: level })}</Text>
        </View>
      ) : (
        <View style={styles.levelPillSpacer} />
      )}
    </Animated.View>
  );
}

export default function StatsModal({
  visible, onClose,
  highScore, bestLevel,
  freeBestScore,
  zenBestScore,
  rescueBestScore, rescueBestLevel,
  levelsStars = {}, rescueStars = {},
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();

  const ratings = [...Object.values(levelsStars), ...Object.values(rescueStars)];
  const levelsCleared = ratings.length;
  const totalStars = ratings.reduce((sum, n) => sum + n, 0);
  const maxStars = levelsCleared * 3;
  const starCounts = [3, 2, 1].map(n => ratings.filter(r => r === n).length);
  const mostCommon = Math.max(1, ...starCounts);

  const best = { levels: highScore, free: freeBestScore, zen: zenBestScore, rescue: rescueBestScore };
  const levelFor = { levels: bestLevel, rescue: rescueBestLevel };

  const heroPop = usePopIn(visible, 80, reduceMotion);
  const breakdownPop = usePopIn(visible, 650, reduceMotion);

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'fade' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>🏆 {t('stats.title')}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('stats.close')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[styles.hero, heroPop]}
            accessible
            accessibilityLabel={t('stats.heroA11y', { stars: totalStars, max: maxStars, n: levelsCleared })}
          >
            <View style={styles.heroGlow} pointerEvents="none" />
            <Text style={styles.heroStar} allowFontScaling={false}>★</Text>
            <View style={styles.heroBody}>
              <Text style={styles.heroLabel} maxFontSizeMultiplier={1.3}>{t('stats.starsCollected')}</Text>
              <View style={styles.heroValueRow}>
                <CountUp value={totalStars} visible={visible} delay={150} reduceMotion={reduceMotion} style={styles.heroValue} />
                <Text style={styles.heroMax} maxFontSizeMultiplier={1.3}> / {maxStars}</Text>
              </View>
              <FillBar
                fraction={maxStars ? totalStars / maxStars : 0}
                color="#FFD60A"
                visible={visible}
                delay={250}
                reduceMotion={reduceMotion}
                styles={styles}
                trackStyle={styles.heroTrack}
              />
              <Text style={styles.heroSub} maxFontSizeMultiplier={1.3}>
                {levelsCleared === 0 ? t('stats.noStars') : t('stats.levelsCleared', { n: levelsCleared })}
              </Text>
            </View>
          </Animated.View>

          <Text accessibilityRole="header" style={styles.sectionLabel}>{t('stats.personalBests')}</Text>
          <View style={styles.grid}>
            {MODES.map((mode, i) => (
              <ModeTile
                key={mode.key}
                mode={mode}
                best={best[mode.key]}
                level={levelFor[mode.key]}
                index={i}
                visible={visible}
                reduceMotion={reduceMotion}
                styles={styles}
              />
            ))}
          </View>

          {levelsCleared > 0 && (
            <>
              <Text accessibilityRole="header" style={styles.sectionLabel}>{t('stats.starRatings')}</Text>
              <Animated.View style={[styles.breakdown, breakdownPop]}>
                {[3, 2, 1].map((n, i) => (
                  <View
                    key={n}
                    style={styles.breakdownRow}
                    accessible
                    accessibilityLabel={t('stats.ratingA11y', { count: starCounts[i], n })}
                  >
                    <Text style={styles.breakdownStars} allowFontScaling={false}>
                      {'★'.repeat(n)}<Text style={styles.breakdownStarsEmpty}>{'★'.repeat(3 - n)}</Text>
                    </Text>
                    <FillBar
                      fraction={starCounts[i] / mostCommon}
                      color={['#FFD60A', '#FF9F0A', '#FF6B3D'][i]}
                      visible={visible}
                      delay={750 + i * 120}
                      reduceMotion={reduceMotion}
                      styles={styles}
                      trackStyle={styles.breakdownTrack}
                    />
                    <Text style={styles.breakdownCount} maxFontSizeMultiplier={1.3}>{starCounts[i]}</Text>
                  </View>
                ))}
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.cardAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: DISPLAY_FONT,
    fontSize: 30,
    lineHeight: lineHeightFor(30),
    color: theme.textPrimary,
    letterSpacing: 6,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  closeText: {
    fontSize: 28,
    color: theme.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  sectionLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    color: theme.textSecondary,
    letterSpacing: 3,
    marginTop: 8,
    marginLeft: 4,
  },

  // Hero: fixed deep-purple card with gold, readable in both themes.
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#2A1050',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderBottomWidth: 5,
    borderBottomColor: '#160828',
    overflow: 'hidden',
    shadowColor: '#BF5AF2',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    left: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 214, 10, 0.18)',
  },
  heroStar: {
    fontSize: 64,
    color: '#FFD60A',
    textShadowColor: 'rgba(255, 214, 10, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  heroBody: {
    flex: 1,
    gap: 4,
  },
  heroLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    color: '#D9C6F5',
    letterSpacing: 2,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontFamily: DISPLAY_FONT,
    fontSize: 44,
    lineHeight: lineHeightFor(44),
    color: '#FFFFFF',
  },
  heroMax: {
    fontFamily: DISPLAY_FONT,
    fontSize: 22,
    lineHeight: lineHeightFor(22),
    color: '#B9A3DC',
  },
  heroTrack: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  heroSub: {
    fontFamily: DISPLAY_FONT,
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    color: '#D9C6F5',
    letterSpacing: 2,
    marginTop: 4,
  },

  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: theme.overlayMedium,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    width: '48.5%',
    borderRadius: 20,
    padding: 14,
    gap: 2,
    overflow: 'hidden',
    borderBottomWidth: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tileMascotBg: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    width: 96,
    height: 96,
    opacity: 0.18,
  },
  tileShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tileMascot: {
    width: 28,
    height: 28,
  },
  tileTitle: {
    fontFamily: DISPLAY_FONT,
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  tileLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 2,
  },
  tileValue: {
    fontFamily: DISPLAY_FONT,
    fontSize: 28,
    lineHeight: lineHeightFor(28),
    color: '#FFFFFF',
  },
  levelPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  levelPillText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    color: '#FFD60A',
    letterSpacing: 1,
  },
  // Keeps tiles without a level the same height as their row-mate.
  levelPillSpacer: {
    height: 27,
  },

  breakdown: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownStars: {
    width: 62,
    fontSize: 18,
    color: '#FFD60A',
    letterSpacing: 1,
  },
  breakdownStarsEmpty: {
    color: 'rgba(255, 255, 255, 0.25)',
  },
  breakdownTrack: {
    height: 14,
    borderRadius: 8,
  },
  breakdownCount: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    color: theme.textOnCard,
    minWidth: 28,
    textAlign: 'right',
  },
  });
}
