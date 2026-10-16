// Turns the microphone level readings taken while recording into simple,
// real measurements of the bark: how many barks, how long, how loud, and
// whether it was a sharp bark, a string of barks, a howl or a soft whine.
//
// Input: an array of { t, db } readings, where t is ms since recording
// started and db is the level in dBFS (0 = loudest, -160 = silence) as
// reported by expo-audio metering.

const SILENCE_DB = -160;
const FLOOR_CLAMP_DB = -70;
const MERGE_GAP_MS = 140; // gaps shorter than this belong to the same bark
const MIN_BURST_MS = 50; // ignore blips shorter than this
const HOWL_MS = 900; // one continuous sound this long reads as a howl/rant
const QUIET_PEAK_DB = -28; // a peak below this is a soft whine/grumble

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function percentile(sorted, p) {
  if (sorted.length === 0) return SILENCE_DB;
  const idx = clamp(Math.floor((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[idx];
}

export function analyzeBark(samples, totalMs) {
  const clean = (samples || [])
    .filter((s) => s && Number.isFinite(s.db) && Number.isFinite(s.t))
    .sort((a, b) => a.t - b.t);

  const durationMs = Math.max(totalMs || 0, clean.length ? clean[clean.length - 1].t : 0);

  if (clean.length < 3) {
    return emptyResult(durationMs);
  }

  const levels = clean.map((s) => Math.max(s.db, FLOOR_CLAMP_DB));
  const sorted = [...levels].sort((a, b) => a - b);
  const noiseFloorDb = percentile(sorted, 0.2);
  const peakDb = sorted[sorted.length - 1];
  const thresholdDb = Math.max(noiseFloorDb + 10, -45);

  // Find stretches where the level is above the threshold.
  const step = clean.length > 1 ? (clean[clean.length - 1].t - clean[0].t) / (clean.length - 1) : 60;
  const raw = [];
  let current = null;
  clean.forEach((s, i) => {
    const loud = levels[i] >= thresholdDb;
    if (loud && !current) current = { start: s.t, end: s.t + step, peak: levels[i] };
    else if (loud && current) {
      current.end = s.t + step;
      current.peak = Math.max(current.peak, levels[i]);
    } else if (!loud && current) {
      raw.push(current);
      current = null;
    }
  });
  if (current) raw.push(current);

  // Merge stretches separated by tiny gaps, then drop blips.
  const bursts = [];
  raw.forEach((b) => {
    const last = bursts[bursts.length - 1];
    if (last && b.start - last.end < MERGE_GAP_MS) {
      last.end = b.end;
      last.peak = Math.max(last.peak, b.peak);
    } else {
      bursts.push({ ...b });
    }
  });
  const barks = bursts.filter((b) => b.end - b.start >= MIN_BURST_MS);

  if (barks.length === 0 || peakDb < thresholdDb) {
    return { ...emptyResult(durationMs), noiseFloorDb, peakDb };
  }

  const lengths = barks.map((b) => b.end - b.start);
  const longestMs = Math.max(...lengths);
  const activeMs = lengths.reduce((a, b) => a + b, 0);
  const spanMs = Math.max(1, barks[barks.length - 1].end - barks[0].start);
  const barksPerSec = barks.length / Math.max(0.5, spanMs / 1000);

  let pattern;
  if (longestMs >= HOWL_MS) pattern = 'howl';
  else if (barks.length >= 3) pattern = 'rapid';
  else if (peakDb < QUIET_PEAK_DB) pattern = 'soft';
  else pattern = 'sharp';

  // 0-100 scores from real readings.
  const loudness = Math.round(clamp(((peakDb + 50) / 45) * 100, 0, 100));
  const clarity = Math.round(clamp(((peakDb - noiseFloorDb) / 35) * 100, 0, 100));

  return {
    heard: true,
    pattern,
    barkCount: barks.length,
    durationMs,
    activeMs,
    longestMs,
    barksPerSec,
    peakDb,
    noiseFloorDb,
    loudness,
    clarity
  };
}

function emptyResult(durationMs) {
  return {
    heard: false,
    pattern: 'none',
    barkCount: 0,
    durationMs,
    activeMs: 0,
    longestMs: 0,
    barksPerSec: 0,
    peakDb: SILENCE_DB,
    noiseFloorDb: SILENCE_DB,
    loudness: 0,
    clarity: 0
  };
}

export const PATTERN_LABELS = {
  sharp: '⚡ Sharp Alert Bark',
  rapid: '🔁 Rapid-Fire Barking',
  howl: '🐺 Extended Rant / Howl',
  soft: '🥺 Soft Whine / Grumble'
};

// Long, intense sounds get the "long" lines; short or soft ones get "short".
export function pickLinePool(pattern) {
  return pattern === 'howl' || pattern === 'rapid' ? 'long' : 'short';
}

const PLAY_CONTEXTS = ['play', 'zoomies', 'window', 'attention'];

// Mood bars driven by the measured sound plus the context the owner picked.
export function moodScores(analysis, contextId, personalityId) {
  const { loudness, barksPerSec, barkCount, longestMs, pattern } = analysis;
  const pace = clamp(barksPerSec / 4, 0, 1); // 4+ barks/sec = max pace
  const length = clamp(longestMs / 1500, 0, 1);

  const urgency = 25 + loudness * 0.45 + pace * 30;
  const play =
    20 + pace * 35 + (pattern === 'rapid' ? 15 : 0) + (PLAY_CONTEXTS.includes(contextId) ? 30 : 0);
  const hunger = 10 + (contextId === 'food' ? 55 : 0) + Math.min(barkCount, 6) * 4 + length * 10;
  const sass = 20 + length * 35 + (pattern === 'soft' ? 15 : 0) + (personalityId === 'diva' ? 30 : 0);

  return [
    { label: 'Sass', val: Math.round(clamp(sass, 5, 99)), color: '#EC4899' },
    { label: 'Urgency', val: Math.round(clamp(urgency, 5, 99)), color: '#FF6B00' },
    { label: 'Hunger', val: Math.round(clamp(hunger, 5, 99)), color: '#FFB800' },
    { label: 'Play', val: Math.round(clamp(play, 5, 99)), color: '#10B981' }
  ];
}
