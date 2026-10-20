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

export function emptyPetGame(pet) {
  return {
    progress: emptyProgress(),
    wardrobe: emptyWardrobe(pet),
    bank: 0, // treats to spend in the wardrobe
    lifetimeTreats: 0,
    streak: emptyStreak(),
    daily: { day: null, best: 0, plays: 0 },
    challenge: { day: null, id: null, count: 0, done: false },
    round: emptyRoundState(),
    powerUps: [], // waiting for the next stage (from treat rounds and photo challenges)
    faceMomentId: null
  };
}

export const emptyGameState = () => ({ pets: {}, options: { sound: true } });

export async function loadGame() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object' && data.pets) return { ...emptyGameState(), ...data, options: { ...emptyGameState().options, ...(data.options || {}) } };
  } catch (_) {}
  return emptyGameState();
}

export async function saveGame(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (_) {}
}

// A pet's game data, filling in anything added since it was saved.
export function petGame(state, pet) {
  const base = emptyPetGame(pet);
  const saved = state.pets[pet.id];
  if (!saved) return base;
  return { ...base, ...saved, round: { ...base.round, ...(saved.round || {}) } };
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
