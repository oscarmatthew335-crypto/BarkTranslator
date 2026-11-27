import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  step,
  buildChunk,
  playerBox,
  entityBox,
  VIEW_W,
  PLAYER_W,
  PLAYER_H,
  DUCK_H,
  LANES
} from '../src/game/engine.js';
import {
  PATTERNS,
  SET_PIECE_IDS,
  CURVE_SPAN_DIST,
  trackCurveAt,
  trackHillAt,
  isStraightAt,
  hasClearPath
} from '../src/game/chunks.js';
import {
  PLACE_CYCLE,
  PLACE_SPAN_DIST,
  DOG_MIX,
  CAT_MIX,
  SURPRISE_OBSTACLES,
  SURPRISE_ENDLESS_DIST,
  placeAtDist,
  placeObstaclesFor,
  stageObstaclesAt,
  endlessStage,
  chaseStage
} from '../src/game/stages.js';
import { ALLOWED_EVENTS } from '../src/game/analytics.js';
import { emptyGameState, effectiveReduceMotion } from '../src/game/gameStore.js';
import { projectBehind, VISIBLE_DEPTH, CENTER_X } from '../src/game/projection.js';

// ---------- 1. Track curve, hills & projection ----------

test('curve is zero on straights, smooth with no jumps between frames, deterministic per seed, and off with reduce motion', () => {
  // Straight stretch 0 (0 .. CURVE_SPAN_DIST) and stretch 2
  for (let d = 0; d < CURVE_SPAN_DIST; d += 100) {
    assert.equal(trackCurveAt(d, 7), 0, `straight at ${d}`);
    assert.equal(isStraightAt(d, 7), true);
    assert.equal(trackCurveAt(d + CURVE_SPAN_DIST * 2, 7), 0);
  }
  // Bend stretch 1 reaches non-zero values and transitions smoothly frame by frame (~6 px step per 1/60 s at 350 u/s)
  let maxCurve = 0;
  let prev = trackCurveAt(0, 7);
  for (let d = 6; d <= CURVE_SPAN_DIST * 4; d += 6) {
    const c = trackCurveAt(d, 7);
    assert.ok(Math.abs(c - prev) < 1.2, `jump at ${d}: ${prev} -> ${c}`);
    maxCurve = Math.max(maxCurve, Math.abs(c));
    prev = c;
    // Same seed -> identical curve; reduceMotion -> strictly 0
    assert.equal(trackCurveAt(d, 7), c);
    assert.equal(trackCurveAt(d, 7, { reduceMotion: true }), 0);
    const h = trackHillAt(d, 7);
    assert.ok(Math.abs(h) <= 12.001, `hill out of range: ${h}`);
    assert.equal(trackHillAt(d, 7, { reduceMotion: true }), 0);
  }
  assert.ok(maxCurve >= 35, `expected noticeable bend, got max ${maxCurve}`);
});

test('projectBehind bends far points by curve * depth^2 while leaving player plane anchored', () => {
  const atPlayerStraight = projectBehind(0, 0, 0, { curve: 0 });
  const atPlayerCurved = projectBehind(0, 0, 0, { curve: 50 });
  assert.equal(atPlayerCurved.x, atPlayerStraight.x);
  assert.equal(atPlayerStraight.x, CENTER_X);

  const atHorizon = projectBehind(VISIBLE_DEPTH, 0, 0, { curve: 50 });
  assert.ok(Math.abs(atHorizon.x - (CENTER_X + 50)) < 1e-6);

  const atMid = projectBehind(VISIBLE_DEPTH / 2, 0, 0, { curve: 50 });
  assert.ok(Math.abs(atMid.x - (CENTER_X + 50 * 0.25)) < 1e-6);
});

// ---------- 2. Place cycle & obstacle mix ----------

test('places cycle garden -> park -> beach -> braai -> vet -> home -> garden every 400 m (4000 units)', () => {
  const metres = [0, 400, 800, 1200, 1600, 2000, 2400];
  const expected = ['garden', 'park', 'beach', 'braai', 'vet', 'home', 'garden'];
  metres.forEach((m, i) => {
    assert.equal(placeAtDist(m * 10), expected[i], `at ${m} m`);
  });
  assert.equal(PLACE_SPAN_DIST, 4000);

  // Endless and Chase runs emit placeChange at 400 m (4000 units)
  for (const make of [endlessStage, chaseStage]) {
    let run = newRun(make('dog'), { seed: 5 });
    assert.equal(run.place, 'garden');
    run = { ...run, dist: 3998, entities: [] };
    const next = step(run, 1 / 60, {});
    assert.ok(next.dist >= 4000);
    assert.equal(next.place, 'park');
    assert.ok(next.events.includes('placeChange'));
  }
});

test('obstacle mix follows current place for dog and cat with bench: 1 and trash: 1 extras', () => {
  for (const place of PLACE_CYCLE) {
    const dogMix = placeObstaclesFor('dog', place);
    const catMix = placeObstaclesFor('cat', place);
    for (const k of Object.keys(DOG_MIX[place])) assert.equal(dogMix[k], DOG_MIX[place][k]);
    for (const k of Object.keys(CAT_MIX[place])) assert.equal(catMix[k], CAT_MIX[place][k]);
    assert.equal(dogMix.bench, 1);
    assert.equal(dogMix.trash, 1);
    assert.equal(catMix.bench, 1);
    assert.equal(catMix.trash, 1);
  }
  const endless = endlessStage('dog');
  assert.deepEqual(stageObstaclesAt(endless, 8000), placeObstaclesFor('dog', 'beach'));

  // Surprise obstacles still wait until 500 m (5000 units)
  const early = buildChunk(endlessStage('dog'), { seed: 9, chunkIndex: 1, startX: 2500 });
  for (const e of early.entities) {
    if (e.kind === 'obstacle' && e.x < SURPRISE_ENDLESS_DIST) {
      assert.ok(!SURPRISE_OBSTACLES.has(e.type), `unexpected surprise ${e.type} at ${e.x}`);
    }
  }
});

// ---------- 3. Variety, breathers, treat runs & set pieces ----------

function generateRunStream(stage, seed, chunkCount = 30) {
  let entities = [];
  let startX = 420;
  let nextId = 0;
  let vState = null;
  for (let c = 0; c < chunkCount; c++) {
    const chunk = buildChunk(stage, { seed, chunkIndex: c, startX, nextId, varietyState: vState });
    entities.push(...chunk.entities);
    startX = chunk.nextX;
    nextId = chunk.nextId;
    vState = chunk.varietyState;
  }
  return { entities, totalDist: startX };
}

test('over 1000 generated obstacles: never 3 identical in a row and every 10 include >= 3 distinct types', () => {
  const allObs = [];
  for (const stage of [endlessStage('dog'), endlessStage('cat'), chaseStage('dog')]) {
    const { entities } = generateRunStream(stage, 17, 100);
    const obs = entities.filter((e) => e.kind === 'obstacle').sort((a, b) => a.x - b.x || a.id - b.id);
    assert.ok(obs.length >= 350, `expected >= 350 obstacles, got ${obs.length}`);
    for (let i = 2; i < obs.length; i++) {
      const same3 = obs[i].type === obs[i - 1].type && obs[i].type === obs[i - 2].type;
      assert.equal(same3, false, `${stage.id} had 3 ${obs[i].type} in a row at index ${i} (${obs[i].x})`);
    }
    for (let i = 0; i + 10 <= obs.length; i++) {
      const distinct = new Set(obs.slice(i, i + 10).map((o) => o.type));
      assert.ok(distinct.size >= 3, `${stage.id} window [${i}..${i + 9}] only had ${distinct.size} types: ${[...distinct]}`);
    }
    allObs.push(...obs);
  }
  assert.ok(allObs.length >= 1000, `checked ${allObs.length} obstacles`);
});

test('breathers (no obstacles with curving treats) and 3-lane treat runs appear in runs', () => {
  const { entities } = generateRunStream(endlessStage('dog'), 23, 25);
  const breathers = entities.filter((e) => e.kind === 'treat' && e.breather);
  const treatRuns = entities.filter((e) => e.kind === 'treat' && e.treatRun);
  const obs = entities.filter((e) => e.kind === 'obstacle');
  assert.ok(breathers.length >= 12, `expected breathers, got ${breathers.length}`);
  assert.ok(treatRuns.length >= 12, `expected treat runs, got ${treatRuns.length}`);
  // Treat run covers all 3 lanes
  assert.deepEqual([...new Set(treatRuns.map((t) => t.trackLane))].sort((a, b) => a - b), LANES);
  // No obstacle inside a treat-run or breather span
  for (const tr of treatRuns) {
    assert.ok(!obs.some((o) => Math.abs(o.x - tr.x) < 25), `obstacle overlapped treat run at ${tr.x}`);
  }
});

test('all 4 set pieces appear in a 3-minute run, never twice in a row, and zig-zag only on straight stretches', () => {
  for (const sp of ['dog', 'cat']) {
    const seed = 31;
    // 3 minutes at ~340 u/s is ~61,200 units (~28 chunks)
    const { entities } = generateRunStream(endlessStage(sp), seed, 28);
    const seq = [];
    for (const e of entities) {
      if (e.kind === 'obstacle' && SET_PIECE_IDS.includes(e.pattern)) {
        if (seq[seq.length - 1]?.pattern !== e.pattern || Math.abs(e.x - seq[seq.length - 1].endX) > 1200) {
          seq.push({ pattern: e.pattern, x: e.x, endX: e.x });
        } else {
          seq[seq.length - 1].endX = Math.max(seq[seq.length - 1].endX, e.x);
        }
        if (e.pattern === 'zigzag') {
          assert.equal(trackCurveAt(e.x, seed), 0, `${sp} zigzag placed on a bend at x=${e.x}`);
        }
      }
    }
    const seen = new Set(seq.map((s) => s.pattern));
    for (const id of SET_PIECE_IDS) {
      assert.ok(seen.has(id), `${sp} missing set piece ${id} in 3-minute run (saw: ${[...seen].join(', ')})`);
    }
    for (let i = 1; i < seq.length; i++) {
      assert.notEqual(seq[i].pattern, seq[i - 1].pattern, `${sp} set piece ${seq[i].pattern} appeared twice in a row`);
    }
  }
  // Ensure every set-piece pattern passes hasClearPath at min & max speeds
  for (const id of SET_PIECE_IDS) {
    const p = PATTERNS.find((pat) => pat.id === id);
    assert.ok(p);
    assert.ok(hasClearPath(p, { jd: 200, speed: 285 }));
    assert.ok(hasClearPath(p, { jd: 300, speed: 410 }));
  }
});

// ---------- 4. Hitboxes, Reduce Motion & Analytics ----------

test('hitboxes are unchanged', () => {
  const standing = playerBox({ ducking: false, height: 0 }, 500);
  assert.deepEqual(standing, { x: 506, y: 2, w: PLAYER_W - 12, h: PLAYER_H - 6 });
  const ducking = playerBox({ ducking: true, height: 0 }, 500);
  assert.deepEqual(ducking, { x: 506, y: 2, w: PLAYER_W - 12, h: DUCK_H - 6 });
  const ent = entityBox({ x: 100, y: 0, w: 58, h: 28 });
  assert.deepEqual(ent, { x: 106, y: 1, w: 46, h: 26 });
});

test('reduce_motion setting and analytics events follow spec', () => {
  const def = emptyGameState();
  assert.equal(effectiveReduceMotion(def.options, false), false);
  assert.equal(effectiveReduceMotion(def.options, true), true);
  assert.equal(effectiveReduceMotion({ reduceMotion: false }, true), false);
  assert.equal(effectiveReduceMotion({ reduceMotion: true }, false), true);
  assert.ok(ALLOWED_EVENTS.has('place_reached'));
  assert.ok(ALLOWED_EVENTS.has('reduce_motion'));
});
