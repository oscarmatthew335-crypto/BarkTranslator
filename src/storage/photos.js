// Photos snapped for share cards, and each translation's sound for share
// videos, live in the app's own folder (the cache can be wiped by the phone at
// any time) and are tidied up when the journal entries that used them go.
// Sounds and camera clips are kept for the newest entries only, to save space.

import { Platform } from 'react-native';
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

// Keep a Play tab photo-challenge photo (already re-encoded without EXIF) in
// the pet's "moments" folder. Moments are never pruned: only the owner deletes them.
export async function keepMoment(tempUri, id) {
  if (!tempUri) return null;
  try {
    const dest = new File(dir('moments'), `${id}.jpg`);
    await new File(tempUri).move(dest);
    return dest.uri;
  } catch (_) {
    return null;
  }
}

export function deleteLocalFile(uri) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (_) {}
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

// Keep the camera clip filmed while listening (moved, or copied when picked from gallery).
export async function keepVideo(tempUri, id, { copy = false } = {}) {
  if (!tempUri) return null;
  try {
    const dest = new File(dir('videos'), `${id}.mp4`);
    if (copy) await new File(tempUri).copy(dest);
    else await new File(tempUri).move(dest);
    return dest.uri;
  } catch (_) {
    return null;
  }
}

// iOS moves the app to a new folder (a new ID in the path) on every update or
// backup restore, so a saved file:// path into Documents goes stale. Point it
// at today's Documents folder. Android paths don't move.
export function rebaseDocumentUri(uri, documentUri) {
  if (typeof uri !== 'string' || !uri.startsWith('file://') || !documentUri) return uri;
  const base = documentUri.endsWith('/') ? documentUri : `${documentUri}/`;
  if (uri.startsWith(base)) return uri;
  const at = uri.indexOf('/Documents/');
  return at < 0 ? uri : base + uri.slice(at + '/Documents/'.length);
}

export function currentUri(uri) {
  if (Platform.OS !== 'ios') return uri;
  try {
    return rebaseDocumentUri(uri, Paths.document.uri);
  } catch (_) {
    return uri;
  }
}

// A journal entry with its saved photo, sound and video paths brought up to date.
export function withCurrentUris(entry) {
  if (Platform.OS !== 'ios' || !entry) return entry;
  return {
    ...entry,
    photoUri: currentUri(entry.photoUri),
    audioUri: currentUri(entry.audioUri),
    videoUri: currentUri(entry.videoUri)
  };
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
