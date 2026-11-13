import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import {
  ALLOWED_EVENTS,
  scoreBucket,
  msBucket,
  runModeFor,
  sanitizeParams,
  initAnalytics,
  isAnalyticsEnabled,
  track,
  setAnalyticsSinkForTests,
  resetAnalyticsForTests
} from '../src/game/analytics.js';

const require = createRequire(import.meta.url);
const appConfigFn = require('../app.config.js');

test('app.config.js reads GOOGLE_SERVICES_JSON and falls back cleanly when missing', () => {
  const src = readFileSync(new URL('../app.config.js', import.meta.url), 'utf8');
  assert.ok(
    src.includes('process.env.GOOGLE_SERVICES_JSON'),
    'app.config.js must read process.env.GOOGLE_SERVICES_JSON'
  );

  const saved = process.env.GOOGLE_SERVICES_JSON;
  try {
    // Missing file (default in dev / CI) -> no crash, no Firebase plugin or googleServicesFile
    process.env.GOOGLE_SERVICES_JSON = './non-existent-google-services.json';
    const cfgMissing = appConfigFn();
    assert.equal(cfgMissing.android?.googleServicesFile, undefined);
    assert.equal(
      cfgMissing.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-firebase/app'),
      false
    );
    assert.equal(
      cfgMissing.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-firebase/analytics'),
      false
    );

    // Existing file on disk -> sets android.googleServicesFile and enables Firebase plugins
    process.env.GOOGLE_SERVICES_JSON = './app.json';
    const cfgPresent = appConfigFn();
    assert.equal(cfgPresent.android?.googleServicesFile, './app.json');
    assert.equal(
      cfgPresent.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-firebase/app'),
      true
    );
    assert.equal(
      cfgPresent.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-firebase/analytics'),
      true
    );
  } finally {
    if (saved === undefined) delete process.env.GOOGLE_SERVICES_JSON;
    else process.env.GOOGLE_SERVICES_JSON = saved;
  }
});

test('google-services.json is never tracked by git and is listed in .gitignore', () => {
  const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.ok(
    gitignore.split(/\r?\n/).some((line) => line.trim() === 'google-services.json'),
    'google-services.json must be in .gitignore'
  );
  const tracked = execFileSync('git', ['ls-files', 'google-services.json'], { encoding: 'utf8' }).trim();
  assert.equal(tracked, '', 'google-services.json must never be tracked by git');
});

test('analytics wrapper gates on UMP consent and Android platform, and strips personal fields', async () => {
  resetAnalyticsForTests();
  const events = [];
  setAnalyticsSinkForTests((name, params) => events.push({ name, params }));

  // Queueing before consent decision holds events until initAnalytics runs
  await track('tutorial_complete', { petName: 'Rex', name: 'Oscar' }, { platform: 'android' });
  assert.equal(events.length, 0);

  // If consent is denied, queued and subsequent events are dropped
  await initAnalytics({ canTrack: false, platform: 'android' });
  assert.equal(isAnalyticsEnabled(), false);
  assert.equal(events.length, 0);
  await track('run_start', { mode: 'endless' }, { platform: 'android' });
  assert.equal(events.length, 0);

  // When consent is granted on Android, allowed events fire without personal info
  resetAnalyticsForTests();
  setAnalyticsSinkForTests((name, params) => events.push({ name, params }));
  await track('tutorial_complete', { petName: 'Buddy', email: 'a@b.c' }, { platform: 'android' });
  await initAnalytics({ canTrack: true, platform: 'android' });
  assert.equal(isAnalyticsEnabled(), true);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], { name: 'tutorial_complete', params: {} });

  // iOS is always a no-op
  await track('run_start', { mode: 'endless' }, { platform: 'ios' });
  assert.equal(events.length, 1);

  // Unknown event names are ignored
  await track('custom_unapproved_event', { foo: 'bar' }, { platform: 'android' });
  assert.equal(events.length, 1);

  // All Part A events log cleanly with sanitized params
  await track('run_start', { mode: 'chase', petName: 'Bella' }, { platform: 'android' });
  await track('run_end', { mode: 'chase', score_bucket: scoreBucket(420), treats: 18 }, { platform: 'android' });
  await track('daily_challenge_done', { type: 'treats' }, { platform: 'android' });
  await track('streak_day', { length: 3 }, { platform: 'android' });
  await track('ad_rewarded_complete', { placement: 'life' }, { platform: 'android' });
  await track('ad_interstitial_shown', {}, { platform: 'android' });
  await track('store_open', { source: 'hub' }, { platform: 'android' });
  await track('purchase', { product_id: 'pawlingo_premium', value: 59, currency: 'ZAR' }, { platform: 'android' });
  await track('share_score', { mode: 'chase', score_bucket: scoreBucket(520) }, { platform: 'android' });

  assert.equal(events.length, 10);
  assert.deepEqual(events[1], { name: 'run_start', params: { mode: 'chase' } });
  assert.deepEqual(events[2], { name: 'run_end', params: { mode: 'chase', score_bucket: '250_499', treats: 18 } });
  assert.deepEqual(events[8], {
    name: 'purchase',
    params: { product_id: 'pawlingo_premium', value: 59, currency: 'ZAR' }
  });

  resetAnalyticsForTests();
});

test('scoreBucket, msBucket, runModeFor, and sanitizeParams helpers', () => {
  assert.equal(scoreBucket(0), '0');
  assert.equal(scoreBucket(55), '1_99');
  assert.equal(scoreBucket(150), '100_249');
  assert.equal(scoreBucket(300), '250_499');
  assert.equal(scoreBucket(750), '500_999');
  assert.equal(scoreBucket(1500), '1000_2499');
  assert.equal(scoreBucket(3000), '2500_plus');

  assert.equal(msBucket(450), 'under_1s');
  assert.equal(msBucket(1500), '1_2s');
  assert.equal(msBucket(3200), '2_5s');
  assert.equal(msBucket(8000), '5s_plus');

  assert.equal(runModeFor({ endless: true }), 'endless');
  assert.equal(runModeFor({ chase: true }), 'chase');
  assert.equal(runModeFor({ daily: true }), 'daily');
  assert.equal(runModeFor({ id: 'dog-park' }), 'stage');

  const cleaned = sanitizeParams({
    mode: 'endless',
    petName: 'Max',
    name: 'Alice',
    text: 'secret',
    uri: 'file:///tmp/a.jpg',
    treats: 25,
    flag: true
  });
  assert.deepEqual(cleaned, { mode: 'endless', treats: 25, flag: 1 });
  assert.ok(ALLOWED_EVENTS.has('tutorial_complete'));
  assert.ok(ALLOWED_EVENTS.has('share_score'));
});
