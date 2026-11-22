import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { C, F, INK_WIDTH, R, SP, S } from '../src/theme.js';

test('docs/STYLE_GUIDE.md exists and documents palette, radii, shadows, typography and spacing', () => {
  const md = fs.readFileSync(new URL('../docs/STYLE_GUIDE.md', import.meta.url), 'utf8');
  for (const hex of ['#F2EFFC', '#241D3B', '#2D224C', '#FFC83B', '#FF6B5B', '#2EA8FF', '#58C942', '#D3CFF0']) {
    assert.ok(md.includes(hex), `STYLE_GUIDE.md must document ${hex}`);
  }
  assert.ok(md.includes('Fredoka_700Bold'));
  assert.ok(md.includes('INK_WIDTH'));
});

test('src/theme.js exports C, F, INK_WIDTH, R, SP, and S tokens matching the style guide', () => {
  assert.equal(C.bg, '#F2EFFC');
  assert.equal(C.ink, '#241D3B');
  assert.equal(C.shadow, '#2D224C');
  assert.equal(C.butter, '#FFC83B');
  assert.equal(C.coral, '#FF6B5B');
  assert.equal(C.arcadeBlue, '#2EA8FF');
  assert.equal(C.lime, '#58C942');
  assert.equal(C.tabInactive, '#D3CFF0');
  assert.equal(F.bold, 'Fredoka_700Bold');
  assert.equal(INK_WIDTH, 2.5);
  assert.equal(R.viewport, 24);
  assert.equal(R.modal, 22);
  assert.equal(R.pill, 999);
  assert.equal(SP.screenX, 16);
  assert.equal(S.card.offset, 4);
  assert.equal(S.small.offset, 3);
});

test('WardrobeIcons.js exports SlotTabIcon, ColourHeadTileSvg, and ItemTileSvg', () => {
  const src = fs.readFileSync(new URL('../src/components/game/WardrobeIcons.js', import.meta.url), 'utf8');
  assert.ok(src.includes('export function SlotTabIcon'));
  assert.ok(src.includes('export function ColourHeadTileSvg'));
  assert.ok(src.includes('export function ItemTileSvg'));
});
