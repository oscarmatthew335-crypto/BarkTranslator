import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  step,
  buildChunk,
  buildLevel,
  currentSpeed,
  jumpDistance,
  laneLean,
  warmupDist,
  LANE_EASE_S,
  FIRST_RUN_SPEED,
  LANES,
} from '../src/game/engine.js';
import { PATTERNS, hasClearPath, patternsFor, difficultyFor } from '../src/game/chunks.js';
import { OBSTACLES, endlessStage, chaseStage, stagesFor } from '../src/game/stages.js';

const DT = 1 / 60;
const quiet = (stage) => ({ ...stage, obstacles: { bench: 1 }, powerUps: [] });

function runFor(run, secs, input = {}) {
  let r = run;
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) r = step(r, DT, i === 0 ? input : {});
  return r;
}

test('a lane change eases out and lands in 0.14 s (one frame either way)', () => {
  let r = newRun(quiet(endlessStage('dog')), { seed: 3 });
  r = step(r, DT, { laneRight: true });
  let frames = 1;
  while (r.player.lanePos !== 1 && frames < 60) {
    r = step(r, DT, {});
    frames += 1;
  }
  assert.equal(r.player.lanePos, 1);
  assert.ok(Math.abs(frames * DT - LANE_EASE_S) <= DT + 1e-9, `took ${frames * DT}s`);
});

test('the ease is fast at the start: over half way after a third of the time', () => {
  let r = newRun(quiet(endlessStage('dog')), { seed: 3 });
  r = step(r, DT, { laneRight: true });
  r = runFor(r, LANE_EASE_S / 3 - DT);
  assert.ok(r.player.lanePos > 0.5, String(r.player.lanePos));
});

test('a second swipe mid-move retargets from where the pet is, with no snap back', () => {
  let r = newRun(quiet(endlessStage('dog')), { seed: 3 });
  r = step(r, DT, { laneRight: true });
  r = step(r, DT, {});
  const mid = r.player.lanePos;
  assert.ok(mid > 0 && mid < 1);
  r = step(r, DT, { laneLeft: true });
  assert.equal(r.player.targetLane, 0);
  assert.ok(r.player.lanePos <= mid + 1e-9 && r.player.lanePos > 0, 'carries on from the current spot');
  r = runFor(r, 0.3);
  assert.equal(r.player.lanePos, 0);
});

test('a swipe during a lane change is kept: two quick swipes reach the far lane', () => {
  let r = newRun(quiet(endlessStage('dog')), { seed: 3 });
  r = step(r, DT, { laneLeft: true });
  r = step(r, DT, {});
  r = step(r, DT, { laneRight: true });
  r = step(r, DT, { laneRight: true });
  r = runFor(r, 0.3);
  assert.equal(r.player.lanePos, 1);
});

test('the lean peaks early (about 12 degrees) and is 0 when the pet arrives', () => {
  let r = newRun(quiet(endlessStage('dog')), { seed: 3 });
  r = step(r, DT, { laneRight: true });
  let peak = 0;
  let peakAt = 0;
  for (let i = 1; i < 20; i++) {
    const lean = laneLean(r.player);
    if (lean > peak) {
      peak = lean;
      peakAt = r.player.laneT;
    }
    r = step(r, DT, {});
  }
  assert.ok(peak > 10 && peak <= 12.01, String(peak));
  assert.ok(peakAt < LANE_EASE_S / 2);
  assert.equal(laneLean(r.player), 0);
});

test('take-off and landing are timed for the squash and stretch', () => {
  let r = newRun(quiet(endlessStage('dog')), { seed: 3 });
  r = step(r, DT, { jump: true });
  assert.equal(r.player.justJumpedT, 0);
  let landed = false;
  for (let i = 0; i < 90 && !landed; i++) {
    r = step(r, DT, {});
    landed = r.events.includes('land');
  }
  assert.ok(landed, 'a land event fires');
  assert.equal(r.player.justLandedT, 0);
  r = step(r, DT, {});
  assert.ok(r.player.justLandedT > 0);
});

// ---------- warm-up ----------

for (const make of [endlessStage, chaseStage]) {
  for (const sp of ['dog', 'cat']) {
    test(`${make(sp).mode} ${sp}: the warm-up is one still obstacle at a time, spaced and guided`, () => {
      const stage = { ...make(sp), obstacles: { bench: 2, trash: 2, vacuum: 3, dog: 2, catDash: 2 } };
      const warm = warmupDist(stage);
      for (const seed of [1, 2, 3, 9, 42]) {
        const { entities } = buildChunk(stage, { seed, chunkIndex: 0, startX: 420 });
        const obs = entities.filter((e) => e.kind === 'obstacle' && e.x < warm);
        assert.ok(obs.length > 2);
        const xs = new Map();
        for (const o of obs) {
          assert.equal(o.move, 0, `${o.type} moves in the warm-up`);
          assert.ok(!xs.has(o.x), 'two side by side');
          xs.set(o.x, o);
        }
        const sorted = obs.slice().sort((a, b) => a.x - b.x);
        for (let i = 1; i < sorted.length; i++) {
          const speed = stage.speed + stage.ramp * Math.min(1, sorted[i - 1].x / 18000);
          assert.ok(sorted[i].x - sorted[i - 1].x >= jumpDistance(speed) * 1.6, 'spaced at least 1.6 jumps');
        }
        for (const o of sorted) {
          const guide = entities.some((e) => e.kind === 'treat' && e.x > o.x - 140 && e.x < o.x + o.w + 140);
          assert.ok(guide, 'a treat guide near every warm-up obstacle');
        }
      }
    });
  }
}

test('the first stage of a place warms up too: no moving obstacles early on', () => {
  for (const sp of ['dog', 'cat']) {
    const stage = stagesFor(sp)[0];
    const warm = warmupDist(stage);
    const { entities } = buildLevel(stage, 5);
    const early = entities.filter((e) => e.kind === 'obstacle' && e.x < warm);
    assert.ok(early.length > 0);
    for (const o of early) assert.equal(OBSTACLES[o.type].move, 0, o.type);
  }
});

test('a first run ever is 85% speed during the warm-up, then normal', () => {
  const stage = quiet(endlessStage('dog'));
  const first = newRun(stage, { seed: 1, firstRun: true });
  const usual = newRun(stage, { seed: 1 });
  assert.ok(Math.abs(currentSpeed(first) - currentSpeed(usual) * FIRST_RUN_SPEED) < 1e-6);
  const later = { ...first, dist: warmupDist(stage) + 1 };
  assert.equal(currentSpeed(later), currentSpeed({ ...usual, dist: warmupDist(stage) + 1 }));
});

// ---------- designed patterns ----------

test('there are at least 12 patterns, each with a difficulty from 1 to 5', () => {
  assert.ok(PATTERNS.length >= 12);
  for (const p of PATTERNS) assert.ok(p.difficulty >= 1 && p.difficulty <= 5, p.id);
  assert.equal(new Set(PATTERNS.map((p) => p.id)).size, PATTERNS.length);
});

test('every pattern leaves a clear path at the slowest and fastest speeds', () => {
  for (const speed of [210, 285, 415]) {
    for (const p of PATTERNS) {
      assert.ok(hasClearPath(p, { jd: jumpDistance(speed), speed, laneS: LANE_EASE_S, w: 58 }), `${p.id} at ${speed}`);
    }
  }
});

test('the path checker does spot a blocked pattern', () => {
  const wall = { id: 'wall', difficulty: 5, len: 0.4, items: [
    { at: 0, lane: -1, slot: 'low' }, { at: 0, lane: 0, slot: 'low' }, { at: 0, lane: 1, slot: 'low' },
    { at: 0.4, lane: -1, slot: 'low' }, { at: 0.4, lane: 0, slot: 'low' }, { at: 0.4, lane: 1, slot: 'low' },
  ] };
  assert.equal(hasClearPath(wall, { jd: jumpDistance(300), speed: 300 }), false);
});

test('difficulty follows speed and the picks fit it', () => {
  assert.equal(difficultyFor(285, 285, 410), 1);
  assert.equal(difficultyFor(410, 285, 410), 5);
  for (let d = 1; d <= 5; d++) {
    const fits = patternsFor(d);
    assert.ok(fits.length > 0);
    for (const p of fits) assert.ok(p.difficulty <= d && p.difficulty >= d - 2);
  }
});

test('later chunks use patterns, and the same seed gives the same chunk', () => {
  const stage = endlessStage('dog');
  const a = buildChunk(stage, { seed: 11, chunkIndex: 4, startX: 9000 });
  const b = buildChunk(stage, { seed: 11, chunkIndex: 4, startX: 9000 });
  assert.deepEqual(a, b);
  const used = new Set();
  for (let seed = 1; seed < 30; seed++) {
    for (const e of buildChunk(stage, { seed, chunkIndex: 4, startX: 9000 }).entities) if (e.pattern) used.add(e.pattern);
  }
  assert.ok(used.size >= 4, [...used].join(','));
});

test('pattern slots use the stage’s own obstacles', () => {
  const stage = { ...endlessStage('cat'), obstacles: { cucumber: 2, spray: 2 } };
  for (let seed = 1; seed < 20; seed++) {
    for (const e of buildChunk(stage, { seed, chunkIndex: 5, startX: 12000 }).entities) {
      if (e.kind === 'obstacle') assert.ok(['cucumber', 'spray'].includes(e.type));
    }
  }
});

test('lanes are always -1, 0 or 1', () => {
  const stage = endlessStage('dog');
  for (let seed = 1; seed < 10; seed++) {
    for (const e of buildChunk(stage, { seed, chunkIndex: 3, startX: 8000 }).entities) assert.ok(LANES.includes(e.trackLane));
  }
});

// ---------- settings and analytics ----------
import { totalRuns, emptyGameState } from '../src/game/gameStore.js';
import { ALLOWED_EVENTS } from '../src/game/analytics.js';

test('new installs default to swipe only; players with runs keep their buttons', () => {
  assert.equal(emptyGameState().options.showJumpDuckButtons, false);
  assert.equal(totalRuns(emptyGameState()), 0);
  const played = { pets: { a: { modeRuns: { stage: 2, endless: 1 } }, b: { modeRuns: { chase: 1 } } } };
  assert.equal(totalRuns(played), 4);
});

test('the new analytics event is on the allow-list', () => {
  assert.ok(ALLOWED_EVENTS.has('controls_mode'));
  assert.ok(ALLOWED_EVENTS.has('run_end'));
});
