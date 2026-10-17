// Share video: the server turns a translation (photo + recorded sound +
// speech bubble text) into a short MP4, which the phone then shares.
// Phones can't encode video from JS, so the server does the rendering and
// deletes everything straight after (see the privacy policy).

import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getInstallId } from '../contribute/contributions';
import { fileExists } from '../storage/photos';

const API = (process.env.EXPO_PUBLIC_PAWLINGO_API || '').replace(/\/+$/, '');
const KEY = process.env.EXPO_PUBLIC_PAWLINGO_KEY || '';
const TIMEOUT_MS = 60000;

export const videoAvailable = Boolean(API && KEY);

// Camera photos are several MB; 1080 px wide is plenty for a 720 px video
// and keeps the upload small on mobile data.
async function smallPhoto(uri) {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: 1080 });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return out.uri;
  } catch (_) {
    return null;
  }
}

// Returns the local URI of the finished MP4. Throws with a readable message.
export async function makeVideo(entry, { signal } = {}) {
  if (!videoAvailable) throw new Error('Video sharing is not set up in this build.');
  const form = new FormData();
  form.append(
    'meta',
    JSON.stringify({
      text: entry.text,
      petName: entry.petName,
      label: entry.guess?.label || entry.contextLabel || '',
      species: entry.species
    })
  );
  if (fileExists(entry.photoUri)) {
    const small = await smallPhoto(entry.photoUri);
    if (small) form.append('photo', new File(small));
  }
  if (fileExists(entry.audioUri)) form.append('clip', new File(entry.audioUri));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onAbort);
  let res;
  try {
    res = await fetch(`${API}/video`, {
      method: 'POST',
      headers: { 'X-App-Key': KEY, 'X-Install-Id': await getInstallId() },
      body: form,
      signal: controller.signal
    });
  } catch (e) {
    if (signal?.aborted) throw new Error('cancelled');
    throw new Error("Couldn't reach the server. Check your connection.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
  if (res.status === 429) throw new Error("You've made a lot of videos today. Try again tomorrow.");
  if (!res.ok) throw new Error(`The video couldn't be made (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const out = new File(Paths.cache, `pawlingo-${entry.id}.mp4`);
  if (out.exists) out.delete();
  out.write(bytes);
  return out.uri;
}
