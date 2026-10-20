import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pickQuestions,
  unlabelledRecent,
  recordAnswer,
  usableAnswer,
  rewardFor,
  roundReward,
  shouldReask,
  petChangesFor,
  rememberAskedClip,
  MAX_QUESTIONS,
  REASK_EVERY
} from '../src/game/treatRound.js';
import { questionsFor, UNSURE, getQuestion } from '../src/game/questions.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const DAY = 86400000;
const pet = { id: 'p1', name: 'Bruno', species: 'dog', answers: {} };
const clip = (id, daysAgo, extra = {}) => ({
  id,
  petId: 'p1',
  features: { version: 'f1', vector: [1, 2, 3] },
  labelled: false,
  date: new Date(NOW - daysAgo * DAY).toISOString(),
  audioUri: `file:///a/${id}.wav`,
  ...extra
});

test('recent unlabelled clips of this pet come first, newest first', () => {
  const history = [clip('new', 0.5), clip('old', 9), clip('done', 1, { labelled: true }), clip('other', 1, { petId: 'p2' }), clip('mid', 3), clip('nofeat', 1, { features: null })];
  const items = pickQuestions({ pet, history, now: NOW });
  assert.deepEqual(
    items.filter((i) => i.kind === 'clip').map((i) => i.entry.id),
    ['new', 'mid']
  );
  assert.equal(items[0].kind, 'clip');
  assert.equal(items[1].kind, 'clip');
  assert.equal(items[2].kind, 'profile');
});

test('clips without a playable sound, or already asked about, are skipped', () => {
  const history = [clip('a', 1), clip('b', 1), clip('c', 1)];
  const got = unlabelledRecent(history, 'p1', NOW, (e) => e.id !== 'b', ['c']);
  assert.deepEqual(got.map((e) => e.id), ['a']);
  let round = { rounds: 0, askedClipIds: [] };
  round = rememberAskedClip(round, 'a');
  round = rememberAskedClip(round, 'a');
  assert.deepEqual(round.askedClipIds, ['a']);
});

test('never more than 5 questions, even with lots to ask', () => {
  const history = Array.from({ length: 12 }, (_, i) => clip(`c${i}`, i * 0.2));
  for (let r = 0; r < 30; r++) {
    const items = pickQuestions({ pet: { ...pet, answers: { size: { value: 'small' } } }, history, now: NOW, roundIndex: r });
    assert.ok(items.length <= MAX_QUESTIONS);
    assert.equal(items.length, 5);
  }
  assert.ok(pickQuestions({ pet, history: [], now: NOW }).length <= MAX_QUESTIONS);
});

test('profile gaps come before habits, and each is asked only until answered', () => {
  const items = pickQuestions({ pet, history: [], now: NOW });
  assert.ok(items.every((i) => i.kind === 'profile'));
  const allProfile = Object.fromEntries(questionsFor('dog', 'profile').map((q) => [q.id, { value: q.options[0] }]));
  const next = pickQuestions({ pet: { ...pet, answers: allProfile }, history: [], now: NOW });
  assert.ok(next.length > 0 && next.every((i) => i.kind === 'habit'));
  const everything = Object.fromEntries([...questionsFor('dog', 'profile'), ...questionsFor('dog', 'habit')].map((q) => [q.id, { value: UNSURE }]));
  assert.equal(pickQuestions({ pet: { ...pet, answers: everything }, history: [], now: NOW, roundIndex: 0 }).length, 0);
});

test('questions follow the species', () => {
  const cat = { ...pet, species: 'cat', answers: Object.fromEntries(questionsFor('cat', 'profile').map((q) => [q.id, { value: 'x' }])) };
  const ids = pickQuestions({ pet: cat, history: [], now: NOW }).map((i) => i.question.id);
  assert.ok(ids.includes('meowWhen'));
  assert.ok(!ids.includes('barkWhen') && !ids.includes('walkAsk') && !ids.includes('size'));
});

test('"Not sure" earns exactly the same reward as any other answer', () => {
  const q = getQuestion('energy');
  const rewards = [...q.options, UNSURE].map((v) => rewardFor({ question: q }, v));
  assert.ok(rewards.every((r) => r === rewards[0]));
  assert.ok(rewards[0] > 0);
  assert.equal(roundReward(2), 2 * rewards[0]);
  assert.equal(roundReward(0), 0);
});

test('consistency re-asks happen in at most 1 in 10 rounds, one question at a time', () => {
  const answers = { size: { value: 'small' }, energy: { value: 'high' }, ageBand: { value: 'adult' } };
  let reaskRounds = 0;
  for (let r = 0; r < 100; r++) {
    const items = pickQuestions({ pet: { ...pet, answers }, history: [], now: NOW, roundIndex: r });
    const re = items.filter((i) => i.reask);
    assert.ok(re.length <= 1);
    if (re.length) reaskRounds++;
    assert.equal(Boolean(re.length), shouldReask(r));
  }
  assert.equal(reaskRounds, 100 / REASK_EVERY);
  // Nothing answered yet: nothing to re-ask.
  assert.ok(!pickQuestions({ pet, history: [], now: NOW, roundIndex: REASK_EVERY - 1 }).some((i) => i.reask));
});

test('a disagreeing re-ask marks the answer low-confidence so it is not used for learning', () => {
  const q = getQuestion('energy');
  let answers = recordAnswer({}, { question: q }, 'high', 1);
  assert.equal(usableAnswer(answers, 'energy'), 'high');
  const same = recordAnswer(answers, { question: q, reask: true }, 'high', 2);
  assert.equal(usableAnswer(same, 'energy'), 'high');
  const unsure = recordAnswer(answers, { question: q, reask: true }, UNSURE, 2);
  assert.deepEqual(unsure, answers, '"Not sure" on a re-ask changes nothing');
  answers = recordAnswer(answers, { question: q, reask: true }, 'low', 3);
  assert.equal(answers.energy.lowConfidence, true);
  assert.equal(answers.energy.earlier, 'high');
  assert.equal(usableAnswer(answers, 'energy'), null);
  assert.equal(usableAnswer({ energy: { value: UNSURE } }, 'energy'), null);
  // Low-confidence answers aren't re-asked again.
  const items = pickQuestions({ pet: { ...pet, answers }, history: [], now: NOW, roundIndex: REASK_EVERY - 1 });
  assert.ok(!items.some((i) => i.reask));
});

test('the home answer updates the pet the app already uses', () => {
  assert.deepEqual(petChangesFor('home', 'indoor'), { home: 'indoor' });
  assert.deepEqual(petChangesFor('home', 'garden'), { home: 'garden' });
  assert.deepEqual(petChangesFor('energy', 'high'), {});
});
