// The optional "treat round" between stages: up to 5 quick questions that
// help Pawlingo learn the pet. It can always be skipped, and the next stage
// is open either way.
//
// Fairness: every answer, "Not sure" included, earns exactly the same reward,
// so there is never a reason to guess.
//
// Priority: (a) the pet's own unlabelled recordings from the last 7 days,
// (b) gaps in the pet's profile, (c) habit questions. About once in ten
// rounds one answered profile/habit question is asked again; if the two
// answers disagree, both are marked low-confidence and not used for learning.

import { makeRng, hashString } from './random';
import { questionsFor, getQuestion, UNSURE } from './questions';

export const MAX_QUESTIONS = 5;
export const MAX_NON_CLIP = 3; // profile + habit questions per round
export const RECENT_DAYS = 7;
export const REASK_EVERY = 10; // at most one re-ask in this many rounds
export const REWARD_PER_ANSWER = 1; // power-ups earned per answer, whatever it is
export const MAX_ROUND_REWARD = 3;
const MAX_ASKED_CLIPS = 200;

export const emptyRoundState = () => ({ rounds: 0, askedClipIds: [] });

// The pet's recordings that still need a label, newest first.
export function unlabelledRecent(history, petId, now = Date.now(), hasAudio = () => true, asked = []) {
  const since = now - RECENT_DAYS * 86400000;
  const skip = new Set(asked);
  return (history || []).filter((h) => {
    if (!h || h.labelled || !h.features || skip.has(h.id)) return false;
    if (h.petId && h.petId !== petId) return false;
    const at = Date.parse(h.recordedAt || h.date || '');
    return Number.isFinite(at) && at >= since && at <= now + 60000 && hasAudio(h);
  });
}

export const shouldReask = (roundIndex) => roundIndex % REASK_EVERY === REASK_EVERY - 1;

// Builds the list of questions for one round (may be empty: then there is no
// round). Each item is { kind: 'clip', entry } or { kind: 'profile'|'habit',
// question, reask }.
export function pickQuestions({ pet, history, now = Date.now(), roundIndex = 0, askedClipIds = [], hasAudio = () => true }) {
  const out = [];
  const species = pet.species;
  const answers = pet.answers || {};
  for (const entry of unlabelledRecent(history, pet.id, now, hasAudio, askedClipIds)) {
    if (out.length >= MAX_QUESTIONS) break;
    out.push({ kind: 'clip', key: `clip:${entry.id}`, entry });
  }
  let nonClip = 0;
  for (const kind of ['profile', 'habit']) {
    for (const q of questionsFor(species, kind)) {
      if (out.length >= MAX_QUESTIONS || nonClip >= MAX_NON_CLIP) break;
      if (answers[q.id]) continue;
      out.push({ kind, key: q.id, question: q });
      nonClip++;
    }
  }
  if (shouldReask(roundIndex)) {
    const answered = Object.entries(answers).filter(([id, a]) => a && a.value !== UNSURE && !a.lowConfidence && getQuestion(id)?.species.includes(species));
    if (answered.length) {
      const rng = makeRng(hashString(`${pet.id}:${roundIndex}`));
      const [id] = answered[Math.floor(rng() * answered.length)];
      const q = getQuestion(id);
      const item = { kind: q.kind, key: `reask:${id}`, question: q, reask: true };
      if (out.length >= MAX_QUESTIONS) out[out.length - 1] = item;
      else out.splice(Math.min(out.length, 1 + Math.floor(rng() * out.length)), 0, item);
    }
  }
  return out.slice(0, MAX_QUESTIONS);
}

// The reward for one answer. Deliberately ignores what the answer was.
export const rewardFor = () => REWARD_PER_ANSWER;

export const roundReward = (answeredCount) => Math.min(MAX_ROUND_REWARD, answeredCount * REWARD_PER_ANSWER);

// Store a profile/habit answer on the pet's answers. Re-asks compare with the
// earlier answer; "Not sure" on a re-ask leaves things as they were.
export function recordAnswer(answers = {}, item, value, now = Date.now()) {
  const id = item.question.id;
  const prev = answers[id];
  if (item.reask && prev) {
    if (value === UNSURE) return answers;
    if (prev.value !== UNSURE && prev.value !== value) {
      return { ...answers, [id]: { value, at: now, lowConfidence: true, earlier: prev.value } };
    }
    return { ...answers, [id]: { ...prev, value, confirmedAt: now } };
  }
  return { ...answers, [id]: { value, at: now } };
}

// An answer that is safe to learn from: not "Not sure", not contradicted.
export function usableAnswer(answers, id) {
  const a = answers?.[id];
  if (!a || a.value === UNSURE || a.lowConfidence) return null;
  return a.value;
}

// Pet fields that follow from a profile answer (the app already uses `home`).
export function petChangesFor(id, value) {
  if (id === 'home' && (value === 'indoor' || value === 'garden')) return { home: value };
  if (id === 'home' && value === 'both') return { home: 'garden' };
  return {};
}

export function rememberAskedClip(round, entryId) {
  const askedClipIds = [...round.askedClipIds.filter((x) => x !== entryId), entryId].slice(-MAX_ASKED_CLIPS);
  return { ...round, askedClipIds };
}
