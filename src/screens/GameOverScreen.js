import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, Platform, findNodeHandle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function Stat({ label, value, accent }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
    </View>
  );
}

export default function GameOverScreen({ mode = 'levels', score, highScore, level, onPlayAgain, onHome, onContinue, canContinue }) {
  const isNewRecord = score > 0 && score >= highScore;
  const headingRef = useRef(null);

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);

    // accessibilityLiveRegion on the "New record" text below is Android-only; iOS needs
    // an explicit announcement. Delayed slightly so it doesn't collide with VoiceOver
    // reading the "GAME OVER" heading focused just above.
    if (isNewRecord && Platform.OS === 'ios') {
      const timer = setTimeout(() => AccessibilityInfo.announceForAccessibility('New record!'), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text ref={headingRef} accessibilityRole="header" style={styles.title}>
          {mode === 'free' ? "TIME'S\nUP!" : 'GAME\nOVER'}
        </Text>

        {isNewRecord && (
          <Text
            style={styles.newRecord}
            accessibilityLiveRegion="assertive"
            accessibilityLabel="New record!"
          >✦ NEW RECORD ✦</Text>
        )}

        <View style={styles.statsBox}>
          <View accessible={true} accessibilityLabel={`Score: ${score.toLocaleString()}`} style={styles.stat}>
            <Text accessible={false} style={styles.statLabel}>SCORE</Text>
            <Text accessible={false} style={[styles.statValue, styles.statAccent]}>{score.toLocaleString()}</Text>
          </View>
          <View accessible={false} style={styles.divider} />
          {mode !== 'free' && (
            <>
              <View accessible={true} accessibilityLabel={`Level reached: ${level}`} style={styles.stat}>
                <Text accessible={false} style={styles.statLabel}>LEVEL REACHED</Text>
                <Text accessible={false} style={styles.statValue}>{level}</Text>
              </View>
              <View accessible={false} style={styles.divider} />
            </>
          )}
          <View accessible={true} accessibilityLabel={`Best score: ${highScore.toLocaleString()}`} style={styles.stat}>
            <Text accessible={false} style={styles.statLabel}>BEST SCORE</Text>
            <Text accessible={false} style={styles.statValue}>{highScore.toLocaleString()}</Text>
          </View>
        </View>

        {canContinue && (
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={onContinue}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Continue — watch an ad to retry this level"
            accessibilityHint="Retries the level you just failed"
          >
            <Text style={styles.restoreText}>CONTINUE</Text>
            <Text style={styles.restoreSubtext}>Watch Ad · Retry Level</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.playAgainBtn}
          onPress={onPlayAgain}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Play again"
          accessibilityHint="Starts a new game"
        >
          <Text style={styles.playAgainText}>PLAY AGAIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={onHome}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Home"
          accessibilityHint="Returns to the main menu"
          hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
        >
          <Text style={styles.homeText}>HOME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'BadUnicorn',
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
    fontFamily: 'BadUnicorn',
    fontSize: 16,
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
    fontFamily: 'BadUnicorn',
    // Was #444455 - failed WCAG AA badly (1.96:1) against the near-black stats card.
    color: '#9A9AB0',
    fontSize: 12,
    letterSpacing: 2,
  },
  statValue: {
    fontFamily: 'BadUnicorn',
    color: '#FFFFFF',
    fontSize: 22,
  },
  statAccent: {
    fontFamily: 'BadUnicorn',
    color: '#FF9F0A',
    fontSize: 32,
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
    fontFamily: 'BadUnicorn',
    fontSize: 20,
    color: '#FF9F0A',
    letterSpacing: 5,
  },
  restoreSubtext: {
    fontFamily: 'BadUnicorn',
    fontSize: 12,
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
    fontFamily: 'BadUnicorn',
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 5,
  },
  homeBtn: {
    paddingVertical: 10,
  },
  homeText: {
    fontFamily: 'BadUnicorn',
    // Was #444455 - failed WCAG AA (2.07:1) against the near-black background.
    color: '#9A9AB0',
    fontSize: 15,
    letterSpacing: 4,
  },
});
