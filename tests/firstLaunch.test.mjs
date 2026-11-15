import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('first launch is one QuickStart screen, then the first run starts by itself', () => {
  const app = src('App.js');
  assert.match(app, /<QuickStart/, 'App shows QuickStart when there is no pet');
  assert.doesNotMatch(app, /if \(!pet\)[\s\S]{0,200}<Onboarding\b(?![\s\S]{0,40}mode="details")/, 'full onboarding is no longer the first screen');
  assert.match(app, /setAutoStartRun\(true\)/, 'QuickStart turns on auto-start');
  assert.match(app, /autoStart=\{autoStartRun\}/, 'PlayTab receives autoStart');

  const play = src('src/components/game/PlayTab.js');
  assert.match(play, /autoStart = false, onAutoStarted/, 'PlayTab takes autoStart');
  assert.match(play, /startStage\(suggestedStage\(game\.progress, pet\.species\)\)/, 'auto-start plays the suggested stage');
});

test('pet details are asked when the translator is first opened, not before the game', () => {
  const app = src('App.js');
  assert.match(app, /detailsDone: false/, 'QuickStart pets are marked as needing details');
  assert.match(app, /activeTab === 'scanner' && pet\.detailsDone === false/, 'translator tab asks for details first');
  assert.match(app, /mode="details"/, 'details use Onboarding in details mode');
  // The translator's own consent screen still comes after the details, as before.
  assert.match(app, /pet\.detailsDone !== false &&\s*\(data\.shareClips === null/, 'consent comes after details');

  const onboarding = src('src/components/Onboarding.js');
  assert.match(onboarding, /mode = 'full'/);
  assert.match(onboarding, /useState\(details\)/, 'age check counts as done in details mode');
});

test('QuickStart asks only dog or cat and the age check', () => {
  const quick = src('src/components/QuickStart.js');
  assert.doesNotMatch(quick, /TextInput/, 'no name field on the first screen');
  assert.match(quick, /onboarding\.ageLabel/);
  assert.match(quick, /disabled=\{!ready\}/);
});
