import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { adUnitIds, TEST_REWARDED_ID } from '../src/game/ads.js';
import {
  DOUBLE_TREATS_MIN,
  DOUBLE_TREATS_DAILY_CAP,
  emptyDoubleTreatsState,
  canOfferDoubleTreats,
  recordDoubleTreats
} from '../src/game/doubleTreats.js';
import {
  PREMIUM_PRODUCT_ID,
  PREMIUM_BONUS_TREATS,
  STARTER_PACK_ID,
  STARTER_PACK_TRIGGER_RUN,
  STARTER_PACK_WINDOW_MS,
  TREAT_PACKS,
  STARTER_PACK,
  grantConsumableOnce,
  shouldTriggerStarterOffer,
  isStarterPackVisible,
  starterPackStrikethrough
} from '../src/game/storeItems.js';
import { firstDayRemainingMs, formatHoursLeft, FIRST_DAY_UNLIMITED_MS } from '../src/game/lives.js';
import { updateStreak, emptyStreak } from '../src/game/daily.js';
import { ITEMS } from '../src/game/wardrobe.js';

test('EXPO_PUBLIC_ADMOB_REWARDED_DOUBLE is read literally and falls back to rewardedLife', () => {
  const src = readFileSync(new URL('../src/game/ads.js', import.meta.url), 'utf8');
  assert.ok(src.includes('process.env.EXPO_PUBLIC_ADMOB_REWARDED_DOUBLE'));

  assert.equal(adUnitIds({}).rewardedDouble, TEST_REWARDED_ID);
  assert.equal(
    adUnitIds({ EXPO_PUBLIC_ADMOB_REWARDED_LIFE: 'life-unit' }).rewardedDouble,
    'life-unit'
  );
  assert.equal(
    adUnitIds({
      EXPO_PUBLIC_ADMOB_REWARDED_LIFE: 'life-unit',
      EXPO_PUBLIC_ADMOB_REWARDED_DOUBLE: 'double-unit'
    }).rewardedDouble,
    'double-unit'
  );
});

test('double treats offer requires >= 10 treats, caps at 3 per day, and never claims twice per run', () => {
  assert.equal(DOUBLE_TREATS_MIN, 10);
  assert.equal(DOUBLE_TREATS_DAILY_CAP, 3);
  const today = '2026-11-13';
  let st = emptyDoubleTreatsState();

  assert.equal(canOfferDoubleTreats({ treats: 9 }, st, today), false);
  assert.equal(canOfferDoubleTreats({ treats: 10 }, st, today), true);
  assert.equal(canOfferDoubleTreats({ treats: 15 }, st, today, { alreadyClaimed: true }), false);

  st = recordDoubleTreats(st, today);
  st = recordDoubleTreats(st, today);
  assert.equal(canOfferDoubleTreats({ treats: 12 }, st, today), true);
  st = recordDoubleTreats(st, today);
  assert.equal(st.count, 3);
  assert.equal(canOfferDoubleTreats({ treats: 12 }, st, today), false);

  // Next day resets the cap
  assert.equal(canOfferDoubleTreats({ treats: 12 }, st, '2026-11-14'), true);
});

test('treat pack consumable granting is idempotent by purchase token', () => {
  assert.equal(TREAT_PACKS.length, 3);
  assert.deepEqual(
    TREAT_PACKS.map((p) => [p.id, p.treats]),
    [
      ['treats_small', 300],
      ['treats_medium', 800],
      ['treats_large', 2000]
    ]
  );

  let tokens = [];
  let out = grantConsumableOnce(tokens, 'tok-1', 300);
  assert.equal(out.granted, 300);
  tokens = out.tokens;

  // Re-delivering the same token grants 0
  out = grantConsumableOnce(tokens, 'tok-1', 300);
  assert.equal(out.granted, 0);

  // Different token grants again
  out = grantConsumableOnce(tokens, 'tok-2', 800);
  assert.equal(out.granted, 800);
});

test('starter pack triggers on 3rd run, is visible for 48 hours, and strike-through only shows when strictly higher', () => {
  assert.equal(STARTER_PACK_ID, 'starter_pack');
  assert.equal(STARTER_PACK_TRIGGER_RUN, 3);
  assert.equal(STARTER_PACK.treats, 500);
  assert.equal(STARTER_PACK.itemId, 'hat-crown');
  assert.equal(STARTER_PACK.extraSavers, 3);
  assert.equal(PREMIUM_PRODUCT_ID, 'pawlingo_premium');
  assert.equal(PREMIUM_BONUS_TREATS, 500);

  const t0 = 1_700_000_000_000;
  let store = { starterOfferedAt: null, starterBought: false };
  assert.equal(shouldTriggerStarterOffer(store, 2), false);
  assert.equal(shouldTriggerStarterOffer(store, 3), true);

  store = { starterOfferedAt: t0, starterBought: false };
  assert.equal(isStarterPackVisible(store, t0), true);
  assert.equal(isStarterPackVisible(store, t0 + STARTER_PACK_WINDOW_MS - 1000), true);
  assert.equal(isStarterPackVisible(store, t0 + STARTER_PACK_WINDOW_MS), false, 'disappears after 48h');
  assert.equal(isStarterPackVisible({ starterOfferedAt: t0, starterBought: true }, t0 + 1000), false);

  // Strike-through math
  assert.equal(
    starterPackStrikethrough({
      treats_small: { price: 18, currency: 'ZAR', displayPrice: 'R18.00' },
      treats_medium: { price: 42, currency: 'ZAR', displayPrice: 'R42.00' },
      starter_pack: { price: 19, currency: 'ZAR', displayPrice: 'R19.00' }
    }),
    'R27.27'
  );
  // If starter pack costs >= calculated normal value, omit strike-through
  assert.equal(
    starterPackStrikethrough({
      treats_small: { price: 18, currency: 'ZAR', displayPrice: 'R18.00' },
      treats_medium: { price: 42, currency: 'ZAR', displayPrice: 'R42.00' },
      starter_pack: { price: 30, currency: 'ZAR', displayPrice: 'R30.00' }
    }),
    null
  );
  // Missing prices -> null
  assert.equal(starterPackStrikethrough({}), null);
});

test('first-24h countdown badge helpers, extra streak savers, and expanded wardrobe items', () => {
  const t0 = 1_700_000_000_000;
  const lives = { firstSeenAt: t0 };
  assert.equal(firstDayRemainingMs(lives, t0 + 2 * 60 * 60 * 1000), FIRST_DAY_UNLIMITED_MS - 2 * 60 * 60 * 1000);
  assert.equal(formatHoursLeft(22 * 60 * 60 * 1000), '22h');
  assert.equal(formatHoursLeft(95 * 60 * 1000), '1h 35m');

  // Extra savers from Starter Pack save a streak even if the weekly free saver was used
  let s = updateStreak(emptyStreak(), '2026-10-19').streak;
  s = updateStreak(s, '2026-10-21').streak; // used weekly saver on 2026-10-20
  const savedWithExtra = updateStreak(s, '2026-10-23', { extraSavers: 2 });
  assert.equal(savedWithExtra.event, 'saved');
  assert.equal(savedWithExtra.usedExtraSaver, true);
  assert.equal(savedWithExtra.streak.count, 3);

  // Expanded wardrobe includes 12 new items up to 600 treats
  const rare = ITEMS.filter((i) => i.rare);
  assert.ok(rare.length >= 4);
  assert.ok(ITEMS.some((i) => i.price === 600));
});
