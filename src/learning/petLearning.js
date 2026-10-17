// Your pet's own learning. Every time the owner says what a bark really
// meant, its sound fingerprint is kept on the phone with that answer. New
// barks are compared with these examples, so the guesses become specific to
// this pet: Bruno's "feed me" may sound nothing like another dog's.
//
// This all stays on the phone. It works whether or not the owner shares clips.
// Each pet has its own examples, so two dogs in one home don't get mixed up.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_VERSION } from '../audio/features';
import { predictShared, sharedEvidence } from './sharedModel';

const MAX_EXAMPLES = 300;
export const MIN_TO_GUESS = 6; // taught barks before the pet's own guesses start
export const MIN_CONTEXTS = 2; // ...covering at least this many situations
export const SHOW_CONFIDENCE = 0.55; // only show a guess at least this sure

const HALF_LIFE_DAYS = 180; // older examples count less: pets' sounds change as they grow
const key = (petId) => `pawlingo:learn:v2:${petId}`;
const memo = {};

export async function loadExamples(petId) {
  if (memo[petId]) return memo[petId];
  try {
    const raw = await AsyncStorage.getItem(key(petId));
    const list = raw ? JSON.parse(raw) : [];
    memo[petId] = Array.isArray(list) ? list.filter((e) => e.fv === FEATURE_VERSION) : [];
  } catch (_) {
    memo[petId] = [];
  }
  return memo[petId];
}

// Earlier builds kept one list per species; hand it to the migrated pet.
export async function migrateSpeciesExamples(species, petId) {
  try {
    const oldKey = `pawlingo:learn:v1:${species}`;
    const raw = await AsyncStorage.getItem(oldKey);
    if (!raw) return;
    if (!(await AsyncStorage.getItem(key(petId)))) await AsyncStorage.setItem(key(petId), raw);
    await AsyncStorage.removeItem(oldKey);
    delete memo[petId];
  } catch (_) {}
}

export async function addExample(petId, vector, contextId, moods) {
  if (!vector || !contextId || contextId === 'other') return loadExamples(petId);
  const list = await loadExamples(petId);
  list.push({ v: vector, c: contextId, m: moods || [], at: Date.now(), fv: FEATURE_VERSION });
  while (list.length > MAX_EXAMPLES) list.shift();
  memo[petId] = list;
  try {
    await AsyncStorage.setItem(key(petId), JSON.stringify(list));
  } catch (_) {}
  return list;
}

export async function resetExamples(petId) {
  memo[petId] = [];
  try {
    await AsyncStorage.removeItem(key(petId));
  } catch (_) {}
}

// Scale each number so no single one dominates the comparison.
// Once a pet has enough of its own taught examples (12+), its own vocal baseline
// scales its personal comparisons; otherwise we use the breed cohort baseline
// (if available) or the species baseline.
function scaler(examples, sharedModel, breedId = null) {
  if (examples.length < 12) {
    const cohort = breedId && sharedModel?.breeds?.[breedId];
    if (cohort?.mean?.length === examples[0]?.v?.length) {
      return { mean: cohort.mean, std: cohort.std };
    }
    if (sharedModel?.mean) return { mean: sharedModel.mean, std: sharedModel.std };
  }
  const n = examples.length;
  const dim = examples[0].v.length;
  const mean = new Array(dim).fill(0);
  const std = new Array(dim).fill(0);
  examples.forEach((e) => e.v.forEach((x, i) => (mean[i] += x / n)));
  examples.forEach((e) => e.v.forEach((x, i) => (std[i] += ((x - mean[i]) ** 2) / n)));
  return { mean, std: std.map((s) => Math.sqrt(s) || 1) };
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// Gentle circadian habit boost: if a pet usually barks for food at 17:30 or
// walkies at 07:00, examples taught near the same time of day get a slight edge
// (1.10 at the same hour, 1.00 at 6h apart, down to 0.90 at 12h apart). Examples
// taught within 10 minutes of now (e.g. unit tests) get 1.0.
export function circadianWeight(exampleAt, nowMs) {
  if (!exampleAt || !nowMs || Math.abs(nowMs - exampleAt) < 10 * 60 * 1000) return 1.0;
  const hNow = new Date(nowMs).getHours() + new Date(nowMs).getMinutes() / 60;
  const hEx = new Date(exampleAt).getHours() + new Date(exampleAt).getMinutes() / 60;
  const diff = Math.abs(hNow - hEx);
  const circHours = Math.min(diff, 24 - diff); // 0..12
  return 1.0 + 0.1 * Math.cos((circHours / 12) * Math.PI); // 1.10 at same hour, 0.90 opposite
}

// Nearest taught barks vote for their situation.
function predictPet(examples, vector, sharedModel, breedId = null, nowMs = Date.now()) {
  const contexts = new Set(examples.map((e) => e.c));
  if (examples.length < MIN_TO_GUESS || contexts.size < MIN_CONTEXTS) return null;
  const { mean, std } = scaler(examples, sharedModel, breedId);
  const z = (v) => v.map((x, i) => (x - mean[i]) / (std[i] || 1));
  const q = z(vector);
  const recency = (e) => 0.5 ** ((nowMs - (e.at || nowMs)) / (HALF_LIFE_DAYS * 86400000));
  const scored = examples
    .map((e) => ({ c: e.c, s: cosine(q, z(e.v)), r: recency(e) * circadianWeight(e.at, nowMs) }))
    .sort((a, b) => b.s - a.s);
  const k = Math.min(7, Math.max(3, Math.round(Math.sqrt(examples.length))));
  const votes = {};
  let total = 0;
  scored.slice(0, k).forEach(({ c, s, r }) => {
    const w = Math.max(0.01, (s + 1) / 2) ** 2 * r;
    votes[c] = (votes[c] || 0) + w;
    total += w;
  });
  Object.keys(votes).forEach((c) => (votes[c] /= total));
  return votes;
}

// Best guess for a new bark, blending the pet's own examples with the breed
// cohort and shared species model. The more this pet has been taught, the more
// its own examples count.
// Returns { contextId, confidence, source, show, wording, evidence } or null.
export async function guessContext(petId, vector, sharedModel, opts = {}) {
  if (!vector) return null;
  const { breedId = null, breedName = null, petName = null, now = Date.now() } = opts || {};
  const examples = await loadExamples(petId);
  const pet = predictPet(examples, vector, sharedModel, breedId, now);
  const shared = sharedModel ? predictShared(sharedModel, vector, breedId) : null;
  if (!pet && !shared) return null;

  let probs;
  let source;
  if (pet && shared) {
    const w = Math.min(0.85, examples.length / (examples.length + 15));
    probs = {};
    new Set([...Object.keys(pet), ...Object.keys(shared)]).forEach((c) => {
      probs[c] = w * (pet[c] || 0) + (1 - w) * (shared[c] || 0);
    });
    source = 'blend';
  } else {
    probs = pet || shared;
    source = pet ? 'pet' : 'shared';
  }
  const [contextId, confidence] = Object.entries(probs).sort((a, b) => b[1] - a[1])[0];
  const petMatches = examples.filter((e) => e.c === contextId).length;
  const comm = sharedEvidence(sharedModel, contextId, breedId);
  const evidence = formatEvidence({ petMatches, petName, comm, breedName });

  return {
    contextId,
    confidence: Number(confidence.toFixed(3)),
    source,
    show: confidence >= SHOW_CONFIDENCE,
    // Plain words instead of a percentage, which would read like a precise claim
    wording: confidence >= 0.75 ? 'Pretty sure' : 'Maybe',
    petMatches,
    breedMatches: comm?.breedCount || 0,
    speciesMatches: comm?.speciesCount || 0,
    evidence
  };
}

function formatEvidence({ petMatches, petName, comm, breedName }) {
  const parts = [];
  if (petMatches > 0) {
    const who = petName ? `${petName}'s` : 'past';
    parts.push(`${petMatches} of ${who} taught sounds`);
  }
  if (comm?.breedCount > 0) {
    const cleanBreed = breedName ? breedName.replace(/^\S+\s/, '').split('/')[0].trim() : 'similar breed';
    parts.push(`${comm.breedCount} ${cleanBreed} clips`);
  } else if (comm?.speciesCount > 0) {
    parts.push(`${comm.speciesCount} community clips`);
  }
  return parts.length ? `Based on ${parts.join(' + ')}` : null;
}

// How far along this pet's learning is, for the progress card.
export async function learningProgress(petId) {
  const examples = await loadExamples(petId);
  const byContext = {};
  examples.forEach((e) => (byContext[e.c] = (byContext[e.c] || 0) + 1));
  const covered = Object.keys(byContext).length;
  const n = examples.length;
  let stage;
  if (n < MIN_TO_GUESS || covered < MIN_CONTEXTS) stage = 'starting';
  else if (n < 25) stage = 'learning';
  else stage = 'confident';
  const toUnlock = Math.max(0, MIN_TO_GUESS - n);
  return { total: n, byContext, covered, stage, toUnlock, needsMoreContexts: covered < MIN_CONTEXTS };
}

// Bond levels give owners a target: "4 more answers and I'll know Rex better".
// Each level is a number of taught sounds; the first also needs two situations.
export const BOND_LEVELS = [
  { at: 0, name: 'Just met' },
  { at: MIN_TO_GUESS, name: 'Getting to know you' },
  { at: 15, name: 'Learning your language' },
  { at: 25, name: 'Good mates' },
  { at: 50, name: 'Best mates' },
  { at: 100, name: 'Fluent' },
  { at: 200, name: 'Soulmates' }
];

export function bondLevel(progress) {
  const n = progress?.total || 0;
  let i = 0;
  while (i + 1 < BOND_LEVELS.length && n >= BOND_LEVELS[i + 1].at) i++;
  // Enough sounds but all from one situation: guesses are still locked.
  if (i >= 1 && progress?.needsMoreContexts) i = 0;
  const cur = BOND_LEVELS[i];
  const next = BOND_LEVELS[i + 1] || { at: cur.at + 100 * Math.ceil((n - cur.at + 1) / 100), name: cur.name };
  const needsContext = i === 0 && n >= MIN_TO_GUESS && !!progress?.needsMoreContexts;
  const remaining = needsContext ? 1 : Math.max(1, next.at - n);
  const span = next.at - cur.at;
  const fraction = needsContext ? 0.9 : Math.max(0, Math.min(1, (n - cur.at) / span));
  return { level: i + 1, name: cur.name, nextName: next.name, remaining, fraction, needsContext, unlocksGuesses: i === 0 };
}
