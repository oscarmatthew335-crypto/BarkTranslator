// The runner's rules as plain functions (no React, no timers), so they can be
// tested and the screen only has to draw whatever state comes out.
//
// World units: the view is VIEW_W wide and VIEW_H tall; the pet's feet sit on
// GROUND. Heights are measured upward from the ground. The pet stays at the
// same spot on screen while the world scrolls by `dist`.

import { makeRng, pick, hashString } from './random';
import { OBSTACLES, COLLECTIBLES, ENDLESS_MAX_SPEED } from './stages';

export const VIEW_W = 400;
export const VIEW_H = 220;
export const GROUND = 186;
export const PLAYER_X = 64;
export const PLAYER_W = 46;
export const PLAYER_H = 40;
export const DUCK_H = 22;
export const GRAVITY = 1900;
export const JUMP_V = 700;
export const DOUBLE_JUMP_V = 540; // smaller second jump while in the air
export const JUMP_BUFFER = 0.12; // a tap just before landing still jumps
export const SWIPE_DUCK_S = 0.6; // a swipe down ducks for this long
export const HIT_INVULN_S = 1.2;
export const HIT_SLOW_S = 0.6;

export const POWER_DURATION = { speed: 5, magnet: 8, double: 10 }; // shield lasts until it is used
export const SPEED_BOOST = 1.4;
export const MAGNET_RANGE = 150;
export const MAGNET_PULL = 520;
export const REDUCED_MOTION_SPEED = 0.8;

// Combo thresholds for the multiplier: 1x -> 2x -> 3x -> 5x.
export const COMBO_THRESHOLDS = [
  { combo: 0, multiplier: 1 },
  { combo: 3, multiplier: 2 },
  { combo: 6, multiplier: 3 },
  { combo: 10, multiplier: 5 }
];

export const CHUNK_LENGTH = 2200;
export const CHUNK_LOOKAHEAD = 1600;

// Chase mode gap rules (0 = caught, 100 = max lead).
export const CHASE_GAP_MAX = 100;
export const CHASE_GAP_START = 70;
export const CHASE_SHRINK_RATE = 3; // shrinks slowly over time (per second)
export const CHASE_HIT_DROP = 26; // shrinks sharply on each hit
export const CHASE_TREAT_GAIN = 4; // each treat grows the gap
export const CHASE_STREAK_GAIN = 5; // clean streak grows the gap (per second)
export const CHASE_SPEED_GAIN = 12; // speed power-up grows it more (per second)
export const CHASE_CLEAN_STREAK_S = 3;

const TREAT_W = 22;
const POWER_W = 28;

// --- shapes --------------------------------------------------------------

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// The pet's box in world units. y/h measured upward from the ground, so a box
// is { x, y: bottom, w, h }. A little smaller than the drawing, to be kind.
export function playerBox(player, dist) {
  const h = player.ducking && player.height <= 0 ? DUCK_H : PLAYER_H;
  return { x: dist + 6, y: player.height + 2, w: PLAYER_W - 12, h: h - 6 };
}

export function entityBox(e) {
  return { x: e.x + 3, y: e.y + 1, w: e.w - 6, h: Math.max(2, e.h - 2) };
}

// --- building a stage -----------------------------------------------------

// How far the pet travels during one jump at this speed.
export const jumpDistance = (speed) => ((2 * JUMP_V) / GRAVITY) * speed;

function weighted(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

// Stage length in world units: base speed plus half the ramp, for its seconds.
export const stageLength = (stage) => Math.round((stage.speed + stage.ramp / 2) * stage.seconds);

// Lay out obstacles, treats and power-ups along the stage. The same seed gives
// the same layout. Gaps always leave room to land and react.
export function buildLevel(stage, seed) {
  const rng = makeRng(seed);
  const length = stageLength(stage);
  const treatTypes = COLLECTIBLES[stage.species] || COLLECTIBLES.dog;
  const entities = [];
  let id = 0;
  let x = 420;
  const powerAt = new Set();
  const powerCount = stage.daily ? 4 : Math.min(3, stage.powerUps.length ? 1 + Math.floor(stage.index / 2) : 0);
  for (let i = 0; i < powerCount; i++) powerAt.add(Math.floor(((i + 1) / (powerCount + 1)) * 100));

  while (x < length - 260) {
    const progress = x / length;
    const speed = stage.speed + stage.ramp * progress;
    const type = weighted(rng, stage.obstacles);
    const o = OBSTACLES[type];
    entities.push({ id: id++, kind: 'obstacle', type, x, y: o.y, w: o.w, h: o.h, lane: o.lane, move: o.move });

    // Treats: an arc over a low obstacle, or a line on the ground under a high one.
    const treat = pick(rng, treatTypes);
    if (rng() < 0.8) {
      // Along the path of a well-timed jump, so a good jump collects them all.
      const jd = jumpDistance(speed);
      const centre = x + o.w / 2;
      for (let k = -1; k <= 1; k++) {
        if (o.lane === 'low') {
          const tt = (jd / 2 + k * jd * 0.28) / speed;
          const h = JUMP_V * tt - (GRAVITY / 2) * tt * tt;
          entities.push({ id: id++, kind: 'treat', type: treat, x: centre + k * jd * 0.28 - TREAT_W / 2, y: h + 6, w: TREAT_W, h: TREAT_W });
        } else {
          entities.push({ id: id++, kind: 'treat', type: treat, x: centre + k * 26 - TREAT_W / 2, y: 2, w: TREAT_W, h: TREAT_W });
        }
      }
    }

    // A pair: jump one, then duck the next (or the other way round) soon after. The gap is the jump plus about
    // a third of a second on the ground to react, so it is always possible.
    let pair = 0;
    if (stage.combo && rng() < stage.combo && x > 900) {
      const other = Object.keys(stage.obstacles).filter((k) => OBSTACLES[k].lane !== o.lane && !OBSTACLES[k].move);
      if (other.length) {
        const t2 = pick(rng, other);
        const o2 = OBSTACLES[t2];
        const x2 = x + o.w + jumpDistance(speed) * (o.lane === 'low' ? 1 : 0.5) + speed * 0.34;
        entities.push({ id: id++, kind: 'obstacle', type: t2, x: x2, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: 0 });
        pair = x2 + o2.w - (x + o.w);
      }
    }

    const minGap = jumpDistance(speed) * 1.25 + o.w + 40 + pair;
    const gap = minGap + (rng() * 260) / stage.density;
    const mid = x + o.w + gap / 2;

    // A row of treats between obstacles on the ground, sometimes.
    if (rng() < 0.55) {
      for (let k = 0; k < 3; k++) {
        entities.push({ id: id++, kind: 'treat', type: treat, x: mid - 40 + k * 28, y: 2, w: TREAT_W, h: TREAT_W });
      }
    }
    const pct = Math.floor(progress * 100);
    for (const p of powerAt) {
      if (pct >= p) {
        powerAt.delete(p);
        entities.push({ id: id++, kind: 'power', type: pick(rng, stage.powerUps), x: mid + 50, y: 46, w: POWER_W, h: POWER_W });
        break;
      }
    }
    x += o.w + gap;
  }
  entities.sort((a, b) => a.x - b.x);
  const totalTreats = entities.filter((e) => e.kind === 'treat').length;
  return { entities, length, totalTreats };
}

// Build one chunk of an endless or chase course. Deterministic per (seed, chunkIndex).
export function buildChunk(stage, { seed = 1, chunkIndex = 0, startX = 420, nextId = 0 } = {}) {
  const rng = makeRng(hashString(`${seed}:chunk:${chunkIndex}`));
  const treatTypes = COLLECTIBLES[stage.species] || COLLECTIBLES.dog;
  const entities = [];
  let id = nextId;
  let x = startX;
  const endX = startX + CHUNK_LENGTH;
  const maxSpeed = stage.maxSpeed || ENDLESS_MAX_SPEED;
  let powerPlaced = false;

  while (x < endX) {
    const progress = Math.min(1, x / 18000);
    const speed = Math.min(maxSpeed, stage.speed + (stage.ramp || 180) * progress);
    const type = weighted(rng, stage.obstacles);
    const o = OBSTACLES[type];
    entities.push({ id: id++, kind: 'obstacle', type, x, y: o.y, w: o.w, h: o.h, lane: o.lane, move: o.move });

    const treat = pick(rng, treatTypes);
    if (rng() < 0.8) {
      const jd = jumpDistance(speed);
      const centre = x + o.w / 2;
      for (let k = -1; k <= 1; k++) {
        if (o.lane === 'low') {
          const tt = (jd / 2 + k * jd * 0.28) / speed;
          const h = JUMP_V * tt - (GRAVITY / 2) * tt * tt;
          entities.push({ id: id++, kind: 'treat', type: treat, x: centre + k * jd * 0.28 - TREAT_W / 2, y: h + 6, w: TREAT_W, h: TREAT_W });
        } else {
          entities.push({ id: id++, kind: 'treat', type: treat, x: centre + k * 26 - TREAT_W / 2, y: 2, w: TREAT_W, h: TREAT_W });
        }
      }
    }

    let pair = 0;
    // Obstacle combos in endless and chase: either a close high+low double-jump pair, or a jump-then-duck pair.
    if (stage.doubleJumpCombo && rng() < stage.doubleJumpCombo && (chunkIndex > 0 || x > 650)) {
      const lowKeys = Object.keys(stage.obstacles).filter((k) => OBSTACLES[k].lane === 'low' && !OBSTACLES[k].move);
      const highKeys = Object.keys(stage.obstacles).filter((k) => OBSTACLES[k].lane === 'high' && !OBSTACLES[k].move);
      const pool = o.lane === 'high' && lowKeys.length ? lowKeys : highKeys.length ? highKeys : lowKeys;
      if (pool.length) {
        const t2 = pick(rng, pool);
        const o2 = OBSTACLES[t2];
        const x2 = x + o.w + Math.round(jumpDistance(speed) * 0.62);
        entities.push({ id: id++, kind: 'obstacle', type: t2, x: x2, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: 0, doubleJumpPair: true });
        // High treats along the double-jump arc
        entities.push({ id: id++, kind: 'treat', type: treat, x: x2 + o2.w / 2 - TREAT_W / 2, y: 88, w: TREAT_W, h: TREAT_W });
        pair = x2 + o2.w - (x + o.w);
      }
    } else if (stage.combo && rng() < stage.combo && (chunkIndex > 0 || x > 900)) {
      const other = Object.keys(stage.obstacles).filter((k) => OBSTACLES[k].lane !== o.lane && !OBSTACLES[k].move);
      if (other.length) {
        const t2 = pick(rng, other);
        const o2 = OBSTACLES[t2];
        const x2 = x + o.w + jumpDistance(speed) * (o.lane === 'low' ? 1 : 0.5) + speed * 0.34;
        entities.push({ id: id++, kind: 'obstacle', type: t2, x: x2, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: 0 });
        pair = x2 + o2.w - (x + o.w);
      }
    }

    const minGap = jumpDistance(speed) * 1.25 + o.w + 40 + pair;
    const gap = minGap + (rng() * 260) / (stage.density || 1.5);
    const mid = x + o.w + gap / 2;

    if (rng() < 0.55) {
      for (let k = 0; k < 3; k++) {
        entities.push({ id: id++, kind: 'treat', type: treat, x: mid - 40 + k * 28, y: 2, w: TREAT_W, h: TREAT_W });
      }
    }
    if (!powerPlaced && stage.powerUps?.length && x - startX >= CHUNK_LENGTH * 0.45 && rng() < 0.65) {
      powerPlaced = true;
      entities.push({ id: id++, kind: 'power', type: pick(rng, stage.powerUps), x: mid + 50, y: 46, w: POWER_W, h: POWER_W });
    }
    x += o.w + gap;
  }
  entities.sort((a, b) => a.x - b.x);
  const treatsInChunk = entities.filter((e) => e.kind === 'treat').length;
  return { entities, nextX: x, nextId: id, chunkIndex: chunkIndex + 1, treatsInChunk };
}

export function ensureChunks(run) {
  if (!run.stage.endless && !run.stage.chase) return run;
  let { entities, cursor, generatedTo, chunkIndex, nextEntityId, totalTreats } = run;
  if (generatedTo - run.dist >= CHUNK_LOOKAHEAD) return run;
  entities = entities.slice();
  if (cursor > 60) {
    entities = entities.slice(cursor);
    cursor = 0;
  }
  while (generatedTo - run.dist < CHUNK_LOOKAHEAD) {
    const chunk = buildChunk(run.stage, { seed: run.seed, chunkIndex, startX: generatedTo, nextId: nextEntityId });
    entities.push(...chunk.entities);
    generatedTo = chunk.nextX;
    chunkIndex = chunk.chunkIndex;
    nextEntityId = chunk.nextId;
    totalTreats += chunk.treatsInChunk;
  }
  return { ...run, entities, cursor, generatedTo, chunkIndex, nextEntityId, totalTreats };
}

// --- combos, multiplier and chase gap --------------------------------------

export function multiplierFor(combo = 0) {
  let m = 1;
  for (const t of COMBO_THRESHOLDS) {
    if (combo >= t.combo) m = t.multiplier;
  }
  return m;
}

// Endless and chase score: distance + treats * multiplier.
export function modeScore({ dist = 0, distance, treats = 0, multiplier = 1 } = {}) {
  const d = Math.floor(distance != null ? distance : dist);
  return Math.max(0, d + treats * multiplier);
}

export function stepChaseGap(gap, dt, { hits = 0, treats = 0, cleanStreak = false, speedBoost = false } = {}) {
  let next = gap - CHASE_SHRINK_RATE * dt;
  if (cleanStreak) next += CHASE_STREAK_GAIN * dt;
  if (speedBoost) next += CHASE_SPEED_GAIN * dt;
  if (treats > 0) next += treats * CHASE_TREAT_GAIN;
  if (hits > 0) next -= hits * CHASE_HIT_DROP;
  return Math.max(0, Math.min(CHASE_GAP_MAX, next));
}

// --- running ---------------------------------------------------------------

export function newRun(stage, { seed = 1, startPowerUps = [], reduceMotion = false } = {}) {
  const isChunked = Boolean(stage.endless || stage.chase);
  const level = isChunked ? { entities: [], length: Infinity, totalTreats: 0 } : buildLevel(stage, seed);
  let run = {
    stage: {
      id: stage.id,
      mode: stage.mode || (stage.daily ? 'daily' : stage.endless ? 'endless' : stage.chase ? 'chase' : 'stage'),
      species: stage.species || 'dog',
      speed: stage.speed,
      ramp: stage.ramp,
      maxSpeed: stage.maxSpeed || ENDLESS_MAX_SPEED,
      density: stage.density || 1.5,
      combo: stage.combo || 0,
      doubleJumpCombo: stage.doubleJumpCombo || 0,
      obstacles: stage.obstacles,
      powerUps: stage.powerUps || [],
      seconds: stage.seconds,
      daily: Boolean(stage.daily),
      endless: Boolean(stage.endless),
      chase: Boolean(stage.chase),
      chaser: stage.chaser || null,
      hearts: stage.hearts || 3
    },
    seed,
    t: 0,
    dist: 0,
    speed: stage.speed,
    speedScale: reduceMotion ? REDUCED_MOTION_SPEED : 1,
    length: level.length,
    totalTreats: level.totalTreats,
    entities: level.entities,
    cursor: 0,
    generatedTo: isChunked ? 420 : level.length,
    chunkIndex: 0,
    nextEntityId: isChunked ? 0 : level.entities.length,
    player: { height: 0, vy: 0, ducking: false, duckTimer: 0, jumpBuffer: 0, doubleJumped: false },
    treats: 0,
    collected: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    score: 0,
    hits: 0,
    hearts: stage.hearts || 3,
    chaseGap: stage.chase ? CHASE_GAP_START : null,
    cleanTime: 0,
    caught: false,
    failed: false,
    invuln: 0,
    slow: 0,
    power: { speed: 0, magnet: 0, double: 0, shield: false },
    powerUpsUsed: 0,
    done: false,
    events: []
  };
  if (isChunked) run = ensureChunks(run);
  return startPowerUps.reduce((r, p) => applyPowerUp(r, p), run);
}

export function applyPowerUp(run, type) {
  const power = { ...run.power };
  if (type === 'shield') power.shield = true;
  else if (POWER_DURATION[type]) power[type] = Math.max(power[type], POWER_DURATION[type]);
  else return run;
  return { ...run, power, powerUpsUsed: run.powerUpsUsed + 1 };
}

// Current running speed: the stage ramps up toward the end (capped in endless
// and chase modes so it stays playable); a speed boost is faster; a hit slows
// the pet briefly; reduce-motion runs a little slower.
export function currentSpeed(run) {
  let v;
  if (run.stage.endless || run.stage.chase) {
    const progress = Math.min(1, run.t / 90);
    const maxSpeed = run.stage.maxSpeed || ENDLESS_MAX_SPEED;
    v = Math.min(maxSpeed, run.stage.speed + (run.stage.ramp || 180) * progress);
  } else {
    const progress = run.stage.daily ? Math.min(1, run.t / run.stage.seconds) : Math.min(1, run.dist / run.length);
    v = run.stage.speed + run.stage.ramp * progress;
  }
  if (run.power.speed > 0) v *= SPEED_BOOST;
  if (run.slow > 0) v *= 0.6;
  return v * run.speedScale;
}

// input: { jump: true on the frame the player tapped, duck: true while held,
// swipeDuck: true on the frame of a swipe down }
export function step(run, dt, input = {}) {
  if (run.done) return run;
  dt = Math.min(Math.max(dt, 0), 1 / 20);
  if (run.stage.endless || run.stage.chase) run = ensureChunks(run);
  const events = [];
  const player = { ...run.player };
  const power = { ...run.power };
  let { treats, collected, combo = 0, maxCombo = 0, multiplier = 1, hits, invuln, slow, hearts, cleanTime = 0 } = run;

  // timers
  for (const k of Object.keys(POWER_DURATION)) power[k] = Math.max(0, power[k] - dt);
  invuln = Math.max(0, invuln - dt);
  slow = Math.max(0, slow - dt);

  // pet movement
  if (input.swipeDuck) player.duckTimer = SWIPE_DUCK_S;
  else player.duckTimer = Math.max(0, player.duckTimer - dt);
  const wantDuck = Boolean(input.duck) || player.duckTimer > 0;

  // Check if the pet is just about to land on this frame, so a pre-landing tap
  // buffers a full ground jump instead of consuming the air double-jump.
  const nextVy = player.vy - GRAVITY * dt * (wantDuck ? 2 : 1);
  const landsThisStep = player.height > 0 && player.height + nextVy * dt <= 0;

  if (input.jump) player.jumpBuffer = JUMP_BUFFER;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

  if (player.height <= 0 && player.jumpBuffer > 0) {
    player.vy = JUMP_V;
    player.jumpBuffer = 0;
    player.duckTimer = 0;
    player.doubleJumped = false;
    events.push('jump');
  } else if (input.jump && player.height > 0 && !landsThisStep && !player.doubleJumped) {
    player.vy = DOUBLE_JUMP_V;
    player.doubleJumped = true;
    player.jumpBuffer = 0;
    player.duckTimer = 0;
    events.push('jump');
    events.push('doubleJump');
  }
  if (player.height > 0 || player.vy > 0) {
    // Ducking in the air drops the pet faster.
    player.vy -= GRAVITY * dt * (wantDuck ? 2 : 1);
    player.height = Math.max(0, player.height + player.vy * dt);
    if (player.height === 0) {
      player.vy = 0;
      player.doubleJumped = false;
    }
  }
  player.ducking = wantDuck && player.height <= 0;

  const speed = currentSpeed({ ...run, power, slow });
  const dist = run.dist + speed * dt;
  const t = run.t + dt;

  // entities near the pet
  const entities = run.entities;
  let cursor = run.cursor;
  while (cursor < entities.length && entities[cursor].x + entities[cursor].w < dist - PLAYER_X - 40) cursor++;
  const pBox = playerBox(player, dist);
  const changed = new Map();
  let frameTreats = 0;
  let frameHits = 0;
  for (let i = cursor; i < entities.length; i++) {
    let e = entities[i];
    if (e.x > dist + VIEW_W + 60) break;
    if (e.gone) continue;
    if (e.move) {
      e = { ...e, x: e.x - e.move * dt };
      changed.set(i, e);
    }
    if (e.kind === 'treat' && power.magnet > 0) {
      const dx = dist + PLAYER_W / 2 - (e.x + e.w / 2);
      const dy = player.height + PLAYER_H / 2 - (e.y + e.h / 2);
      const d = Math.hypot(dx, dy);
      if (d < MAGNET_RANGE && d > 1) {
        const k = Math.min(1, (MAGNET_PULL * dt) / d);
        e = { ...e, x: e.x + dx * k, y: e.y + dy * k };
        changed.set(i, e);
      }
    }
    if (!overlaps(pBox, entityBox(e))) continue;
    if (e.kind === 'treat') {
      const value = power.double > 0 ? 2 : 1;
      treats += value;
      collected += 1;
      frameTreats += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      multiplier = multiplierFor(combo);
      changed.set(i, { ...e, gone: true });
      events.push('collect');
    } else if (e.kind === 'power') {
      changed.set(i, { ...e, gone: true });
      if (e.type === 'shield') power.shield = true;
      else power[e.type] = Math.max(power[e.type], POWER_DURATION[e.type]);
      events.push('power');
    } else if (e.kind === 'obstacle' && !e.hit) {
      if (invuln > 0 || power.speed > 0) {
        if (power.speed > 0 && invuln <= 0) {
          changed.set(i, { ...e, hit: true });
          events.push('smash');
        }
        continue;
      }
      changed.set(i, { ...e, hit: true });
      if (power.shield) {
        power.shield = false;
        invuln = HIT_INVULN_S;
        events.push('shield');
      } else {
        hits += 1;
        frameHits += 1;
        combo = 0;
        multiplier = 1;
        cleanTime = 0;
        if (!run.stage.chase) hearts = Math.max(0, hearts - 1);
        invuln = HIT_INVULN_S;
        slow = HIT_SLOW_S;
        events.push('hit');
      }
    }
  }
  if (frameHits === 0) cleanTime += dt;

  let nextEntities = entities;
  if (changed.size) {
    nextEntities = entities.slice();
    changed.forEach((e, i) => (nextEntities[i] = e));
  }

  let chaseGap = run.chaseGap;
  let caught = false;
  if (run.stage.chase) {
    const cleanStreak = cleanTime >= CHASE_CLEAN_STREAK_S && combo >= 2;
    chaseGap = stepChaseGap(chaseGap ?? CHASE_GAP_START, dt, {
      hits: frameHits,
      treats: frameTreats,
      cleanStreak,
      speedBoost: power.speed > 0
    });
    caught = chaseGap <= 0;
  }

  const score = modeScore({ dist, treats, multiplier });

  // Out of hearts: the stage is lost (treats picked up are kept). Endless ends on hearts <= 0; Chase ends when caught.
  const outOfHearts = !run.stage.chase && hearts <= 0;
  let done = false;
  if (run.stage.chase) done = caught;
  else if (run.stage.endless) done = outOfHearts;
  else if (run.stage.daily) done = outOfHearts || t >= run.stage.seconds;
  else done = outOfHearts || dist >= run.length;

  if (done) {
    if (caught) events.push('caught');
    else if (outOfHearts) events.push('out');
    else events.push('finish');
  }

  let nextRun = {
    ...run,
    t,
    dist,
    speed,
    player,
    power,
    treats,
    collected,
    combo,
    maxCombo,
    multiplier,
    score,
    hits,
    hearts,
    chaseGap,
    cleanTime,
    caught,
    failed: outOfHearts && !run.stage.daily && !run.stage.endless,
    invuln,
    slow,
    cursor,
    entities: nextEntities,
    done,
    powerUpsUsed: run.powerUpsUsed + events.filter((e) => e === 'power').length,
    events
  };
  if (!done && (run.stage.endless || run.stage.chase)) nextRun = ensureChunks(nextRun);
  return nextRun;
}

// Entities to draw this frame, with their position on screen.
export function visible(run) {
  const out = [];
  for (let i = run.cursor; i < run.entities.length; i++) {
    const e = run.entities[i];
    const sx = e.x - run.dist + PLAYER_X;
    if (sx > VIEW_W + 10) break;
    if (e.gone || sx + e.w < -10) continue;
    out.push({ ...e, sx, sy: GROUND - e.y - e.h });
  }
  return out;
}

// --- results ----------------------------------------------------------------

// 1 star for reaching the goal, 2 for most of the treats with at most two
// bumps, 3 for nearly all the treats without a single bump.
export function starsFor({ collected, totalTreats, hits }) {
  const ratio = totalTreats > 0 ? collected / totalTreats : 1;
  if (ratio >= 0.85 && hits === 0) return 3;
  if (ratio >= 0.6 && hits <= 2) return 2;
  return 1;
}

// Daily run score: treats count most, distance a little, bumps cost a bit.
export function scoreFor({ treats, dist, hits }) {
  return Math.max(0, treats * 10 + Math.floor(dist / 25) - hits * 15);
}

export function resultOf(run) {
  const isEndlessOrChase = Boolean(run.stage.endless || run.stage.chase);
  return {
    stageId: run.stage.id,
    mode: run.stage.mode || (run.stage.daily ? 'daily' : 'stage'),
    daily: Boolean(run.stage.daily),
    endless: Boolean(run.stage.endless),
    chase: Boolean(run.stage.chase),
    caught: Boolean(run.caught),
    treats: run.treats,
    collected: run.collected,
    totalTreats: run.totalTreats,
    combo: run.combo || 0,
    maxCombo: run.maxCombo || 0,
    multiplier: run.multiplier || 1,
    hits: run.hits,
    failed: Boolean(run.failed),
    seconds: Math.round(run.t),
    stars: run.stage.daily || isEndlessOrChase || run.failed ? 0 : starsFor(run),
    score: isEndlessOrChase ? modeScore(run) : run.stage.daily ? scoreFor(run) : 0
  };
}
