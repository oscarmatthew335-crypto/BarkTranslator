// Pure lives rules for Endless and Chase runs (no React, no timers).
// Every function takes `now` (ms timestamp) so tests can step time directly.

export const MAX_LIVES = 5;
export const REFILL_MS = 20 * 60 * 1000; // 1 life every 20 minutes
export const FIRST_DAY_UNLIMITED_MS = 24 * 60 * 60 * 1000; // 24 hours from first Play tab open

export const emptyLives = (now = null) => ({
  lives: MAX_LIVES,
  refillFrom: null,
  firstSeenAt: now
});

// First 24 hours after first opening the Play tab have unlimited lives.
// If the phone clock moves backwards before firstSeenAt, clamp elapsed to 0.
export function isUnlimitedFirstDay(state, now) {
  if (!state || state.firstSeenAt == null) return true;
  if (now == null) return false;
  const elapsed = Math.max(0, now - state.firstSeenAt);
  return elapsed < FIRST_DAY_UNLIMITED_MS;
}

export function firstDayRemainingMs(state, now = Date.now()) {
  if (!state || state.firstSeenAt == null) return FIRST_DAY_UNLIMITED_MS;
  const elapsed = Math.max(0, now - state.firstSeenAt);
  return Math.max(0, FIRST_DAY_UNLIMITED_MS - elapsed);
}

export function formatHoursLeft(ms) {
  const totalMin = Math.max(1, Math.ceil((ms || 0) / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function livesNow(state, now = Date.now(), { premium = false } = {}) {
  const base = state && typeof state === 'object' ? state : emptyLives(now);
  const firstSeenAt = base.firstSeenAt ?? now;
  const unlimited = Boolean(premium || isUnlimitedFirstDay({ ...base, firstSeenAt }, now));

  if (unlimited) {
    return {
      lives: MAX_LIVES,
      max: MAX_LIVES,
      unlimited: true,
      msUntilNext: 0,
      nextAt: null,
      state: {
        ...base,
        lives: MAX_LIVES,
        refillFrom: null,
        firstSeenAt
      }
    };
  }

  const rawLives = typeof base.lives === 'number' ? Math.max(0, Math.min(MAX_LIVES, Math.floor(base.lives))) : MAX_LIVES;
  if (rawLives >= MAX_LIVES) {
    return {
      lives: MAX_LIVES,
      max: MAX_LIVES,
      unlimited: false,
      msUntilNext: 0,
      nextAt: null,
      state: {
        ...base,
        lives: MAX_LIVES,
        refillFrom: null,
        firstSeenAt
      }
    };
  }

  // If refillFrom is missing or the phone clock moved backwards before refillFrom,
  // clamp refillFrom to `now` so the timer never gets stuck hours in the future.
  const refillFrom = base.refillFrom == null || now < base.refillFrom ? now : base.refillFrom;
  const elapsed = Math.max(0, now - refillFrom);
  const gained = Math.floor(elapsed / REFILL_MS);
  const lives = Math.min(MAX_LIVES, rawLives + gained);

  if (lives >= MAX_LIVES) {
    return {
      lives: MAX_LIVES,
      max: MAX_LIVES,
      unlimited: false,
      msUntilNext: 0,
      nextAt: null,
      state: {
        ...base,
        lives: MAX_LIVES,
        refillFrom: null,
        firstSeenAt
      }
    };
  }

  const nextRefillFrom = refillFrom + gained * REFILL_MS;
  const nextAt = nextRefillFrom + REFILL_MS;
  const msUntilNext = Math.max(0, nextAt - now);

  return {
    lives,
    max: MAX_LIVES,
    unlimited: false,
    msUntilNext,
    nextAt,
    state: {
      ...base,
      lives,
      refillFrom: nextRefillFrom,
      firstSeenAt
    }
  };
}

export function canStartRun(state, now = Date.now(), { premium = false } = {}) {
  return livesNow(state, now, { premium }).lives > 0;
}

export function useLife(state, now = Date.now(), { premium = false } = {}) {
  const cur = livesNow(state, now, { premium });
  if (cur.unlimited) return cur.state;
  if (cur.lives <= 0) return cur.state;
  const nextLives = cur.lives - 1;
  const refillFrom = cur.state.refillFrom ?? now;
  return {
    ...cur.state,
    lives: nextLives,
    refillFrom: nextLives >= MAX_LIVES ? null : refillFrom
  };
}

export function addLife(state, now = Date.now(), n = 1, { premium = false } = {}) {
  const cur = livesNow(state, now, { premium });
  if (cur.unlimited) return cur.state;
  const delta = Math.max(1, Math.floor(n || 1));
  const nextLives = Math.min(MAX_LIVES, cur.lives + delta);
  return {
    ...cur.state,
    lives: nextLives,
    refillFrom: nextLives >= MAX_LIVES ? null : cur.state.refillFrom
  };
}

export function formatWait(ms) {
  const totalSec = Math.max(0, Math.ceil((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
