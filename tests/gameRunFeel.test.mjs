import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  RUN_GOAL_BONUS,
  nearMissStatus,
  recordRecentRun,
  pickRunGoal,
  runGoalProgress,
  collectPitchFor
} from '../src/game/runFeel.js';
import { nextUnownedItem, ITEMS } from '../src/game/wardrobe.js';
import { newRun, step } from '../src/game/engine.js';
import { endlessStage } from '../src/game/stages.js';

test('nearMissStatus reports new_best, near_miss within 15%, new_weekly_best, and none otherwise', () => {
  assert.deepEqual(
    nearMissStatus({ score: 500, previousBest: 400, newBest: true }),
    { kind: 'new_best', diff: 0, target: 500 }
  );

  // Within 15% of previousBest (e.g. 900 vs 1000 -> 1000 * 0.85 = 850)
  const nm = nearMissStatus({ score: 900, previousBest: 1000, newBest: false });
  assert.equal(nm.kind, 'near_miss');
  assert.equal(nm.diff, 101);
  assert.equal(nm.target, 1000);

  // Below 85% of previousBest -> checks weekly best
  const nmWeekly = nearMissStatus({
    score: 430,
    previousBest: 1000,
    previousWeeklyBest: 500,
    newBest: false,
    newWeeklyBest: false
  });
  assert.equal(nmWeekly.kind, 'near_miss_weekly');
  assert.equal(nmWeekly.diff, 71);

  // Too far from both -> none
  assert.deepEqual(
    nearMissStatus({ score: 200, previousBest: 1000, previousWeeklyBest: 500 }),
    { kind: 'none', diff: 0, target: 0 }
  );
});

test('pickRunGoal is deterministic from seed and scales from recentRuns', () => {
  const recent = [
    { treats: 20, score: 400, jumps: 16, seconds: 40 },
    { treats: 40, score: 800, jumps: 24, seconds: 60 },
    { treats: 30, score: 600, jumps: 20, seconds: 50 }
  ];
  const g1 = pickRunGoal({ day: '2026-11-13', runCount: 4, mode: 'endless', recentRuns: recent });
  const g2 = pickRunGoal({ day: '2026-11-13', runCount: 4, mode: 'endless', recentRuns: recent });
  assert.deepEqual(g1, g2);
  assert.equal(g1.bonus, RUN_GOAL_BONUS);
  assert.ok(['treats', 'score', 'jumps', 'seconds'].includes(g1.type));

  // Higher recent runs produce a higher scaled target for the same seed
  const bigger = recent.map((r) => ({
    treats: r.treats * 3,
    score: r.score * 3,
    jumps: r.jumps * 3,
    seconds: r.seconds * 3
  }));
  const gBig = pickRunGoal({ day: '2026-11-13', runCount: 4, mode: 'endless', recentRuns: bigger });
  assert.equal(gBig.type, g1.type);
  assert.ok(gBig.target > g1.target);
});

test('runGoalProgress tracks progress and marks done once reached', () => {
  const goal = { type: 'treats', target: 25, bonus: RUN_GOAL_BONUS };
  assert.deepEqual(runGoalProgress(goal, { treats: 10 }), { current: 10, target: 25, done: false });
  assert.deepEqual(runGoalProgress(goal, { treats: 30 }), { current: 25, target: 25, done: true });

  const secGoal = { type: 'seconds', target: 30, bonus: RUN_GOAL_BONUS };
  assert.deepEqual(runGoalProgress(secGoal, { t: 31.4 }), { current: 30, target: 30, done: true });
});

test('recordRecentRun keeps a rolling window of 5 runs', () => {
  let runs = [];
  for (let i = 1; i <= 7; i++) {
    runs = recordRecentRun(runs, { treats: i, score: i * 100, jumps: i * 2, seconds: i * 10 });
  }
  assert.equal(runs.length, 5);
  assert.equal(runs[0].treats, 3);
  assert.equal(runs[4].treats, 7);
});

test('nextUnownedItem picks the cheapest wardrobe item not yet owned', () => {
  const emptyWardrobe = { owned: [], equipped: {} };
  const first = nextUnownedItem(emptyWardrobe, 10);
  const purchasable = ITEMS.filter((i) => !i.streakOnly && i.price > 0).sort((a, b) => a.price - b.price);
  assert.equal(first.item.price, purchasable[0].price);
  assert.equal(first.needed, Math.max(0, first.item.price - 10));
  assert.equal(first.progress, Math.min(1, 10 / first.item.price));

  const allOwned = { owned: ITEMS.map((i) => i.id), equipped: {} };
  assert.equal(nextUnownedItem(allOwned, 1000), null);
});

test('collectPitchFor rises within 1s streak and resets after >1s', () => {
  const r1 = collectPitchFor(null, 5000, 0);
  assert.equal(r1.nextStreak, 0);
  assert.equal(r1.rate, 1);

  const r2 = collectPitchFor(5000, 5400, r1.nextStreak);
  assert.equal(r2.nextStreak, 1);
  assert.ok(r2.rate > 1);

  const r3 = collectPitchFor(5400, 7000, r2.nextStreak);
  assert.equal(r3.nextStreak, 0);
  assert.equal(r3.rate, 1);
});

test('engine counts jumps and exposes jumps in result', () => {
  const run = newRun(endlessStage('dog'), { seed: 42 });
  assert.equal(run.jumps, 0);
  const nextRun = step(run, 1 / 60, { jump: true });
  assert.equal(nextRun.jumps, 1);
  assert.ok(nextRun.events.includes('jump'));
});

test('instant restart skips intro countdown in PlayTab and RunnerScreen', () => {
  const playSrc = readFileSync(new URL('../src/components/game/PlayTab.js', import.meta.url), 'utf8');
  const runnerSrc = readFileSync(new URL('../src/components/game/RunnerScreen.js', import.meta.url), 'utf8');
  assert.ok(playSrc.includes('instantStart'), 'PlayTab must pass instantStart on quick Play again');
  assert.ok(runnerSrc.includes('instantStart'), 'RunnerScreen must shorten countdown when instantStart is true');
});
