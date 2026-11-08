import test from 'node:test';
import assert from 'node:assert/strict';
import {
  overlaps,
  playerBox,
  entityBox,
  buildLevel,
  newRun,
  step,
  applyPowerUp,
  currentSpeed,
  starsFor,
  scoreFor,
  modeScore,
  multiplierFor,
  COMBO_THRESHOLDS,
  buildChunk,
  ensureChunks,
  stepChaseGap,
  CHASE_GAP_START,
  CHASE_GAP_MAX,
  JUMP_V,
  DOUBLE_JUMP_V,
  resultOf,
  visible,
  PLAYER_H,
  DUCK_H,
  POWER_DURATION,
  SPEED_BOOST,
  REDUCED_MOTION_SPEED
} from '../src/game/engine.js';
import { STAGES, stagesFor, dailyStage, endlessStage, chaseStage, modesFor, chaserFor, ENDLESS_MAX_SPEED } from '../src/game/stages.js';
import { emptyProgress, isUnlocked, recordStage, suggestedStage, nextStageAfter } from '../src/game/progress.js';
import { emptyBestScores, bestScoreFor, recordBestScore, loadBestScores, saveBestScore, emptyGameState, saveGame } from '../src/game/gameStore.js';
import { pickRewardLine, pickCaughtLine } from '../src/lines.js';

const DT = 1 / 60;
const garden = STAGES.dog[0];

test('boxes overlap only when they really touch', () => {
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 11, w: 10, h: 10 }), false);
});

test('ducking makes the pet short enough to pass under a high obstacle; standing does not', () => {
  const high = { x: 0, y: 30, w: 46, h: 30 };
  const stand = playerBox({ height: 0, ducking: false }, 0);
  const duck = playerBox({ height: 0, ducking: true }, 0);
  assert.ok(stand.h > duck.h);
  assert.equal(overlaps(stand, entityBox(high)), true);
  assert.equal(overlaps(duck, entityBox(high)), false);
  assert.ok(PLAYER_H > DUCK_H);
});

test('jumping clears a low obstacle that standing would hit', () => {
  const low = { x: 0, y: 0, w: 46, h: 16 };
  assert.equal(overlaps(playerBox({ height: 0 }, 0), entityBox(low)), true);
  assert.equal(overlaps(playerBox({ height: 60 }, 0), entityBox(low)), false);
});

test('the same seed builds the same level; a different seed a different one', () => {
  const a = buildLevel(garden, 42);
  const b = buildLevel(garden, 42);
  const c = buildLevel(garden, 43);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.entities, c.entities);
  assert.ok(a.totalTreats > 10);
});

test('every stage is 45-90 seconds and later stages are faster and busier', () => {
  for (const species of ['dog', 'cat']) {
    const list = stagesFor(species);
    assert.equal(list.length, 6);
    list.forEach((s, i) => {
      assert.ok(s.seconds >= 45 && s.seconds <= 90, s.id);
      if (i) {
        assert.ok(s.speed > list[i - 1].speed);
        assert.ok(s.density > list[i - 1].density);
      }
    });
  }
  assert.deepEqual(
    STAGES.dog.map((s) => s.theme),
    ['garden', 'park', 'beach', 'braai', 'vet', 'home']
  );
});

test('dog stages use dog obstacles and cat stages cat obstacles', () => {
  const dogTypes = new Set(STAGES.dog.flatMap((s) => Object.keys(s.obstacles)));
  const catTypes = new Set(STAGES.cat.flatMap((s) => Object.keys(s.obstacles)));
  for (const k of ['puddle', 'vacuum', 'sprinkler', 'postman']) assert.ok(dogTypes.has(k), k);
  for (const k of ['cucumber', 'spray', 'vacuum', 'dog']) assert.ok(catTypes.has(k), k);
  assert.ok(!dogTypes.has('cucumber') && !catTypes.has('postman'));
});

test('gaps between obstacles leave room to land', () => {
  for (const stage of [...STAGES.dog, ...STAGES.cat]) {
    const obs = buildLevel(stage, 7).entities.filter((e) => e.kind === 'obstacle');
    for (let i = 1; i < obs.length; i++) assert.ok(obs[i].x - (obs[i - 1].x + obs[i - 1].w) > 150, stage.id);
  }
});

// A simple autopilot: jump at low obstacles, duck under high ones.
function autopilot(run) {
  const ahead = visible(run).filter((e) => e.kind === 'obstacle' && !e.hit && e.sx + e.w > 50 && e.sx < 160);
  const next = ahead[0];
  const lead = currentSpeed(run) * 0.3;
  return {
    jump: Boolean(next && next.lane === 'low' && next.sx - 64 < lead && run.player.height === 0),
    duck: Boolean(next && next.lane === 'high' && next.sx - 64 < 90)
  };
}

function play(stage, seed, pilot = () => ({})) {
  let run = newRun(stage, { seed });
  let guard = 0;
  while (!run.done && guard++ < 60 * 200) run = step(run, DT, pilot(run));
  return run;
}

test('careful play does better than doing nothing', () => {
  const idle = play(garden, 3);
  assert.equal(idle.done, true);
  assert.ok(idle.hits > 3);
  assert.equal(starsFor(idle), 1); // reaching the goal is always worth a star
  const good = play(garden, 3, autopilot);
  assert.ok(good.hits < idle.hits);
  assert.ok(good.collected > idle.collected);
  assert.ok(starsFor(good) >= 2);
  assert.ok(good.t >= 40 && good.t <= 95, `took ${good.t}s`);
});

test('stars: 1 for finishing, 2 for most treats with at most two bumps, 3 for nearly all with no bumps', () => {
  assert.equal(starsFor({ collected: 0, totalTreats: 50, hits: 4 }), 1);
  assert.equal(starsFor({ collected: 30, totalTreats: 50, hits: 2 }), 2);
  assert.equal(starsFor({ collected: 30, totalTreats: 50, hits: 3 }), 1);
  assert.equal(starsFor({ collected: 25, totalTreats: 50, hits: 0 }), 1);
  assert.equal(starsFor({ collected: 43, totalTreats: 50, hits: 0 }), 3);
  assert.equal(starsFor({ collected: 43, totalTreats: 50, hits: 1 }), 2);
});

test('hearts: each bump costs one; out of hearts loses the stage (no stars), treats are kept', () => {
  const idle = play(garden, 3);
  assert.equal(idle.done, true);
  assert.equal(idle.failed, true);
  assert.equal(idle.hearts, 0);
  assert.equal(idle.hits, garden.hearts);
  assert.ok(idle.dist < idle.length, 'stopped before the goal');
  const res = resultOf(idle);
  assert.equal(res.failed, true);
  assert.equal(res.stars, 0);
  assert.equal(res.treats, idle.treats);
});

test('harder stages: fewer hearts, faster, busier, and jump-then-duck pairs later on', () => {
  const [g, park, beach, , , home] = STAGES.dog;
  assert.equal(g.hearts, 5);
  assert.equal(park.hearts, 4);
  assert.equal(home.hearts, 3);
  assert.ok(home.speed > g.speed && home.density > g.density);
  assert.equal(g.combo, 0);
  const obs = buildLevel(beach, 4).entities.filter((e) => e.kind === 'obstacle');
  const close = obs.filter((e, i) => i > 0 && e.lane !== obs[i - 1].lane && e.x - (obs[i - 1].x + obs[i - 1].w) < 400);
  assert.ok(close.length > 0, 'Beach has some pairs');
});

test('every stage can be cleared: the autopilot finishes them all without running out of hearts', () => {
  for (const stage of [...STAGES.dog, ...STAGES.cat]) {
    for (const seed of [1, 2, 3]) {
      const run = play(stage, seed, autopilot);
      assert.equal(run.failed, false, `${stage.id} seed ${seed}: ${run.hits} bumps`);
      assert.ok(run.dist >= run.length, stage.id);
    }
  }
});

test('collecting a treat counts it once, double treats count twice', () => {
  const run = newRun(garden, { seed: 5 });
  const treat = { id: 999, kind: 'treat', type: 'bone', x: 10, y: 2, w: 22, h: 22 };
  let r = { ...run, entities: [treat], cursor: 0 };
  r = step(r, DT);
  assert.equal(r.treats, 1);
  assert.equal(r.collected, 1);
  assert.ok(r.events.includes('collect'));
  r = step(r, DT);
  assert.equal(r.treats, 1, 'a collected treat is gone');

  let d = applyPowerUp({ ...run, entities: [treat], cursor: 0 }, 'double');
  d = step(d, DT);
  assert.equal(d.treats, 2);
  assert.equal(d.collected, 1);
});

test('a hit counts, slows the pet and gives a moment of safety', () => {
  const run = newRun(garden, { seed: 5 });
  const box = { id: 1, kind: 'obstacle', type: 'puddle', lane: 'low', x: 10, y: 0, w: 52, h: 10, move: 0 };
  let r = step({ ...run, entities: [box, { ...box, id: 2, x: 30 }], cursor: 0 }, DT);
  assert.equal(r.hits, 1);
  assert.ok(r.events.includes('hit'));
  assert.ok(currentSpeed(r) < currentSpeed(run));
  r = step(r, DT);
  assert.equal(r.hits, 1, 'no second hit while flashing');
});

test('power-ups: shield takes one free hit, speed boost is faster and smashes through, magnet pulls treats', () => {
  const run = newRun(garden, { seed: 5 });
  const box = { id: 1, kind: 'obstacle', type: 'puddle', lane: 'low', x: 10, y: 0, w: 52, h: 10, move: 0 };

  let sh = applyPowerUp({ ...run, entities: [box], cursor: 0 }, 'shield');
  sh = step(sh, DT);
  assert.equal(sh.hits, 0);
  assert.equal(sh.power.shield, false);
  assert.ok(sh.events.includes('shield'));

  const fast = applyPowerUp(run, 'speed');
  assert.ok(Math.abs(currentSpeed(fast) - currentSpeed(run) * SPEED_BOOST) < 1e-9);
  const smash = step({ ...fast, entities: [box], cursor: 0 }, DT);
  assert.equal(smash.hits, 0);

  const treat = { id: 2, kind: 'treat', type: 'bone', x: 120, y: 2, w: 22, h: 22 };
  let plain = { ...run, entities: [treat], cursor: 0 };
  let mag = applyPowerUp(plain, 'magnet');
  for (let i = 0; i < 10; i++) {
    plain = step(plain, DT);
    mag = step(mag, DT);
  }
  assert.ok(mag.treats > plain.treats || mag.entities[0].x < plain.entities[0].x);

  // Timed power-ups wear off.
  let timed = applyPowerUp(run, 'magnet');
  const frames = Math.ceil(POWER_DURATION.magnet / DT) + 5;
  for (let i = 0; i < frames; i++) timed = step({ ...timed, entities: [], cursor: 0 }, DT);
  assert.equal(timed.power.magnet, 0);
});

test('power-up pickups on the course turn on their power', () => {
  const run = newRun(garden, { seed: 5 });
  const r = step({ ...run, entities: [{ id: 3, kind: 'power', type: 'magnet', x: 10, y: 2, w: 28, h: 28 }], cursor: 0 }, DT);
  assert.ok(r.power.magnet > 0);
  assert.ok(r.events.includes('power'));
});

test('jump input jumps from the ground and a tap just before landing is remembered', () => {
  let r = newRun(garden, { seed: 1 });
  r = step({ ...r, entities: [] }, DT, { jump: true });
  assert.ok(r.player.height > 0);
  assert.ok(r.events.includes('jump'));
  while (r.player.height > 6) r = step({ ...r, entities: [] }, DT);
  r = step({ ...r, entities: [] }, DT, { jump: true });
  let jumped = false;
  for (let i = 0; i < 10; i++) {
    r = step({ ...r, entities: [] }, DT);
    if (r.events.includes('jump')) jumped = true;
  }
  assert.ok(jumped);
});

test('reduce motion runs the stage a little slower', () => {
  const normal = newRun(garden, { seed: 1 });
  const calm = newRun(garden, { seed: 1, reduceMotion: true });
  assert.ok(Math.abs(currentSpeed(calm) - currentSpeed(normal) * REDUCED_MOTION_SPEED) < 1e-9);
});

test('start power-ups from a treat round are on from the first frame', () => {
  const r = newRun(garden, { seed: 1, startPowerUps: ['shield', 'magnet'] });
  assert.equal(r.power.shield, true);
  assert.ok(r.power.magnet > 0);
});

test('the daily run ends on time and scores treats, distance and bumps', () => {
  const run = play(dailyStage('dog'), 11, autopilot);
  assert.ok(run.t >= 75 && run.t < 75.1);
  const res = resultOf(run);
  assert.equal(res.daily, true);
  assert.equal(res.score, scoreFor(run));
  assert.equal(scoreFor({ treats: 10, dist: 2500, hits: 2 }), 100 + 100 - 30);
  assert.equal(scoreFor({ treats: 0, dist: 0, hits: 9 }), 0);
});

test('the daily run ends early when the hearts run out, and still gets a score', () => {
  const run = play(dailyStage('dog'), 11);
  assert.ok(run.done && run.t < 75);
  assert.equal(run.hearts, 0);
  const res = resultOf(run);
  assert.equal(res.failed, false);
  assert.equal(res.score, scoreFor(run));
});

test('stages open by playing: finishing one opens the next', () => {
  let p = emptyProgress();
  const [a, b, c] = STAGES.cat;
  assert.equal(isUnlocked(p, 'cat', a.id), true);
  assert.equal(isUnlocked(p, 'cat', b.id), false);
  p = recordStage(p, { stageId: a.id, stars: 1, treats: 3 });
  assert.equal(isUnlocked(p, 'cat', b.id), true);
  assert.equal(isUnlocked(p, 'cat', c.id), false);
  p = recordStage(p, { stageId: a.id, stars: 3, treats: 1 });
  p = recordStage(p, { stageId: a.id, stars: 2, treats: 9 });
  assert.equal(p.stars[a.id], 3, 'best stars kept');
  assert.equal(p.bestTreats[a.id], 9);
  assert.equal(p.plays[a.id], 3);
  assert.equal(suggestedStage(p, 'cat').id, b.id);
  assert.equal(nextStageAfter('cat', a.id).id, b.id);
  assert.equal(nextStageAfter('cat', STAGES.cat[5].id), null);
});

test('endless chunk generation never runs out and caps speed so it stays playable', () => {
  for (const sp of ['dog', 'cat']) {
    const stage = endlessStage(sp);
    let r = newRun(stage, { seed: 99 });
    assert.equal(r.length, Infinity);
    assert.ok(r.entities.length > 0);

    // Run for a long distance (with invulnerability so hearts never run out during the course check).
    for (let i = 0; i < 60 * 120; i++) {
      r = step({ ...r, invuln: 2 }, DT);
      const furthest = r.entities[r.entities.length - 1];
      assert.ok(furthest && furthest.x > r.dist + 400, `course ahead at step ${i}`);
    }
    assert.ok(r.dist > 30000);
    assert.ok(r.chunkIndex >= 10);
    assert.ok(currentSpeed(r) <= ENDLESS_MAX_SPEED + 1e-6);

    // Same seed + chunkIndex builds the exact same chunk.
    assert.deepEqual(buildChunk(stage, { seed: 7, chunkIndex: 2 }), buildChunk(stage, { seed: 7, chunkIndex: 2 }));
  }
});

test('score and multiplier maths: 1x -> 2x -> 3x -> 5x at combo thresholds, and combo resets on hit', () => {
  assert.deepEqual(
    COMBO_THRESHOLDS.map((t) => t.multiplier),
    [1, 2, 3, 5]
  );
  assert.equal(multiplierFor(0), 1);
  assert.equal(multiplierFor(COMBO_THRESHOLDS[1].combo), 2);
  assert.equal(multiplierFor(COMBO_THRESHOLDS[2].combo), 3);
  assert.equal(multiplierFor(COMBO_THRESHOLDS[3].combo), 5);
  assert.equal(modeScore({ dist: 250.8, treats: 6, multiplier: 3 }), 250 + 18);

  // Collect treats in a run to reach 5x, then take a hit and verify reset to 1x.
  let r = newRun(endlessStage('dog'), { seed: 5 });
  const need = COMBO_THRESHOLDS[3].combo;
  for (let i = 0; i < need; i++) {
    const treat = { id: 1000 + i, kind: 'treat', type: 'bone', x: r.dist + 10, y: 2, w: 22, h: 22 };
    r = step({ ...r, entities: [treat], cursor: 0 }, DT);
  }
  assert.equal(r.combo, need);
  assert.equal(r.multiplier, 5);
  assert.equal(r.score, Math.floor(r.dist) + r.treats * 5);

  const obstacle = { id: 2000, kind: 'obstacle', type: 'puddle', lane: 'low', x: r.dist + 10, y: 0, w: 52, h: 10, move: 0 };
  r = step({ ...r, entities: [obstacle], cursor: 0 }, DT);
  assert.equal(r.hits, 1);
  assert.equal(r.combo, 0);
  assert.equal(r.multiplier, 1);
  assert.equal(r.score, Math.floor(r.dist) + r.treats * 1);
});

test('double jump: second tap in the air gives one smaller extra jump and resets on landing', () => {
  assert.ok(DOUBLE_JUMP_V < JUMP_V && DOUBLE_JUMP_V > 0);
  let r = newRun(garden, { seed: 1 });
  r = step({ ...r, entities: [] }, DT, { jump: true });
  assert.ok(r.player.height > 0);
  assert.equal(r.player.doubleJumped, false);

  // Step a few frames into the jump, then tap jump again for the double jump.
  for (let i = 0; i < 8; i++) r = step({ ...r, entities: [] }, DT);
  r = step({ ...r, entities: [] }, DT, { jump: true });
  assert.equal(r.player.doubleJumped, true);
  assert.ok(r.events.includes('doubleJump'));
  const vyAfterDouble = r.player.vy;
  assert.ok(vyAfterDouble > 0 && vyAfterDouble < JUMP_V);

  // A third tap while still in the air does not jump again.
  r = step({ ...r, entities: [] }, DT);
  r = step({ ...r, entities: [] }, DT, { jump: true });
  assert.ok(!r.events.includes('doubleJump'));

  // Landing resets doubleJumped so the pet can double-jump again on the next jump.
  while (r.player.height > 0) r = step({ ...r, entities: [] }, DT);
  assert.equal(r.player.doubleJumped, false);
  r = step({ ...r, entities: [] }, DT, { jump: true });
  for (let i = 0; i < 6; i++) r = step({ ...r, entities: [] }, DT);
  r = step({ ...r, entities: [] }, DT, { jump: true });
  assert.equal(r.player.doubleJumped, true);
  assert.ok(r.events.includes('doubleJump'));
});

test('chase mode: gap shrinks over time and sharply on hit, grows on treats/streak/speed, and caught at 0', () => {
  assert.equal(chaserFor('dog').emoji, '🛁');
  assert.equal(chaserFor('cat').emoji, '🐕');

  // 1) Pure gap maths: shrinks over time, drops sharply on hit, grows on treats, clean streak and speed boost.
  const shrunk = stepChaseGap(70, 1, {});
  assert.ok(shrunk < 70 && shrunk > 60);
  const hitDrop = stepChaseGap(70, DT, { hits: 1 });
  assert.ok(70 - hitDrop >= 20, 'sharp drop on hit');
  const treatGrow = stepChaseGap(70, DT, { treats: 1 });
  assert.ok(treatGrow > 70, 'treat grows the gap');
  const streakGrow = stepChaseGap(70, 1, { cleanStreak: true });
  assert.ok(streakGrow > 70, 'clean streak grows the gap');
  const speedGrow = stepChaseGap(70, 1, { speedBoost: true });
  assert.ok(speedGrow > streakGrow, 'speed power-up grows it more');
  assert.equal(stepChaseGap(99, 2, { speedBoost: true }), CHASE_GAP_MAX);
  assert.equal(stepChaseGap(10, 1, { hits: 1 }), 0);

  // 2) Full Chase run: hits and time shrink the gap to 0 -> caught -> run over.
  let r = newRun(chaseStage('dog'), { seed: 3 });
  assert.equal(r.chaseGap, CHASE_GAP_START);
  r = step({ ...r, entities: [] }, 0.05);
  assert.ok(r.chaseGap < CHASE_GAP_START);

  // Speed boost in a run grows the gap.
  let boosted = applyPowerUp({ ...r, entities: [] }, 'speed');
  const beforeBoost = boosted.chaseGap;
  for (let i = 0; i < 20; i++) boosted = step({ ...boosted, entities: [] }, DT);
  assert.ok(boosted.chaseGap > beforeBoost);

  // Repeated hits catch the pet (gap reaches 0).
  let caughtRun = newRun(chaseStage('cat'), { seed: 4 });
  let guard = 0;
  while (!caughtRun.done && guard++ < 600) {
    const obs = { id: 5000 + guard, kind: 'obstacle', type: 'cucumber', lane: 'low', x: caughtRun.dist + 10, y: 0, w: 46, h: 16, move: 0 };
    caughtRun = step({ ...caughtRun, invuln: 0, entities: [obs], cursor: 0 }, 0.05);
  }
  assert.equal(caughtRun.done, true);
  assert.equal(caughtRun.caught, true);
  assert.equal(caughtRun.chaseGap, 0);
  assert.ok(caughtRun.events.includes('caught'));
  const res = resultOf(caughtRun);
  assert.equal(res.chase, true);
  assert.equal(res.caught, true);
});

test('reduce motion still slows endless and chase modes', () => {
  for (const stage of [...modesFor('dog'), ...modesFor('cat')]) {
    const normal = newRun(stage, { seed: 1 });
    const calm = newRun(stage, { seed: 1, reduceMotion: true });
    assert.ok(Math.abs(currentSpeed(calm) - currentSpeed(normal) * REDUCED_MOTION_SPEED) < 1e-9, stage.id);
  }
});

test('best score is saved and loaded per species per mode, and reward/caught pet lines work', async () => {
  await saveGame(emptyGameState());
  assert.deepEqual(await loadBestScores(), emptyBestScores());

  const r1 = await saveBestScore('dog', 'endless', 320);
  assert.equal(r1.best, 320);
  assert.equal(r1.isNewBest, true);

  const r2 = await saveBestScore('dog', 'endless', 200);
  assert.equal(r2.best, 320, 'lower score does not overwrite best');
  assert.equal(r2.isNewBest, false);

  const r3 = await saveBestScore('dog', 'chase', 510);
  assert.equal(r3.best, 510);
  assert.equal(r3.isNewBest, true);

  const r4 = await saveBestScore('cat', 'endless', 440);
  assert.equal(r4.best, 440);
  assert.equal(r4.isNewBest, true);

  const loaded = await loadBestScores();
  assert.equal(loaded.dog.endless, 320);
  assert.equal(loaded.dog.chase, 510);
  assert.equal(loaded.cat.endless, 440);
  assert.equal(loaded.cat.chase, 0);
  assert.equal(bestScoreFor({ bestScores: loaded }, 'dog', 'chase'), 510);
  assert.equal(recordBestScore({ bestScores: loaded }, 'cat', 'chase', 150).isNewBest, true);

  // Translator reward line and caught line per species in en, af and zu.
  for (const species of ['dog', 'cat']) {
    for (const lang of ['en', 'af', 'zu']) {
      const reward = pickRewardLine({ species, personality: 'boet' }, { lang });
      const caught = pickCaughtLine({ species, personality: 'boet' }, { lang });
      assert.ok(reward.text && reward.text.length > 3, `reward ${species} ${lang}`);
      assert.ok(caught.text && caught.text.length > 3, `caught ${species} ${lang}`);
    }
  }
});
