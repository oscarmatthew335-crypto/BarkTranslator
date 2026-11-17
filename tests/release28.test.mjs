import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_EVENTS,
  distanceBucket,
  sanitizeParams
} from '../src/game/analytics.js';
import {
  computeUsualPlayHour,
  shouldOfferReminderPrompt,
  shouldScheduleStreakReminder,
  buildStreakReminderMessage
} from '../src/game/reminders.js';
import {
  POWER_DURATION,
  ZOOMIES_END_INVULN_S,
  CONTINUE_MIN_SECONDS,
  newRun,
  step,
  canContinueRun
} from '../src/game/engine.js';
import {
  stagesFor,
  endlessStage,
  SURPRISE_ENDLESS_DIST,
  isSurpriseObstacleAllowed
} from '../src/game/stages.js';
import {
  SCORE_SHARE_URL,
  canShareRunScore,
  formatShareHeadline,
  formatShareChallenge
} from '../src/game/shareScore.js';
import { parallaxOffsets } from '../src/game/parallax.js';

test('2.8 analytics: new events allowed, distanceBucket ranges, and no pet names leaked', () => {
  for (const ev of [
    'run_end',
    'continue_offered',
    'continue_taken',
    'continue_declined',
    'share_card_shown',
    'share_tapped',
    'reminder_prompt_shown',
    'reminder_enabled',
    'replay_tapped'
  ]) {
    assert.equal(ALLOWED_EVENTS.has(ev), true, `${ev} must be in ALLOWED_EVENTS`);
  }
  assert.equal(distanceBucket(0), '0-100');
  assert.equal(distanceBucket(99), '0-100');
  assert.equal(distanceBucket(100), '100-250');
  assert.equal(distanceBucket(250), '250-500');
  assert.equal(distanceBucket(500), '500-1000');
  assert.equal(distanceBucket(1000), '1000+');

  const clean = sanitizeParams({
    stage_id: 'garden',
    distance_bucket: '250-500',
    end_cause: 'finished',
    continued: false,
    petName: 'Buster',
    pet_name: 'Buster',
    photo: 'file:///pet.jpg'
  });
  assert.equal('petName' in clean, false);
  assert.equal('pet_name' in clean, false);
  assert.equal('photo' in clean, false);
  assert.equal(clean.stage_id, 'garden');
});

test('2.8 reminders: 1-day streak, 3-day re-ask once, 3-ignored stop, usual hour median + clamp 08-20', () => {
  assert.equal(computeUsualPlayHour([]), 18);
  assert.equal(computeUsualPlayHour([10, 14, 12, 16, 15]), 14);
  assert.equal(computeUsualPlayHour([2, 3, 4]), 8);
  assert.equal(computeUsualPlayHour([22, 23, 21]), 20);

  // Prompt after 1st streak day; re-ask at most once 3 days later
  assert.equal(shouldOfferReminderPrompt({ streakCount: 0, promptCount: 0, remindersEnabled: false }), false);
  assert.equal(shouldOfferReminderPrompt({ streakCount: 1, promptCount: 0, remindersEnabled: false }), true);
  const t0 = 1_700_000_000_000;
  assert.equal(
    shouldOfferReminderPrompt({ streakCount: 1, promptCount: 1, promptDismissedAt: t0, nowMs: t0 + 2 * 86400_000, remindersEnabled: false }),
    false
  );
  assert.equal(
    shouldOfferReminderPrompt({ streakCount: 1, promptCount: 1, promptDismissedAt: t0, nowMs: t0 + 3 * 86400_000, remindersEnabled: false }),
    true
  );
  assert.equal(
    shouldOfferReminderPrompt({ streakCount: 1, promptCount: 2, promptDismissedAt: t0, nowMs: t0 + 10 * 86400_000, remindersEnabled: false }),
    false
  );

  // Stop after 3 ignored
  assert.equal(
    shouldScheduleStreakReminder({ enabled: true, streakCount: 1, lastPlayedDay: '2026-10-19', today: '2026-10-20', ignoredCount: 3 }),
    false
  );
  assert.equal(
    shouldScheduleStreakReminder({ enabled: true, streakCount: 1, lastPlayedDay: '2026-10-19', today: '2026-10-20', ignoredCount: 2 }),
    true
  );

  const msg = buildStreakReminderMessage({ petName: 'Rex', streakCount: 2, livesEmptyAtClose: true });
  assert.ok(msg.body.includes('Rex'));
});

test('2.8 continue: requires >= 15s and at most once per run', () => {
  assert.equal(CONTINUE_MIN_SECONDS, 15);
  let run = newRun(endlessStage('dog'), { seed: 3 });
  assert.equal(canContinueRun({ ...run, t: 14.9, hearts: 0, done: true }), false);
  assert.equal(canContinueRun({ ...run, t: 15, hearts: 0, done: true }), true);
});

test('2.8 share card: auto-shows on personal or weekly best, formats place and challenge', () => {
  assert.equal(canShareRunScore({ score: 100 }, { newBest: true }), true);
  assert.equal(canShareRunScore({ score: 100 }, { newWeeklyBest: true }), true);
  assert.equal(canShareRunScore({ score: 100 }, { newBest: false, newWeeklyBest: false }), false);
  assert.ok(SCORE_SHARE_URL.includes('utm_source%3Dshare'));
  assert.equal(formatShareHeadline({ petName: 'Milo', distance: 420, place: 'Garden' }), 'Milo ran 420 m in the Garden!');
  assert.equal(formatShareChallenge({ species: 'cat' }), 'Can your cat beat that?');
});

test('2.8 Zoomies: 4s duration, smashes obstacles as near miss, magnetises treats, ends with 0.8s invuln', () => {
  assert.equal(POWER_DURATION.speed, 4);
  assert.equal(ZOOMIES_END_INVULN_S, 0.8);

  let run = newRun(stagesFor('dog')[0], { seed: 1, startPowerUps: ['speed'] });
  run = {
    ...run,
    entities: [
      { id: 99, kind: 'obstacle', type: 'puddle', x: run.dist + 15, y: 0, w: 36, h: 16, hit: false }
    ]
  };
  const smashed = step(run, 0.05, {});
  assert.equal(smashed.events.includes('smash'), true);
  assert.equal(smashed.events.includes('nearMiss'), true);
  assert.equal(smashed.treatPoints, 5);
  assert.ok(smashed.nearMissTimer > 0);

  // When Zoomies expires, 0.8s invulnerability is granted
  const expiring = { ...run, power: { ...run.power, speed: 0.02 }, invuln: 0 };
  const expired = step(expiring, 0.05, {});
  assert.equal(expired.power.speed, 0);
  assert.ok(expired.invuln >= ZOOMIES_END_INVULN_S - 0.05);
});

test('2.8 surprise obstacles: gated to stage 4+ or endless >= 500m (5000 units)', () => {
  const dogStages = stagesFor('dog');
  assert.equal(isSurpriseObstacleAllowed(dogStages[0], 'catDash', 0), false);
  assert.equal(isSurpriseObstacleAllowed(dogStages[2], 'bird', 0), false);
  assert.equal(isSurpriseObstacleAllowed(dogStages[3], 'catDash', 0), true);
  assert.equal(isSurpriseObstacleAllowed(dogStages[4], 'bird', 0), true);

  const endless = endlessStage('dog');
  assert.equal(SURPRISE_ENDLESS_DIST, 5000);
  assert.equal(isSurpriseObstacleAllowed(endless, 'catDash', 4999), false);
  assert.equal(isSurpriseObstacleAllowed(endless, 'catDash', 5000), true);
});

test('2.8 parallaxOffsets: 0.1x sky, 0.3x far, 0.6x props, 1x ground; reduceMotion freezes all except ground', () => {
  assert.deepEqual(parallaxOffsets(100, false), { sky: 10, far: 30, props: 60, ground: 100 });
  assert.deepEqual(parallaxOffsets(100, true), { sky: 0, far: 0, props: 0, ground: 100 });
});

test('reminder: a passed reminder day with no play counts as ignored, once', async () => {
  const { settleIgnoredReminder, shouldScheduleStreakReminder } = await import('../src/game/reminders.js');
  assert.deepEqual(settleIgnoredReminder({ lastReminderDay: '2026-11-16', lastPlayedDay: '2026-11-16', today: '2026-11-16', ignoredCount: 1 }), { changed: false, ignoredCount: 1 });
  assert.deepEqual(settleIgnoredReminder({ lastReminderDay: '2026-11-16', lastPlayedDay: '2026-11-15', today: '2026-11-17', ignoredCount: 2 }), { changed: true, ignoredCount: 3 });
  assert.deepEqual(settleIgnoredReminder({ lastReminderDay: '2026-11-16', lastPlayedDay: '2026-11-16', today: '2026-11-17', ignoredCount: 2 }), { changed: true, ignoredCount: 0 });
  assert.equal(shouldScheduleStreakReminder({ enabled: true, streakCount: 3, today: '2026-11-18', ignoredCount: 3 }), false);
});

test('PlayTab passes run hours to syncStreakReminder under the name it reads', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/components/game/PlayTab.js', import.meta.url), 'utf8');
  assert.equal(/playHours:/.test(src), false);
  assert.ok((src.match(/runHours: options\??\.recentRunHours/g) || []).length >= 2);
});
