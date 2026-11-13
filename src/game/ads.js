// Android-only AdMob integration (iOS is a safe no-op).
// Uses Google's official test ad unit IDs unless EXPO_PUBLIC_ADMOB_* env vars
// are provided. Runs Google's UMP consent flow after onboarding + age check
// and only requests ads when consent allows (`canRequestAds === true`).

import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  MaxAdContentRating,
  TestIds
} from 'react-native-google-mobile-ads';
import { count } from './counters';
import { initAnalytics, track } from './analytics';
import { initMeta } from './meta';

export const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const TEST_REWARDED_ID = TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917';
export const TEST_INTERSTITIAL_ID = TestIds?.INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712';

// Set to true to request non-personalised ads on every request.
export const ADS_NON_PERSONALISED = false;
export const AD_CONTENT_RATING = MaxAdContentRating?.PG || 'PG';

// Expo only inlines EXPO_PUBLIC_* values into the app bundle where the code reads
// them literally as `process.env.EXPO_PUBLIC_X`. Reading them through a variable
// (e.g. `env = process.env; env.EXPO_PUBLIC_X`) is NOT inlined, so release builds
// silently fell back to Google's test units (2.6.1 shipped showing "Test Ad").
function bundledAdEnv() {
  return {
    EXPO_PUBLIC_ADMOB_REWARDED_LIFE: process.env.EXPO_PUBLIC_ADMOB_REWARDED_LIFE,
    EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE: process.env.EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE,
    EXPO_PUBLIC_ADMOB_INTERSTITIAL: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL
  };
}

export function adUnitIds(env = bundledAdEnv()) {
  return {
    rewardedLife: env?.EXPO_PUBLIC_ADMOB_REWARDED_LIFE || TEST_REWARDED_ID,
    rewardedContinue: env?.EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE || TEST_REWARDED_ID,
    interstitial: env?.EXPO_PUBLIC_ADMOB_INTERSTITIAL || TEST_INTERSTITIAL_ID
  };
}

export function adRequestOptions(nonPersonalised = ADS_NON_PERSONALISED) {
  return {
    requestNonPersonalizedAdsOnly: Boolean(nonPersonalised)
  };
}

let initialized = false;
let initPromise = null;
let canRequest = false;
let privacyOptionsAvailable = false;

const slots = {
  life: { ad: null, loaded: false, cleanups: [] },
  continue: { ad: null, loaded: false, cleanups: [] },
  interstitial: { ad: null, loaded: false, cleanups: [] }
};

const listeners = new Set();

function notify() {
  const snapshot = getAdsStatus();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (_) {}
  });
}

export function getAdsStatus() {
  if (Platform.OS !== 'android') {
    return {
      ready: false,
      canRequestAds: false,
      rewardedLifeReady: false,
      rewardedContinueReady: false,
      interstitialReady: false,
      privacyOptionsAvailable: false
    };
  }
  return {
    ready: initialized,
    canRequestAds: canRequest,
    rewardedLifeReady: Boolean(slots.life.loaded && slots.life.ad),
    rewardedContinueReady: Boolean(slots.continue.loaded && slots.continue.ad),
    interstitialReady: Boolean(slots.interstitial.loaded && slots.interstitial.ad),
    privacyOptionsAvailable
  };
}

export function onAdsStatusChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isRewardedReady(kind = 'life') {
  if (Platform.OS !== 'android') return false;
  const key = kind === 'continue' ? 'continue' : 'life';
  return Boolean(slots[key].loaded && slots[key].ad);
}

export function isInterstitialReady() {
  if (Platform.OS !== 'android') return false;
  return Boolean(slots.interstitial.loaded && slots.interstitial.ad);
}

// A failed load (no fill is common for a new AdMob account) is retried after
// 30 s, 1 min, 2 min, 4 min, then every 5 min. A successful load resets it.
export const RETRY_BASE_MS = 30000;
export const RETRY_MAX_MS = 300000;
export const retryDelayMs = (attempt) => Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempt), RETRY_MAX_MS);
const retries = { life: 0, continue: 0, interstitial: 0 };
const retryTimers = {};

function scheduleRetry(key, load) {
  clearTimeout(retryTimers[key]);
  const wait = retryDelayMs(retries[key]);
  retries[key] += 1;
  retryTimers[key] = setTimeout(() => load(key), wait);
}

function clearSlot(key) {
  const slot = slots[key];
  if (!slot) return;
  slot.cleanups.forEach((fn) => {
    try {
      fn?.();
    } catch (_) {}
  });
  slot.cleanups = [];
  slot.ad = null;
  slot.loaded = false;
  clearTimeout(retryTimers[key]);
}

// While an ad is showing, its load listeners are no longer needed (and a show
// error must not also schedule a load retry).
function dropLoadListeners(slot) {
  slot.cleanups.forEach((fn) => {
    try {
      fn?.();
    } catch (_) {}
  });
  slot.cleanups = [];
}

function preloadRewarded(key) {
  if (Platform.OS !== 'android' || !canRequest) return;
  clearSlot(key);
  try {
    const ids = adUnitIds();
    const unitId = key === 'continue' ? ids.rewardedContinue : ids.rewardedLife;
    const ad = RewardedAd.createForAdRequest(unitId, adRequestOptions());
    const unsubLoad = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      slots[key].loaded = true;
      retries[key] = 0;
      notify();
    });
    const unsubErr = ad.addAdEventListener(AdEventType.ERROR, () => {
      // Errors while showing are handled in showRewardedAd; only retry a failed load.
      if (slots[key].ad !== ad || slots[key].loaded) return;
      slots[key].loaded = false;
      notify();
      scheduleRetry(key, preloadRewarded);
    });
    slots[key].ad = ad;
    slots[key].cleanups = [unsubLoad, unsubErr];
    ad.load();
  } catch (_) {
    clearSlot(key);
  }
}

function preloadInterstitial() {
  if (Platform.OS !== 'android' || !canRequest) return;
  clearSlot('interstitial');
  try {
    const ids = adUnitIds();
    const ad = InterstitialAd.createForAdRequest(ids.interstitial, adRequestOptions());
    const unsubLoad = ad.addAdEventListener(AdEventType.LOADED, () => {
      slots.interstitial.loaded = true;
      retries.interstitial = 0;
      notify();
    });
    const unsubErr = ad.addAdEventListener(AdEventType.ERROR, () => {
      if (slots.interstitial.ad !== ad || slots.interstitial.loaded) return;
      slots.interstitial.loaded = false;
      notify();
      scheduleRetry('interstitial', () => preloadInterstitial());
    });
    slots.interstitial.ad = ad;
    slots.interstitial.cleanups = [unsubLoad, unsubErr];
    ad.load();
  } catch (_) {
    clearSlot('interstitial');
  }
}

// Gather UMP consent and initialize AdMob (called after onboarding + ageCheck).
export async function initAds() {
  if (Platform.OS !== 'android') return false;
  if (initialized) return canRequest;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let consentInfo = null;
      if (AdsConsent?.gatherConsent) {
        try {
          consentInfo = await AdsConsent.gatherConsent();
        } catch (_) {
          if (AdsConsent?.getConsentInfo) {
            consentInfo = await AdsConsent.getConsentInfo().catch(() => null);
          }
        }
      }
      // Only load ads when UMP consent says we can request ads (or if consent Info
      // reports canRequestAds === true).
      // If the consent check failed (no answer at all), don't request ads:
      // initAds() runs again on the next app start.
      canRequest = Boolean(consentInfo ? consentInfo.canRequestAds : !AdsConsent);
      privacyOptionsAvailable = Boolean(
        consentInfo?.privacyOptionsRequirementStatus === 'REQUIRED'
      );
      await initAnalytics({ canTrack: canRequest && !ADS_NON_PERSONALISED });
      await initMeta({ canTrack: canRequest && !ADS_NON_PERSONALISED });

      if (!canRequest) {
        initialized = true;
        notify();
        return false;
      }

      const sdk = typeof mobileAds === 'function' ? mobileAds() : null;
      if (sdk?.setRequestConfiguration) {
        await sdk.setRequestConfiguration({
          maxAdContentRating: AD_CONTENT_RATING,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false
        });
      }
      if (sdk?.initialize) {
        await sdk.initialize();
      }

      initialized = true;
      preloadRewarded('life');
      preloadRewarded('continue');
      preloadInterstitial();
      notify();
      return true;
    } catch (_) {
      canRequest = false;
      initialized = false;
      await initAnalytics({ canTrack: false });
      await initMeta({ canTrack: false });
      notify();
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

// Show a rewarded ad ('life' or 'continue'). Resolves `{ rewarded: true }` only
// if the user completed the ad and earned the reward.
export function showRewardedAd(kind = 'life') {
  if (Platform.OS !== 'android') return Promise.resolve({ rewarded: false });
  const key = kind === 'continue' ? 'continue' : 'life';
  const slot = slots[key];
  if (!slot?.loaded || !slot?.ad) {
    preloadRewarded(key);
    return Promise.resolve({ rewarded: false });
  }

  return new Promise((resolve) => {
    const ad = slot.ad;
    slot.loaded = false;
    dropLoadListeners(slot);
    notify();

    let earned = false;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        unsubEarned?.();
        unsubClosed?.();
        unsubError?.();
      } catch (_) {}
      if (earned) {
        count('rewardedAdsCompleted');
        track('ad_rewarded_complete', { placement: key });
      }
      preloadRewarded(key);
      resolve({ rewarded: earned });
    };

    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, finish);
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, finish);

    try {
      const maybePromise = ad.show();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(finish);
      }
    } catch (_) {
      finish();
    }
  });
}

// Show an interstitial ad if one is loaded. Resolves `true` if shown.
export function showInterstitialAd() {
  if (Platform.OS !== 'android') return Promise.resolve(false);
  const slot = slots.interstitial;
  if (!slot?.loaded || !slot?.ad) {
    preloadInterstitial();
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const ad = slot.ad;
    slot.loaded = false;
    dropLoadListeners(slot);
    notify();

    let settled = false;
    const finish = (shown) => {
      if (settled) return;
      settled = true;
      try {
        unsubClosed?.();
        unsubError?.();
      } catch (_) {}
      if (shown) {
        count('interstitialsShown');
        track('ad_interstitial_shown');
      }
      preloadInterstitial();
      resolve(Boolean(shown));
    };

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(true));
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));

    try {
      const maybePromise = ad.show();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => finish(false));
      }
    } catch (_) {
      finish(false);
    }
  });
}

export async function openPrivacyOptions() {
  if (Platform.OS !== 'android') return false;
  try {
    if (AdsConsent?.showPrivacyOptionsForm) {
      await AdsConsent.showPrivacyOptionsForm();
      return true;
    }
  } catch (_) {}
  return false;
}
