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

export function saverAvailable(streak, today) {
  const missed = keyFromNumber(dayNumber(today) - 1);
  return streak.saverWeek !== weekOf(missed);
}

// Call when the owner plays on `today`. Returns { streak, event } where event
// is start | same | up | saved | reset.
//  - Playing again the same day changes nothing.
//  - A day key earlier than the last one (flying west across time zones)
//    is treated as the same day: the streak never breaks from travel.
//  - Missing exactly one day uses the week's free streak saver, if unused.
export function updateStreak(streak, today) {
  if (!streak.lastDay) {
    const s = { ...streak, count: 1, best: Math.max(streak.best, 1), lastDay: today };
    return { streak: s, event: 'start' };
  }
  const gap = dayNumber(today) - dayNumber(streak.lastDay);
  if (gap <= 0) return { streak, event: 'same' };
  if (gap === 1) {
    const count = streak.count + 1;
    return { streak: { ...streak, count, best: Math.max(streak.best, count), lastDay: today }, event: 'up' };
  }
  if (gap === 2 && saverAvailable(streak, today)) {
    const missed = keyFromNumber(dayNumber(today) - 1);
    const count = streak.count + 1;
    return {
      streak: { ...streak, count, best: Math.max(streak.best, count), lastDay: today, saverWeek: weekOf(missed), savedDay: missed },
      event: 'saved'
    };
  }
  return { streak: { ...streak, count: 1, lastDay: today }, event: 'reset' };
}

// What the streak shows today without playing (it is only "lost" once the
// owner plays again after a gap, so there's never a countdown).
export function streakShown(streak, today) {
  if (!streak.lastDay) return 0;
  const gap = dayNumber(today) - dayNumber(streak.lastDay);
  if (gap <= 1) return streak.count;
  if (gap === 2 && saverAvailable(streak, today)) return streak.count;
  return 0;
}

// --- daily challenge ------------------------------------------------------

export const CHALLENGE_REWARD = 30; // bonus treats for the wardrobe

// type: treats (collect N in any runs today), stars3 (3 stars on a stage),
// daily (play the daily run), stages (finish N stages), clean (a stage with no bumps)
export function challengeFor(today, species, progress) {
  const rng = makeRng(hashString(`pawlingo-challenge:${today}:${species}`));
  const open = stagesFor(species).filter((s) => isUnlocked(progress, species, s.id));
  const stage = open[Math.floor(rng() * open.length)] || stagesFor(species)[0];
  const options = [
    { type: 'treats', target: [20, 30, 40][Math.floor(rng() * 3)] },
    { type: 'stars3', target: 1, stageId: stage.id },
    { type: 'daily', target: 1 },
    { type: 'stages', target: 2 },
    { type: 'clean', target: 1 }
  ];
  const c = options[Math.floor(rng() * options.length)];
  return { day: today, id: `${today}:${c.type}`, ...c, count: 0, done: false };
}

// Update the challenge after a run. Returns { challenge, justDone }.
export function advanceChallenge(challenge, result) {
  if (!challenge || challenge.done) return { challenge, justDone: false };
  let add = 0;
  if (challenge.type === 'treats') add = result.treats;
  else if (challenge.type === 'stars3') add = !result.daily && result.stageId === challenge.stageId && result.stars >= 3 ? 1 : 0;
  else if (challenge.type === 'daily') add = result.daily ? 1 : 0;
  else if (challenge.type === 'stages') add = result.daily || result.failed ? 0 : 1;
  else if (challenge.type === 'clean') add = !result.daily && !result.failed && result.hits === 0 ? 1 : 0;
  const count = Math.min(challenge.target, challenge.count + add);
  const done = count >= challenge.target;
  return { challenge: { ...challenge, count, done }, justDone: done };
}
