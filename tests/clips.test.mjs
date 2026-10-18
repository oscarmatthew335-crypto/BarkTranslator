import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, decodeWav, SAMPLE_RATE } from '../src/audio/features.js';
import { RollingAudioBuffer, MAX_ROLLING_SECONDS } from '../src/audio/rollingBuffer.js';
import { runTranslationPipeline } from '../src/audio/pipeline.js';
import { getSpecies } from '../src/species.js';
import { makePet } from '../src/storage/savedState.js';
import { synth } from './synth.mjs';

test('WAV decoding (16-bit mono) round-trips with encodeWav', () => {
  const original = synth(1.5, [[0.4, 0.5, 480, 0.5]]);
  // Quantise once to 16-bit PCM so encode -> decode -> encode is bit-exact
  const wav1 = encodeWav(original, SAMPLE_RATE);
  const decoded1 = decodeWav(wav1);
  assert.ok(decoded1 instanceof Float32Array);
  assert.equal(decoded1.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(decoded1[i] - original[i]) < 1 / 32760, `sample ${i} drifted`);
  }
  const wav2 = encodeWav(decoded1, SAMPLE_RATE);
  assert.deepEqual(wav2, wav1);
});

test('shared pipeline gives the same result for the same PCM from live and clip paths', async () => {
  // Quantise the source PCM to 16-bit so the live Float32Array and the
  // WAV-decoded clip Float32Array contain identical samples.
  const raw = synth(2, [[0.5, 0.55, 520, 0.5]]);
  const pcmLive = decodeWav(encodeWav(raw, SAMPLE_RATE));
  const pcmClip = decodeWav(encodeWav(pcmLive, SAMPLE_RATE));

  const pet = makePet({ name: 'Mittens', species: 'cat' });
  const species = getSpecies('cat');
  const fixedNow = new Date('2026-10-18T10:00:00.000Z');

  const liveRes = await runTranslationPipeline({
    pcm: pcmLive,
    liveHeard: true,
    pet,
    species,
    history: [],
    sharedModel: null,
    now: fixedNow,
    random: () => 0.42
  });

  const clipRes = await runTranslationPipeline({
    pcm: pcmClip,
    liveHeard: true,
    pet,
    species,
    history: [],
    sharedModel: null,
    recordedAt: fixedNow.toISOString(),
    random: () => 0.42
  });

  assert.equal(liveRes.heard, true);
  assert.equal(clipRes.heard, true);
  assert.deepEqual(clipRes.analysis, liveRes.analysis);
  assert.deepEqual(clipRes.features, liveRes.features);
  assert.equal(clipRes.text, liveRes.text);
  assert.equal(clipRes.entry.contextId, liveRes.entry.contextId);
  assert.deepEqual(clipRes.entry.emotions, liveRes.entry.emotions);
  assert.equal(clipRes.entry.recordedAt, fixedNow.toISOString());
});

test('rolling buffer keeps only the last 10 seconds', () => {
  const buf = new RollingAudioBuffer(MAX_ROLLING_SECONDS);
  assert.equal(MAX_ROLLING_SECONDS, 10);

  // Push 14 one-second chunks where each second is filled with its index (1..14)
  for (let sec = 1; sec <= 14; sec++) {
    const chunk = new Float32Array(SAMPLE_RATE).fill(sec / 20);
    buf.push(chunk, SAMPLE_RATE);
  }
  assert.equal(buf.durationMs(), 10000);
  const pcm = buf.toPcm();
  assert.equal(pcm.length, 10 * SAMPLE_RATE);
  // First retained second should be chunk #5 (since 1..4 were dropped)
  assert.ok(Math.abs(pcm[0] - 5 / 20) < 1e-6);
  // Last retained second should be chunk #14
  assert.ok(Math.abs(pcm[pcm.length - 1] - 14 / 20) < 1e-6);

  buf.clear();
  assert.equal(buf.durationMs(), 0);
  assert.equal(buf.toPcm().length, 0);
});

test('rolling buffer with only silence or vibration does not count as heard, real sound does', () => {
  const buf = new RollingAudioBuffer(10);

  // 1) Silence only -> heard = false
  buf.push(synth(3, []), SAMPLE_RATE);
  assert.equal(buf.inspect().heard, false);

  // 2) Silence + 200 ms vibration in the first 300 ms -> heard = false
  buf.clear();
  buf.push(synth(2, [[0.05, 0.2, 160, 0.5]]), SAMPLE_RATE);
  assert.equal(buf.inspect().heard, false);

  // 3) Silence + 60 ms tap blip -> heard = false
  buf.clear();
  buf.push(synth(2, [[0.8, 0.06, 500, 0.6]]), SAMPLE_RATE);
  assert.equal(buf.inspect().heard, false);

  // 4) Real pitched vocalisation (500 ms meow at 550 Hz) -> heard = true
  buf.clear();
  buf.push(synth(2, [[0.6, 0.5, 550, 0.5]]), SAMPLE_RATE);
  assert.equal(buf.inspect().heard, true);
});
