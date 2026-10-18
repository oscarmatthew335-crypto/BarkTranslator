// Lightweight crash reporting to Pawlingo's own server (no third-party SDK).
// Sends the error message and stack trace, app version and platform: no
// recordings, names or personal data. Rate-limited per session and per day
// on the device so a crash loop can't flood the server or the user's data.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import appJson from '../app.json';
import { getInstallId } from './contribute/contributions';

export const MAX_PER_SESSION = 8;
export const MAX_PER_DAY = 20;
const DAY_KEY = 'pawlingo:crash:day:v1';

let sent = 0;
const seen = new Set();
let customConfig = { api: null, key: null, fetchImpl: null };

export function configureCrashReporting({ api = null, key = null, fetchImpl = null } = {}) {
  customConfig = { api, key, fetchImpl };
}

export async function resetCrashReporter() {
  sent = 0;
  seen.clear();
  try {
    await AsyncStorage.removeItem(DAY_KEY);
  } catch (_) {}
}

// Strips emails, user home paths, and long digit strings (ID/card/phone numbers).
export function scrubPersonalData(text) {
  if (!text) return '';
  return String(text)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(\/Users\/|\/home\/|[A-Za-z]:\\Users\\)[^/\\\s"']+/g, '$1[user]')
    .replace(/\b\d{10,19}\b/g, '[redacted-digits]');
}

async function withinDailyLimit() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = await AsyncStorage.getItem(DAY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const count = parsed?.day === today ? Number(parsed.count) || 0 : 0;
    if (count >= MAX_PER_DAY) return false;
    await AsyncStorage.setItem(DAY_KEY, JSON.stringify({ day: today, count: count + 1 }));
    return true;
  } catch (_) {
    return true;
  }
}

export async function reportError(error, { fatal = false, where = 'js' } = {}) {
  try {
    const api = (customConfig.api ?? process.env.EXPO_PUBLIC_PAWLINGO_API ?? '').replace(/\/+$/, '');
    const key = customConfig.key ?? process.env.EXPO_PUBLIC_PAWLINGO_KEY ?? '';
    const fetchFn = customConfig.fetchImpl || globalThis.fetch;
    if (!api || !fetchFn || sent >= MAX_PER_SESSION || !error) return false;

    const rawMessage = String(error?.message || error).trim();
    if (!rawMessage) return false;
    const message = scrubPersonalData(rawMessage).slice(0, 1000);
    const stack = scrubPersonalData(String(error?.stack || '')).slice(0, 6000);
    const sig = `${where}|${message}|${stack.slice(0, 200)}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    sent++;

    if (!(await withinDailyLimit())) return false;

    const installId = await getInstallId();
    await fetchFn(`${api}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Key': key, 'X-Install-Id': installId },
      body: JSON.stringify({
        message,
        stack,
        fatal: Boolean(fatal),
        where: String(where || 'js').slice(0, 40),
        appVersion: appJson?.expo?.version || 'unknown',
        platform: Platform.OS,
        osVersion: String(Platform.Version)
      })
    });
    return true;
  } catch (_) {
    // never let reporting itself crash the app
    return false;
  }
}

let installed = false;
export function installCrashReporting({ force = false } = {}) {
  if (installed && !force) return;
  installed = true;
  const EU = globalThis.ErrorUtils;
  if (EU?.setGlobalHandler) {
    const previous = EU.getGlobalHandler?.();
    EU.setGlobalHandler((error, isFatal) => {
      reportError(error, { fatal: Boolean(isFatal), where: 'global' });
      if (previous) previous(error, isFatal);
    });
  }
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason || new Error('Unhandled promise rejection');
      reportError(reason, { fatal: false, where: 'promise' });
    });
  }
}

