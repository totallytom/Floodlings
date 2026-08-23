import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsModal from '../components/SettingsModal';
import FloatingAnimals from '../components/FloatingAnimals';
import { useTheme } from '../hooks/useTheme';

export default function HomeScreen({ highScore, onPlay, freeBestScore, onPlayFree, soundEnabled, toggleSound }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const headingRef = useRef(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingAnimals />
      <View style={styles.container}>
        <View style={styles.topRightRow}>
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

        <TouchableOpacity
          style={styles.playBtn}
          onPress={onPlay}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Play"
          accessibilityHint="Starts a new game"
        >
          <Text style={styles.playText}>PLAY</Text>
        </TouchableOpacity>

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
        </View>

        <Text style={styles.hint}>
          Swap adjacent animals to match 3 or more.{'\n'}
          Chain cascades to multiply your score.
        </Text>
      </View>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
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
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      paddingHorizontal: 24,
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
    hint: {
      fontFamily: 'BadUnicorn',
      color: theme.textSecondary,
      textAlign: 'center',
      fontSize: 20,
    },
  });
}
