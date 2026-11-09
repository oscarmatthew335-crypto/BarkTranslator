// Pure interstitial ad frequency rules (no React, no timers).
// Every rule lives in INTERSTITIAL_RULES so it can be tuned in one place.

export const INTERSTITIAL_RULES = {
  everyNRuns: 3, // at most every 3rd run
  minIntervalMs: 3 * 60 * 1000, // at least 3 minutes apart
  minLifetimeRuns: 5 // never in the player's first 5 runs ever
};

export const emptyInterstitialState = () => ({
  totalRuns: 0,
  runsSinceLast: 0,
  lastShownAt: null
});

export function recordRunForInterstitial(state, { mode } = {}) {
  const base = { ...emptyInterstitialState(), ...(state || {}) };
  if (mode !== 'endless' && mode !== 'chase') return base;
  return {
    ...base,
    totalRuns: (base.totalRuns || 0) + 1,
    runsSinceLast: (base.runsSinceLast || 0) + 1
  };
}

// history may include { totalRuns, runsSinceLast, lastShownAt, mode, newBest, premium }
export function shouldShowInterstitial(history, now = Date.now()) {
  if (!history || typeof history !== 'object') return false;
  if (history.premium) return false;
  if (history.mode && history.mode !== 'endless' && history.mode !== 'chase') return false;
  if (history.newBest) return false;
  if ((history.totalRuns || 0) <= INTERSTITIAL_RULES.minLifetimeRuns) return false;
  if ((history.runsSinceLast || 0) < INTERSTITIAL_RULES.everyNRuns) return false;
  if (history.lastShownAt != null && now != null) {
    // If the phone clock moved backwards before lastShownAt, do not block forever;
    // otherwise require at least minIntervalMs since lastShownAt.
    if (now >= history.lastShownAt && now - history.lastShownAt < INTERSTITIAL_RULES.minIntervalMs) {
      return false;
    }
  }
  return true;
}

export function recordInterstitialShown(state, now = Date.now()) {
  const base = { ...emptyInterstitialState(), ...(state || {}) };
  return {
    ...base,
    runsSinceLast: 0,
    lastShownAt: now
  };
}
