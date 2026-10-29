import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsModal from '../components/SettingsModal';
import StatsModal from '../components/StatsModal';
import FloatingAnimals from '../components/FloatingAnimals';
import LevelPath from '../components/LevelPath';
import { useTheme } from '../hooks/useTheme';

export default function HomeScreen({
  highScore, onPlay, onRestart, bestLevel, levelsProgress, levelsStars,
  freeBestScore, onPlayFree,
  zenBestScore, onPlayZen,
  rescueBestScore, onPlayRescue, onRestartRescue, rescueBestLevel, rescueProgress,
  soundEnabled, toggleSound,
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const headingRef = useRef(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  const hasLevelsProgress = levelsProgress.level > 1 || levelsProgress.score > 0;
  const hasRescueProgress = rescueProgress.level > 1 || rescueProgress.score > 0;

  // Stars are kept either way - starting over only moves the checkpoint back
  // to level 1, so replaying can still improve old ratings.
  const confirmStartOver = () => {
    const buttons = [{ text: 'Cancel', style: 'cancel' }];
    if (hasLevelsProgress) buttons.push({ text: `Levels (on ${levelsProgress.level})`, style: 'destructive', onPress: onRestart });
    if (hasRescueProgress) buttons.push({ text: `Species Rescue (on ${rescueProgress.level})`, style: 'destructive', onPress: onRestartRescue });
    Alert.alert('Start over?', 'Which mode should go back to level 1? Your stars and best scores are kept.', buttons);
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
            accessibilityLabel="Stats"
          >
            {/* No dedicated stats image asset exists - a plain glyph matches how
                the app already handles other icon-only buttons (HUD's pause icon,
                GameOverScreen's stars) rather than adding a new asset for this. */}
            <Text style={styles.statsIcon}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Settings"
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
          <Text accessible={false} style={styles.tagline}>SWAP. MATCH. CASCADE.</Text>
        </View>

        {highScore > 0 && (
          <View
            style={styles.hsBox}
            accessible={true}
            accessibilityLabel={`Best score: ${highScore.toLocaleString()}`}
          >
            <Text accessible={false} style={styles.hsLabel}>BEST SCORE</Text>
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
            accessibilityLabel={hasLevelsProgress ? `Continue, level ${levelsProgress.level}` : 'Play'}
            accessibilityHint={hasLevelsProgress ? 'Picks up from the level you left off on' : 'Starts a new game'}
          >
            <Text style={styles.playText}>{hasLevelsProgress ? 'CONTINUE' : 'PLAY'}</Text>
            {hasLevelsProgress && (
              <Text style={styles.playSubtext}>LEVEL {levelsProgress.level}</Text>
            )}
          </TouchableOpacity>
          {(hasLevelsProgress || hasRescueProgress) && (
            <TouchableOpacity
              onPress={confirmStartOver}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start over"
              accessibilityHint="Choose a mode to restart from level 1"
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={styles.startOverText}>START OVER</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.modeGroup}>
          <TouchableOpacity
            style={styles.freeModeBtn}
            onPress={onPlayFree}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Free mode"
            accessibilityHint="Starts a 3 minute 30 second timed session to beat your best score"
          >
            <Text style={styles.freeModeText}>FREE MODE</Text>
          </TouchableOpacity>
          {freeBestScore > 0 && (
            <Text
              style={styles.freeModeBest}
              accessible={true}
              accessibilityLabel={`Free mode best: ${freeBestScore.toLocaleString()}`}
            >
              BEST: {freeBestScore.toLocaleString()}
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
            accessibilityLabel="Zen mode"
            accessibilityHint="Starts an untimed session with no move limit and no way to fail"
          >
            <Text style={styles.freeModeText}>ZEN MODE</Text>
          </TouchableOpacity>
          {zenBestScore > 0 && (
            <Text
              style={styles.freeModeBest}
              accessible={true}
              accessibilityLabel={`Zen mode best: ${zenBestScore.toLocaleString()}`}
            >
              BEST: {zenBestScore.toLocaleString()}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.freeModeBtn, styles.secondaryModeBtn]}
            onPress={onPlayRescue}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={hasRescueProgress ? `Species rescue, continue level ${rescueProgress.level}` : 'Species rescue'}
            accessibilityHint="Starts species rescue mode - rescue enough of a target animal each level before you run out of moves"
          >
            <Text style={styles.freeModeText}>SPECIES RESCUE</Text>
          </TouchableOpacity>
          {(rescueBestScore > 0 || hasRescueProgress) && (
            <Text
              style={styles.freeModeBest}
              accessible={true}
              accessibilityLabel={`Species rescue: level ${rescueProgress.level}, best ${rescueBestScore.toLocaleString()}`}
            >
              LEVEL {rescueProgress.level} · BEST: {rescueBestScore.toLocaleString()}
            </Text>
          )}
        </View>

        <Text style={styles.hint}>
          Swap adjacent animals to match 3 or more.{'\n'}
          Chain cascades to multiply your score.
        </Text>
      </View>
      </ScrollView>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
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
      gap: 24,
      paddingHorizontal: 24,
      paddingVertical: 56,
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
      fontFamily: 'BadUnicorn',
      fontSize: 60,
      color: theme.textPrimary,
      letterSpacing: 10,
      // No fixed lineHeight - a fixed value here would clip the glyphs once Dynamic
      // Type scales the font well past what a 66px line box can hold. Omitting it
      // lets RN size the line to the (scaled) font automatically.
    },
    titleAccent: {
      // Was a fixed #BF5AF2 - failed WCAG AA (2.38:1) against the light-lavender
      // background. accentPurpleText darkens for light mode, stays full-vibrant
      // for dark mode where the brand purple already has plenty of contrast.
      color: theme.accentPurpleText,
    },
    tagline: {
      fontFamily: 'BadUnicorn',
      fontSize: 20,
      color: theme.textSecondary,
      letterSpacing: 5,
      marginTop: 6,
    },
    hsBox: {
      alignItems: 'center',
      gap: 2,
    },
    hsLabel: {
      fontFamily: 'BadUnicorn',
      color: theme.textSecondary,
      fontSize: 20,
      letterSpacing: 3,
    },
    hsValue: {
      // Was a fixed #FF9F0A - failed WCAG AA badly (1.39:1) against the
      // light-lavender background; accentOrange handles the same per-theme split.
      fontFamily: 'BadUnicorn',
      color: theme.accentOrange,
      fontSize: 36,
    },
    playBtn: {
      backgroundColor: theme.purple,
      paddingHorizontal: 72,
      paddingVertical: 20,
      borderRadius: 18,
      alignItems: 'center',
      shadowColor: theme.purple,
      shadowOpacity: 0.75,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
    },
    playText: {
      fontFamily: 'BadUnicorn',
      fontSize: 30,
      color: '#FFFFFF',
      letterSpacing: 8,
    },
    playGroup: {
      alignItems: 'center',
      gap: 10,
    },
    playSubtext: {
      fontFamily: 'BadUnicorn',
      fontSize: 16,
      color: '#FFFFFF',
      letterSpacing: 3,
      textAlign: 'center',
      opacity: 0.9,
    },
    startOverText: {
      fontFamily: 'BadUnicorn',
      fontSize: 14,
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
      paddingHorizontal: 40,
      paddingVertical: 12,
      borderRadius: 16,
    },
    freeModeText: {
      fontFamily: 'BadUnicorn',
      fontSize: 18,
      color: theme.accentOrange,
      letterSpacing: 4,
    },
    freeModeBest: {
      fontFamily: 'BadUnicorn',
      fontSize: 13,
      color: theme.textSecondary,
      letterSpacing: 2,
    },
    secondaryModeBtn: {
      marginTop: 10,
    },
    hint: {
      fontFamily: 'BadUnicorn',
      color: theme.textSecondary,
      textAlign: 'center',
      fontSize: 20,
    },
  });
}
