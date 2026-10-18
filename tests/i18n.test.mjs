import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';
import af from '../src/i18n/af.js';
import zu from '../src/i18n/zu.js';
import { translate, setAppLanguage, resolveLanguage } from '../src/i18n/index.js';
import { readFileSync } from 'node:fs';

test('en, af and zu dictionaries have the same keys and af/zu carry review comments', () => {
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(Object.keys(af).sort(), enKeys, 'af keys match en');
  assert.deepEqual(Object.keys(zu).sort(), enKeys, 'zu keys match en');

  const afSrc = readFileSync(new URL('../src/i18n/af.js', import.meta.url), 'utf8');
  const zuSrc = readFileSync(new URL('../src/i18n/zu.js', import.meta.url), 'utf8');
  assert.match(afSrc.split('\n')[0], /native-speaker review/i);
  assert.match(zuSrc.split('\n')[0], /native-speaker review/i);
});

test('translate interpolates variables and falls back to English', () => {
  setAppLanguage('af');
  assert.equal(translate('tab.translate'), 'Vertaal');
  assert.equal(translate('onboarding.startPet', { petName: 'Bruno' }), 'Begin Bruno vertaal');

  setAppLanguage('zu');
  assert.equal(translate('tab.translate'), 'Humusha');
  assert.equal(translate('onboarding.startPet', { petName: 'Bruno' }), 'Qala ukuhumusha u-Bruno');

  // Unknown language preference falls back to device language / English
  assert.ok(['en', 'af', 'zu'].includes(resolveLanguage('unknown')));
  setAppLanguage('en');
  assert.equal(translate('tab.translate'), 'Translate');
});
