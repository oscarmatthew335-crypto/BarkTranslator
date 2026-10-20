// Everything Pawlingo keeps on the phone, in one saved object:
//   pets         [{ id, name, species, breedId, personality, contextId, contextSetAt, home: 'indoor'|'garden', createdAt,
//                   answers? }]  answers: Play tab treat-round profile/habit answers,
//                   { [questionId]: { value, at, lowConfidence?, earlier?, edited? } } (see src/game/treatRound.js)
//   activePetId  which pet the Translate screen is for
//   history      the journal (newest first, capped)
//   shareClips   true / false / null (not asked yet)
//   settings     { mobileData, ageConfirmed, seen: { pawHint, micPrimer } }
//
// Older single-pet saves (BarkTranslator / first Pawlingo builds) are
// migrated into this shape the first time the new version opens.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSpecies } from '../species';

const KEY = 'pawlingo:state:v2';
const OLD_KEY = 'barktranslator:state:v1';
export const MAX_HISTORY = 100;

// sharePhotos: the Play tab's separate "share pet photos" choice (only used
// while clip sharing is on too); photoShareAsked: that choice was shown once.
export const DEFAULT_SETTINGS = {
  mobileData: false,
  ageConfirmed: false,
  readAloud: false,
  catchMissed: true,
  language: 'system',
  seen: {},
  sharePhotos: false,
  photoShareAsked: false
};

export function newPetId() {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  return 'p' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function makePet({ name, species, breedId = null, home = null }) {
  const sp = getSpecies(species);
  return {
    id: newPetId(),
    name: (name || '').trim() || sp.defaultName,
    species: sp.id,
    breedId: sp.breeds ? breedId : null,
    personality: sp.defaultPersonality,
    contextId: sp.defaultContext,
    contextSetAt: 0,
    home: home || sp.defaultHome,
    createdAt: new Date().toISOString()
  };
}

function migrateV1(old) {
  const sp = getSpecies(old.species || 'dog');
  const pet = {
    ...makePet({ name: old.petName ?? old.dogName, species: sp.id, breedId: old.breedId }),
    personality: sp.packs[old.personality] ? old.personality : sp.defaultPersonality,
    contextId: sp.contexts.some((c) => c.id === old.context) ? old.context : sp.defaultContext
  };
  const history = (Array.isArray(old.history) ? old.history : []).map((h) => ({
    ...h,
    petId: pet.id,
    petName: h.petName || h.dogName || pet.name,
    species: h.species || 'dog'
  }));
  return {
    pets: [pet],
    activePetId: pet.id,
    history,
    shareClips: typeof old.shareClips === 'boolean' ? old.shareClips : null,
    // People who set up before the age check existed are asked once.
    settings: { ...DEFAULT_SETTINGS },
    migratedFrom: 'v1',
    migratedSpecies: sp.id
  };
}

// Returns the saved state, a migrated one, or null on a fresh install.
export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.pets) && data.pets.length) {
        return { ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } };
      }
    }
    const oldRaw = await AsyncStorage.getItem(OLD_KEY);
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (old && typeof old === 'object') return migrateV1(old);
    }
  } catch (_) {}
  return null;
}

export async function saveState(state) {
  try {
    const { migratedFrom, migratedSpecies, ...rest } = state;
    const trimmed = { ...rest, history: (state.history || []).slice(0, MAX_HISTORY) };
    await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch (_) {}
}
