// Android-only Meta (Facebook) SDK wrapper for install and ad attribution.
// Safe no-op on iOS, in dev/CI without credentials, when ADS_NON_PERSONALISED
// is true, or before UMP consent allows personalised ads/analytics.

import { Platform } from 'react-native';
import { ADS_NON_PERSONALISED } from './ads';

export const ALLOWED_RUN_MODES = new Set(['stage', 'endless', 'chase', 'daily']);

// Expo only inlines EXPO_PUBLIC_* values when read literally as
// `process.env.EXPO_PUBLIC_<NAME>`.
function bundledMetaEnv() {
  return {
    EXPO_PUBLIC_META_APP_ID: process.env.EXPO_PUBLIC_META_APP_ID,
    EXPO_PUBLIC_META_CLIENT_TOKEN: process.env.EXPO_PUBLIC_META_CLIENT_TOKEN
  };
}

export function metaConfig(env = bundledMetaEnv()) {
  const appId = String(env?.EXPO_PUBLIC_META_APP_ID || '').trim();
  const clientToken = String(env?.EXPO_PUBLIC_META_CLIENT_TOKEN || '').trim();
  return {
    appId,
    clientToken,
    configured: Boolean(appId && clientToken)
  };
}

let metaEnabled = false;
let testSink = null;

function loadFbSdk(overrideSdk) {
  if (overrideSdk) return overrideSdk;
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line global-require
    return require('react-native-fbsdk-next');
  } catch (_) {
    return null;
  }
}

export async function initMeta({
  canTrack = false,
  env = bundledMetaEnv(),
  nonPersonalised = ADS_NON_PERSONALISED,
  platform = Platform.OS,
  sdk: overrideSdk = null
} = {}) {
  const { configured } = metaConfig(env);
  if (platform !== 'android' || !configured || Boolean(nonPersonalised) || canTrack !== true) {
    metaEnabled = false;
    return false;
  }

  const fbsdk = loadFbSdk(overrideSdk);
  const Settings = fbsdk?.Settings;
  if (!Settings) {
    metaEnabled = Boolean(typeof testSink === 'function');
    return metaEnabled;
  }

  try {
    await Settings.setAutoLogAppEventsEnabled?.(true);
    await Settings.setAdvertiserIDCollectionEnabled?.(true);
    await Settings.initializeSDK?.();
    metaEnabled = true;
    return true;
  } catch (_) {
    metaEnabled = false;
    return false;
  }
}

export function isMetaEnabled() {
  return metaEnabled;
}

export function logMetaRunFinished(mode, { platform = Platform.OS, sdk: overrideSdk = null } = {}) {
  if (platform !== 'android' || !metaEnabled) return false;
  const cleanMode = ALLOWED_RUN_MODES.has(mode) ? mode : 'stage';
  const payload = { mode: cleanMode };
  if (typeof testSink === 'function') {
    testSink({ type: 'event', name: 'run_finished', params: payload });
    return true;
  }
  const fbsdk = loadFbSdk(overrideSdk);
  const AppEventsLogger = fbsdk?.AppEventsLogger;
  if (!AppEventsLogger?.logEvent) return false;
  try {
    AppEventsLogger.logEvent('run_finished', payload);
    return true;
  } catch (_) {
    return false;
  }
}

export function logMetaPremiumPurchased(
  { price = 0, currency = 'USD', productId = 'pawlingo_premium' } = {},
  { platform = Platform.OS, sdk: overrideSdk = null } = {}
) {
  if (platform !== 'android' || !metaEnabled) return false;
  const amount = Number.isFinite(Number(price)) && Number(price) >= 0 ? Number(price) : 0;
  const curr = String(currency || 'USD').slice(0, 8);
  const contentId = String(productId || 'pawlingo_premium').slice(0, 40);
  if (typeof testSink === 'function') {
    testSink({
      type: 'purchase',
      name: 'premium_purchased',
      amount,
      currency: curr,
      params: { content_id: contentId }
    });
    return true;
  }
  const fbsdk = loadFbSdk(overrideSdk);
  const AppEventsLogger = fbsdk?.AppEventsLogger;
  if (!AppEventsLogger) return false;
  try {
    if (typeof AppEventsLogger.logPurchase === 'function') {
      AppEventsLogger.logPurchase(amount, curr, { content_id: contentId });
    } else if (typeof AppEventsLogger.logEvent === 'function') {
      AppEventsLogger.logEvent('premium_purchased', { value: amount, currency: curr, content_id: contentId });
    }
    return true;
  } catch (_) {
    return false;
  }
}

export function setMetaSinkForTests(fn) {
  testSink = typeof fn === 'function' ? fn : null;
}

export function resetMetaForTests() {
  metaEnabled = false;
  testSink = null;
}
