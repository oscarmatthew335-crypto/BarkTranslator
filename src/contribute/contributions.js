// Opt-in data sharing: keeps the recording of each translation, lets the owner
// label what it meant, and uploads both to the Pawlingo server so a real
// sound model can be trained later.
//
// Nothing here runs unless the owner opted in. Clips are tied to a random
// install ID, never to a name, account, contacts or location.
//
// The server address and app key are set at build time:
//   EXPO_PUBLIC_PAWLINGO_API   e.g. https://<region>-<project>.cloudfunctions.net/pawlingo-ingest
//   EXPO_PUBLIC_PAWLINGO_KEY   shared key the server checks (a speed bump, not real security)
// Without them, clips and labels wait on the phone and upload once a build
// that has them is installed.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import appJson from '../../app.json';

const API = (process.env.EXPO_PUBLIC_PAWLINGO_API || '').replace(/\/+$/, '');
const KEY = process.env.EXPO_PUBLIC_PAWLINGO_KEY || '';
const INSTALL_KEY = 'pawlingo:installId';
const OUTBOX_KEY = 'pawlingo:outbox:v1';
const MAX_QUEUED_CLIPS = 40;
const APP_VERSION = appJson?.expo?.version || 'unknown';

export const uploadsConfigured = Boolean(API);

// Last upload outcome, shown in pet settings so problems are visible.
let lastResult = { at: null, ok: null, detail: null };
const listeners = new Set();
function setResult(ok, detail) {
  lastResult = { at: new Date().toISOString(), ok, detail };
  listeners.forEach((fn) => fn());
}
export function onStatusChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// What the settings screen shows: is a server set up, what is waiting, and
// how the last upload went.
export async function getStatus() {
  const box = await readOutbox();
  return {
    configured: Boolean(API),
    server: API ? API.replace(/^https?:\/\//, '').split('.')[0] : null,
    hasKey: Boolean(KEY),
    waitingClips: box.filter((o) => o.type === 'clip').length,
    waitingLabels: box.filter((o) => o.type === 'label').length,
    last: lastResult
  };
}

let installIdPromise = null;
export function getInstallId() {
  if (!installIdPromise) {
    installIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(INSTALL_KEY);
        if (existing) return existing;
      } catch (_) {}
      const id = randomId();
      try {
        await AsyncStorage.setItem(INSTALL_KEY, id);
      } catch (_) {}
      return id;
    })();
  }
  return installIdPromise;
}

function randomId() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function readOutbox() {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

async function writeOutbox(list) {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
  } catch (_) {}
}

function deleteFile(uri) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (_) {}
}

// Move a fresh recording out of the cache (which the OS may clear) into the
// app's own folder until it has been uploaded.
async function keepClipFile(tempUri, clipId) {
  try {
    const dir = new Directory(Paths.document, 'clips');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const ext = (tempUri.match(/\.[a-z0-9]+$/i) || ['.m4a'])[0];
    const dest = new File(dir, `${clipId}${ext}`);
    await new File(tempUri).move(dest);
    return dest.uri;
  } catch (_) {
    return tempUri;
  }
}

// Queue a recording with its measurements and the situation the owner picked.
export async function queueClip({ clipId, tempUri, species, breedId, contextId, analysis }) {
  const uri = await keepClipFile(tempUri, clipId);
  const meta = {
    clipId,
    species,
    breedId: breedId || null,
    chosenContext: contextId,
    pattern: analysis.pattern,
    soundCount: analysis.barkCount,
    loudness: analysis.loudness,
    clarity: analysis.clarity,
    durationMs: Math.round(analysis.durationMs),
    activeMs: Math.round(analysis.activeMs),
    longestMs: Math.round(analysis.longestMs),
    peakDb: Number(analysis.peakDb.toFixed(1)),
    noiseFloorDb: Number(analysis.noiseFloorDb.toFixed(1)),
    recordedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    platform: Platform.OS
  };
  const box = await readOutbox();
  box.push({ type: 'clip', clipId, uri, meta });
  // Keep the phone from filling up if uploads can't go out for a long time.
  let clips = box.filter((op) => op.type === 'clip');
  while (clips.length > MAX_QUEUED_CLIPS) {
    const oldest = clips.shift();
    deleteFile(oldest.uri);
    box.splice(box.indexOf(oldest), 1);
  }
  await writeOutbox(box);
  flush();
}

// Queue the owner's own reading of what the sound meant.
export async function queueLabel({ clipId, contextId, moods, comment, rating }) {
  const box = await readOutbox();
  box.push({
    type: 'label',
    clipId,
    label: {
      context: contextId,
      moods: moods || [],
      comment: (comment || '').trim().slice(0, 280),
      rating: rating || null,
      labelledAt: new Date().toISOString()
    }
  });
  await writeOutbox(box);
  flush();
}

let flushing = null;
// Upload whatever is waiting, oldest first. Stops at the first network
// failure and tries again next time.
export function flush() {
  if (!API) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    const installId = await getInstallId();
    let box = await readOutbox();
    while (box.length) {
      const op = box[0];
      let res;
      try {
        if (op.type === 'clip') {
          const form = new FormData();
          form.append('meta', JSON.stringify(op.meta));
          form.append('clip', { uri: op.uri, name: `${op.clipId}.m4a`, type: 'audio/mp4' });
          res = await fetch(`${API}/clips`, {
            method: 'POST',
            headers: { 'X-App-Key': KEY, 'X-Install-Id': installId },
            body: form
          });
        } else {
          res = await fetch(`${API}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-App-Key': KEY, 'X-Install-Id': installId },
            body: JSON.stringify({ clipId: op.clipId, ...op.label })
          });
        }
      } catch (e) {
        setResult(false, `No connection (${e?.message || 'network error'})`);
        break; // offline: try later
      }
      if (res.status >= 500 || res.status === 429 || res.status === 401) {
        // Server trouble or a wrong app key in this build: keep it and retry.
        setResult(false, `Server said ${res.status}${await errorText(res)}`);
        break;
      }
      if (res.ok) setResult(true, op.type === 'clip' ? 'Clip uploaded' : 'Answer uploaded');
      else setResult(false, `Dropped one ${op.type}: server said ${res.status}${await errorText(res)}`);
      // 2xx is done; any other 4xx will never succeed, so drop it.
      if (op.type === 'clip') deleteFile(op.uri);
      // Re-read in case something was queued while this upload ran.
      box = dropFirstMatch(await readOutbox(), op);
      await writeOutbox(box);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function errorText(res) {
  try {
    const body = await res.json();
    return body?.error ? ` (${body.error})` : '';
  } catch (_) {
    return '';
  }
}

function dropFirstMatch(list, op) {
  const i = list.findIndex(
    (o) =>
      o.type === op.type &&
      o.clipId === op.clipId &&
      (o.type === 'clip' || o.label?.labelledAt === op.label?.labelledAt)
  );
  if (i >= 0) list.splice(i, 1);
  return list;
}

// Turn sharing off: anything not yet uploaded is deleted from the phone.
export async function discardQueued() {
  const box = await readOutbox();
  box.forEach((op) => op.type === 'clip' && deleteFile(op.uri));
  await writeOutbox([]);
}

// Delete everything this install has shared, on the phone and on the server.
// Returns 'deleted', 'local-only' (no server configured) or 'failed'.
export async function deleteMyData() {
  await discardQueued();
  if (!API) return 'local-only';
  try {
    const installId = await getInstallId();
    const res = await fetch(`${API}/me`, {
      method: 'DELETE',
      headers: { 'X-App-Key': KEY, 'X-Install-Id': installId }
    });
    return res.ok ? 'deleted' : 'failed';
  } catch (_) {
    return 'failed';
  }
}
