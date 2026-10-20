import test from 'node:test';
import assert from 'node:assert/strict';
import { rebaseDocumentUri, currentUri } from '../src/storage/photos.js';

const OLD = 'file:///var/mobile/Containers/Data/Application/AAAA-1111/Documents/';
const NOW = 'file:///var/mobile/Containers/Data/Application/BBBB-2222/Documents/';

test('iOS paths saved before an app update point at the new Documents folder', () => {
  assert.equal(rebaseDocumentUri(`${OLD}photos/e1.jpg`, NOW), `${NOW}photos/e1.jpg`);
  assert.equal(rebaseDocumentUri(`${OLD}audio/e1.wav`, NOW.slice(0, -1)), `${NOW}audio/e1.wav`);
  assert.equal(rebaseDocumentUri(`${NOW}videos/e1.mp4`, NOW), `${NOW}videos/e1.mp4`);
});

test('paths outside Documents and missing paths are left alone', () => {
  const cache = 'file:///var/mobile/Containers/Data/Application/AAAA-1111/Library/Caches/bark-1.wav';
  assert.equal(rebaseDocumentUri(cache, NOW), cache);
  assert.equal(rebaseDocumentUri(null, NOW), null);
  assert.equal(rebaseDocumentUri('content://media/1', NOW), 'content://media/1');
});

test('Android paths are never rewritten', () => {
  const p = 'file:///data/user/0/com.pawlingo.app/files/Documents/photos/e1.jpg';
  assert.equal(currentUri(p), p);
});
