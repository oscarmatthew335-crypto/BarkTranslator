import test from 'node:test';
import assert from 'node:assert/strict';
import { pickLine, activeContext, fitsPlace, fitsTime } from '../src/lines.js';
import { SPECIES } from '../src/species.js';

const pool = {
  short: ["You're eating snoek on the braai and I'm getting pellets?", 'Eish bru, I can see the bottom of the bowl.', 'Midnight snack time!'],
  long: ['I want to go outside and patrol the wall!']
};

test('indoor pets skip outdoor lines; night lines wait for night', () => {
  const noon = new Date(2026, 9, 17, 13, 0);
  for (let i = 0; i < 30; i++) {
    const line = pickLine({ pool, size: 'short', home: 'indoor', contextId: 'food', now: noon });
    assert.equal(line, 'Eish bru, I can see the bottom of the bowl.');
  }
  assert.ok(fitsPlace('snoek on the braai', 'garden'));
  assert.ok(!fitsPlace('snoek on the braai', 'indoor'));
  assert.ok(fitsTime('Midnight snack', 23) && !fitsTime('Midnight snack', 13));
});

test('avoids recent lines but never returns nothing', () => {
  const noon = new Date(2026, 9, 17, 13, 0);
  const only = 'Eish bru, I can see the bottom of the bowl.';
  const line = pickLine({ pool, size: 'short', home: 'indoor', contextId: 'food', recent: [only], now: noon });
  assert.equal(line, only); // nothing else fits, so repeating beats saying something wrong
});

test('a picked situation wears off after 20 minutes', () => {
  const now = Date.now();
  assert.equal(activeContext({ contextId: 'food', contextSetAt: now - 5 * 60e3 }, now), 'food');
  assert.equal(activeContext({ contextId: 'food', contextSetAt: now - 25 * 60e3 }, now), 'chat');
  assert.equal(activeContext({ contextId: 'food' }, now), 'chat');
});

test('every dog and cat personality has expanded lines and no duplicate lines', () => {
  for (const sp of Object.values(SPECIES)) {
    for (const [packId, pack] of Object.entries(sp.packs)) {
      const allLines = [];
      for (const pools of Object.values(pack.lines)) {
        allLines.push(...(pools.short || []), ...(pools.long || []));
      }
      assert.ok(
        allLines.length >= 38,
        `${sp.id}.${packId} should have at least 38 total lines (has ${allLines.length})`
      );
      const seen = new Set();
      for (const line of allLines) {
        const norm = line.trim();
        assert.ok(!seen.has(norm), `Duplicate line in ${sp.id}.${packId}: "${norm}"`);
        seen.add(norm);
      }
    }
  }
});

