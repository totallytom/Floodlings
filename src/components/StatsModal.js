import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme } from '../hooks/useTheme';

function StatRow({ styles, label, value }) {
  return (
    <View
      style={styles.row}
      accessible={true}
      accessibilityLabel={`${label}: ${value.toLocaleString()}`}
    >
      <Text accessible={false} style={styles.rowLabel}>{label}</Text>
      <Text accessible={false} style={styles.rowValue}>{value.toLocaleString()}</Text>
    </View>
  );
}

export default function StatsModal({
  visible, onClose,
  highScore, bestLevel,
  freeBestScore,
  zenBestScore,
  rescueBestScore, rescueBestLevel,
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'fade' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>STATS</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close stats"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>LEVELS</Text>
            <View style={styles.card}>
              <StatRow styles={styles} label="Best Score" value={highScore} />
              <View style={styles.divider} />
              <StatRow styles={styles} label="Best Level" value={bestLevel} />
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>FREE MODE</Text>
            <View style={styles.card}>
              <StatRow styles={styles} label="Best Score" value={freeBestScore} />
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>ZEN MODE</Text>
            <View style={styles.card}>
              <StatRow styles={styles} label="Best Score" value={zenBestScore} />
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>SPECIES RESCUE</Text>
            <View style={styles.card}>
              <StatRow styles={styles} label="Best Score" value={rescueBestScore} />
              <View style={styles.divider} />
              <StatRow styles={styles} label="Best Level" value={rescueBestLevel} />
            </View>
          </View>
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
    fontFamily: 'BadUnicorn',
    fontSize: 28,
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
    paddingBottom: 12,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: 'BadUnicorn',
    fontSize: 22,
    color: theme.textSecondary,
    letterSpacing: 3,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  rowLabel: {
    fontFamily: 'BadUnicorn',
    fontSize: 22,
    color: theme.textOnCard,
  },
  rowValue: {
    // Bumped well past rowLabel - same "the number is the point" treatment
    // GameOverScreen's statAccent and HomeScreen's hsValue already use for a
    // headline stat, rather than matching the label's weight.
    fontFamily: 'BadUnicorn',
    fontSize: 32,
    color: theme.accentOrange,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 16,
  },
  });
}
