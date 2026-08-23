import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { useFonts } from 'expo-font';
import { useSettings } from './src/hooks/useSettings';
import { ThemeProvider } from './src/hooks/useTheme';
import useGame from './src/hooks/useGame';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';

export default function App() {
  const settings = useSettings();
  const [adsReady, setAdsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    BadUnicorn: require('./assets/fonts/BadUnicornDemoRegular-BVWx.ttf'),
  });
  const game = useGame({
    soundEnabled: settings.soundEnabled,
    adsReady,
  });

  useEffect(() => {
    (async () => {
      await requestTrackingPermissionsAsync();

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
      if (canRequestAds) await MobileAds().initialize();
      // Only start loading ads once the SDK has actually finished initializing -
      // loading before that tends to fail and (pre-fix) never retried.
      setAdsReady(canRequestAds);
    })();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {game.screen === 'home' && (
          <HomeScreen
            highScore={game.highScore}
            onPlay={game.startGame}
            freeBestScore={game.freeBestScore}
            onPlayFree={game.startFreeGame}
            soundEnabled={settings.soundEnabled}
            toggleSound={settings.toggleSound}
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
            freeTimeLeft={game.freeTimeLeft}
            freeBestScore={game.freeBestScore}
            combo={game.combo}
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
            highScore={game.mode === 'free' ? game.freeBestScore : game.highScore}
            level={game.level}
            onPlayAgain={game.mode === 'free' ? game.startFreeGame : game.startGame}
            onHome={() => game.setScreen('home')}
            onContinue={game.onContinue}
            canContinue={game.mode === 'levels' && game.canContinue && game.rewLoaded}
          />
        )}
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
