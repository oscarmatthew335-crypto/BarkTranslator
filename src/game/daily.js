// Daily hooks: the day key (in the phone's own time zone), the daily run's
// seed, the day streak with one free "streak saver" a week, and the daily
// challenge. All plain functions so they can be tested with any clock.

import { hashString, makeRng } from './random';
import { stagesFor } from './stages';
import { isUnlocked } from './progress';

const DAY_MS = 86400000;

// "2026-10-20" for this moment in the phone's time zone. Pass utcOffsetMinutes
// (e.g. 120 for South Africa) to pick a zone explicitly.
export function dayKey(ms = Date.now(), utcOffsetMinutes = null) {
  const offset = utcOffsetMinutes == null ? -new Date(ms).getTimezoneOffset() : utcOffsetMinutes;
  const d = new Date(ms + offset * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function dayNumber(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function keyFromNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

// Weeks start on Monday (day 0, 1 Jan 1970, was a Thursday).
export const weekOf = (key) => Math.floor((dayNumber(key) + 3) / 7);

export const dailySeed = (key, species) => hashString(`pawlingo-daily:${key}:${species}`);

// --- streak -------------------------------------------------------------

export const emptyStreak = () => ({ count: 0, best: 0, lastDay: null, saverWeek: null, savedDay: null });

export const STREAK_REWARDS = {
  1: 10,
  2: 15,
  3: 20,
  5: 30,
  7: 50
};

export const STREAK_DAY7_ITEM = 'bandana-champ';

export function streakRewardFor(dayCount) {
  const n = Math.max(0, Math.floor(Number(dayCount) || 0));
  return {
    treats: STREAK_REWARDS[n] || 0,
    item: n === 7 ? STREAK_DAY7_ITEM : null
  };
}

export function nextStreakReward(currentCount) {
  const n = Math.max(0, Math.floor(Number(currentCount) || 0));
  const milestones = [1, 2, 3, 5, 7];
  const nextDay = milestones.find((d) => d > n);
  if (!nextDay) return null;
  return {
    day: nextDay,
    treats: STREAK_REWARDS[nextDay] || 0,
    item: nextDay === 7 ? STREAK_DAY7_ITEM : null
  };
}

export const emptyWeeklyBest = () => ({
  week: null,
  endless: 0,
  chase: 0,
  daily: 0
});

export function weeklyBestFor(weeklyBest, today, mode) {
  if (!today) return 0;
  const wk = weekOf(today);
  if (!weeklyBest || weeklyBest.week !== wk) return 0;
  return Math.max(0, Math.floor(Number(weeklyBest[mode]) || 0));
}

export function updateWeeklyBest(weeklyBest, today, mode, score) {
  const wk = today ? weekOf(today) : null;
  const base =
    weeklyBest && weeklyBest.week === wk
      ? { ...emptyWeeklyBest(), ...weeklyBest, week: wk }
      : { ...emptyWeeklyBest(), week: wk };
  if (!['endless', 'chase', 'daily'].includes(mode)) {
    return { weeklyBest: base, best: 0, previousWeeklyBest: 0, isNewWeeklyBest: false };
  }
  const prev = Math.max(0, Math.floor(Number(base[mode]) || 0));
  const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
  const best = Math.max(prev, cleanScore);
  const isNewWeeklyBest = cleanScore > prev && cleanScore > 0;
  return {
    weeklyBest: { ...base, [mode]: best },
    best,
    previousWeeklyBest: prev,
    isNewWeeklyBest
  };
}

export function saverAvailable(streak, today, extraSavers = 0) {
  const missed = keyFromNumber(dayNumber(today) - 1);
  return streak.saverWeek !== weekOf(missed) || Number(extraSavers) > 0;
}

// Call when the owner plays on `today`. Returns { streak, event, usedExtraSaver } where event
// is start | same | up | saved | reset.
//  - Playing again the same day changes nothing.
//  - A day key earlier than the last one (flying west across time zones)
//    is treated as the same day: the streak never breaks from travel.
//  - Missing exactly one day uses the week's free streak saver, if unused, or an extraSaver if available.
export function updateStreak(streak, today, { extraSavers = 0 } = {}) {
  if (!streak.lastDay) {
    const s = { ...streak, count: 1, best: Math.max(streak.best, 1), lastDay: today };
    return { streak: s, event: 'start', usedExtraSaver: false };
  }
  const gap = dayNumber(today) - dayNumber(streak.lastDay);
  if (gap <= 0) return { streak, event: 'same', usedExtraSaver: false };
  if (gap === 1) {
    const count = streak.count + 1;
    return { streak: { ...streak, count, best: Math.max(streak.best, count), lastDay: today }, event: 'up', usedExtraSaver: false };
  }
  if (gap === 2) {
    const missed = keyFromNumber(dayNumber(today) - 1);
    const freeAvailable = streak.saverWeek !== weekOf(missed);
    if (freeAvailable || Number(extraSavers) > 0) {
      const count = streak.count + 1;
      return {
        streak: {
          ...streak,
          count,
          best: Math.max(streak.best, count),
          lastDay: today,
          saverWeek: freeAvailable ? weekOf(missed) : streak.saverWeek,
          savedDay: missed
        },
        event: 'saved',
        usedExtraSaver: !freeAvailable
      };
    }
  }
  return { streak: { ...streak, count: 1, lastDay: today }, event: 'reset', usedExtraSaver: false };
}

// What the streak shows today without playing (it is only "lost" once the
// owner plays again after a gap, so there's never a countdown).
export function streakShown(streak, today, extraSavers = 0) {
  if (!streak.lastDay) return 0;
  const gap = dayNumber(today) - dayNumber(streak.lastDay);
  if (gap <= 1) return streak.count;
  if (gap === 2 && saverAvailable(streak, today, extraSavers)) return streak.count;
  return 0;
}

// --- daily challenge ------------------------------------------------------

export const CHALLENGE_REWARD = 30; // bonus treats for the wardrobe

// type: treats (collect N in any runs today), stars3 (3 stars on a stage),
// daily (play the daily run), stages (finish N stages), clean (a stage with no bumps),
// endlessScore (score N in Endless), chaseSeconds (survive N seconds in Chase),
// combo5 (reach a x5 combo)
export function challengeFor(today, species, progress) {
  const rng = makeRng(hashString(`pawlingo-challenge:${today}:${species}`));
  const open = stagesFor(species).filter((s) => isUnlocked(progress, species, s.id));
  const stage = open[Math.floor(rng() * open.length)] || stagesFor(species)[0];
  const options = [
    { type: 'treats', target: [20, 30, 40][Math.floor(rng() * 3)] },
    { type: 'stars3', target: 1, stageId: stage.id },
    { type: 'daily', target: 1 },
    { type: 'stages', target: 2 },
    { type: 'clean', target: 1 },
    { type: 'endlessScore', target: [250, 400, 600][Math.floor(rng() * 3)] },
    { type: 'chaseSeconds', target: [30, 45, 60][Math.floor(rng() * 3)] },
    { type: 'combo5', target: 1 }
  ];
  const c = options[Math.floor(rng() * options.length)];
  return { day: today, id: `${today}:${c.type}`, ...c, count: 0, done: false };
}

// Update the challenge after a run. Returns { challenge, justDone }.
export function advanceChallenge(challenge, result) {
  if (!challenge || challenge.done) return { challenge, justDone: false };
  const stageRun = !result.daily && !result.endless && !result.chase;
  let nextCount = challenge.count || 0;
  if (challenge.type === 'treats') nextCount += result.treats || 0;
  else if (challenge.type === 'stars3') nextCount += stageRun && result.stageId === challenge.stageId && result.stars >= 3 ? 1 : 0;
  else if (challenge.type === 'daily') nextCount += result.daily ? 1 : 0;
  else if (challenge.type === 'stages') nextCount += stageRun && !result.failed ? 1 : 0;
  else if (challenge.type === 'clean') nextCount += stageRun && !result.failed && result.hits === 0 ? 1 : 0;
  else if (challenge.type === 'endlessScore') {
    if (result.endless) nextCount = Math.max(nextCount, Math.floor(result.score || 0));
  } else if (challenge.type === 'chaseSeconds') {
    if (result.chase) nextCount = Math.max(nextCount, Math.floor(result.seconds || 0));
  } else if (challenge.type === 'combo5') {
    if ((result.maxCombo || 0) >= 10 || (result.multiplier || 1) >= 5) nextCount += 1;
  }
  const count = Math.min(challenge.target, nextCount);
  const done = count >= challenge.target;
  return { challenge: { ...challenge, count, done }, justDone: done };
}
