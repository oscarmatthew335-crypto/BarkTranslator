import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES } from '../src/species.js';
import { pickLocalizedLine, fitsPlace, fitsTime } from '../src/lines.js';
import { PET_TRANSLATIONS, localizeLine, localizeContext } from '../src/data/i18n/index.js';
import { setAppLanguage } from '../src/i18n/index.js';

const LANGS = ['af', 'zu'];
// English lines that are deliberately left in English (none yet). Format: `${species}.${pack}:${line}`
const ENGLISH_ON_PURPOSE = new Set();

const allLines = (pack) =>
  Object.values(pack.lines).flatMap((pools) => [...(pools.short || []), ...(pools.long || [])]);

test('every English pet line has an af and zu version (or is listed as staying English)', () => {
  for (const lang of LANGS) {
    for (const sp of Object.values(SPECIES)) {
      for (const [packId, pack] of Object.entries(sp.packs)) {
        const map = PET_TRANSLATIONS[lang].lines[sp.id]?.[packId] || {};
        for (const line of allLines(pack)) {
          if (ENGLISH_ON_PURPOSE.has(`${sp.id}.${packId}:${line}`)) continue;
          assert.ok(map[line]?.trim(), `${lang} is missing ${sp.id}.${packId}: "${line}"`);
        }
        // No leftovers from English lines that were edited or removed.
        const english = new Set(allLines(pack));
        for (const key of Object.keys(map)) assert.ok(english.has(key), `${lang} has a stale key in ${sp.id}.${packId}: "${key}"`);
      }
    }
  }
});

test('no duplicate translated lines within a personality, per language', () => {
  for (const lang of LANGS) {
    for (const sp of Object.values(SPECIES)) {
      for (const packId of Object.keys(sp.packs)) {
        const seen = new Set();
        for (const line of Object.values(PET_TRANSLATIONS[lang].lines[sp.id][packId])) {
          const norm = line.trim();
          assert.ok(!seen.has(norm), `Duplicate ${lang} line in ${sp.id}.${packId}: "${norm}"`);
          seen.add(norm);
        }
      }
    }
  }
});

test('every situation label, short label and tip has af and zu versions', () => {
  for (const lang of LANGS) {
    for (const sp of Object.values(SPECIES)) {
      for (const ctx of sp.contexts) {
        const { contexts } = PET_TRANSLATIONS[lang];
        const tr = contexts[sp.id]?.[ctx.id] || contexts.shared?.[ctx.id];
        for (const field of ['label', 'shortLabel', 'tip']) {
          assert.ok(tr?.[field]?.trim(), `${lang} is missing ${sp.id}.${ctx.id}.${field}`);
        }
      }
    }
  }
});

test('translation files are marked for native-speaker review', () => {
  for (const lang of LANGS) {
    const src = readFileSync(new URL(`../src/data/i18n/${lang}.js`, import.meta.url), 'utf8');
    assert.match(src.split('\n')[0], /needs native-speaker review/i);
  }
});

test('filtering keeps working in every language: indoor pets at noon get no outdoor or night lines', () => {
  const noon = new Date(2026, 9, 17, 13, 0);
  for (const lang of ['en', ...LANGS]) {
    for (const sp of Object.values(SPECIES)) {
      for (const [packId, pack] of Object.entries(sp.packs)) {
        for (const [contextId, pool] of Object.entries(pack.lines)) {
          for (const size of ['short', 'long']) {
            const fitting = [...(pool.short || []), ...(pool.long || [])].filter((l) => fitsPlace(l, 'indoor') && fitsTime(l, 13));
            if (!fitting.length) continue; // pickLine falls back on purpose then
            for (let i = 0; i < 8; i++) {
              const { key, text } = pickLocalizedLine({
                species: sp.id,
                pack: packId,
                lang,
                pool,
                size,
                home: 'indoor',
                contextId: contextId === 'zoomies' ? 'chat' : contextId,
                now: noon,
                random: () => i / 8
              });
              assert.ok(fitsPlace(key, 'indoor') && fitsTime(key, 13), `${lang} ${sp.id}.${packId}.${contextId}: "${key}"`);
              assert.equal(text, localizeLine(key, { species: sp.id, pack: packId, lang }));
              if (lang !== 'en') assert.notEqual(text, key, `${lang} shows English for "${key}"`);
            }
          }
        }
      }
    }
  }
});

test('recent lines are avoided whether history holds the English or the translated line', () => {
  const noon = new Date(2026, 9, 17, 13, 0);
  const pool = { short: ['Hmph. You again.', "I'm not old, I'm vintage."], long: [] };
  const opts = { species: 'cat', pack: 'grumpy', lang: 'af', pool, size: 'short', home: 'indoor', contextId: 'chat', now: noon, random: () => 0 };
  const first = pickLocalizedLine(opts);
  assert.equal(first.key, 'Hmph. You again.');
  assert.equal(first.text, 'Hmf. Jy weer.');
  for (const recent of [[first.text], [first.key]]) {
    assert.equal(pickLocalizedLine({ ...opts, recent }).key, "I'm not old, I'm vintage.");
  }
});

test('English stays the fallback for missing lines and languages', () => {
  const line = 'A line nobody has translated yet.';
  assert.equal(localizeLine(line, { species: 'dog', pack: 'boet', lang: 'af' }), line);
  assert.equal(localizeLine('Hmph. You again.', { species: 'cat', pack: 'grumpy', lang: 'fr' }), 'Hmph. You again.');
  assert.equal(localizeContext({ id: 'new', label: '🆕 New' }, 'label', { species: 'dog', lang: 'zu' }), '🆕 New');
});

test('situation labels follow the app language', () => {
  const food = SPECIES.dog.contexts.find((c) => c.id === 'food');
  setAppLanguage('af');
  assert.equal(food.label, '🍖 Kos / Braai');
  setAppLanguage('zu');
  assert.equal(food.label, '🍖 Ukudla / Braai');
  setAppLanguage('en');
  assert.equal(food.label, '🍖 Food / Braai');
  assert.equal(SPECIES.cat.contexts[0].shortLabel, 'Chatting');
});
