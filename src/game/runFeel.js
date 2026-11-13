// Pure game-feel helpers for Part E2 ("One more go"):
// - Near-miss detection on StageEnd
// - Per-run deterministic goals scaled from recent runs
// - Recent runs rolling window

import { hashString, makeRng } from './random';

export const RUN_GOAL_BONUS = 15;
export const NEAR_MISS_RATIO = 0.85;

export function nearMissStatus({
  score = 0,
  previousBest = 0,
  previousWeeklyBest = 0,
  newBest = false,
  newWeeklyBest = false
} = {}) {
  const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
  if (newBest) return { kind: 'new_best', diff: 0, target: cleanScore };
  if (previousBest > 0 && cleanScore <= previousBest && cleanScore >= Math.ceil(previousBest * NEAR_MISS_RATIO)) {
    return { kind: 'near_miss', diff: previousBest - cleanScore + 1, target: previousBest };
  }
  if (newWeeklyBest) return { kind: 'new_weekly_best', diff: 0, target: cleanScore };
  if (
    previousWeeklyBest > 0 &&
    cleanScore <= previousWeeklyBest &&
    cleanScore >= Math.ceil(previousWeeklyBest * NEAR_MISS_RATIO)
  ) {
    return {
      kind: 'near_miss_weekly',
      diff: previousWeeklyBest - cleanScore + 1,
      target: previousWeeklyBest
    };
  }
  return { kind: 'none', diff: 0, target: 0 };
}

export function recordRecentRun(recentRuns = [], result = {}) {
  const list = Array.isArray(recentRuns) ? recentRuns : [];
  const entry = {
    treats: Math.max(0, Math.floor(Number(result.treats) || 0)),
    score: Math.max(0, Math.floor(Number(result.score) || 0)),
    jumps: Math.max(0, Math.floor(Number(result.jumps) || 0)),
    seconds: Math.max(0, Math.floor(Number(result.seconds) || 0))
  };
  return [...list, entry].slice(-5);
}

function medianOf(values, fallback) {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!valid.length) return fallback;
  const mid = Math.floor(valid.length / 2);
  return valid[mid];
}

// Deterministic per-run goal scaled from recent runs so it is reachable ~50%
// of the time.
export function pickRunGoal({ day = '2026-10-20', runCount = 0, mode = 'stage', recentRuns = [] } = {}) {
  const isScoreMode = mode === 'endless' || mode === 'chase' || mode === 'daily';
  const types = isScoreMode ? ['treats', 'score', 'jumps', 'seconds'] : ['treats', 'jumps', 'seconds'];
  const rng = makeRng(hashString(`goal:${day}:${runCount}:${mode}`));
  const type = types[Math.floor(rng() * types.length) % types.length];

  const runs = Array.isArray(recentRuns) ? recentRuns : [];
  let target = 15;
  if (type === 'treats') {
    const base = medianOf(runs.map((r) => r.treats), 15);
    target = Math.max(10, Math.round((base * 1.05) / 5) * 5);
  } else if (type === 'score') {
    const base = medianOf(runs.map((r) => r.score), 300);
    target = Math.max(150, Math.round((base * 1.05) / 50) * 50);
  } else if (type === 'jumps') {
    const base = medianOf(runs.map((r) => r.jumps), 12);
    target = Math.max(8, Math.round(base * 1.05));
  } else if (type === 'seconds') {
    const base = medianOf(runs.map((r) => r.seconds), 30);
    target = Math.max(20, Math.round((base * 1.05) / 5) * 5);
  }

  return {
    type,
    target,
    bonus: RUN_GOAL_BONUS
  };
}

export function runGoalProgress(goal, runOrResult) {
  if (!goal || !runOrResult) return { current: 0, target: goal?.target || 1, done: false };
  let current = 0;
  if (goal.type === 'treats') current = Math.floor(Number(runOrResult.treats) || 0);
  else if (goal.type === 'score') current = Math.floor(Number(runOrResult.score) || 0);
  else if (goal.type === 'jumps') current = Math.floor(Number(runOrResult.jumps) || 0);
  else if (goal.type === 'seconds') {
    const sec = runOrResult.seconds != null ? runOrResult.seconds : runOrResult.t;
    current = Math.floor(Number(sec) || 0);
  }
  const target = Math.max(1, Math.floor(Number(goal.target) || 1));
  return {
    current: Math.min(target, Math.max(0, current)),
    target,
    done: current >= target
  };
}

export function collectPitchFor(lastAt, now = Date.now(), streak = 0) {
  const withinCombo = lastAt != null && now - lastAt <= 1000;
  const nextStreak = withinCombo ? Math.max(0, streak) + 1 : 0;
  const rate = Math.min(1.5, Number((1 + nextStreak * 0.06).toFixed(2)));
  return { nextStreak, rate };
}
