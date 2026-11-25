import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GIFT_LADDER,
  emptyGiftState,
  giftForDay,
  giftStatus,
  claimDailyGift,
  upcomingGiftForDay
} from '../src/game/dailyGift.js';
import {
  emptyGameState,
  emptyPetGame,
  saveGame,
  loadGame,
  petGame
} from '../src/game/gameStore.js';
import {
  shouldOfferReminderPrompt,
  shouldScheduleStreakReminder,
  settleIgnoredReminder,
  buildStreakReminderMessage,
  requestReminderPermission,
  syncStreakReminder
} from '../src/game/reminders.js';
import {
  ALLOWED_EVENTS,
  initAnalytics,
  track,
  setAnalyticsSinkForTests,
  resetAnalyticsForTests
} from '../src/game/analytics.js';
import * as Notifications from 'expo-notifications';

test('daily gift ladder: Day 1 -> 7 rewards then wraps back to Day 1', () => {
  assert.deepEqual(
    GIFT_LADDER.map((g) => [g.day, g.treats, g.extraSavers]),
    [
      [1, 10, 0],
      [2, 15, 0],
      [3, 20, 0],
      [4, 25, 0],
      [5, 30, 0],
      [6, 40, 0],
      [7, 100, 1]
    ]
  );

  let gift = emptyGiftState();
  const expectedTreats = [10, 15, 20, 25, 30, 40, 100, 10];
  const days = [
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
    '2026-11-07',
    '2026-11-08'
  ];

  for (let i = 0; i < days.length; i++) {
    const res = claimDailyGift(gift, days[i]);
    assert.equal(res.claimed, true);
    assert.equal(res.day, i === 7 ? 1 : i + 1);
    assert.equal(res.treats, expectedTreats[i]);
    assert.equal(res.extraSavers, i === 6 ? 1 : 0);
    assert.equal(res.afterGap, false);
    gift = res.gift;
  }
});

test('daily gift gap rules: missing 1 day keeps place; missing 2+ days resets to day 1', () => {
  const afterDay3 = { day: 3, lastClaimedDay: '2026-11-10' };

  // Missed 2026-11-11 (1 missing day -> gap = 2) -> Day 4 with afterGap = true
  const oneMissing = claimDailyGift(afterDay3, '2026-11-12');
  assert.equal(oneMissing.claimed, true);
  assert.equal(oneMissing.day, 4);
  assert.equal(oneMissing.treats, 25);
  assert.equal(oneMissing.afterGap, true);

  // Missed 2026-11-11 and 2026-11-12 (2 missing days -> gap = 3) -> resets to Day 1
  const twoMissing = claimDailyGift(afterDay3, '2026-11-13');
  assert.equal(twoMissing.claimed, true);
  assert.equal(twoMissing.day, 1);
  assert.equal(twoMissing.treats, 10);
  assert.equal(twoMissing.afterGap, true);
});

test('daily gift clock & duplicate guards: same day twice and earlier day key give no gift', () => {
  const first = claimDailyGift(emptyGiftState(), '2026-11-10');
  assert.equal(first.claimed, true);
  assert.equal(first.treats, 10);

  // Same day again
  const second = claimDailyGift(first.gift, '2026-11-10');
  assert.equal(second.claimed, false);
  assert.equal(second.treats, 0);
  assert.deepEqual(second.gift, first.gift);

  // Phone clock set backwards
  const earlier = claimDailyGift(first.gift, '2026-11-09');
  assert.equal(earlier.claimed, false);
  assert.equal(earlier.treats, 0);
  assert.deepEqual(earlier.gift, first.gift);
});

test('daily gift store: top-level ladder per phone credits active pet bank and Day 7 adds a streak saver', async () => {
  const petA = { id: 'pet-a', species: 'dog', name: 'Rex' };
  const petB = { id: 'pet-b', species: 'cat', name: 'Mittens' };
  let state = {
    ...emptyGameState(),
    pets: {
      [petA.id]: { ...emptyPetGame(petA), bank: 5 },
      [petB.id]: { ...emptyPetGame(petB), bank: 12 }
    }
  };

  // Claim day 1 for petA, then switch to petB for day 7
  const d1 = claimDailyGift(state.gift, '2026-11-01');
  state = {
    ...state,
    gift: d1.gift,
    pets: {
      ...state.pets,
      [petA.id]: { ...state.pets[petA.id], bank: state.pets[petA.id].bank + d1.treats }
    }
  };

  // Advance ladder state to day 6 claimed, then claim day 7 while petB is active
  state.gift = { day: 6, lastClaimedDay: '2026-11-06' };
  const d7 = claimDailyGift(state.gift, '2026-11-07');
  assert.equal(d7.day, 7);
  assert.equal(d7.treats, 100);
  assert.equal(d7.extraSavers, 1);

  state = {
    ...state,
    gift: d7.gift,
    extraSavers: state.extraSavers + d7.extraSavers,
    pets: {
      ...state.pets,
      [petB.id]: { ...state.pets[petB.id], bank: state.pets[petB.id].bank + d7.treats }
    }
  };

  await saveGame(state);
  const reloaded = await loadGame();
  assert.equal(reloaded.gift.day, 7);
  assert.equal(reloaded.gift.lastClaimedDay, '2026-11-07');
  assert.equal(reloaded.extraSavers, 1);
  assert.equal(petGame(reloaded, petA).bank, 15);
  assert.equal(petGame(reloaded, petB).bank, 112);
});

test('reminder prompt timing: after first gift, at most twice, second offer after 3 days, and existing users once', () => {
  const t0 = 1_700_000_000_000;
  // Before collecting any gift (and 0 streak), do not offer
  assert.equal(shouldOfferReminderPrompt({ giftClaimed: false, streakCount: 0 }), false);

  // Immediately after first gift collection -> offer
  assert.equal(shouldOfferReminderPrompt({ giftClaimed: true, promptCount: 0, remindersEnabled: false }), true);

  // Dismissed ("Not now"): promptCount = 1, giftPromptV1 = true -> wait 3 days
  assert.equal(
    shouldOfferReminderPrompt({
      giftClaimed: true,
      giftPromptV1: true,
      promptShown: true,
      promptCount: 1,
      promptDismissedAt: t0,
      nowMs: t0 + 2 * 86400_000,
      remindersEnabled: false
    }),
    false
  );
  assert.equal(
    shouldOfferReminderPrompt({
      giftClaimed: true,
      giftPromptV1: true,
      promptShown: true,
      promptCount: 1,
      promptDismissedAt: t0,
      nowMs: t0 + 3 * 86400_000,
      remindersEnabled: false
    }),
    true
  );

  // Dismissed a second time -> never offer again
  assert.equal(
    shouldOfferReminderPrompt({
      giftClaimed: true,
      giftPromptV1: true,
      promptShown: true,
      promptCount: 2,
      promptDismissedAt: t0,
      nowMs: t0 + 30 * 86400_000,
      remindersEnabled: false
    }),
    false
  );

  // Existing player from before gift update who already exhausted old prompts -> 1 new offer
  assert.equal(
    shouldOfferReminderPrompt({
      giftClaimed: true,
      giftPromptV1: false,
      promptShown: true,
      promptCount: 2,
      promptDismissedAt: t0,
      nowMs: t0 + 30 * 86400_000,
      remindersEnabled: false
    }),
    true
  );
});

test('refused reminder permission keeps reminders off and does not track reminder_enabled', async () => {
  for (const ev of ['gift_shown', 'gift_claimed', 'reminder_permission', 'notification_opened']) {
    assert.equal(ALLOWED_EVENTS.has(ev), true, ev);
  }

  Notifications.__resetNotificationsForTests('denied');
  resetAnalyticsForTests();
  const logged = [];
  setAnalyticsSinkForTests((name, params) => logged.push({ name, params }));
  await initAnalytics({ canTrack: true, platform: 'android' });

  const granted = await requestReminderPermission();
  assert.equal(granted, false);
  await track('reminder_permission', { granted }, { platform: 'android' });
  if (granted) {
    await track('reminder_enabled', { hour: 18 }, { platform: 'android' });
  }

  const sched = await syncStreakReminder({
    enabled: granted,
    gift: { day: 1, lastClaimedDay: '2026-11-25' },
    today: '2026-11-25',
    nowMs: Date.parse('2026-11-25T10:00:00Z')
  });
  assert.equal(sched.scheduled, false);
  assert.deepEqual(logged, [{ name: 'reminder_permission', params: { granted: 0 } }]);
  assert.equal(logged.some((e) => e.name === 'reminder_enabled'), false);

  Notifications.__resetNotificationsForTests('granted');
  resetAnalyticsForTests();
});

test('reminder messages show the real amount, day, day 6/7 copy, and streak suffix', () => {
  const m1a = buildStreakReminderMessage({
    petName: 'Bolt',
    gift: giftForDay(2),
    species: 'dog',
    streakCount: 0,
    rotationIndex: 0
  });
  assert.ok(m1a.body.includes('day 2 gift'));
  assert.ok(m1a.body.includes('15'));
  assert.ok(m1a.body.includes('🦴'));
  assert.equal(m1a.body.includes('streak 🔥'), false);

  const m1b = buildStreakReminderMessage({
    petName: 'Mittens',
    gift: giftForDay(3),
    species: 'cat',
    streakCount: 4,
    rotationIndex: 1
  });
  assert.ok(m1b.body.includes('Mittens saved you 20 🐟'));
  assert.ok(m1b.body.includes('4-day streak 🔥'));

  const m6 = buildStreakReminderMessage({ petName: 'Bolt', gift: giftForDay(6), species: 'dog' });
  assert.ok(m6.body.includes('One more day'));
  assert.ok(m6.body.includes('100 🦴'));

  const m7 = buildStreakReminderMessage({ petName: 'Bolt', gift: giftForDay(7), species: 'dog' });
  assert.ok(m7.body.includes('100 🦴'));
  assert.ok(m7.body.includes('streak saver'));
});

test('nothing is scheduled on a day already collected, and collecting resets ignored count', async () => {
  assert.equal(
    shouldScheduleStreakReminder({
      enabled: true,
      hasGift: true,
      giftClaimedDay: '2026-11-25',
      today: '2026-11-25',
      ignoredCount: 0
    }),
    false
  );

  // When gift is already claimed today ('2026-11-25'), sync schedules tomorrow ('2026-11-26') with Day 2 (15)
  Notifications.__resetNotificationsForTests('granted');
  const morningToday = new Date(2026, 10, 25, 10, 0, 0).getTime();
  const res = await syncStreakReminder({
    enabled: true,
    gift: { day: 1, lastClaimedDay: '2026-11-25' },
    species: 'dog',
    today: '2026-11-25',
    petName: 'Rex',
    nowMs: morningToday,
    ignoredCount: 0
  });
  assert.equal(res.scheduled, true);
  assert.equal(res.scheduledForDay, '2026-11-26');
  const scheduled = Notifications.__getScheduledForTests();
  assert.equal(scheduled.length, 1);
  assert.ok(scheduled[0].content.body.includes('15 🦴'));

  // Upcoming gift calculation and ignored reset when a gift is claimed
  assert.equal(upcomingGiftForDay({ day: 1, lastClaimedDay: '2026-11-25' }, '2026-11-25').claimedToday, true);
  assert.equal(upcomingGiftForDay({ day: 1, lastClaimedDay: '2026-11-25' }, '2026-11-26').day, 2);
  assert.deepEqual(
    settleIgnoredReminder({
      lastReminderDay: '2026-11-24',
      lastPlayedDay: '2026-11-20',
      lastGiftClaimedDay: '2026-11-24',
      today: '2026-11-25',
      ignoredCount: 2
    }),
    { changed: true, ignoredCount: 0 }
  );
});
