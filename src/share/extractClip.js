// Sends a video or voice note the owner picked (or shared into Pawlingo) to
// POST /extract on the server, which returns a 16 kHz mono 16-bit WAV and
// deletes the upload straight away.

import { File, Paths } from 'expo-file-system';
import { getInstallId } from '../contribute/contributions';
import { decodeWav } from '../audio/features';

const API = (process.env.EXPO_PUBLIC_PAWLINGO_API || '').replace(/\/+$/, '');
const KEY = process.env.EXPO_PUBLIC_PAWLINGO_KEY || '';
const TIMEOUT_MS = 65000;

export const MAX_MEDIA_BYTES = 25_000_000;
export const MAX_VIDEO_BYTES = 15_000_000;
export const MAX_EXTRACT_SECONDS = 30;
export const extractAvailable = Boolean(API && KEY);

export function canUseForShareVideo(uri) {
  if (!uri) return false;
  try {
    const f = new File(uri);
    return Boolean(f.exists && typeof f.size === 'number' && f.size > 0 && f.size <= MAX_VIDEO_BYTES);
  } catch (_) {
    return false;
  }
}

export async function extractClipAudio({ uri, start = 0, seconds = MAX_EXTRACT_SECONDS, fallbackDate = null }) {
  if (!extractAvailable) {
    throw new Error('Clip import is not set up in this build.');
  }
  if (!uri) {
    throw new Error('Could not read that clip.');
  }
  const file = new File(uri);
  if (typeof file.size === 'number' && file.size > MAX_MEDIA_BYTES) {
    throw new Error('That clip is too large (max 25 MB). Try a shorter clip.');
  }

  const form = new FormData();
  form.append('media', file);
  if (start > 0) form.append('start', String(Math.round(start * 10) / 10));
  if (seconds > 0) form.append('seconds', String(Math.min(MAX_EXTRACT_SECONDS, Math.round(seconds * 10) / 10)));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API}/extract`, {
      method: 'POST',
      headers: { 'X-App-Key': KEY, 'X-Install-Id': await getInstallId() },
      body: form,
      signal: controller.signal
    });
  } catch (_) {
    throw new Error("Couldn't reach the server to read that clip. Check your connection.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 413) {
    throw new Error('That clip is too large (max 25 MB). Try a shorter clip.');
  }
  if (res.status === 429) {
    throw new Error("You've imported a lot of clips today. Try again tomorrow.");
  }
  if (res.status === 422 || !res.ok) {
    let serverMsg = '';
    try {
      const body = await res.json();
      serverMsg = body?.error || '';
    } catch (_) {}
    if (/no sound/i.test(serverMsg)) throw new Error('That clip has no sound.');
    if (/could not read/i.test(serverMsg)) throw new Error('Could not read that clip.');
    throw new Error(serverMsg || `Could not read that clip (${res.status}).`);
  }

  const headerDate = res.headers?.get?.('X-Recorded-At') || res.headers?.get?.('x-recorded-at');
  let recordedAt = null;
  if (headerDate && Number.isFinite(Date.parse(headerDate))) {
    recordedAt = new Date(Date.parse(headerDate)).toISOString();
  } else if (fallbackDate && Number.isFinite(Date.parse(fallbackDate))) {
    recordedAt = new Date(Date.parse(fallbackDate)).toISOString();
  } else if (typeof fallbackDate === 'number' && Number.isFinite(fallbackDate)) {
    recordedAt = new Date(fallbackDate).toISOString();
  } else {
    recordedAt = new Date().toISOString();
  }

  const wavBytes = new Uint8Array(await res.arrayBuffer());
  const pcm = decodeWav(wavBytes);
  if (!pcm || !pcm.length) {
    throw new Error('That clip has no sound.');
  }

  let clipUri = null;
  try {
    const tempWav = new File(Paths.cache, `extract-${Date.now()}.wav`);
    if (tempWav.exists) tempWav.delete();
    tempWav.write(wavBytes);
    clipUri = tempWav.uri;
  } catch (_) {}

  return { pcm, wavBytes, clipUri, recordedAt };
}
