// Photos snapped for share cards live in the app's own folder (the cache can
// be wiped by the phone at any time) and are tidied up when journal entries
// that used them are gone.

import { File, Directory, Paths } from 'expo-file-system';

function dir() {
  const d = new Directory(Paths.document, 'photos');
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

// Delete saved photos no journal entry points to any more.
export function prunePhotos(history) {
  try {
    const keep = new Set((history || []).map((h) => h.photoUri).filter(Boolean));
    dir()
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
