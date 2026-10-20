import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import en from '../src/i18n/game/en.js';
import af from '../src/i18n/game/af.js';
import zu from '../src/i18n/game/zu.js';
import { DICTS } from '../src/i18n/index.js';
import { ALL_QUESTIONS } from '../src/game/questions.js';
import { ITEMS, BODY_COLOURS } from '../src/game/wardrobe.js';
import { POWER_UPS, STAGES } from '../src/game/stages.js';

const root = new URL('../', import.meta.url);

test('Play tab strings exist in en, af and zu, and af/zu are marked for native-speaker review', () => {
  const keys = Object.keys(en).sort();
  assert.deepEqual(Object.keys(af).sort(), keys);
  assert.deepEqual(Object.keys(zu).sort(), keys);
  for (const lang of ['af', 'zu']) {
    const first = readFileSync(new URL(`src/i18n/game/${lang}.js`, root), 'utf8').split('\n')[0];
    assert.match(first, /needs native-speaker review/i);
  }
  for (const k of keys) {
    assert.ok(DICTS.en[k] && DICTS.af[k] && DICTS.zu[k], k);
    // Same placeholders in every language
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(vars(af[k]), vars(en[k]), `af ${k}`);
    assert.equal(vars(zu[k]), vars(en[k]), `zu ${k}`);
  }
});

test('every literal t() key used by the game screens has an English string', () => {
  const files = [
    ...readdirSync(new URL('src/components/game/', root)).map((f) => `src/components/game/${f}`),
    'src/components/TabBar.js',
    'src/components/SettingsSheet.js',
    'src/components/PetsSheet.js'
  ];
  for (const f of files) {
    const src = readFileSync(new URL(f, root), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) assert.ok(DICTS.en[m[1]], `${f}: ${m[1]}`);
  }
});

test('data-driven names have strings: questions, answers, wardrobe, power-ups, places', () => {
  for (const q of ALL_QUESTIONS) {
    for (const sp of q.species) assert.ok(en[`q.${q.id}.${sp}`] || en[`q.${q.id}`], q.id);
    for (const o of q.options) assert.ok(en[`q.${q.id}.${o}`] || en[`q.opt.${o}`], `${q.id}.${o}`);
  }
  for (const i of ITEMS) assert.ok(en[`game.item.${i.id}`], i.id);
  for (const c of BODY_COLOURS) assert.ok(en[`game.colour.${c.id}`], c.id);
  for (const p of POWER_UPS) assert.ok(en[`game.power.${p}`], p);
  for (const s of [...STAGES.dog, ...STAGES.cat]) assert.ok(en[s.nameKey], s.nameKey);
});
