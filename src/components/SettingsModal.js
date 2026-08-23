import React, { useMemo } from 'react';
import {
  Modal, View, Text, Image, Switch, TouchableOpacity,
  StyleSheet, Linking, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROSS_PROMO_GAMES } from '../crossPromo';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTheme, useThemeMode } from '../hooks/useTheme';

function Row({ styles, label, value, onToggle }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#2A2A3E', true: '#FF2D55' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#2A2A3E"
        accessibilityLabel={label}
      />
    </View>
  );
}

function LinkRow({ styles, label, url }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.6}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function CrossPromoCard({ styles, game }) {
  const url = Platform.OS === 'android' ? game.androidUrl : game.iosUrl;
  if (!url) return null;

  return (
    <TouchableOpacity
      style={styles.promoCard}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.75}
      accessibilityRole="link"
      accessibilityLabel={`${game.name}. Opens the Play Store listing in a new app.`}
    >
      <Image source={game.icon} style={styles.promoIcon} />
      <Text style={styles.promoName} numberOfLines={1}>{game.name}</Text>
    </TouchableOpacity>
  );
}

function CrossPromoSection({ styles }) {
  const games = CROSS_PROMO_GAMES.filter(g => Platform.OS === 'android' ? g.androidUrl : g.iosUrl);
  if (games.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>MORE GAMES</Text>
      <View style={styles.promoGrid}>
        {games.map(g => (
          <CrossPromoCard key={g.id} styles={styles} game={g} />
        ))}
      </View>
    </View>
  );
}

export default function SettingsModal({ visible, onClose, soundEnabled, toggleSound }) {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
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
          <Text accessibilityRole="header" style={styles.title}>SETTINGS</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>APPEARANCE</Text>
            <View style={styles.card}>
              <Row styles={styles} label="Dark Mode" value={mode === 'dark'} onToggle={toggleTheme} />
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>AUDIO</Text>
            <View style={styles.card}>
              <Row styles={styles} label="Sound Effects" value={soundEnabled} onToggle={toggleSound} />
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>LEGAL</Text>
            <View style={styles.card}>
              <LinkRow styles={styles} label="Privacy Policy" url='https://www.theamuletstudios.com/privacy-policy' />
              <View style={styles.divider} />
              <LinkRow styles={styles} label="Terms of Service" url='https://www.theamuletstudios.com/terms-of-service' />
            </View>
          </View>

          <CrossPromoSection styles={styles} />

          <Text style={styles.copyright}>© {new Date().getFullYear()} Amulet Studios. All rights reserved.</Text>
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
    fontSize: 20,
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
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: 'BadUnicorn',
    fontSize: 20,
    color: theme.textOnCard,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 16,
  },
  chevron: {
    fontSize: 22,
    color: theme.textSecondary,
  },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  promoCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  promoIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  promoName: {
    fontFamily: 'BadUnicorn',
    fontSize: 11,
    color: theme.textOnCard,
    textAlign: 'center',
  },
  copyright: {
    fontFamily: 'BadUnicorn',
    marginTop: 24,
    marginBottom: 12,
    alignSelf: 'center',
    fontSize: 11,
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  });
}
