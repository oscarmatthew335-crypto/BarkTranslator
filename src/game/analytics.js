import { Platform } from 'react-native';

export const ALLOWED_EVENTS = new Set([
  'tutorial_complete',
  'run_start',
  'run_end',
  'daily_challenge_done',
  'streak_day',
  'ad_rewarded_complete',
  'ad_interstitial_shown',
  'store_open',
  'purchase',
  'share_score',
  'run_goal_shown',
  'run_goal_done',
  'play_again_tap',
  'near_miss_shown'
]);

const FORBIDDEN_PARAM_KEYS = new Set([
  'name',
  'petname',
  'dogname',
  'catname',
  'username',
  'text',
  'comment',
  'note',
  'uri',
  'url',
  'email',
  'phone',
  'installid',
  'petid',
  'userid',
  'photo',
  'audio'
]);

let consentAllowed = false;
let consentDecided = false;
let pendingQueue = [];
let testSink = null;

function loadFirebaseAnalytics() {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line global-require
    return require('@react-native-firebase/analytics');
  } catch (_) {
    return null;
  }
}

export function scoreBucket(score) {
  const n = Math.max(0, Math.floor(Number(score) || 0));
  if (n === 0) return '0';
  if (n < 100) return '1_99';
  if (n < 250) return '100_249';
  if (n < 500) return '250_499';
  if (n < 1000) return '500_999';
  if (n < 2500) return '1000_2499';
  return '2500_plus';
}

export function msBucket(ms) {
  const n = Math.max(0, Math.floor(Number(ms) || 0));
  if (n < 1000) return 'under_1s';
  if (n < 2000) return '1_2s';
  if (n < 5000) return '2_5s';
  return '5s_plus';
}

export function runModeFor(stageOrResult) {
  if (!stageOrResult) return 'stage';
  if (stageOrResult.endless) return 'endless';
  if (stageOrResult.chase) return 'chase';
  if (stageOrResult.daily) return 'daily';
  return 'stage';
}

export function sanitizeParams(params = {}) {
  if (!params || typeof params !== 'object') return {};
  const clean = {};
  for (const [rawKey, rawVal] of Object.entries(params)) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    if (FORBIDDEN_PARAM_KEYS.has(key.toLowerCase())) continue;
    if (rawVal === null || rawVal === undefined) continue;
    if (typeof rawVal === 'number') {
      if (Number.isFinite(rawVal)) clean[key] = rawVal;
    } else if (typeof rawVal === 'boolean') {
      clean[key] = rawVal ? 1 : 0;
    } else if (typeof rawVal === 'string') {
      clean[key] = rawVal.slice(0, 40);
    }
  }
  return clean;
}

export async function initAnalytics({ canTrack = false, platform = Platform.OS } = {}) {
  const allowed = platform === 'android' && Boolean(canTrack);
  consentAllowed = allowed;
  consentDecided = true;
  if (platform === 'android') {
    const mod = loadFirebaseAnalytics();
    if (mod) {
      try {
        if (typeof mod.getAnalytics === 'function' && typeof mod.setAnalyticsCollectionEnabled === 'function') {
          const inst = mod.getAnalytics();
          await mod.setAnalyticsCollectionEnabled(inst, allowed);
        } else {
          const fn = mod.default || mod;
          if (typeof fn === 'function') {
            await fn().setAnalyticsCollectionEnabled?.(allowed);
          }
        }
      } catch (_) {}
    }
  }
  const queued = pendingQueue.splice(0, pendingQueue.length);
  if (allowed) {
    for (const item of queued) {
      await track(item.name, item.params, { platform });
    }
  }
  return allowed;
}

export function isAnalyticsEnabled() {
  return consentAllowed;
}

export async function track(event, params = {}, { platform = Platform.OS } = {}) {
  const name = String(event || '').trim();
  if (!ALLOWED_EVENTS.has(name)) return false;
  if (platform !== 'android') return false;
  const safeParams = sanitizeParams(params);
  if (!consentDecided) {
    if (pendingQueue.length < 10) pendingQueue.push({ name, params: safeParams });
    return false;
  }
  if (!consentAllowed) return false;
  if (typeof testSink === 'function') {
    testSink(name, safeParams);
    return true;
  }
  const mod = loadFirebaseAnalytics();
  if (!mod) return false;
  try {
    if (typeof mod.getAnalytics === 'function' && typeof mod.logEvent === 'function') {
      const inst = mod.getAnalytics();
      await mod.logEvent(inst, name, safeParams);
      return true;
    }
    const fn = mod.default || mod;
    if (typeof fn === 'function') {
      await fn().logEvent?.(name, safeParams);
      return true;
    }
  } catch (_) {}
  return false;
}

export function setAnalyticsSinkForTests(fn) {
  testSink = typeof fn === 'function' ? fn : null;
}

export function resetAnalyticsForTests() {
  consentAllowed = false;
  consentDecided = false;
  pendingQueue = [];
  testSink = null;
}
