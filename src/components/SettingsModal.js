import React, { useEffect, useMemo, useRef } from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity, Animated,
  StyleSheet, Linking, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CROSS_PROMO_GAMES, storeUrlFor } from '../crossPromo';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { usePopIn } from '../hooks/usePopIn';
import { useTheme, useThemeMode } from '../hooks/useTheme';
import { t, SUPPORTED_LANGUAGES, deviceLanguage } from '../i18n';
import { DISPLAY_FONT, lineHeightFor } from '../fonts';

const KNOB_TRAVEL = 22;

// Big tappable tile standing in for a plain Switch row. Its fill, icon and
// caption all change with the setting, so the state reads at a glance. Fixed
// saturated fills with white text (each clears WCAG AA), same as the Stats
// tiles, so they look the same in both themes.
function ToggleTile({ styles, label, value, onToggle, on, off, index, visible, reduceMotion }) {
  const pop = usePopIn(visible, 120 + index * 90, reduceMotion);
  const knob = useRef(new Animated.Value(value ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduceMotion) {
      knob.setValue(value ? 1 : 0);
      return;
    }
    Animated.spring(knob, { toValue: value ? 1 : 0, friction: 6, tension: 140, useNativeDriver: true }).start();
    bounce.setValue(0.6);
    Animated.spring(bounce, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  }, [value]);

  const look = value ? on : off;

  const handlePress = () => {
    Haptics.selectionAsync();
    onToggle();
  };

  return (
    <Animated.View style={[styles.toggleTileWrap, pop]}>
      <TouchableOpacity
        style={[styles.toggleTile, { backgroundColor: look.color, borderBottomColor: look.lip }]}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
      >
        <View style={styles.tileShine} pointerEvents="none" />
        <Animated.Text style={[styles.toggleIcon, { transform: [{ scale: bounce }] }]} allowFontScaling={false}>
          {look.icon}
        </Animated.Text>
        <Text style={styles.toggleLabel} maxFontSizeMultiplier={1.3}>{label}</Text>
        <View style={styles.toggleFooter}>
          <Text style={styles.toggleState} maxFontSizeMultiplier={1.3}>{look.caption}</Text>
          <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
            <Animated.View
              style={[
                styles.switchKnob,
                { transform: [{ translateX: knob.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] }) }] },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function LinkRow({ styles, label, url, icon, color }) {
  return (
    <TouchableOpacity
      style={styles.linkRow}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.6}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <View style={[styles.linkBadge, { backgroundColor: color }]}>
        <Text style={styles.linkBadgeIcon} allowFontScaling={false}>{icon}</Text>
      </View>
      <Text style={styles.linkLabel} maxFontSizeMultiplier={1.3}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function CrossPromoCard({ styles, game, index, visible, reduceMotion }) {
  const pop = usePopIn(visible, 450 + index * 80, reduceMotion);
  const url = storeUrlFor(game);
  if (!url) return null;

  return (
    <Animated.View style={[styles.promoWrap, pop]}>
      <TouchableOpacity
        style={styles.promoCard}
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.75}
        accessibilityRole="link"
        accessibilityLabel={t('settings.promoA11y', { name: game.name })}
      >
        <View style={styles.promoIconFrame}>
          <Image source={game.icon} style={styles.promoIcon} />
        </View>
        <Text style={styles.promoName} numberOfLines={1}>{game.name}</Text>
        <View style={styles.promoCta}>
          <Text style={styles.promoCtaText} maxFontSizeMultiplier={1.2}>{t('settings.play')}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CrossPromoSection({ styles, visible, reduceMotion }) {
  const games = CROSS_PROMO_GAMES.filter(storeUrlFor);
  if (games.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>{t('settings.moreGames')}</Text>
      <View style={styles.promoGrid}>
        {games.map((g, i) => (
          <CrossPromoCard key={g.id} styles={styles} game={g} index={i} visible={visible} reduceMotion={reduceMotion} />
        ))}
      </View>
    </View>
  );
}

// One chip per language plus "Automatic" (follow the device). Names render in
// the system font, not DISPLAY_FONT: the display font only covers the active
// language's script, and every name here must be readable whatever that is.
function LanguagePicker({ styles, choice, onChange, visible, reduceMotion }) {
  const pop = usePopIn(visible, 260, reduceMotion);
  const deviceName = SUPPORTED_LANGUAGES.find(l => l.code === deviceLanguage())?.name ?? 'English';
  const options = [
    { code: null, name: t('settings.languageAuto'), sub: deviceName, a11y: t('settings.languageAutoA11y', { name: deviceName }) },
    ...SUPPORTED_LANGUAGES.map(l => ({ code: l.code, name: l.name, a11y: l.name })),
  ];

  return (
    <Animated.View style={[styles.languageGrid, pop]} accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = option.code === choice;
        return (
          <TouchableOpacity
            key={option.code ?? 'auto'}
            style={[styles.languageChip, selected && styles.languageChipSelected]}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(option.code);
            }}
            activeOpacity={0.75}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.a11y}
            accessibilityHint={t('settings.languageHint')}
          >
            <Text style={[styles.languageName, selected && styles.languageNameSelected]} maxFontSizeMultiplier={1.3}>
              {selected ? '✓ ' : ''}{option.name}
            </Text>
            {option.sub && (
              <Text style={[styles.languageSub, selected && styles.languageNameSelected]} maxFontSizeMultiplier={1.3}>
                {option.sub}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

export default function SettingsModal({ visible, onClose, soundEnabled, toggleSound, languageChoice, onChangeLanguage }) {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const legalPop = usePopIn(visible, 320, reduceMotion);

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'fade' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>⚙️ {t('settings.title')}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('settings.close')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.toggleGrid}>
            <ToggleTile
              styles={styles}
              label={t('settings.darkMode')}
              value={mode === 'dark'}
              onToggle={toggleTheme}
              on={{ icon: '🌙', caption: t('settings.on'), color: '#3730A3', lip: '#241F6E' }}
              off={{ icon: '☀️', caption: t('settings.off'), color: '#B45309', lip: '#7C3A06' }}
              index={0}
              visible={visible}
              reduceMotion={reduceMotion}
            />
            <ToggleTile
              styles={styles}
              label={t('settings.sound')}
              value={soundEnabled}
              onToggle={toggleSound}
              on={{ icon: '🔊', caption: t('settings.on'), color: '#0F766E', lip: '#0A524C' }}
              off={{ icon: '🔇', caption: t('settings.off'), color: '#4B5563', lip: '#30363F' }}
              index={1}
              visible={visible}
              reduceMotion={reduceMotion}
            />
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>🌐 {t('settings.language')}</Text>
            <LanguagePicker
              styles={styles}
              choice={languageChoice}
              onChange={onChangeLanguage}
              visible={visible}
              reduceMotion={reduceMotion}
            />
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionLabel}>{t('settings.legal')}</Text>
            <Animated.View style={[styles.card, legalPop]}>
              <LinkRow styles={styles} label={t('settings.privacy')} icon="🔒" color="#6B21A8" url='https://www.theamuletstudios.com/privacy-policy' />
              <View style={styles.divider} />
              <LinkRow styles={styles} label={t('settings.terms')} icon="📜" color="#C2410C" url='https://www.theamuletstudios.com/terms-of-service' />
            </Animated.View>
          </View>

          <CrossPromoSection styles={styles} visible={visible} reduceMotion={reduceMotion} />

          <Text style={styles.copyright}>{t('settings.copyright', { year: new Date().getFullYear() })}</Text>
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
    paddingBottom: 12,
  },
  section: {
    marginTop: 26,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    color: theme.textSecondary,
    letterSpacing: 3,
    marginLeft: 4,
  },

  toggleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toggleTileWrap: {
    width: '48.5%',
  },
  toggleTile: {
    borderRadius: 22,
    padding: 16,
    gap: 4,
    overflow: 'hidden',
    borderBottomWidth: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tileShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleIcon: {
    fontSize: 44,
    marginBottom: 6,
  },
  toggleLabel: {
    fontFamily: DISPLAY_FONT,
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  toggleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toggleState: {
    fontFamily: DISPLAY_FONT,
    fontSize: 16,
    lineHeight: lineHeightFor(16),
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  switchTrackOn: {
    backgroundColor: '#30D158',
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderBottomWidth: 3,
  },
  languageChipSelected: {
    backgroundColor: '#6B21A8',
    borderColor: '#BF5AF2',
    borderBottomColor: '#4A1475',
  },
  languageName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textOnCard,
  },
  languageNameSelected: {
    color: '#FFFFFF',
  },
  languageSub: {
    fontSize: 11,
    color: theme.textOnCard,
    opacity: 0.8,
    marginTop: 1,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBadgeIcon: {
    fontSize: 18,
  },
  linkLabel: {
    flex: 1,
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    color: theme.textOnCard,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginLeft: 66,
  },
  chevron: {
    fontSize: 26,
    color: theme.textOnCard,
    opacity: 0.6,
  },

  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  promoWrap: {
    flexBasis: '31%',
    flexGrow: 1,
  },
  promoCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderBottomWidth: 4,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  promoIconFrame: {
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  promoIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  promoName: {
    fontFamily: DISPLAY_FONT,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    color: theme.textOnCard,
    textAlign: 'center',
  },
  promoCta: {
    backgroundColor: '#30D158',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  // Dark text on the bright green - white on #30D158 fails AA.
  promoCtaText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    color: '#0A2E14',
    letterSpacing: 2,
  },
  copyright: {
    fontFamily: DISPLAY_FONT,
    marginTop: 24,
    marginBottom: 12,
    alignSelf: 'center',
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  });
}
