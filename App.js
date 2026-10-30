import { Fragment, useEffect, useState } from 'react';
import { AppState, Image } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { useSettings } from './src/hooks/useSettings';
import { useLanguage } from './src/hooks/useLanguage';
import { ANIMALS } from './src/animals';
import { ThemeProvider } from './src/hooks/useTheme';
import useGame from './src/hooks/useGame';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';

export default function App() {
  const settings = useSettings();
  const language = useLanguage();
  const fontsLoaded = language.ready;
  const [adsReady, setAdsReady] = useState(false);
  // Lives here rather than in HomeScreen so the Settings sheet stays open when
  // a language switch remounts the screens.
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Warm the image cache with the animal art at launch, so the first board and
  // the Rescue mission portrait don't wait on it. Matters most in dev builds,
  // where each image is fetched from the Metro server on first use; in release
  // builds they're local files and this is near-instant.
  useEffect(() => {
    for (const animal of ANIMALS) {
      const { uri } = Image.resolveAssetSource(animal.icon);
      Image.prefetch(uri).catch(() => {});
    }
  }, []);
  const game = useGame({
    soundEnabled: settings.soundEnabled,
    adsReady,
  });

  useEffect(() => {
    // Wait until the app's window is actually visible before asking for ATT -
    // requesting it while still on the fontsLoaded splash (rendering null) can
    // cause iOS to silently skip the permission dialog instead of showing it.
    if (!fontsLoaded) return;

    let cancelled = false;
    let appStateSub = null;

    // iOS only presents the ATT prompt while the app is in the "active" state.
    // Right after the splash the app can still be "inactive" for a beat; if we
    // ask then, iOS returns "denied" without ever showing the dialog - which is
    // exactly what App Review sees. Resolve once we're genuinely active.
    const waitForActive = () => new Promise((resolve) => {
      if (AppState.currentState === 'active') return resolve();
      appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          appStateSub?.remove();
          appStateSub = null;
          resolve();
        }
      });
    });

    (async () => {
      await waitForActive();
      if (cancelled) return;
      // Small settle delay after becoming active - the very first active frame
      // can still be too early for iOS to surface the system dialog.
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) return;

      // Request ATT first and wait for the user's answer BEFORE any AdMob/UMP
      // call, so tracking permission is resolved before ads are configured.
      try {
        await requestTrackingPermissionsAsync();
      } catch (e) {
        // Non-iOS or unavailable; carry on.
      }
      if (cancelled) return;

      // Google UMP: gather EEA/UK consent (or confirm it isn't required) before
      // requesting any ads, per AdMob policy.
      let canRequestAds = true;
      try {
        const consentInfo = await AdsConsent.gatherConsent();
        canRequestAds = consentInfo.canRequestAds;
      } catch (e) {
        // Consent SDK unavailable (e.g. offline on first launch); default to requesting
        // ads rather than losing revenue for the vast majority of non-regulated users.
      }
      if (cancelled) return;
      if (canRequestAds) await MobileAds().initialize();
      // Only start loading ads once the SDK has actually finished initializing -
      // loading before that tends to fail and (pre-fix) never retried.
      if (!cancelled) setAdsReady(canRequestAds);
    })();

    return () => {
      cancelled = true;
      appStateSub?.remove();
    };
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      {/* initialWindowMetrics gives the real notch/home-indicator insets on the
          very first frame. Without it insets start at 0 and arrive a frame
          later, so the game screen's board area shrinks after its first
          layout and every tile visibly slides into its final row. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="light" />
        {/* Keyed on the language so switching it remounts every screen with
            fresh text and fonts; game state lives in useGame above, so it's
            unaffected. */}
        <Fragment key={language.active}>
        {game.screen === 'home' && (
          <HomeScreen
            highScore={game.highScore}
            bestLevel={game.bestLevel}
            onPlay={game.startGame}
            onRestart={game.restartGame}
            levelsProgress={game.levelsProgress}
            levelsStars={game.levelsStars}
            freeBestScore={game.freeBestScore}
            onPlayFree={game.startFreeGame}
            zenBestScore={game.zenBestScore}
            onPlayZen={game.startZenGame}
            rescueBestScore={game.rescueBestScore}
            rescueBestLevel={game.rescueBestLevel}
            onPlayRescue={game.startRescueGame}
            onRestartRescue={game.restartRescueGame}
            rescueProgress={game.rescueProgress}
            rescueStars={game.rescueStars}
            soundEnabled={settings.soundEnabled}
            toggleSound={settings.toggleSound}
            settingsOpen={settingsOpen}
            setSettingsOpen={setSettingsOpen}
            languageChoice={language.choice}
            onChangeLanguage={language.changeLanguage}
          />
        )}
        {game.screen === 'game' && (
          <GameScreen
            mode={game.mode}
            level={game.level}
            score={game.score}
            board={game.board}
            movesLeft={game.movesLeft}
            levelScore={game.levelScore}
            rescueCount={game.rescueCount}
            freeTimeLeft={game.freeTimeLeft}
            freeBestScore={game.freeBestScore}
            zenBestScore={game.zenBestScore}
            combo={game.combo}
            streak={game.streak}
            phase={game.phase}
            config={game.config}
            pendingResolution={game.pendingResolution}
            levelStats={game.levelStats}
            startPlaying={game.startPlaying}
            attemptSwap={game.attemptSwap}
            finishResolution={game.finishResolution}
            paused={game.paused}
            togglePause={game.togglePause}
            returnToMenu={game.returnToMenu}
          />
        )}
        {game.screen === 'gameover' && (
          <GameOverScreen
            mode={game.mode}
            score={game.score}
            highScore={
              game.mode === 'free' ? game.freeBestScore :
              game.mode === 'rescue' ? game.rescueBestScore :
              game.highScore
            }
            level={game.level}
            onPlayAgain={game.mode === 'free' ? game.startFreeGame : game.mode === 'rescue' ? game.startRescueGame : game.startGame}
            onHome={() => game.setScreen('home')}
            onContinue={game.onContinue}
            canContinue={(game.mode === 'levels' || game.mode === 'rescue') && game.canContinue && game.rewLoaded}
          />
        )}
        </Fragment>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
