import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { TestIds, useInterstitialAd, useRewardedAd, useRewardedInterstitialAd } from 'react-native-google-mobile-ads';

// __DEV__ is false in any real build, including TestFlight/ad-hoc ones - so without
// this, a build installed on a real device for manual testing would request live
// ads. Tapping through real ads on your own device is an AdMob policy violation
// (counts as invalid traffic), so EXPO_PUBLIC_FORCE_TEST_ADS forces test IDs for
// builds explicitly made for that purpose (see the "adtest" profile in eas.json),
// independent of whether it's a dev build or a real release build.
const FORCE_TEST_ADS = __DEV__ || process.env.EXPO_PUBLIC_FORCE_TEST_ADS === 'true';

const INTERSTITIAL_ID = FORCE_TEST_ADS
  ? TestIds.INTERSTITIAL
  : Platform.select({
      android: 'ca-app-pub-3981993675235210/9239588970',
      ios:     'ca-app-pub-3981993675235210/3245156144',
      default: TestIds.INTERSTITIAL,
    });

// Android's "watch an ad to revive" slot is a plain Rewarded ad unit; iOS's is a
// Rewarded Interstitial unit instead (a different AdMob product/hook, not just a
// different ID) - see the two hook calls below.
const REWARDED_ID = Platform.OS === 'android'
  ? (FORCE_TEST_ADS ? TestIds.REWARDED : 'ca-app-pub-3981993675235210/2098218711')
  : null;

const REWARDED_INTERSTITIAL_ID = Platform.OS === 'ios'
  ? (FORCE_TEST_ADS ? TestIds.REWARDED_INTERSTITIAL : 'ca-app-pub-3981993675235210/9209597568')
  : null;

const ROUNDS_PER_AD = 4;
const AD_RETRY_DELAY_MS = 15000;

export function useAds({ adsReady = false } = {}) {
  // Interstitial
  const { isLoaded: intLoaded, isClosed: intClosed, error: intError, load: loadInt, show: showInt } = useInterstitialAd(INTERSTITIAL_ID);
  const intLoadedRef = useRef(false);
  const clearCountRef = useRef(0);
  const onIntClosedRef = useRef(null);

  useEffect(() => { intLoadedRef.current = intLoaded; }, [intLoaded]);
  // Don't request an ad until the Mobile Ads SDK has actually finished initializing
  // (and consent, if required, has been resolved) - loading earlier tends to fail.
  useEffect(() => { if (adsReady) loadInt(); }, [adsReady]);
  useEffect(() => {
    if (!intError || !adsReady) return;
    const timer = setTimeout(() => loadInt(), AD_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [intError, adsReady]);
  useEffect(() => {
    if (!intClosed) return;
    loadInt();
    if (onIntClosedRef.current) {
      const cb = onIntClosedRef.current;
      onIntClosedRef.current = null;
      cb();
    }
  }, [intClosed]);

  // Calls onDone once the interstitial has been shown and closed (every ROUNDS_PER_AD-th
  // clear), or immediately if no ad is due this round.
  function trackLevelClear(onDone) {
    clearCountRef.current += 1;
    if (clearCountRef.current >= ROUNDS_PER_AD && intLoadedRef.current) {
      clearCountRef.current = 0;
      onIntClosedRef.current = onDone;
      showInt();
    } else {
      onDone();
    }
  }

  // Unlike trackLevelClear, this isn't gated by a rounds counter - every call
  // shows an ad if one's loaded. Free Mode sessions run a full 3:30 each, far
  // longer than a single level clear, so gating them behind the same shared
  // "every 4th" counter as quick level clears would make free-mode ads much
  // rarer than intended - each session end gets its own ad instead.
  function showInterstitial(onDone) {
    if (intLoadedRef.current) {
      onIntClosedRef.current = onDone;
      showInt();
    } else {
      onDone();
    }
  }

  // Rewarded (Android: plain Rewarded; iOS: Rewarded Interstitial). Both hooks are
  // called unconditionally - the inactive platform's ID is null, so that hook's
  // internal ad instance never gets created and it stays inert.
  const androidRewarded = useRewardedAd(REWARDED_ID);
  const iosRewardedInterstitial = useRewardedInterstitialAd(REWARDED_INTERSTITIAL_ID);
  const { isLoaded: rewLoaded, isClosed: rewClosed, error: rewError, isEarnedReward, load: loadRew, show: showRew } =
    Platform.OS === 'ios' ? iosRewardedInterstitial : androidRewarded;
  const rewLoadedRef = useRef(false);
  const onRewardedRef = useRef(null);

  useEffect(() => { rewLoadedRef.current = rewLoaded; }, [rewLoaded]);
  useEffect(() => { if (adsReady) loadRew(); }, [adsReady]);
  useEffect(() => {
    if (!rewError || !adsReady) return;
    const timer = setTimeout(() => loadRew(), AD_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rewError, adsReady]);
  useEffect(() => { if (rewClosed) loadRew(); }, [rewClosed]);

  useEffect(() => {
    if (isEarnedReward && onRewardedRef.current) {
      onRewardedRef.current();
      onRewardedRef.current = null;
    }
  }, [isEarnedReward]);

  function showRewarded(onRewarded) {
    if (rewLoadedRef.current) {
      onRewardedRef.current = onRewarded;
      showRew();
    }
  }

  return { trackLevelClear, showInterstitial, showRewarded, rewLoaded };
}
