// Turns the microphone level readings taken while recording into simple,
// real measurements of the bark: how many barks, how long, how loud, and
// whether it was a sharp bark, a string of barks, a howl or a soft whine.
//
// Input: an array of { t, db } readings, where t is ms since recording
// started and db is the level in dBFS (0 = loudest, -160 = silence) as
// reported by expo-audio metering.

import { pitch, SAMPLE_RATE, windowLevels } from './features';

const SILENCE_DB = -160;
const FLOOR_CLAMP_DB = -70;
export const SETTLE_MS = 350; // first bit of audio is used only to measure background noise
const MERGE_GAP_MS = 140; // gaps shorter than this belong to the same bark
export const MIN_BURST_MS = 120; // ignore taps and clicks shorter than this
const HOWL_MS = 900; // one continuous sound this long reads as a howl/rant
const QUIET_PEAK_DB = -28; // a peak below this is a soft whine/grumble
const FRAME = 400; // 25 ms at 16 kHz
const HOP = 160; // 10 ms at 16 kHz

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function percentile(sorted, p) {
  if (sorted.length === 0) return SILENCE_DB;
  const idx = clamp(Math.floor((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[idx];
}

// Checks that the loud bursts contain at least MIN_BURST_MS of actual signal
// at 10 ms resolution and that the loud frames have a clear pitch (80-1500 Hz).
// Taps, clicks, rustles and phone knocks are either too brief or unpitched.
function isVoiced(pcm, barks, thresholdDb) {
  if (!pcm || pcm.length < FRAME) return false;
  const ampThreshold = Math.max(0.015, 10 ** (thresholdDb / 20));
  const frame = new Float32Array(FRAME);
  const hopMs = (HOP / SAMPLE_RATE) * 1000;
  let voiced = 0;
  let activeHops = 0;
  let maxBurstMs = 0;
  for (const b of barks) {
    const startSample = Math.max(0, Math.floor((b.start / 1000) * SAMPLE_RATE));
    const endSample = Math.min(pcm.length, Math.ceil((b.end / 1000) * SAMPLE_RATE));
    let burstHops = 0;
    for (let off = startSample; off + FRAME <= endSample; off += HOP) {
      let hopPeak = 0;
      const hopStart = off + ((FRAME - HOP) >> 1);
      for (let i = 0; i < HOP; i++) {
        const a = Math.abs(pcm[hopStart + i]);
        if (a > hopPeak) hopPeak = a;
      }
      if (hopPeak < ampThreshold) continue;
      burstHops++;
      activeHops++;
      for (let i = 0; i < FRAME; i++) frame[i] = pcm[off + i];
      const [f0, strength] = pitch(frame);
      if (strength >= 0.3 && f0 >= 80 && f0 <= 1500) voiced++;
    }
    if (burstHops * hopMs > maxBurstMs) maxBurstMs = burstHops * hopMs;
  }
  return maxBurstMs >= MIN_BURST_MS && voiced >= 5 && voiced / Math.max(1, activeHops) >= 0.25;
}

export function analyzeBark(samplesOrPcm, totalMs, { pcm = null, liveHeard = true } = {}) {
  let samples = samplesOrPcm;
  let rawPcm = pcm;
  if (samplesOrPcm instanceof Float32Array) {
    rawPcm = samplesOrPcm;
    samples = windowLevels(rawPcm, SAMPLE_RATE, 0);
    if (totalMs === undefined) totalMs = (rawPcm.length / SAMPLE_RATE) * 1000;
  }

  const clean = (samples || [])
    .filter((s) => s && Number.isFinite(s.db) && Number.isFinite(s.t))
    .sort((a, b) => a.t - b.t);

  const durationMs = Math.max(totalMs || 0, clean.length ? clean[clean.length - 1].t : 0);

  if (clean.length < 3) {
    return emptyResult(durationMs);
  }

  const levels = clean.map((s) => Math.max(s.db, FLOOR_CLAMP_DB));
  const settleLevels = clean.filter((s) => s.t < SETTLE_MS).map((s) => Math.max(s.db, FLOOR_CLAMP_DB));
  const sortedAll = [...levels].sort((a, b) => a - b);
  const sortedSettle = [...settleLevels].sort((a, b) => a - b);
  const noiseFloorDb = sortedSettle.length
    ? Math.min(percentile(sortedSettle, 0.5), percentile(sortedAll, 0.2))
    : percentile(sortedAll, 0.2);

  const postSettle = clean.filter((s) => s.t >= SETTLE_MS).map((s) => Math.max(s.db, FLOOR_CLAMP_DB));
  const peakDb = postSettle.length ? Math.max(...postSettle) : noiseFloorDb;
  const thresholdDb = Math.max(noiseFloorDb + 10, -45);

  // Find stretches after SETTLE_MS where the level is above the threshold.
  // The first SETTLE_MS is used only for the background noise floor.
  const step = clean.length > 1 ? (clean[clean.length - 1].t - clean[0].t) / (clean.length - 1) : 60;
  const raw = [];
  let current = null;
  clean.forEach((s, i) => {
    const loud = s.t >= SETTLE_MS && levels[i] >= thresholdDb;
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

  // Merge stretches separated by tiny gaps, then drop short taps/blips.
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

  const voicedOk = rawPcm ? isVoiced(rawPcm, barks, thresholdDb) : true;
  if (!liveHeard || !voicedOk || barks.length === 0 || peakDb < thresholdDb) {
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
