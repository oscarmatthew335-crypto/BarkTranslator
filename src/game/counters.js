// Local-only usage counters for the owner's hidden debug screen (long-press
// the version number in Settings). Nothing here is ever sent anywhere: no
// analytics SDK, no tracking, no network.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey, dayNumber } from './daily';

const KEY = 'pawlingo:counters:v1';
const KEEP_DAYS = 60;

export const emptyCounters = () => ({
  firstOpenDay: null,
  sessionsByDay: {}, // dayKey -> app opens / returns to the foreground
  stagesPlayed: 0,
  stagesFinished: 0,
  dailyRuns: 0,
  treatRoundsOffered: 0,
  treatRoundsStarted: 0,
  questionsAsked: 0,
  questionsAnswered: 0,
  notSure: 0,
  clipsLabelled: 0,
  photoChallenges: 0,
  photosShared: 0,
  fpsSamples: [] // average frames per second of recent runs
});

// One app session (open or back from the background) on `today`.
export function applySession(c, today) {
  const sessionsByDay = { ...c.sessionsByDay, [today]: (c.sessionsByDay[today] || 0) + 1 };
  const cutoff = dayNumber(today) - KEEP_DAYS;
  for (const k of Object.keys(sessionsByDay)) if (dayNumber(k) < cutoff) delete sessionsByDay[k];
  return { ...c, firstOpenDay: c.firstOpenDay || today, sessionsByDay };
}

// Day-1/7/30 returns: did the app open on that day after the first open?
// null = that day hasn't come yet. (Days older than 60 are forgotten, so the
// day-30 answer is kept once known.)
export function retention(c, today) {
  if (!c.firstOpenDay) return { d1: null, d7: null, d30: null };
  const first = dayNumber(c.firstOpenDay);
  const now = dayNumber(today);
  const opened = (n) => {
    if (now < first + n) return null;
    return Object.keys(c.sessionsByDay).some((k) => dayNumber(k) === first + n) || Boolean(c.returned?.[n]);
  };
  return { d1: opened(1), d7: opened(7), d30: opened(30) };
}

export function rememberReturns(c, today) {
  const r = retention(c, today);
  const returned = { ...(c.returned || {}) };
  for (const [k, n] of [['d1', 1], ['d7', 7], ['d30', 30]]) if (r[k]) returned[n] = true;
  return { ...c, returned };
}

export function sessionsPerDay(c) {
  const days = Object.values(c.sessionsByDay);
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
}

export const rate = (part, whole) => (whole > 0 ? part / whole : null);

// --- storage (one shared copy in memory) ---------------------------------

let cache = null;
let saving = Promise.resolve();

let loading = null;
export function loadCounters() {
  if (cache) return Promise.resolve(cache);
  if (!loading)
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        cache = { ...emptyCounters(), ...(raw ? JSON.parse(raw) : {}) };
      } catch (_) {
        cache = emptyCounters();
      }
      return cache;
    })();
  return loading;
}

// Counts made at the same moment must all land: each one applies to the
// current copy after loading, never to a copy read before another count.
async function update(fn) {
  await loadCounters();
  cache = fn(cache);
  saving = saving.then(() => AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {}));
  return cache;
}

export const countSession = (now = Date.now()) => update((c) => rememberReturns(applySession(c, dayKey(now)), dayKey(now)));
export const count = (name, n = 1) => update((c) => ({ ...c, [name]: (c[name] || 0) + n }));
export const recordFps = (fps) =>
  update((c) => ({ ...c, fpsSamples: [...(c.fpsSamples || []), Math.round(fps * 10) / 10].slice(-20) }));
export const resetCounters = () => update(() => emptyCounters());
