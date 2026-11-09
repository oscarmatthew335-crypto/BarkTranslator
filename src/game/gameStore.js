// Saved Play tab data, kept on the phone in its own AsyncStorage entry so the
// rest of the app's saved state is untouched:
//   pets[petId]   { progress, wardrobe, bank, streak, daily, challenge, round, powerUps, faceMomentId }
//   options       { sound }
// Nothing here is ever sent anywhere.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyProgress } from './progress';
import { emptyWardrobe } from './wardrobe';
import { emptyStreak } from './daily';
import { emptyRoundState } from './treatRound';

const KEY = 'pawlingo:game:v1';

export const emptyBestScores = () => ({
  dog: { endless: 0, chase: 0 },
  cat: { endless: 0, chase: 0 }
});

export const HOW_TO_RUN_LIMIT = 2;

export const emptyModeRuns = () => ({
  endless: 0,
  chase: 0,
  daily: 0,
  stage: 0
});

export function modeKeyFor(stage) {
  if (!stage) return 'stage';
  if (stage.endless || stage.mode === 'endless') return 'endless';
  if (stage.chase || stage.mode === 'chase') return 'chase';
  if (stage.daily || stage.mode === 'daily') return 'daily';
  return 'stage';
}

export function shouldShowHowTo(modeRuns, modeOrStage) {
  const key = typeof modeOrStage === 'string' ? modeOrStage : modeKeyFor(modeOrStage);
  return (modeRuns?.[key] || 0) < HOW_TO_RUN_LIMIT;
}

export function recordModeRun(modeRuns, modeOrStage) {
  const key = typeof modeOrStage === 'string' ? modeOrStage : modeKeyFor(modeOrStage);
  const base = { ...emptyModeRuns(), ...(modeRuns || {}) };
  return { ...base, [key]: (base[key] || 0) + 1 };
}

export function emptyPetGame(pet) {
  return {
    progress: emptyProgress(),
    wardrobe: emptyWardrobe(pet),
    bank: 0, // treats to spend in the wardrobe
    lifetimeTreats: 0,
    streak: emptyStreak(),
    daily: { day: null, best: 0, plays: 0 },
    bestScores: { endless: 0, chase: 0 },
    modeRuns: emptyModeRuns(),
    challenge: { day: null, id: null, count: 0, done: false },
    round: emptyRoundState(),
    powerUps: [], // waiting for the next stage (from treat rounds and photo challenges)
    faceMomentId: null
  };
}

export const emptyGameState = () => ({ pets: {}, bestScores: emptyBestScores(), options: { sound: true, vibration: true } });

export function bestScoreFor(state, species, mode) {
  const sp = species === 'cat' ? 'cat' : 'dog';
  return Math.max(0, state?.bestScores?.[sp]?.[mode] || 0);
}

export function recordBestScore(state, species, mode, score) {
  const sp = species === 'cat' ? 'cat' : 'dog';
  const base = state || emptyGameState();
  const prev = bestScoreFor(base, sp, mode);
  const cleanScore = Math.max(0, Math.floor(score || 0));
  const best = Math.max(prev, cleanScore);
  const isNewBest = cleanScore > prev && cleanScore > 0;
  const bestScores = {
    ...emptyBestScores(),
    ...(base.bestScores || {}),
    [sp]: {
      ...emptyBestScores()[sp],
      ...(base.bestScores?.[sp] || {}),
      [mode]: best
    }
  };
  return { state: { ...base, bestScores }, best, isNewBest };
}

export async function loadGame() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object' && data.pets) {
      const def = emptyGameState();
      const bestScores = {
        dog: { ...def.bestScores.dog, ...(data.bestScores?.dog || {}) },
        cat: { ...def.bestScores.cat, ...(data.bestScores?.cat || {}) }
      };
      return { ...def, ...data, bestScores, options: { ...def.options, ...(data.options || {}) } };
    }
  } catch (_) {}
  return emptyGameState();
}

export async function saveGame(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (_) {}
}

export async function loadBestScores() {
  const state = await loadGame();
  return state.bestScores || emptyBestScores();
}

export async function saveBestScore(species, mode, score) {
  const state = await loadGame();
  const res = recordBestScore(state, species, mode, score);
  await saveGame(res.state);
  return res;
}

// A pet's game data, filling in anything added since it was saved.
export function petGame(state, pet) {
  const base = emptyPetGame(pet);
  const sp = pet?.species === 'cat' ? 'cat' : 'dog';
  const speciesBest = state?.bestScores?.[sp] || { endless: 0, chase: 0 };
  const saved = state?.pets?.[pet.id];
  if (!saved) return { ...base, bestScores: { ...base.bestScores, ...speciesBest } };
  return {
    ...base,
    ...saved,
    bestScores: {
      endless: Math.max(speciesBest.endless || 0, saved.bestScores?.endless || 0),
      chase: Math.max(speciesBest.chase || 0, saved.bestScores?.chase || 0)
    },
    modeRuns: { ...base.modeRuns, ...(saved.modeRuns || {}) },
    round: { ...base.round, ...(saved.round || {}) }
  };
}

export function removePetGame(state, petId) {
  const pets = { ...state.pets };
  delete pets[petId];
  return { ...state, pets };
}

// A pet was removed: forget its game progress.
export async function forgetPetGame(petId) {
  const state = await loadGame();
  if (state.pets[petId]) await saveGame(removePetGame(state, petId));
}
