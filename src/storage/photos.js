// Photos snapped for share cards, and each translation's sound for share
// videos, live in the app's own folder (the cache can be wiped by the phone at
// any time) and are tidied up when the journal entries that used them go.
// Sounds and camera clips are kept for the newest entries only, to save space.

import { File, Directory, Paths } from 'expo-file-system';

const KEEP_AUDIO = 30;
const KEEP_VIDEO = 10; // camera clips are a few MB each

function dir(name = 'photos') {
  const d = new Directory(Paths.document, name);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

export async function keepPhoto(tempUri, id) {
  if (!tempUri) return null;
  try {
    const dest = new File(dir(), `${id}.jpg`);
    await new File(tempUri).move(dest);
    return dest.uri;
  } catch (_) {
    return tempUri;
  }
}

// Keep a copy of the recording so the owner can share it as a video later.
export async function keepAudio(tempUri, id) {
  if (!tempUri) return null;
  try {
    const dest = new File(dir('audio'), `${id}.wav`);
    await new File(tempUri).copy(dest);
    return dest.uri;
  } catch (_) {
    return null;
  }
}

// Keep the camera clip filmed while listening (moved, not copied).
export async function keepVideo(tempUri, id) {
  if (!tempUri) return null;
  try {
    const dest = new File(dir('videos'), `${id}.mp4`);
    await new File(tempUri).move(dest);
    return dest.uri;
  } catch (_) {
    return null;
  }
}

export function fileExists(uri) {
  try {
    return Boolean(uri) && new File(uri).exists;
  } catch (_) {
    return false;
  }
}

function prune(name, keep) {
  try {
    dir(name)
      .list()
      .forEach((item) => {
        if (item instanceof File && !keep.has(item.uri)) {
          try {
            item.delete();
          } catch (_) {}
        }
      });
  } catch (_) {}
}

// Delete saved photos and sounds no journal entry points to any more.
// History is newest first.
export function prunePhotos(history) {
  const list = history || [];
  prune('photos', new Set(list.map((h) => h.photoUri).filter(Boolean)));
  prune('audio', new Set(list.slice(0, KEEP_AUDIO).map((h) => h.audioUri).filter(Boolean)));
  prune('videos', new Set(list.slice(0, KEEP_VIDEO).map((h) => h.videoUri).filter(Boolean)));
}
