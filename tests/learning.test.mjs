import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFeatures } from '../src/audio/features.js';
import { addExample, guessContext, learningProgress, resetExamples } from '../src/learning/petLearning.js';
import { predictShared } from '../src/learning/sharedModel.js';
import { synth } from './synth.mjs';

let seed = 1;
const j = (b) => b * (0.9 + ((seed = (seed * 48271) % 2147483647) / 2147483647) * 0.2);
const gens = {
  door: () => synth(2, [[0.2, j(0.25), j(230), 0.6], [0.7, j(0.25), j(230), 0.6], [1.2, j(0.25), j(230), 0.6]], seed++),
  food: () => synth(3, [[0.3, j(1.6), j(700), 0.3]], seed++),
  play: () => synth(2, Array.from({ length: 6 }, (_, i) => [0.15 + i * 0.25, j(0.08), j(950), 0.5]), seed++)
};
const fp = (c) => computeFeatures(gens[c]()).vector;

test('no guesses before teaching, then learns each pet separately', async () => {
  await resetExamples('petA');
  assert.equal(await guessContext('petA', fp('door'), null), null);
  for (let r = 0; r < 3; r++) for (const c of Object.keys(gens)) await addExample('petA', fp(c), c, []);
  const p = await learningProgress('petA');
  assert.equal(p.total, 9);
  assert.notEqual(p.stage, 'starting');
  let right = 0;
  for (const c of Object.keys(gens)) for (let r = 0; r < 4; r++) if ((await guessContext('petA', fp(c), null))?.contextId === c) right++;
  assert.ok(right >= 10, `only ${right}/12 right`);
  assert.equal(await guessContext('petB', fp('door'), null), null, 'another pet has its own learning');
});

test('"other" answers are not learned', async () => {
  await resetExamples('petC');
  await addExample('petC', fp('door'), 'other', []);
  assert.equal((await learningProgress('petC')).total, 0);
});

test('guess wording', async () => {
  const g = await guessContext('petA', fp('play'), null);
  assert.ok(['Pretty sure', 'Maybe'].includes(g.wording));
});

test('shared model maths and breed cohort blending', async () => {
  const m = {
    featureVersion: 'f1',
    contexts: ['a', 'b'],
    mean: [0, 0],
    std: [1, 1],
    W: [[1, 0], [-1, 0]],
    b: [0, 0],
    metrics: { phones: 20, examples: 120, countsByContext: { a: 60, b: 60 } },
    breeds: {
      boerboel: {
        contexts: ['a', 'b'],
        mean: [0, 0],
        std: [1, 1],
        W: [[-2, 0], [2, 0]],
        b: [0, 0],
        metrics: { phones: 10, examples: 180, countsByContext: { a: 40, b: 140 } }
      }
    }
  };
  const p = predictShared(m, [2, 0]);
  assert.ok(p.a > 0.9 && Math.abs(p.a + p.b - 1) < 1e-9);
  assert.equal(predictShared(m, [1, 2, 3]), null);

  // With breedId='boerboel', the saturated breed cohort shifts the prediction toward 'b'
  const pb = predictShared(m, [1, 0], 'boerboel');
  assert.ok(pb.b > p.b, 'breed cohort shifts probability');

  // Evidence string combines personal taught barks + breed cohort clips
  const g = await guessContext('petA', fp('food'), {
    ...m,
    contexts: ['door', 'food', 'play'],
    mean: new Array(62).fill(0),
    std: new Array(62).fill(1),
    W: [new Array(62).fill(0), new Array(62).fill(0.1), new Array(62).fill(0)],
    b: [0, 1, 0],
    breeds: {
      boerboel: {
        mean: new Array(62).fill(0),
        std: new Array(62).fill(1),
        metrics: { phones: 8, examples: 95, countsByContext: { food: 48 } }
      }
    }
  }, { breedId: 'boerboel', breedName: '🐕 Boerboel / Mastiff', petName: 'Spot' });
  assert.ok(g.evidence && g.evidence.includes("Spot's taught sounds") && g.evidence.includes('48 Boerboel clips'));
});

test('bond levels count down to the next target', async () => {
  const { bondLevel } = await import('../src/learning/petLearning.js');
  let b = bondLevel({ total: 2, needsMoreContexts: true });
  assert.equal(b.level, 1);
  assert.equal(b.remaining, 4);
  assert.ok(b.unlocksGuesses);
  b = bondLevel({ total: 7, needsMoreContexts: true });
  assert.ok(b.needsContext);
  assert.equal(b.level, 1);
  b = bondLevel({ total: 11, needsMoreContexts: false });
  assert.equal(b.level, 2);
  assert.equal(b.remaining, 4);
  assert.ok(b.fraction > 0.5 && b.fraction < 0.6);
  b = bondLevel({ total: 250, needsMoreContexts: false });
  assert.equal(b.level, 7);
  assert.equal(b.remaining, 50);
});
