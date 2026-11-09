import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_LIVES,
  REFILL_MS,
  FIRST_DAY_UNLIMITED_MS,
  emptyLives,
  isUnlimitedFirstDay,
  livesNow,
  canStartRun,
  useLife,
  addLife,
  formatWait
} from '../src/game/lives.js';
import {
  INTERSTITIAL_RULES,
  emptyInterstitialState,
  recordRunForInterstitial,
  shouldShowInterstitial,
  recordInterstitialShown
} from '../src/game/interstitial.js';
import {
  CHASE_CONTINUE_GAP,
  HIT_INVULN_S,
  newRun,
  canContinueRun,
  continueRun,
  resultOf
} from '../src/game/engine.js';
import { endlessStage, chaseStage, stagesFor } from '../src/game/stages.js';
import { emptyCounters, count, loadCounters, resetCounters } from '../src/game/counters.js';
import { PREMIUM_PRODUCT_ID, isPremiumPurchase, isPendingPurchase } from '../src/game/purchases.js';
import { ADS_NON_PERSONALISED, AD_CONTENT_RATING, adUnitIds, adRequestOptions } from '../src/game/ads.js';

test('lives: first 24 hours are unlimited, then refills 1 life every 20 minutes up to 5', () => {
  const t0 = 1_700_000_000_000;
  let state = emptyLives(t0);

  // Within first 24 hours: unlimited lives, using a life does not reduce lives
  assert.equal(isUnlimitedFirstDay(state, t0 + 1000), true);
  let info = livesNow(state, t0 + 60_000);
  assert.equal(info.unlimited, true);
  assert.equal(info.lives, MAX_LIVES);
  state = useLife(state, t0 + 60_000);
  assert.equal(livesNow(state, t0 + 120_000).lives, MAX_LIVES);

  // After 24 hours: lives are consumed and refilled every 20m
  const afterDay = t0 + FIRST_DAY_UNLIMITED_MS + 1000;
  assert.equal(isUnlimitedFirstDay(state, afterDay), false);
  state = useLife(state, afterDay);
  info = livesNow(state, afterDay);
  assert.equal(info.unlimited, false);
  assert.equal(info.lives, 4);
  assert.equal(info.msUntilNext, REFILL_MS);

  // Spend remaining 4 lives
  for (let i = 0; i < 4; i++) {
    state = useLife(state, afterDay + 1000);
  }
  info = livesNow(state, afterDay + 1000);
  assert.equal(info.lives, 0);
  assert.equal(canStartRun(state, afterDay + 1000), false);

  // 19 minutes later: still 0 lives
  info = livesNow(state, afterDay + 19 * 60 * 1000);
  assert.equal(info.lives, 0);
  assert.equal(formatWait(info.msUntilNext), '01:00');

  // 20 minutes later: 1 life refilled
  info = livesNow(state, afterDay + REFILL_MS);
  assert.equal(info.lives, 1);
  assert.equal(canStartRun(state, afterDay + REFILL_MS), true);

  // 45 minutes later: 2 lives refilled, 15m until next
  info = livesNow(state, afterDay + 45 * 60 * 1000);
  assert.equal(info.lives, 2);
  assert.equal(formatWait(info.msUntilNext), '15:00');

  // 100+ minutes later: capped at 5 lives, refillFrom cleared
  info = livesNow(state, afterDay + 5 * REFILL_MS);
  assert.equal(info.lives, MAX_LIVES);
  assert.equal(info.msUntilNext, 0);
  assert.equal(info.state.refillFrom, null);
});

test('lives: handles phone clock moving backwards without getting stuck, and addLife / premium', () => {
  const t0 = 1_700_000_000_000;
  const afterDay = t0 + FIRST_DAY_UNLIMITED_MS + 6 * 60 * 60 * 1000;
  let state = emptyLives(t0);
  state = useLife(state, afterDay);
  state = useLife(state, afterDay);
  assert.equal(livesNow(state, afterDay).lives, 3);

  // Phone clock moves backwards by 3 hours (still after first day)
  const backwards = afterDay - 3 * 60 * 60 * 1000;
  const infoBack = livesNow(state, backwards);
  assert.equal(infoBack.lives, 3);
  // Wait time must never exceed REFILL_MS (20 minutes) even when clock moved back
  assert.ok(infoBack.msUntilNext <= REFILL_MS);

  // Rewarded ad adds +1 life
  state = addLife(state, afterDay, 1);
  assert.equal(livesNow(state, afterDay).lives, 4);

  // Premium always gives unlimited lives
  const premInfo = livesNow({ ...state, lives: 0 }, afterDay, { premium: true });
  assert.equal(premInfo.unlimited, true);
  assert.equal(premInfo.lives, MAX_LIVES);
  assert.equal(canStartRun({ ...state, lives: 0 }, afterDay, { premium: true }), true);
});

test('continueRun: restores 1 heart in Endless or 40 gap in Chase once per run with invulnerability', () => {
  // Endless run out of hearts
  let endless = newRun(endlessStage('dog'), { seed: 7 });
  endless = { ...endless, hearts: 0, done: true };
  assert.equal(canContinueRun(endless), true);

  const continuedEndless = continueRun(endless);
  assert.equal(continuedEndless.done, false);
  assert.equal(continuedEndless.hearts, 1);
  assert.equal(continuedEndless.invuln, HIT_INVULN_S);
  assert.equal(continuedEndless.continued, true);
  // Cannot continue a second time in the same run
  assert.equal(canContinueRun({ ...continuedEndless, hearts: 0, done: true }), false);
  assert.equal(resultOf(continuedEndless).continued, true);

  // Chase run caught
  let chase = newRun(chaseStage('cat'), { seed: 9 });
  chase = { ...chase, chaseGap: 0, caught: true, done: true };
  assert.equal(canContinueRun(chase), true);

  const continuedChase = continueRun(chase);
  assert.equal(continuedChase.done, false);
  assert.equal(continuedChase.caught, false);
  assert.equal(continuedChase.chaseGap, CHASE_CONTINUE_GAP);
  assert.equal(continuedChase.invuln, HIT_INVULN_S);
  assert.equal(continuedChase.continued, true);
  assert.equal(canContinueRun({ ...continuedChase, chaseGap: 0, caught: true, done: true }), false);

  // Normal stage cannot continue
  const stageRun = { ...newRun(stagesFor('dog')[0], { seed: 1 }), hearts: 0, done: true };
  assert.equal(canContinueRun(stageRun), false);
});

test('interstitial frequency rules: every 3rd run, >= 3m apart, never in first 5 runs, never on newBest, never for Premium or stages', () => {
  const t0 = 1_700_000_000_000;
  let state = emptyInterstitialState();

  // Runs 1..5: never shown even when runsSinceLast >= 3
  for (let i = 1; i <= INTERSTITIAL_RULES.minLifetimeRuns; i++) {
    state = recordRunForInterstitial(state, { mode: 'endless' });
    assert.equal(
      shouldShowInterstitial({ ...state, mode: 'endless', newBest: false, premium: false }, t0 + i * 60_000),
      false,
      `should not show on lifetime run #${i}`
    );
  }

  // Run 6 (totalRuns = 6, runsSinceLast = 6): eligible!
  state = recordRunForInterstitial(state, { mode: 'chase' });
  assert.equal(state.totalRuns, 6);
  assert.equal(shouldShowInterstitial({ ...state, mode: 'chase', newBest: false, premium: false }, t0), true);

  // Never right after a new best
  assert.equal(shouldShowInterstitial({ ...state, mode: 'chase', newBest: true, premium: false }, t0), false);

  // Never for Premium
  assert.equal(shouldShowInterstitial({ ...state, mode: 'chase', newBest: false, premium: true }, t0), false);

  // Never after a stage or daily run
  assert.equal(shouldShowInterstitial({ ...state, mode: 'stage', newBest: false, premium: false }, t0), false);
  assert.equal(shouldShowInterstitial({ ...state, mode: 'daily', newBest: false, premium: false }, t0), false);

  // Record shown at t0
  state = recordInterstitialShown(state, t0);
  assert.equal(state.runsSinceLast, 0);
  assert.equal(state.lastShownAt, t0);

  // Next 2 runs: runsSinceLast < 3 -> false
  state = recordRunForInterstitial(state, { mode: 'endless' });
  assert.equal(shouldShowInterstitial({ ...state, mode: 'endless' }, t0 + 10 * 60_000), false);
  state = recordRunForInterstitial(state, { mode: 'endless' });
  assert.equal(shouldShowInterstitial({ ...state, mode: 'endless' }, t0 + 10 * 60_000), false);

  // 3rd run since last, but only 2 minutes elapsed (< 3 minutes) -> false
  state = recordRunForInterstitial(state, { mode: 'endless' });
  assert.equal(state.runsSinceLast, 3);
  assert.equal(shouldShowInterstitial({ ...state, mode: 'endless' }, t0 + 2 * 60_000), false);

  // 3 minutes elapsed -> true
  assert.equal(shouldShowInterstitial({ ...state, mode: 'endless' }, t0 + INTERSTITIAL_RULES.minIntervalMs), true);
});

test('purchases and ads config helpers + new counters', async () => {
  assert.equal(PREMIUM_PRODUCT_ID, 'pawlingo_premium');
  assert.equal(isPremiumPurchase({ productId: 'pawlingo_premium', purchaseState: 'purchased' }), true);
  assert.equal(isPremiumPurchase({ ids: ['pawlingo_premium'], purchaseState: 'purchased' }), true);
  assert.equal(isPremiumPurchase({ productId: 'pawlingo_premium', purchaseState: 'pending' }), false);
  assert.equal(isPendingPurchase({ productId: 'pawlingo_premium', purchaseState: 'pending' }), true);

  assert.equal(ADS_NON_PERSONALISED, false);
  assert.equal(AD_CONTENT_RATING, 'PG');
  assert.deepEqual(adRequestOptions(true), { requestNonPersonalizedAdsOnly: true });
  const ids = adUnitIds({});
  assert.ok(ids.rewardedLife.startsWith('ca-app-pub-3940256099942544/'));
  assert.ok(ids.rewardedContinue.startsWith('ca-app-pub-3940256099942544/'));
  assert.ok(ids.interstitial.startsWith('ca-app-pub-3940256099942544/'));

  await resetCounters();
  const base = emptyCounters();
  for (const key of [
    'endlessRuns',
    'chaseRuns',
    'continuesOffered',
    'continuesTaken',
    'livesSheetShown',
    'rewardedAdsCompleted',
    'interstitialsShown',
    'premiumScreenShown',
    'purchases'
  ]) {
    assert.equal(base[key], 0, `emptyCounters should include ${key}`);
    await count(key);
  }
  const updated = await loadCounters();
  assert.equal(updated.endlessRuns, 1);
  assert.equal(updated.purchases, 1);
});
