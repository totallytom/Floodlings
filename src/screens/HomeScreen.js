import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsModal from '../components/SettingsModal';
import StatsModal from '../components/StatsModal';
import FloatingAnimals from '../components/FloatingAnimals';
import LevelPath from '../components/LevelPath';
import { useTheme } from '../hooks/useTheme';
import { featuredPromo, storeUrlFor } from '../crossPromo';
import { t } from '../i18n';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

export default function HomeScreen({
  highScore, onPlay, onRestart, bestLevel, levelsProgress, levelsStars,
  freeBestScore, onPlayFree,
  zenBestScore, onPlayZen,
  rescueBestScore, onPlayRescue, onRestartRescue, rescueBestLevel, rescueProgress, rescueStars,
  soundEnabled, toggleSound,
  settingsOpen, setSettingsOpen, languageChoice, onChangeLanguage,
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const headingRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  const hasLevelsProgress = levelsProgress.level > 1 || levelsProgress.score > 0;
  const hasRescueProgress = rescueProgress.level > 1 || rescueProgress.score > 0;
  // First-timers get the how-to-play hint at the bottom; once someone has
  // played, that slot shows the cross-promo card instead - the home screen
  // can't fit both without scrolling once the progress UI is showing.
  const isNewPlayer = !hasLevelsProgress && !hasRescueProgress && highScore === 0;
  const promo = featuredPromo();

  // Stars are kept either way - starting over only moves the checkpoint back
  // to level 1, so replaying can still improve old ratings.
  const confirmStartOver = () => {
    const buttons = [{ text: t('home.startOverCancel'), style: 'cancel' }];
    if (hasLevelsProgress) buttons.push({ text: t('home.startOverLevels', { n: levelsProgress.level }), style: 'destructive', onPress: onRestart });
    if (hasRescueProgress) buttons.push({ text: t('home.startOverRescue', { n: rescueProgress.level }), style: 'destructive', onPress: onRestartRescue });
    Alert.alert(t('home.startOverTitle'), t('home.startOverBody'), buttons);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingAnimals />
      {/* Scrollable so the extra progress UI can't push the bottom of the menu
          off-screen on short phones; on taller ones it stays centered. */}
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
      <View style={styles.container}>
        <View style={styles.topRightRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            onPress={() => setStatsVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('home.stats')}
          >
            {/* No dedicated stats image asset exists - a plain glyph matches how
                the app already handles other icon-only buttons (HUD's pause icon,
                GameOverScreen's stars) rather than adding a new asset for this. */}
            <Text style={styles.statsIcon}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            onPress={() => setSettingsOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
          >
            <Image source={require('../../assets/img/settings.png')} style={styles.settingsIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View
            ref={headingRef}
            style={styles.titleGroup}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="Floodlings"
          >
            <Text accessible={false} style={styles.title}>FLOOD</Text>
            <Text accessible={false} style={[styles.title, styles.titleAccent]}>LINGS</Text>
          </View>
          <Text accessible={false} style={styles.tagline}>{t('home.tagline')}</Text>
        </View>

        {highScore > 0 && (
          <View
            style={styles.hsBox}
            accessible={true}
            accessibilityLabel={t('a11y.bestScore', { score: highScore.toLocaleString() })}
          >
            <Text accessible={false} style={styles.hsLabel}>{t('common.bestScore')}</Text>
            <Text accessible={false} style={styles.hsValue}>{highScore.toLocaleString()}</Text>
          </View>
        )}

        {hasLevelsProgress && <LevelPath currentLevel={levelsProgress.level} stars={levelsStars} />}

        <View style={styles.playGroup}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={onPlay}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={hasLevelsProgress ? t('home.continueA11y', { n: levelsProgress.level }) : t('home.playA11y')}
            accessibilityHint={hasLevelsProgress ? t('home.continueHint') : t('home.playHint')}
          >
            <Text style={styles.playText}>{hasLevelsProgress ? t('home.continue') : t('home.play')}</Text>
            {hasLevelsProgress && (
              <Text style={styles.playSubtext}>{t('common.levelN', { n: levelsProgress.level })}</Text>
            )}
          </TouchableOpacity>
          {(hasLevelsProgress || hasRescueProgress) && (
            <TouchableOpacity
              onPress={confirmStartOver}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('home.startOverA11y')}
              accessibilityHint={t('home.startOverHint')}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={styles.startOverText}>{t('home.startOver')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.modeGroup}>
          <TouchableOpacity
            style={styles.freeModeBtn}
            onPress={onPlayFree}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('home.freeA11y')}
            accessibilityHint={t('home.freeHint')}
          >
            <Text style={styles.freeModeText}>{t('home.free')}</Text>
          </TouchableOpacity>
          {freeBestScore > 0 && (
            <Text
              style={styles.freeModeBest}
              accessible={true}
              accessibilityLabel={t('home.freeBestA11y', { score: freeBestScore.toLocaleString() })}
            >
              {t('home.bestLine', { score: freeBestScore.toLocaleString() })}
            </Text>
          )}

          {/* Zen and Species Rescue reuse Free Mode's exact button treatment -
              these three are equal-tier mode choices differentiated by label and
              order, not by color, so no new color-contrast pairing needs vetting
              (accentOrange here is already the one checked against this screen's
              background). */}
          <TouchableOpacity
            style={[styles.freeModeBtn, styles.secondaryModeBtn]}
            onPress={onPlayZen}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('home.zenA11y')}
            accessibilityHint={t('home.zenHint')}
          >
            <Text style={styles.freeModeText}>{t('home.zen')}</Text>
          </TouchableOpacity>
          {zenBestScore > 0 && (
            <Text
              style={styles.freeModeBest}
              accessible={true}
              accessibilityLabel={t('home.zenBestA11y', { score: zenBestScore.toLocaleString() })}
            >
              {t('home.bestLine', { score: zenBestScore.toLocaleString() })}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.freeModeBtn, styles.secondaryModeBtn]}
            onPress={onPlayRescue}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={hasRescueProgress ? t('home.rescueContinueA11y', { n: rescueProgress.level }) : t('home.rescueA11y')}
            accessibilityHint={t('home.rescueHint')}
          >
            <Text style={styles.freeModeText}>{t('home.rescue')}</Text>
          </TouchableOpacity>
          {(rescueBestScore > 0 || hasRescueProgress) && (
            <Text
              style={styles.freeModeBest}
              accessible={true}
              accessibilityLabel={t('home.rescueInfoA11y', { n: rescueProgress.level, score: rescueBestScore.toLocaleString() })}
            >
              {t('home.rescueInfo', { n: rescueProgress.level, score: rescueBestScore.toLocaleString() })}
            </Text>
          )}
        </View>

        {isNewPlayer || !promo ? (
          <Text style={styles.hint}>{t('home.hint')}</Text>
        ) : (
          <TouchableOpacity
            style={styles.promoCard}
            onPress={() => Linking.openURL(storeUrlFor(promo))}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel={t('settings.promoA11y', { name: promo.name })}
          >
            <Image source={promo.icon} style={styles.promoIcon} />
            <View style={styles.promoBody}>
              <Text style={styles.promoLabel} maxFontSizeMultiplier={1.3}>{t('home.promoLabel')}</Text>
              <Text style={styles.promoName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{promo.name}</Text>
            </View>
            <View style={styles.promoCta}>
              <Text style={styles.promoCtaText} maxFontSizeMultiplier={1.2}>{t('settings.play')}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>

      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        languageChoice={languageChoice}
        onChangeLanguage={onChangeLanguage}
      />
      <StatsModal
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        highScore={highScore}
        bestLevel={bestLevel}
        freeBestScore={freeBestScore}
        zenBestScore={zenBestScore}
        rescueBestScore={rescueBestScore}
        rescueBestLevel={rescueBestLevel}
        levelsStars={levelsStars}
        rescueStars={rescueStars}
      />
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 24,
      paddingTop: 44,
      paddingBottom: 16,
    },
    topRightRow: {
      position: 'absolute',
      top: 12,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      padding: 8,
    },
    settingsIcon: {
      width: 26,
      height: 26,
      tintColor: theme.textSecondary,
    },
    statsIcon: {
      fontSize: 22,
    },
    header: {
      alignItems: 'center',
      gap: 2,
    },
    titleGroup: {
      alignItems: 'center',
      gap: 2,
    },
    title: {
      fontFamily: DISPLAY_FONT,
      fontSize: 46,
      // Ratio-based (see fonts.js) rather than a fixed px value, and RN scales
      // lineHeight with Dynamic Type - so unlike the old fixed 66px line box,
      // this can't clip the glyphs at larger text sizes.
      lineHeight: lineHeightFor(46),
      color: theme.textPrimary,
      letterSpacing: 8,
    },
    titleAccent: {
      // Was a fixed #BF5AF2 - failed WCAG AA (2.38:1) against the light-lavender
      // background. accentPurpleText darkens for light mode, stays full-vibrant
      // for dark mode where the brand purple already has plenty of contrast.
      color: theme.accentPurpleText,
    },
    tagline: {
      fontFamily: DISPLAY_FONT,
      fontSize: 17,
      lineHeight: lineHeightFor(17),
      color: theme.textSecondary,
      letterSpacing: 4,
      marginTop: 4,
    },
    hsBox: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
    },
    hsLabel: {
      fontFamily: DISPLAY_FONT,
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: lineHeightFor(16),
      letterSpacing: 3,
    },
    hsValue: {
      // Was a fixed #FF9F0A - failed WCAG AA badly (1.39:1) against the
      // light-lavender background; accentOrange handles the same per-theme split.
      fontFamily: DISPLAY_FONT,
      color: theme.accentOrange,
      fontSize: 30,
      lineHeight: lineHeightFor(30),
    },
    playBtn: {
      backgroundColor: theme.purple,
      // Was 72 - Patrick Hand sets "CONTINUE" ~28% wider than the old display
      // font, which at 72 left the button wider than small phones' content area.
      paddingHorizontal: 48,
      minWidth: 240,
      paddingVertical: 14,
      borderRadius: 18,
      alignItems: 'center',
      shadowColor: theme.purple,
      shadowOpacity: 0.75,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
    },
    playText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 26,
      lineHeight: lineHeightFor(26),
      color: '#FFFFFF',
      letterSpacing: 6,
    },
    playGroup: {
      alignItems: 'center',
      gap: 10,
    },
    playSubtext: {
      fontFamily: DISPLAY_FONT,
      fontSize: 16,
      lineHeight: lineHeightFor(16),
      color: '#FFFFFF',
      letterSpacing: 3,
      textAlign: 'center',
      opacity: 0.9,
    },
    startOverText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 14,
      lineHeight: lineHeightFor(14),
      color: theme.textSecondary,
      letterSpacing: 3,
      textDecorationLine: 'underline',
    },
    modeGroup: {
      alignItems: 'center',
      gap: 4,
      marginTop: -12,
    },
    freeModeBtn: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.accentOrange,
      paddingHorizontal: 32,
      paddingVertical: 8,
      borderRadius: 16,
    },
    freeModeText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 17,
      lineHeight: lineHeightFor(17),
      color: theme.accentOrange,
      letterSpacing: 3,
      textAlign: 'center',
    },
    freeModeBest: {
      fontFamily: DISPLAY_FONT,
      fontSize: 13,
      lineHeight: lineHeightFor(13),
      color: theme.textSecondary,
      letterSpacing: 2,
    },
    secondaryModeBtn: {
      marginTop: 8,
    },
    promoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      alignSelf: 'stretch',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 18,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomWidth: 3,
    },
    promoIcon: {
      width: 44,
      height: 44,
      borderRadius: 11,
    },
    promoBody: {
      flex: 1,
    },
    promoLabel: {
      fontFamily: DISPLAY_FONT,
      fontSize: 11,
      lineHeight: lineHeightFor(11),
      color: theme.textOnCard,
      opacity: 0.85,
      letterSpacing: 1.5,
    },
    promoName: {
      fontFamily: DISPLAY_FONT,
      fontSize: 19,
      lineHeight: lineHeightFor(19),
      color: theme.textOnCard,
    },
    promoCta: {
      backgroundColor: '#30D158',
      borderRadius: 12,
      borderBottomWidth: 3,
      borderBottomColor: '#1E8E3E',
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    // Dark text on the bright green - white on #30D158 fails AA.
    promoCtaText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 15,
      lineHeight: lineHeightFor(15),
      color: '#0A2E14',
      letterSpacing: 2,
    },
    hint: {
      fontFamily: DISPLAY_FONT,
      color: theme.textSecondary,
      textAlign: 'center',
      fontSize: 16,
      lineHeight: lineHeightFor(16),
    },
  });
}
