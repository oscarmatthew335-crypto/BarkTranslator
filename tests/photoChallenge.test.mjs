import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveMoment,
  shouldUploadPhoto,
  reencodeWithoutMetadata,
  uploadMeta,
  challengeSituation,
  newPhotoId,
  guessFromPhoto,
  SITUATIONS,
  MAX_PHOTO_EDGE
} from '../src/game/photoChallenge.js';
import { calls } from './stubs/imagemanip.mjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queuePhoto, queuePhotoDelete, discardQueuedPhotos, getStatus } from '../src/contribute/contributions.js';

const pet = { id: 'p0123456789abcdef', name: 'Bruno', species: 'dog', breedId: 'golden' };
const asset = { uri: 'file:///picked/IMG_0001.jpg', width: 4000, height: 3000 };

function recorder({ canUpload = false, reencode } = {}) {
  const log = [];
  return {
    log,
    deps: {
      reencode: reencode || (async (uri, size) => (log.push(['reencode', uri, size]), `${uri}.clean.jpg`)),
      keep: async (uri, id) => (log.push(['keep', uri, id]), `file:///docs/moments/${id}.jpg`),
      upload: async (m) => log.push(['upload', m.id]),
      canUpload
    }
  };
}

test('the EXIF-stripping re-encode runs before the photo is saved, and only the clean copy is kept', async () => {
  const { log, deps } = recorder();
  const m = await saveMoment({ asset, pet, situation: 'eating', labels: { isPet: 'yes' }, now: 1760000000123 }, deps);
  assert.deepEqual(log.map((l) => l[0]), ['reencode', 'keep']);
  assert.equal(log[0][1], asset.uri);
  assert.equal(log[1][1], `${asset.uri}.clean.jpg`, 'the saved file is the re-encoded one');
  assert.notEqual(log[1][1], asset.uri);
  assert.equal(m.uri, 'file:///docs/moments/ph-dog-1760000000123.jpg');
  assert.equal(m.situation, 'eating');
  assert.equal(m.isPet, 'yes');
  assert.equal(m.shared, false);
});

test('if the re-encode fails (or would keep the original), nothing is saved', async () => {
  const failing = recorder({ reencode: async () => { throw new Error('nope'); } });
  assert.equal(await saveMoment({ asset, pet, situation: 'toy' }, failing.deps), null);
  assert.ok(!failing.log.some((l) => l[0] === 'keep'));
  const same = recorder({ reencode: async (uri) => uri });
  assert.equal(await saveMoment({ asset, pet, situation: 'toy' }, same.deps), null);
  assert.ok(!same.log.some((l) => l[0] === 'keep'));
});

test('re-encoding goes through the image manipulator as a fresh JPEG, shrunk when large', async () => {
  calls.length = 0;
  const out = await reencodeWithoutMetadata(asset.uri, { width: 4000, height: 3000 });
  assert.equal(out, `${asset.uri}.clean.jpg`);
  assert.deepEqual(calls[0], ['manipulate', asset.uri]);
  assert.deepEqual(calls[1], ['resize', { width: MAX_PHOTO_EDGE }]);
  assert.equal(calls[2][0], 'save');
  assert.equal(calls[2][2].format, 'jpeg');
  calls.length = 0;
  await reencodeWithoutMetadata(asset.uri, { width: 800, height: 600 });
  assert.ok(!calls.some((c) => c[0] === 'resize'), 'small photos are still re-encoded, not resized');
  assert.ok(calls.some((c) => c[0] === 'save'));
});

test('photos upload only with clip sharing AND the separate photo choice', async () => {
  assert.equal(shouldUploadPhoto({ shareClips: true, sharePhotos: true }), true);
  assert.equal(shouldUploadPhoto({ shareClips: true, sharePhotos: false }), false);
  assert.equal(shouldUploadPhoto({ shareClips: false, sharePhotos: true }), false);
  assert.equal(shouldUploadPhoto({ shareClips: null, sharePhotos: true }), false);
  assert.equal(shouldUploadPhoto({ shareClips: true }), false, 'photo sharing defaults to off');

  const off = recorder({ canUpload: shouldUploadPhoto({ shareClips: true, sharePhotos: false }) });
  await saveMoment({ asset, pet, situation: 'door' }, off.deps);
  assert.ok(!off.log.some((l) => l[0] === 'upload'));
  const on = recorder({ canUpload: shouldUploadPhoto({ shareClips: true, sharePhotos: true }) });
  const m = await saveMoment({ asset, pet, situation: 'door' }, on.deps);
  assert.deepEqual(on.log.map((l) => l[0]), ['reencode', 'keep', 'upload']);
  assert.equal(m.shared, true);
});

test('upload labels carry the situation and confirmations, never a name or location', async () => {
  const { deps } = recorder();
  const m = await saveMoment({ asset, pet, situation: 'playing', labels: { isPet: 'yes', size: 'large', breedConfirmed: true }, now: 1760000000999 }, deps);
  const meta = uploadMeta(m, pet);
  assert.deepEqual(meta, {
    photoId: 'ph-dog-1760000000999',
    species: 'dog',
    petKey: pet.id,
    situation: 'playing',
    isPet: 'yes',
    size: 'large',
    breedId: 'golden',
    breedConfirmed: true,
    savedAt: new Date(1760000000999).toISOString()
  });
  assert.ok(!JSON.stringify(meta).includes('Bruno'));
  assert.ok(!/lat|lon|gps|exif/i.test(Object.keys(meta).join()));
  const unconfirmed = await saveMoment({ asset, pet, situation: 'playing', labels: { breedConfirmed: false } }, deps);
  assert.equal(uploadMeta(unconfirmed, pet).breedId, null);
});

test('photo ids match the server, and the daily situation is one of the six and moves on', () => {
  assert.match(newPhotoId('cat', 1760000000000), /^ph-cat-\d{13}$/);
  assert.match(newPhotoId('dog', 1760000000000), /^ph-dog-\d{13}$/);
  const a = challengeSituation('2026-10-20', 'p1', 0);
  const b = challengeSituation('2026-10-20', 'p1', 1);
  assert.ok(SITUATIONS.includes(a) && SITUATIONS.includes(b));
  assert.notEqual(a, b);
  assert.equal(challengeSituation('2026-10-20', 'p1', 0), a);
});

test('no automatic breed guessing yet: the on-device model hook returns nothing', async () => {
  assert.equal(await guessFromPhoto('file:///x.jpg'), null);
});

test('queued photos wait in the outbox; deleting before upload just drops them; photo sharing off discards them', async () => {
  await AsyncStorage.removeItem('pawlingo:outbox:v1');
  await queuePhoto({ photoId: 'ph-dog-1760000000001', uri: 'file:///m/1.jpg', meta: { situation: 'eating' } });
  await queuePhoto({ photoId: 'ph-dog-1760000000002', uri: 'file:///m/2.jpg', meta: { situation: 'toy' } });
  assert.equal((await getStatus()).waitingPhotos, 2);
  await queuePhotoDelete('ph-dog-1760000000001');
  assert.equal((await getStatus()).waitingPhotos, 1);
  const box = JSON.parse(await AsyncStorage.getItem('pawlingo:outbox:v1'));
  assert.ok(!box.some((o) => o.type === 'photoDelete'), 'never-sent photo needs no server delete');
  await queuePhotoDelete('ph-dog-1760000000009');
  assert.ok(JSON.parse(await AsyncStorage.getItem('pawlingo:outbox:v1')).some((o) => o.type === 'photoDelete'));
  await discardQueuedPhotos();
  assert.equal((await getStatus()).waitingPhotos, 0);
});
