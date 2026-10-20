// Photo challenges: "Show us <name> eating -> instant speed boost".
// The owner picks a photo from the gallery or takes one. It becomes theirs:
// a moment in "<name>'s moments" and the pet's face in the game.
//
// Privacy:
//  - Every photo is re-encoded before it is saved, which drops all EXIF
//    metadata, including GPS location (saveMoment, below).
//  - A photo is uploaded only when the owner shares clips AND has ticked the
//    separate "share pet photos" choice (shouldUploadPhoto). Both default off.
//  - Nothing is inferred about the pet's temperament from photos.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { hashString } from './random';
import { currentUri } from '../storage/photos';

export const SITUATIONS = ['eating', 'sleeping', 'playing', 'door', 'outside', 'toy'];
export const PHOTO_REWARD = 'speed'; // the power-up a photo challenge gives
export const MAX_PHOTO_EDGE = 1280;
export const JPEG_QUALITY = 0.8;

const KEY = 'pawlingo:moments:v1';

// Today's situation for this pet; moves on once it's done.
export function challengeSituation(today, petId, doneCount = 0) {
  return SITUATIONS[(hashString(`${today}:${petId}`) + doneCount) % SITUATIONS.length];
}

export const shouldUploadPhoto = ({ shareClips, sharePhotos }) => shareClips === true && sharePhotos === true;

export const newPhotoId = (species, now = Date.now()) => `ph-${species === 'cat' ? 'cat' : 'dog'}-${now}`;

// Re-encode a picked photo as a fresh JPEG (no EXIF, no location), at most
// MAX_PHOTO_EDGE pixels on its long side. Returns the new file's uri.
export async function reencodeWithoutMetadata(uri, { width, height } = {}) {
  const ctx = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > MAX_PHOTO_EDGE) {
    ctx.resize(width >= height ? { width: MAX_PHOTO_EDGE } : { height: MAX_PHOTO_EDGE });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return out.uri;
}

// Save a challenge photo for the pet. The EXIF-stripping step always runs
// before anything is stored; if it fails, nothing is saved.
// deps (for tests): reencode(uri, size) -> uri, keep(uri, id) -> uri, upload(moment), canUpload
export async function saveMoment({ asset, pet, situation, labels = {}, now = Date.now() }, deps) {
  const id = newPhotoId(pet.species, now);
  let clean;
  try {
    clean = await deps.reencode(asset.uri, { width: asset.width, height: asset.height });
  } catch (_) {
    return null;
  }
  if (!clean || clean === asset.uri) return null;
  const uri = await deps.keep(clean, id);
  if (!uri) return null;
  const moment = {
    id,
    petId: pet.id,
    uri,
    situation,
    isPet: labels.isPet ?? null, // 'yes' | 'no' | null
    size: labels.size ?? null,
    breedId: labels.breedConfirmed === true ? pet.breedId : null,
    breedConfirmed: labels.breedConfirmed ?? null,
    createdAt: new Date(now).toISOString(),
    shared: false
  };
  if (deps.canUpload) {
    await deps.upload(moment);
    moment.shared = true;
  }
  return moment;
}

// What goes to the server with a shared photo: the labels only. No name,
// no location, no capture time.
export function uploadMeta(moment, pet) {
  return {
    photoId: moment.id,
    species: pet.species,
    petKey: pet.id,
    situation: moment.situation,
    isPet: moment.isPet,
    size: moment.size,
    breedId: moment.breedId,
    breedConfirmed: moment.breedConfirmed,
    savedAt: moment.createdAt
  };
}

// Hook for a later on-device model (breed / "is this a pet?"). Not used for
// guessing anything yet: always returns null.
export async function guessFromPhoto(/* uri */) {
  return null;
}

// --- the moments list -------------------------------------------------------

export async function loadMoments() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map((m) => ({ ...m, uri: currentUri(m.uri) })) : [];
  } catch (_) {
    return [];
  }
}

export async function saveMoments(list) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (_) {}
}
