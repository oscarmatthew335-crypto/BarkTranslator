import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey,
  dayNumber,
  keyFromNumber,
  weekOf,
  dailySeed,
  emptyStreak,
  updateStreak,
  streakShown,
  saverAvailable,
  challengeFor,
  advanceChallenge
} from '../src/game/daily.js';
import { buildLevel } from '../src/game/engine.js';
import { dailyStage, STAGES } from '../src/game/stages.js';
import { emptyProgress, recordStage } from '../src/game/progress.js';
import { emptyWardrobe, buy, toggleWear, setColour, canBuy, defaultColour, ITEMS, BODY_COLOURS } from '../src/game/wardrobe.js';
import { emptyCounters, applySession, retention, rememberReturns, sessionsPerDay, rate } from '../src/game/counters.js';

const SAST = 120; // South Africa, UTC+2

test('day keys follow the phone time zone, not UTC', () => {
  const lateEvening = Date.parse('2026-10-20T22:30:00Z'); // 00:30 on the 21st in Johannesburg
  assert.equal(dayKey(lateEvening, 0), '2026-10-20');
  assert.equal(dayKey(lateEvening, SAST), '2026-10-21');
  assert.equal(dayKey(lateEvening, -300), '2026-10-20'); // New York
  assert.equal(keyFromNumber(dayNumber('2026-10-21')), '2026-10-21');
  assert.equal(dayNumber('2026-03-01') - dayNumber('2026-02-28'), 1);
  assert.equal(weekOf('2026-10-19'), weekOf('2026-10-25'), 'Monday to Sunday is one week');
  assert.equal(weekOf('2026-10-26'), weekOf('2026-10-25') + 1);
});

test('the daily run seed is the same all day and changes the next day', () => {
  assert.equal(dailySeed('2026-10-20', 'dog'), dailySeed('2026-10-20', 'dog'));
  assert.notEqual(dailySeed('2026-10-20', 'dog'), dailySeed('2026-10-21', 'dog'));
  assert.notEqual(dailySeed('2026-10-20', 'dog'), dailySeed('2026-10-20', 'cat'));
  const st = dailyStage('dog');
  assert.deepEqual(buildLevel(st, dailySeed('2026-10-20', 'dog')), buildLevel(st, dailySeed('2026-10-20', 'dog')));
  assert.ok(st.seconds >= 60 && st.seconds <= 90);
});

test('streak: starts at 1, grows on consecutive days, ignores replays the same day', () => {
  let { streak, event } = updateStreak(emptyStreak(), '2026-10-19');
  assert.equal(event, 'start');
  assert.equal(streak.count, 1);
  ({ streak, event } = updateStreak(streak, '2026-10-19'));
  assert.equal(event, 'same');
  assert.equal(streak.count, 1);
  ({ streak, event } = updateStreak(streak, '2026-10-20'));
  assert.equal(event, 'up');
  assert.equal(streak.count, 2);
  assert.equal(streak.best, 2);
});

test('streak saver: one missed day a week is forgiven, a second one that week is not', () => {
  let s = updateStreak(emptyStreak(), '2026-10-19').streak; // Monday
  s = updateStreak(s, '2026-10-20').streak; // Tue: 2
  assert.equal(saverAvailable(s, '2026-10-22'), true);
  let r = updateStreak(s, '2026-10-22'); // skipped Wed
  assert.equal(r.event, 'saved');
  assert.equal(r.streak.count, 3);
  assert.equal(r.streak.savedDay, '2026-10-21');
  s = r.streak;
  assert.equal(saverAvailable(s, '2026-10-24'), false, 'already used this week');
  r = updateStreak(s, '2026-10-24'); // skipped Fri, same week
  assert.equal(r.event, 'reset');
  assert.equal(r.streak.count, 1);
  assert.equal(r.streak.best, 3, 'best is kept');

  // A new week brings a new saver.
  let n = updateStreak(emptyStreak(), '2026-10-24').streak;
  n = updateStreak(n, '2026-10-25').streak; // Sun
  n = { ...n, saverWeek: weekOf('2026-10-21') };
  r = updateStreak(n, '2026-10-27'); // skipped Monday 26th: next week
  assert.equal(r.event, 'saved');
});

test('streak: missing two days in a row always resets', () => {
  const s = updateStreak(emptyStreak(), '2026-10-19').streak;
  assert.equal(updateStreak(s, '2026-10-22').event, 'reset');
});

test('streak and time zones: flying west never breaks or double-counts a streak', () => {
  // Played at 08:00 on the 21st in Johannesburg...
  const t1 = Date.parse('2026-10-21T06:00:00Z');
  let s = updateStreak({ ...emptyStreak(), count: 4, best: 4, lastDay: '2026-10-20' }, dayKey(t1, SAST)).streak;
  assert.equal(s.count, 5);
  // ...then flew to São Paulo (UTC-3), where it is still the 20th: same day, nothing changes.
  const t2 = Date.parse('2026-10-21T02:00:00Z');
  const r = updateStreak(s, dayKey(t2, -180));
  assert.equal(dayKey(t2, -180), '2026-10-20');
  assert.equal(r.event, 'same');
  assert.equal(r.streak.count, 5);
  assert.equal(r.streak.lastDay, '2026-10-21', 'last day never moves backwards');
  // Playing late at night counts for the phone's local day.
  const nearMidnight = Date.parse('2026-10-21T21:59:00Z'); // 23:59 SAST on the 21st
  assert.equal(updateStreak(s, dayKey(nearMidnight, SAST)).event, 'same');
  const afterMidnight = Date.parse('2026-10-21T22:01:00Z'); // 00:01 SAST on the 22nd
  assert.equal(updateStreak(s, dayKey(afterMidnight, SAST)).event, 'up');
});

test('the streak shown never counts down: it only resets once the owner plays again too late', () => {
  const s = { ...emptyStreak(), count: 6, best: 6, lastDay: '2026-10-20' };
  assert.equal(streakShown(s, '2026-10-20'), 6);
  assert.equal(streakShown(s, '2026-10-21'), 6);
  assert.equal(streakShown(s, '2026-10-22'), 6, 'saver still covers one missed day');
  assert.equal(streakShown(s, '2026-10-23'), 0);
  assert.equal(streakShown(emptyStreak(), '2026-10-20'), 0);
});

test('daily challenge: one per day, picks only open stages, completes once, and needs no questions or photos', () => {
  const p = emptyProgress();
  const a = challengeFor('2026-10-20', 'dog', p);
  assert.deepEqual(a, challengeFor('2026-10-20', 'dog', p));
  const types = new Set();
  for (let d = 1; d <= 28; d++) {
    const c = challengeFor(`2026-11-${String(d).padStart(2, '0')}`, 'dog', p);
    types.add(c.type);
    if (c.type === 'stars3') assert.equal(c.stageId, STAGES.dog[0].id, 'only the open stage');
  }
  assert.ok(types.size >= 4);

  const treats = { day: 'x', id: 'x', type: 'treats', target: 20, count: 0, done: false };
  let r = advanceChallenge(treats, { treats: 12, daily: false, stars: 1, hits: 2 });
  assert.equal(r.challenge.count, 12);
  assert.equal(r.justDone, false);
  r = advanceChallenge(r.challenge, { treats: 30, daily: true, hits: 0 });
  assert.equal(r.challenge.count, 20);
  assert.equal(r.justDone, true);
  assert.equal(advanceChallenge(r.challenge, { treats: 5 }).justDone, false, 'the bonus is given once');

  const stars = { type: 'stars3', target: 1, stageId: 'dog-park', count: 0, done: false };
  assert.equal(advanceChallenge(stars, { stageId: 'dog-park', stars: 2 }).justDone, false);
  assert.equal(advanceChallenge(stars, { stageId: 'dog-garden', stars: 3 }).justDone, false);
  assert.equal(advanceChallenge(stars, { stageId: 'dog-park', stars: 3 }).justDone, true);
  const clean = { type: 'clean', target: 1, count: 0, done: false };
  assert.equal(advanceChallenge(clean, { hits: 1 }).justDone, false);
  assert.equal(advanceChallenge(clean, { hits: 0 }).justDone, true);
  assert.equal(advanceChallenge(clean, { hits: 0, daily: true }).justDone, false);
  const opened = recordStage(p, { stageId: STAGES.cat[0].id, stars: 1, treats: 1 });
  assert.ok(challengeFor('2026-10-20', 'cat', opened));
});

test('wardrobe: 8 colours, 10-15 cosmetic items, buy with treats, wear and take off', () => {
  assert.equal(BODY_COLOURS.length, 8);
  assert.ok(ITEMS.length >= 10 && ITEMS.length <= 15);
  assert.equal(defaultColour({ species: 'dog', breedId: 'gsd' }), 'brown');
  assert.equal(defaultColour({ species: 'dog', breedId: 'rescue' }), 'golden');
  assert.equal(defaultColour({ species: 'cat' }), 'grey');
  let w = emptyWardrobe({ species: 'dog' });
  assert.equal(canBuy(w, 50, 'hat-party'), false, 'not enough treats');
  let r = buy(w, 50, 'hat-party');
  assert.equal(r.bank, 50);
  r = buy(w, 100, 'hat-party');
  assert.equal(r.bank, 40);
  assert.ok(r.wardrobe.owned.includes('hat-party'));
  assert.equal(r.wardrobe.equipped.hat, 'hat-party');
  assert.equal(buy(r.wardrobe, 999, 'hat-party').bank, 999, 'no buying twice');
  w = toggleWear(r.wardrobe, 'hat-party');
  assert.equal(w.equipped.hat, undefined);
  w = toggleWear(w, 'hat-party');
  assert.equal(w.equipped.hat, 'hat-party');
  assert.equal(toggleWear(w, 'hat-crown'), w, "can't wear what you don't own");
  assert.equal(setColour(w, 'black').colour, 'black');
  assert.equal(setColour(w, 'rainbow').colour, w.colour);
});

test('local counters: sessions per day, first open, and day-1/7/30 returns', () => {
  let c = emptyCounters();
  c = applySession(c, '2026-10-01');
  c = applySession(c, '2026-10-01');
  assert.equal(c.firstOpenDay, '2026-10-01');
  assert.deepEqual(retention(c, '2026-10-01'), { d1: null, d7: null, d30: null });
  assert.equal(retention(c, '2026-10-02').d1, false);
  c = applySession(c, '2026-10-02');
  assert.equal(retention(c, '2026-10-02').d1, true);
  c = applySession(c, '2026-10-08');
  assert.equal(retention(c, '2026-10-08').d7, true);
  assert.equal(retention(c, '2026-10-20').d30, null);
  c = rememberReturns(applySession(c, '2026-10-31'), '2026-10-31');
  assert.equal(retention(c, '2026-10-31').d30, true);
  // Day-30 stays known after old days are trimmed.
  c = applySession(c, '2027-01-15');
  assert.equal(c.sessionsByDay['2026-10-01'], undefined);
  assert.equal(retention(c, '2027-01-15').d30, true);
  assert.equal(sessionsPerDay({ sessionsByDay: { a: 2, b: 4 } }), 3);
  assert.equal(rate(1, 4), 0.25);
  assert.equal(rate(1, 0), null);
});

test('the Play tab sends nothing by itself: no fetch or analytics anywhere in its code', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  for (const dir of ['src/game/', 'src/components/game/']) {
    for (const f of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      const src = readFileSync(new URL(`../${dir}${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
      assert.ok(!/\bfetch\(|XMLHttpRequest|analytics|firebase|segment|amplitude|mixpanel/i.test(src), `${dir}${f}`);
    }
  }
});

test('counts made at the same moment are all kept (none overwrite another)', async () => {
  const c = await import('../src/game/counters.js');
  await c.resetCounters();
  await Promise.all([c.count('stagesFinished'), c.count('treatRoundsOffered'), c.count('stagesFinished'), c.count('questionsAsked', 3)]);
  const now = await c.loadCounters();
  assert.equal(now.stagesFinished, 2);
  assert.equal(now.treatRoundsOffered, 1);
  assert.equal(now.questionsAsked, 3);
});
