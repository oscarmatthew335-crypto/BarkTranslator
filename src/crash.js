// Lightweight crash reporting to Pawlingo's own server (no third-party SDK).
// Sends the error message and stack trace, app version and platform: no
// recordings, names or anything about the pet. Limited to a few reports per
// session so a crash loop can't flood the server or the user's data.

import { Platform } from 'react-native';
import appJson from '../app.json';
import { getInstallId } from './contribute/contributions';

const API = (process.env.EXPO_PUBLIC_PAWLINGO_API || '').replace(/\/+$/, '');
const KEY = process.env.EXPO_PUBLIC_PAWLINGO_KEY || '';
const MAX_PER_SESSION = 8;
let sent = 0;
const seen = new Set();

export async function reportError(error, { fatal = false, where = 'js' } = {}) {
  try {
    if (!API || sent >= MAX_PER_SESSION || !error) return;
    const message = String(error?.message || error).slice(0, 1000);
    const stack = String(error?.stack || '').slice(0, 6000);
    const sig = `${message}|${stack.slice(0, 200)}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    sent++;
    const installId = await getInstallId();
    await fetch(`${API}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Key': KEY, 'X-Install-Id': installId },
      body: JSON.stringify({
        message,
        stack,
        fatal,
        where,
        appVersion: appJson?.expo?.version || 'unknown',
        platform: Platform.OS,
        osVersion: String(Platform.Version)
      })
    });
  } catch (_) {
    // never let reporting itself crash the app
  }
}

let installed = false;
export function installCrashReporting() {
  if (installed) return;
  installed = true;
  const EU = globalThis.ErrorUtils;
  if (!EU?.setGlobalHandler) return;
  const previous = EU.getGlobalHandler?.();
  EU.setGlobalHandler((error, isFatal) => {
    reportError(error, { fatal: Boolean(isFatal), where: 'global' });
    if (previous) previous(error, isFatal);
  });
}
