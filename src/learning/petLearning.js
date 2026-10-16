// Your pet's own learning. Every time the owner says what a bark really
// meant, its sound fingerprint is kept on the phone with that answer. New
// barks are compared with these examples, so the guesses become specific to
// this pet: Bruno's "feed me" may sound nothing like another dog's.
//
// This all stays on the phone. It works whether or not the owner shares clips.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_VERSION } from '../audio/features';
import { predictShared } from './sharedModel';

const MAX_EXAMPLES = 300;
export const MIN_TO_GUESS = 6; // taught barks before the pet's own guesses start
export const MIN_CONTEXTS = 2; // ...covering at least this many situations
export const SHOW_CONFIDENCE = 0.55; // only show a guess at least this sure

const key = (species) => `pawlingo:learn:v1:${species}`;
const memo = {};

export async function loadExamples(species) {
  if (memo[species]) return memo[species];
  try {
    const raw = await AsyncStorage.getItem(key(species));
    const list = raw ? JSON.parse(raw) : [];
    memo[species] = Array.isArray(list) ? list.filter((e) => e.fv === FEATURE_VERSION) : [];
  } catch (_) {
    memo[species] = [];
  }
  return memo[species];
}

export async function addExample(species, vector, contextId, moods) {
  if (!vector || !contextId || contextId === 'other') return loadExamples(species);
  const list = await loadExamples(species);
  list.push({ v: vector, c: contextId, m: moods || [], at: Date.now(), fv: FEATURE_VERSION });
  while (list.length > MAX_EXAMPLES) list.shift();
  memo[species] = list;
  try {
    await AsyncStorage.setItem(key(species), JSON.stringify(list));
  } catch (_) {}
  return list;
}

export async function resetExamples(species) {
  memo[species] = [];
  try {
    await AsyncStorage.removeItem(key(species));
  } catch (_) {}
}

// Scale each number so no single one dominates the comparison.
function scaler(examples, sharedModel) {
  if (sharedModel?.mean) return { mean: sharedModel.mean, std: sharedModel.std };
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

// Nearest taught barks vote for their situation.
function predictPet(examples, vector, sharedModel) {
  const contexts = new Set(examples.map((e) => e.c));
  if (examples.length < MIN_TO_GUESS || contexts.size < MIN_CONTEXTS) return null;
  const { mean, std } = scaler(examples, sharedModel);
  const z = (v) => v.map((x, i) => (x - mean[i]) / (std[i] || 1));
  const q = z(vector);
  const scored = examples.map((e) => ({ c: e.c, s: cosine(q, z(e.v)) })).sort((a, b) => b.s - a.s);
  const k = Math.min(7, Math.max(3, Math.round(Math.sqrt(examples.length))));
  const votes = {};
  let total = 0;
  scored.slice(0, k).forEach(({ c, s }) => {
    const w = Math.max(0.01, (s + 1) / 2) ** 2;
    votes[c] = (votes[c] || 0) + w;
    total += w;
  });
  Object.keys(votes).forEach((c) => (votes[c] /= total));
  return votes;
}

// Best guess for a new bark, blending the pet's own examples with the shared
// model. The more this pet has been taught, the more its own examples count.
// Returns { contextId, confidence, source, show } or null.
export async function guessContext(species, vector, sharedModel) {
  if (!vector) return null;
  const examples = await loadExamples(species);
  const pet = predictPet(examples, vector, sharedModel);
  const shared = sharedModel ? predictShared(sharedModel, vector) : null;
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
  return { contextId, confidence: Number(confidence.toFixed(3)), source, show: confidence >= SHOW_CONFIDENCE };
}

// How far along this pet's learning is, for the progress card.
export async function learningProgress(species) {
  const examples = await loadExamples(species);
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
