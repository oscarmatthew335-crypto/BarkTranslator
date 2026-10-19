import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFeatures, FEATURE_NAMES, encodeWav, resample, windowLevels, SAMPLE_RATE } from '../src/audio/features.js';
import { analyzeBark, SETTLE_MS } from '../src/audio/barkAnalysis.js';
import { synth } from './synth.mjs';

const get = (f, name) => f.vector[FEATURE_NAMES.indexOf(name)];

test('silence has no fingerprint', () => {
  assert.equal(computeFeatures(synth(2, [])), null);
});

test('fingerprint separates low barks, quick yips and a howl', () => {
  const low = computeFeatures(synth(2, [[0.3, 0.25, 220, 0.6], [0.9, 0.25, 220, 0.6]]));
  const yips = computeFeatures(synth(2, Array.from({ length: 5 }, (_, i) => [0.2 + i * 0.2, 0.08, 900, 0.5])));
  const howl = computeFeatures(synth(3, [[0.3, 1.8, 450, 0.5]]));
  assert.equal(low.vector.length, FEATURE_NAMES.length);
  assert.ok(get(low, 'f0_median_khz') < 0.3 && get(yips, 'f0_median_khz') > 0.8);
  assert.equal(get(yips, 'burst_count'), 5);
  assert.ok(get(howl, 'longest_burst_s') > 1.5);
});

test('wav and resample helpers', () => {
  const w = encodeWav(new Float32Array(1600));
  assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF');
  assert.equal(w.length, 44 + 3200);
  assert.equal(resample(new Float32Array(48000), 48000).length, 16000);
});

test('bark analysis patterns', () => {
  const q = (ms, fn) => Array.from({ length: Math.floor(ms / 60) }, (_, i) => ({ t: i * 60, db: fn(i * 60) }));
  const quiet = () => -55;
  assert.equal(analyzeBark(q(2000, quiet), 2000).heard, false);
  assert.equal(analyzeBark(q(1500, (t) => (t > 500 && t < 700 ? -8 : quiet())), 1500).pattern, 'sharp');
  assert.equal(analyzeBark(q(3000, (t) => (t > 400 && t < 1800 ? -12 : quiet())), 3000).pattern, 'howl');
});

test('false-heard guards: settle window, short taps, unvoiced knocks and real meows', () => {
  assert.equal(SETTLE_MS, 350);

  // 1) Silence plus a 200 ms vibration-like burst in the first 300 ms -> heard = false
  const vibEarly = synth(2, [[0.05, 0.2, 160, 0.5]]);
  assert.equal(analyzeBark(windowLevels(vibEarly, SAMPLE_RATE, 0), 2000, { pcm: vibEarly }).heard, false);

  // 2) A 60 ms tap blip later in the clip -> heard = false
  const shortTap = synth(2, [[0.8, 0.06, 500, 0.6]]);
  assert.equal(analyzeBark(windowLevels(shortTap, SAMPLE_RATE, 0), 2000, { pcm: shortTap }).heard, false);

  // 3) Unpitched knock/rustle noise later in the clip -> heard = false
  const knock = synth(2, []);
  let s = 42;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = Math.floor(0.6 * SAMPLE_RATE); i < Math.floor(0.95 * SAMPLE_RATE); i++) {
    knock[i] = (rnd() - 0.5) * 0.8;
  }
  assert.equal(analyzeBark(windowLevels(knock, SAMPLE_RATE, 0), 2000, { pcm: knock }).heard, false);

  // 4) Synthetic meow (pitched, 400-700 Hz, 500 ms, after settle) -> heard = true
  const meow = synth(2, [[0.5, 0.5, 550, 0.5]]);
  const meowRes = analyzeBark(windowLevels(meow, SAMPLE_RATE, 0), 2000, { pcm: meow, liveHeard: true });
  assert.equal(meowRes.heard, true);

  // 5) If the recorder's live detector did not hear anything, final heard is false
  assert.equal(analyzeBark(windowLevels(meow, SAMPLE_RATE, 0), 2000, { pcm: meow, liveHeard: false }).heard, false);
});
