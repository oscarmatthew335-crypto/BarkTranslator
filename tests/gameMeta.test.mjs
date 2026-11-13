import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import {
  metaConfig,
  initMeta,
  isMetaEnabled,
  logMetaRunFinished,
  logMetaPremiumPurchased,
  setMetaSinkForTests,
  resetMetaForTests
} from '../src/game/meta.js';

const require = createRequire(import.meta.url);
const appConfigFn = require('../app.config.js');

test('EXPO_PUBLIC_META_APP_ID and EXPO_PUBLIC_META_CLIENT_TOKEN are read literally via process.env.EXPO_PUBLIC_*', () => {
  const metaSrc = readFileSync(new URL('../src/game/meta.js', import.meta.url), 'utf8');
  const cfgSrc = readFileSync(new URL('../app.config.js', import.meta.url), 'utf8');
  for (const key of ['EXPO_PUBLIC_META_APP_ID', 'EXPO_PUBLIC_META_CLIENT_TOKEN']) {
    assert.ok(metaSrc.includes(`process.env.${key}`), `meta.js must read process.env.${key} literally`);
    assert.ok(cfgSrc.includes(`process.env.${key}`), `app.config.js must read process.env.${key} literally`);
  }
  assert.ok(!/metaConfig\(env = process\.env\)/.test(metaSrc), 'metaConfig must not default to bare process.env');
});

test('without Meta env values (or without client token), app.config.js omits the Meta plugin and initMeta is a no-op', async () => {
  const savedAppId = process.env.EXPO_PUBLIC_META_APP_ID;
  const savedToken = process.env.EXPO_PUBLIC_META_CLIENT_TOKEN;
  try {
    delete process.env.EXPO_PUBLIC_META_APP_ID;
    delete process.env.EXPO_PUBLIC_META_CLIENT_TOKEN;

    const cfgEmpty = appConfigFn();
    assert.equal(
      cfgEmpty.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-fbsdk-next'),
      false,
      'Meta plugin must be omitted when env vars are unset'
    );

    // App ID set, client token empty -> still omitted so builds do not crash
    process.env.EXPO_PUBLIC_META_APP_ID = '1715784240586694';
    process.env.EXPO_PUBLIC_META_CLIENT_TOKEN = '';
    const cfgNoToken = appConfigFn();
    assert.equal(
      cfgNoToken.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-fbsdk-next'),
      false,
      'Meta plugin must be omitted when client token is empty'
    );

    resetMetaForTests();
    const ok = await initMeta({
      canTrack: true,
      env: { EXPO_PUBLIC_META_APP_ID: '1715784240586694', EXPO_PUBLIC_META_CLIENT_TOKEN: '' },
      platform: 'android'
    });
    assert.equal(ok, false);
    assert.equal(isMetaEnabled(), false);

    // When both are set, app.config.js includes react-native-fbsdk-next with auto-init disabled
    process.env.EXPO_PUBLIC_META_APP_ID = '1715784240586694';
    process.env.EXPO_PUBLIC_META_CLIENT_TOKEN = 'test_client_token_abc';
    const cfgBoth = appConfigFn();
    const fbPlugin = cfgBoth.plugins.find((p) => Array.isArray(p) && p[0] === 'react-native-fbsdk-next');
    assert.ok(fbPlugin, 'react-native-fbsdk-next plugin should be present when both env values are set');
    assert.deepEqual(fbPlugin[1], {
      appID: '1715784240586694',
      clientToken: 'test_client_token_abc',
      displayName: 'Pawlingo',
      scheme: 'fb1715784240586694',
      autoLogAppEventsEnabled: false,
      advertiserIDCollectionEnabled: false,
      isAutoInitEnabled: false
    });
  } finally {
    if (savedAppId === undefined) delete process.env.EXPO_PUBLIC_META_APP_ID;
    else process.env.EXPO_PUBLIC_META_APP_ID = savedAppId;
    if (savedToken === undefined) delete process.env.EXPO_PUBLIC_META_CLIENT_TOKEN;
    else process.env.EXPO_PUBLIC_META_CLIENT_TOKEN = savedToken;
  }
});

test('initMeta gates on UMP consent, ADS_NON_PERSONALISED, Android platform, and both credentials', async () => {
  resetMetaForTests();
  const sdkCalls = [];
  const fakeSdk = {
    Settings: {
      setAutoLogAppEventsEnabled: (v) => sdkCalls.push(['autoLog', v]),
      setAdvertiserIDCollectionEnabled: (v) => sdkCalls.push(['adId', v]),
      initializeSDK: () => sdkCalls.push(['init'])
    },
    AppEventsLogger: {
      logEvent: (name, params) => sdkCalls.push(['event', name, params]),
      logPurchase: (amount, currency, params) => sdkCalls.push(['purchase', amount, currency, params])
    }
  };
  const validEnv = {
    EXPO_PUBLIC_META_APP_ID: '1715784240586694',
    EXPO_PUBLIC_META_CLIENT_TOKEN: 'client_token_123'
  };

  assert.equal(metaConfig(validEnv).configured, true);

  // 1. Consent denied -> does NOT initialize
  assert.equal(
    await initMeta({ canTrack: false, env: validEnv, nonPersonalised: false, platform: 'android', sdk: fakeSdk }),
    false
  );
  assert.equal(sdkCalls.length, 0);
  assert.equal(isMetaEnabled(), false);

  // 2. ADS_NON_PERSONALISED === true -> does NOT initialize even if canTrack is true
  assert.equal(
    await initMeta({ canTrack: true, env: validEnv, nonPersonalised: true, platform: 'android', sdk: fakeSdk }),
    false
  );
  assert.equal(sdkCalls.length, 0);
  assert.equal(isMetaEnabled(), false);

  // 3. iOS -> does NOT initialize
  assert.equal(
    await initMeta({ canTrack: true, env: validEnv, nonPersonalised: false, platform: 'ios', sdk: fakeSdk }),
    false
  );
  assert.equal(sdkCalls.length, 0);

  // 4. Consent granted + personalised ads allowed + both env vars on Android -> initializes
  assert.equal(
    await initMeta({ canTrack: true, env: validEnv, nonPersonalised: false, platform: 'android', sdk: fakeSdk }),
    true
  );
  assert.equal(isMetaEnabled(), true);
  assert.deepEqual(sdkCalls, [
    ['autoLog', true],
    ['adId', true],
    ['init']
  ]);

  resetMetaForTests();
});

test('event helpers send only the allowed fields and never leak personal or pet data', async () => {
  resetMetaForTests();
  const events = [];
  setMetaSinkForTests((ev) => events.push(ev));

  // Before initMeta -> no events sent
  assert.equal(logMetaRunFinished('endless', { platform: 'android' }), false);
  assert.equal(events.length, 0);

  await initMeta({
    canTrack: true,
    env: { EXPO_PUBLIC_META_APP_ID: '1715784240586694', EXPO_PUBLIC_META_CLIENT_TOKEN: 'tok' },
    nonPersonalised: false,
    platform: 'android'
  });

  assert.equal(logMetaRunFinished('chase', { platform: 'android' }), true);
  assert.equal(logMetaRunFinished('unknown_mode_with_pet_name', { platform: 'android' }), true);
  assert.equal(
    logMetaPremiumPurchased(
      { price: 59, currency: 'ZAR', productId: 'pawlingo_premium', petName: 'Buddy', installId: 'secret' },
      { platform: 'android' }
    ),
    true
  );

  assert.deepEqual(events, [
    { type: 'event', name: 'run_finished', params: { mode: 'chase' } },
    { type: 'event', name: 'run_finished', params: { mode: 'stage' } },
    {
      type: 'purchase',
      name: 'premium_purchased',
      amount: 59,
      currency: 'ZAR',
      params: { content_id: 'pawlingo_premium' }
    }
  ]);

  resetMetaForTests();
});

test('privacy policies and data-safety.md stay in sync and document the Meta SDK', () => {
  const storePrivacy = readFileSync(new URL('../store/privacy.html', import.meta.url), 'utf8');
  const serverPrivacy = readFileSync(new URL('../server/privacy.html', import.meta.url), 'utf8');
  const dataSafety = readFileSync(new URL('../store/data-safety.md', import.meta.url), 'utf8');
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));

  assert.equal(storePrivacy, serverPrivacy, 'store/privacy.html and server/privacy.html must stay identical');
  assert.ok(storePrivacy.includes('Meta (Facebook) SDK'), 'privacy.html must include the Meta (Facebook) SDK section');
  assert.ok(dataSafety.includes('Meta'), 'store/data-safety.md must document sharing with Meta');
  assert.equal(eas.build.production.env.EXPO_PUBLIC_META_APP_ID, '1715784240586694');
});
