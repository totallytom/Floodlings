import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { t } from '../i18n';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

const VISIBLE_BEHIND = 3;
const VISIBLE_AHEAD = 1;

function MiniStars({ styles, count }) {
  return (
    <Text style={styles.miniStars} allowFontScaling={false}>
      {[0, 1, 2].map(i => (i < count ? '★' : '☆')).join('')}
    </Text>
  );
}

// Home-screen strip of nodes around the player's current level: cleared levels
// (with their best stars), the current one pulsing, and the next one locked.
export default function LevelPath({ currentLevel, stars }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  const first = Math.max(1, currentLevel - VISIBLE_BEHIND);
  const levels = [];
  for (let l = first; l <= currentLevel + VISIBLE_AHEAD; l++) levels.push(l);
  const totalStars = Object.values(stars).reduce((sum, n) => sum + n, 0);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={t('path.a11y', { n: currentLevel, stars: totalStars })}
    >
      <View style={styles.path}>
        {levels.map((l, i) => {
          const done = l < currentLevel;
          const current = l === currentLevel;
          return (
            <React.Fragment key={l}>
              {i > 0 && <View style={[styles.connector, l <= currentLevel && styles.connectorDone]} />}
              <View style={styles.nodeCol}>
                {current ? (
                  <View style={styles.currentWrap}>
                    <Animated.View
                      style={[
                        styles.currentHalo,
                        {
                          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
                          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
                        },
                      ]}
                    />
                    <View style={[styles.node, styles.nodeCurrent]}>
                      <Text style={styles.nodeCurrentText} allowFontScaling={false}>{l}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.node, done ? styles.nodeDone : styles.nodeLocked]}>
                    <Text style={[styles.nodeText, !done && styles.nodeLockedText]} allowFontScaling={false}>
                      {done ? l : '🔒'}
                    </Text>
                  </View>
                )}
                {done ? <MiniStars styles={styles} count={stars[l] || 0} /> : <Text style={styles.miniStars}> </Text>}
              </View>
            </React.Fragment>
          );
        })}
      </View>
      {totalStars > 0 && (
        <Text style={styles.totalStars} allowFontScaling={false}>{t('path.starsEarned', { stars: totalStars })}</Text>
      )}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 6,
    },
    path: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    nodeCol: {
      alignItems: 'center',
      gap: 3,
      width: 46,
    },
    connector: {
      width: 14,
      height: 4,
      borderRadius: 2,
      marginTop: 19,
      backgroundColor: theme.overlayMedium,
    },
    connectorDone: {
      backgroundColor: theme.green,
    },
    node: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 3,
    },
    nodeDone: {
      backgroundColor: theme.green,
      borderBottomColor: '#1E8E3E',
    },
    nodeLocked: {
      backgroundColor: theme.overlayMedium,
      borderBottomColor: theme.overlaySubtle,
    },
    nodeCurrent: {
      backgroundColor: theme.purple,
      borderBottomColor: '#7A1FA8',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    currentWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentHalo: {
      position: 'absolute',
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.purple,
    },
    nodeText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 18,
      lineHeight: lineHeightFor(18),
      color: '#FFFFFF',
    },
    nodeLockedText: {
      fontSize: 14,
    },
    nodeCurrentText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 20,
      lineHeight: lineHeightFor(20),
      color: '#FFFFFF',
    },
    miniStars: {
      fontSize: 11,
      color: '#FFB800',
      letterSpacing: -1,
    },
    totalStars: {
      fontFamily: DISPLAY_FONT,
      fontSize: 14,
      lineHeight: lineHeightFor(14),
      color: theme.accentOrange,
      letterSpacing: 2,
    },
  });
}
