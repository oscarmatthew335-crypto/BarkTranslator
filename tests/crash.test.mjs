import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reportError,
  installCrashReporting,
  configureCrashReporting,
  resetCrashReporter,
  scrubPersonalData,
  MAX_PER_SESSION
} from '../src/crash.js';

test('crash reporter sends appVersion and platform, scrubs personal data, deduplicates and rate-limits', async () => {
  await resetCrashReporter();
  const calls = [];
  configureCrashReporting({
    api: 'https://pawlingo.example',
    key: 'test-key',
    fetchImpl: async (url, opts) => {
      calls.push({ url, opts, body: JSON.parse(opts.body) });
      return { ok: true, status: 201 };
    }
  });

  // 1) Scrubs emails, user paths and long ID/card numbers
  const err = new Error('Failed for owner@example.com at C:\\Users\\omatt\\secret\\file.js with ID 8501015009087');
  err.stack = 'at render (/Users/alice/app/App.js:12:4)';
  const sent = await reportError(err, { fatal: true, where: 'render' });
  assert.equal(sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://pawlingo.example/errors');
  assert.equal(calls[0].opts.headers['X-App-Key'], 'test-key');
  assert.match(calls[0].opts.headers['X-Install-Id'], /^[0-9a-f]{32}$/);
  assert.equal(calls[0].body.platform, 'android');
  assert.equal(calls[0].body.appVersion, '2.4.0');
  assert.equal(calls[0].body.fatal, true);
  assert.equal(calls[0].body.where, 'render');
  assert.ok(!calls[0].body.message.includes('owner@example.com'));
  assert.ok(!calls[0].body.message.includes('omatt'));
  assert.ok(!calls[0].body.message.includes('8501015009087'));
  assert.ok(!calls[0].body.stack.includes('alice'));

  // 2) Duplicate error with the same signature is dropped
  assert.equal(await reportError(err, { fatal: true, where: 'render' }), false);
  assert.equal(calls.length, 1);

  // 3) Rate-limited to MAX_PER_SESSION (8) distinct errors per session
  for (let i = 0; i < MAX_PER_SESSION + 4; i++) {
    await reportError(new Error(`Distinct error #${i}`), { where: 'loop' });
  }
  assert.equal(calls.length, MAX_PER_SESSION);
});

test('installCrashReporting hooks global ErrorUtils and forwards to previous handler', async () => {
  await resetCrashReporter();
  const calls = [];
  let prevCalled = null;
  configureCrashReporting({
    api: 'https://pawlingo.example',
    key: 'k',
    fetchImpl: async (url, opts) => {
      calls.push(JSON.parse(opts.body));
      return { ok: true, status: 201 };
    }
  });

  let registered = null;
  globalThis.ErrorUtils = {
    getGlobalHandler: () => (e, fatal) => {
      prevCalled = { msg: e.message, fatal };
    },
    setGlobalHandler: (fn) => {
      registered = fn;
    }
  };

  installCrashReporting({ force: true });
  assert.equal(typeof registered, 'function');
  registered(new Error('Boom in global handler'), true);
  await new Promise((r) => setTimeout(r, 30));

  assert.deepEqual(prevCalled, { msg: 'Boom in global handler', fatal: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].where, 'global');
  assert.equal(calls[0].fatal, true);
  assert.equal( scrubPersonalData('test@domain.co.za'), '[email]');
});
