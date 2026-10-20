// React Native APIs that no longer exist in the version this app ships with. The web preview still has some of
// them, so a screen can look fine there and break on a phone (the Play tab's Go! card did, with absoluteFillObject).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REMOVED = ['StyleSheet.absoluteFillObject'];

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(js|jsx|ts|tsx)$/.test(n) ? [p] : [];
  });
}

test('no removed React Native APIs are used', () => {
  const hits = [];
  for (const f of [...files('src'), 'App.js']) {
    const text = readFileSync(f, 'utf8');
    for (const api of REMOVED) if (text.includes(api)) hits.push(`${f}: ${api}`);
  }
  assert.deepEqual(hits, []);
});
