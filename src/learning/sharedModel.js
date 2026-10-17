// The shared model: trained on the server from every owner who opted in,
// downloaded to the phone as a small JSON file and run in JavaScript.
// New versions arrive over the air, with no app store update.
//
// Model file format (written by server/train/train.py):
// {
//   version, species, featureVersion,
//   contexts: [ids],            // what it can recognise
//   mean: [..], std: [..],      // feature scaling
//   W: [[..]], b: [..],         // one row of weights per context (softmax)
//   metrics: { ... }            // how it scored on held-out phones
// }

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_VERSION } from '../audio/features';
import { getInstallId } from '../contribute/contributions';

const API = (process.env.EXPO_PUBLIC_PAWLINGO_API || '').replace(/\/+$/, '');
const KEY = process.env.EXPO_PUBLIC_PAWLINGO_KEY || '';
const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;

const models = {}; // species -> model
const storageKey = (species) => `pawlingo:model:v1:${species}`;

export async function loadSharedModel(species) {
  if (models[species]) return models[species];
  try {
    const raw = await AsyncStorage.getItem(storageKey(species));
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.model?.featureVersion === FEATURE_VERSION) models[species] = saved.model;
  } catch (_) {}
  return models[species] || null;
}

// Ask the server whether there's a newer model. Quietly does nothing when
// offline, when there's no server, or when no model has been published yet.
export async function refreshSharedModel(species, { force = false } = {}) {
  if (!API) return null;
  let saved = null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(species));
    saved = raw ? JSON.parse(raw) : null;
  } catch (_) {}
  if (!force && saved?.checkedAt && Date.now() - saved.checkedAt < CHECK_EVERY_MS) return loadSharedModel(species);
  try {
    const installId = await getInstallId();
    const have = saved?.model?.version || '';
    const res = await fetch(
      `${API}/model?species=${species}&fv=${FEATURE_VERSION}&have=${encodeURIComponent(have)}`,
      { headers: { 'X-App-Key': KEY, 'X-Install-Id': installId } }
    );
    let model = saved?.model || null;
    if (res.status === 200) {
      const body = await res.json();
      if (isValid(body)) model = body;
    }
    await AsyncStorage.setItem(storageKey(species), JSON.stringify({ model, checkedAt: Date.now() }));
    if (model) models[species] = model;
    return model;
  } catch (_) {
    return loadSharedModel(species);
  }
}

function isValid(m) {
  return (
    m &&
    m.featureVersion === FEATURE_VERSION &&
    Array.isArray(m.contexts) &&
    Array.isArray(m.W) &&
    m.W.length === m.contexts.length &&
    Array.isArray(m.mean) &&
    m.W.every((row) => Array.isArray(row) && row.length === m.mean.length)
  );
}

// Probabilities for each context the model knows, e.g. { door: 0.6, food: 0.3 }.
// When breedId is provided and the model has a cohort for that breed, blends
// the breed cohort's prediction (or breed acoustic normalisation) with the
// species-wide model.
export function predictShared(model, vector, breedId = null) {
  if (!model || !vector || vector.length !== model.mean.length) return null;
  const base = runSoftmax(model, vector, model.mean, model.std);
  if (!breedId || !model.breeds || !model.breeds[breedId]) return base;

  const cohort = model.breeds[breedId];
  const hasScaler =
    Array.isArray(cohort.mean) &&
    cohort.mean.length === vector.length &&
    Array.isArray(cohort.std) &&
    cohort.std.length === vector.length;

  // If the breed has its own trained classifier, blend it with the species model
  // according to how saturated the breed cohort is.
  if (
    hasScaler &&
    Array.isArray(cohort.contexts) &&
    Array.isArray(cohort.W) &&
    cohort.W.length === cohort.contexts.length
  ) {
    const breedProbs = runSoftmax(cohort, vector, cohort.mean, cohort.std);
    const n = cohort.metrics?.examples || 30;
    const w = Math.min(0.75, n / (n + 60));
    const out = {};
    new Set([...Object.keys(base), ...Object.keys(breedProbs)]).forEach((c) => {
      out[c] = w * (breedProbs[c] || 0) + (1 - w) * (base[c] || 0);
    });
    const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
    Object.keys(out).forEach((c) => (out[c] /= sum));
    return out;
  }

  // Otherwise, use the breed's acoustic baseline (pitch/formant mean & std)
  // to normalise the sound before running the species classifier.
  if (hasScaler) {
    const normProbs = runSoftmax(model, vector, cohort.mean, cohort.std);
    const out = {};
    model.contexts.forEach((c) => {
      out[c] = 0.5 * (normProbs[c] || 0) + 0.5 * (base[c] || 0);
    });
    return out;
  }
  return base;
}

function runSoftmax(m, vector, mean, std) {
  const z = vector.map((x, i) => (x - mean[i]) / (std[i] || 1));
  const logits = m.W.map((row, k) => row.reduce((s, w, i) => s + w * z[i], m.b?.[k] || 0));
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  const out = {};
  m.contexts.forEach((c, k) => {
    out[c] = exps[k] / sum;
  });
  return out;
}

// Returns how many community recordings back a predicted context for this breed/species.
export function sharedEvidence(model, contextId, breedId = null) {
  if (!model || !contextId) return null;
  const cohort = breedId && model.breeds ? model.breeds[breedId] : null;
  const breedCount = cohort?.metrics?.countsByContext?.[contextId] || 0;
  const breedTotal = cohort?.metrics?.examples || 0;
  const speciesCount = model.metrics?.countsByContext?.[contextId] || 0;
  const phones = model.metrics?.phones || 0;
  if (!breedCount && !speciesCount) return null;
  return { breedCount, breedTotal, speciesCount, phones };
}

