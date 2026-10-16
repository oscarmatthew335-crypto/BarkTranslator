import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFeatures, FEATURE_NAMES, encodeWav, resample } from '../src/audio/features.js';
import { analyzeBark } from '../src/audio/barkAnalysis.js';
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
