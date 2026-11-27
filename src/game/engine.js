// The runner's rules as plain functions (no React, no timers), so they can be
// tested and the screen only has to draw whatever state comes out.
//
// World units: the view is VIEW_W wide and VIEW_H tall; the pet's feet sit on
// GROUND. Heights are measured upward from the ground. The pet stays at the
// same spot on screen while the world scrolls by `dist`.

import { makeRng, pick, hashString } from './random';
import { OBSTACLES, COLLECTIBLES, ENDLESS_MAX_SPEED, isSurpriseObstacleAllowed, placeAtDist, stageObstaclesAt } from './stages';
import { difficultyFor, patternsFor, PATTERNS, isStraightAt } from './chunks';

export const VIEW_W = 400;
export const VIEW_H = 220;
export const GROUND = 186;
export const PLAYER_X = 64;
export const PLAYER_W = 46;
export const PLAYER_H = 40;
export const DUCK_H = 22;
export const LANES = [-1, 0, 1];
export const LANE_SWITCH_SPEED = 14; // the old constant-speed move (lanes per second), kept for reference
export const LANE_EASE_S = 0.14; // a lane change eases out over this long
export const LANE_LEAN_DEG = 12; // the pet leans this far early in a lane change
export const GRAVITY = 1900;
export const JUMP_V = 700;
export const DOUBLE_JUMP_V = 440; // snappier second jump while in the air
// A double jump is a spin trick: land it without a bump for a few treats.
export const TRICK_TREATS = 3;
export const TRICK_CAP = 5; // rewarded tricks per run
export const MAX_JUMP_HEIGHT = 124; // prevents floating high into the top HUD
export const JUMP_BUFFER = 0.12; // a tap just before landing still jumps
export const GRIND_MIN = 0.35; // landing on a low obstacle above this share of its height grinds over it
export const GRIND_HOP_V = 380; // the hop off the end of a grind
export const SWIPE_DUCK_S = 0.6; // a swipe down ducks for this long
// The first 25 seconds of Endless and Chase (and the first stage of a place)
// are a warm-up: one obstacle at a time, nothing moving, a treat guide before
// each one. Measured as distance: 25 s at the starting speed.
export const WARMUP_S = 25;
export const FIRST_RUN_SPEED = 0.85; // a player's very first run is slower during the warm-up
export const PATTERN_CHANCE = 0.6; // after the warm-up, how often a designed pattern is used
export const HIT_INVULN_S = 1.2;
export const HIT_SLOW_S = 0.6;

export const POWER_DURATION = { speed: 4, magnet: 8, double: 10 }; // shield lasts until it is used
export const ZOOMIES_END_INVULN_S = 0.8;
export const CONTINUE_MIN_SECONDS = 15;
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

// Endless and chase score: one point per DIST_PER_POINT of distance, plus
// TREAT_POINTS for each treat times the multiplier at the moment it was
// collected. Treat points are banked, so a later hit never lowers the score.
export const DIST_PER_POINT = 10;
export const TREAT_POINTS = 10;

export const CHUNK_LENGTH = 2200;
export const CHUNK_LOOKAHEAD = 1600;

// Chase mode gap rules (0 = caught, 100 = max lead).
export const CHASE_GAP_MAX = 100;
export const CHASE_GAP_START = 70;
export const CHASE_SHRINK_START = 2; // shrinks slowly at the start (per second)
export const CHASE_SHRINK_END = 6; // shrinks faster at CHASE_RAMP_SECONDS (per second)
export const CHASE_RAMP_SECONDS = 90;
export const CHASE_SHRINK_RATE = CHASE_SHRINK_START;
export const CHASE_HIT_DROP = 20; // shrinks on each hit
export const CHASE_TREAT_GAIN = 4; // each treat grows the gap
export const CHASE_STREAK_GAIN = 5; // clean streak grows the gap (per second)
export const CHASE_SPEED_GAIN = 12; // speed power-up grows it more (per second)
export const CHASE_CLEAN_STREAK_S = 3;
export const CHASE_CONTINUE_GAP = 40; // gap restored when continuing once in Chase

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
  return { x: e.x + 6, y: e.y + 1, w: e.w - 12, h: Math.max(2, e.h - 2) };
}

// --- building a stage -----------------------------------------------------

// How far the pet travels during one jump at this speed.
export const jumpDistance = (speed) => ((2 * JUMP_V) / GRAVITY) * speed;
export const warmupDist = (stage) => WARMUP_S * (stage.speed || 0);

// Ease-out for lane changes: fast at the start, settling into the lane.
export const laneEase = (u) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);

// How far the pet leans (degrees, + = right) during a lane change: peaks a
// third of the way in and is back to 0 when it arrives.
export function laneLean(player) {
  if (!player || player.laneT == null) return 0;
  const u = Math.min(1, player.laneT / LANE_EASE_S);
  if (u >= 1) return 0;
  const dir = Math.sign((player.targetLane ?? 0) - (player.laneFrom ?? 0));
  return dir * LANE_LEAN_DEG * 6.75 * u * (1 - u) * (1 - u);
}

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

function makeVarietyState() {
  return {
    recentTypes: [],
    laneLast: {},
    lastPatternId: null,
    lastSetPieceId: null,
    setPieceCounts: {},
    busyCount: 0,
    nextTreatRunDist: 10500
  };
}

function cloneVarietyState(vs) {
  if (!vs) return makeVarietyState();
  const laneLast = {};
  for (const [k, v] of Object.entries(vs.laneLast || {})) laneLast[k] = v.slice();
  return {
    recentTypes: (vs.recentTypes || []).slice(-12),
    laneLast,
    lastPatternId: vs.lastPatternId || null,
    lastSetPieceId: vs.lastSetPieceId || null,
    setPieceCounts: { ...(vs.setPieceCounts || {}) },
    busyCount: vs.busyCount || 0,
    nextTreatRunDist: vs.nextTreatRunDist ?? 10500
  };
}

function recordObstacleChoice(state, type, trackLane = 0) {
  if (!state || !type) return;
  state.recentTypes.push(type);
  if (state.recentTypes.length > 12) state.recentTypes.shift();
  const prev = state.laneLast[trackLane] || [];
  state.laneLast[trackLane] = [...prev.slice(-1), type];
}

// Picks an obstacle from `weights`, never picking the same type 3 times in a row
// (globally or on `trackLane`) and ensuring every 10 obstacles cover >= 3 types
// when `poolDistinctCount >= 3`.
function pickVariedObstacle(rng, weights, state, { trackLane = 0, poolDistinctCount = null } = {}) {
  const entries = Object.entries(weights || {}).filter(([, w]) => w > 0);
  if (!entries.length) return null;
  if (entries.length === 1) {
    const only = entries[0][0];
    recordObstacleChoice(state, only, trackLane);
    return only;
  }
  const recent = state.recentTypes;
  const lastGlobal2 = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2] ? recent[recent.length - 1] : null;
  const lp = state.laneLast[trackLane] || [];
  const lastLane2 = lp.length >= 2 && lp[0] === lp[1] ? lp[0] : null;

  let candidates = entries.filter(([k]) => k !== lastGlobal2 && k !== lastLane2);
  if (!candidates.length) candidates = entries.filter(([k]) => k !== lastGlobal2);
  if (!candidates.length) candidates = entries;

  const distinctTotal = poolDistinctCount ?? entries.length;
  if (distinctTotal >= 3 && recent.length >= 3) {
    const tail4 = new Set(recent.slice(-4));
    if (tail4.size < 2 || (recent.length === 3 && tail4.size < 3)) {
      const fresh = candidates.filter(([k]) => !tail4.has(k));
      if (fresh.length) candidates = fresh;
    } else if (recent.length >= 5) {
      const tail9 = new Set(recent.slice(-9));
      if (tail9.size < 3) {
        const fresh = candidates.filter(([k]) => !tail9.has(k));
        if (fresh.length) candidates = fresh;
      }
    }
  }

  const chosen = weighted(rng, Object.fromEntries(candidates));
  recordObstacleChoice(state, chosen, trackLane);
  return chosen;
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

  const warm = stage.index === 0 ? warmupDist(stage) : 0;
  const stillMix = Object.fromEntries(Object.entries(stage.obstacles).filter(([k]) => !OBSTACLES[k].move));
  const vState = makeVarietyState();
  while (x < length - 260) {
    const progress = x / length;
    const speed = stage.speed + stage.ramp * progress;
    const warming = x < warm;
    const mix = warming && Object.keys(stillMix).length ? stillMix : stage.obstacles;
    const type = pickVariedObstacle(rng, mix, vState, { trackLane: 0, poolDistinctCount: Object.keys(mix).length });
    const o = OBSTACLES[type];
    entities.push({ id: id++, kind: 'obstacle', type, trackLane: 0, x, y: o.y, w: o.w, h: o.h, lane: o.lane, move: o.move });

    // Treats: an arc over a low obstacle, or a line on the ground under a high one.
    const treat = pick(rng, treatTypes);
    if (rng() < 0.8 || warming) {
      // Along the path of a well-timed jump, so a good jump collects them all.
      const jd = jumpDistance(speed);
      const centre = x + o.w / 2;
      for (let k = -1; k <= 1; k++) {
        if (o.lane === 'low') {
          const tt = (jd / 2 + k * jd * 0.28) / speed;
          const h = JUMP_V * tt - (GRAVITY / 2) * tt * tt;
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: 0, x: centre + k * jd * 0.28 - TREAT_W / 2, y: h + 6, w: TREAT_W, h: TREAT_W });
        } else {
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: 0, x: centre + k * 26 - TREAT_W / 2, y: 2, w: TREAT_W, h: TREAT_W });
        }
      }
    }

    // A pair: jump one, then duck the next (or the other way round) soon after. The gap is the jump plus about
    // a third of a second on the ground to react, so it is always possible.
    let pair = 0;
    if (stage.combo && rng() < stage.combo && x > 900 && !warming) {
      const other = Object.keys(stage.obstacles).filter((k) => OBSTACLES[k].lane !== o.lane && !OBSTACLES[k].move);
      if (other.length) {
        const t2 = pick(rng, other);
        const o2 = OBSTACLES[t2];
        const x2 = x + o.w + jumpDistance(speed) * (o.lane === 'low' ? 1 : 0.5) + speed * 0.34;
        entities.push({ id: id++, kind: 'obstacle', type: t2, trackLane: 0, x: x2, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: 0 });
        pair = x2 + o2.w - (x + o.w);
      }
    }

    const minGap = Math.max(jumpDistance(speed) * (warming ? 1.6 : 1.25) + o.w + 40 + pair, warming ? jumpDistance(speed) * 1.6 + o.w : 0);
    const gap = minGap + (rng() * 260) / stage.density;
    const mid = x + o.w + gap / 2;

    // A row of treats between obstacles on the ground, sometimes.
    if (rng() < 0.55) {
      for (let k = 0; k < 3; k++) {
        entities.push({ id: id++, kind: 'treat', type: treat, trackLane: 0, x: mid - 40 + k * 28, y: 2, w: TREAT_W, h: TREAT_W });
      }
    }
    const pct = Math.floor(progress * 100);
    for (const p of powerAt) {
      if (pct >= p) {
        powerAt.delete(p);
        entities.push({ id: id++, kind: 'power', type: pick(rng, stage.powerUps), trackLane: 0, x: mid + 50, y: 46, w: POWER_W, h: POWER_W });
        break;
      }
    }
    x += o.w + gap;
  }
  entities.sort((a, b) => a.x - b.x);
  const totalTreats = entities.filter((e) => e.kind === 'treat').length;
  return { entities, length, totalTreats };
}

// Lay one hand-made pattern (src/game/chunks.js) at x, with the active place's own
// obstacles swapped into its slots. Returns null when no pattern fits.
function placePattern(rng, stage, { x, speed, maxSpeed, treat, nextId, activeMix, seed = 1, varietyState }) {
  const pool = activeMix || stageObstaclesAt(stage, x);
  const poolDistinctCount = Object.keys(pool).length;
  const still = (lane) => Object.fromEntries(Object.entries(pool).filter(([k]) => OBSTACLES[k]?.lane === lane && !OBSTACLES[k].move));
  const allHighs = Object.fromEntries(Object.entries(pool).filter(([k]) => OBSTACLES[k]?.lane === 'high'));
  const lows = still('low');
  const highs = still('high');
  const jd = jumpDistance(speed);
  const prevType = varietyState?.recentTypes?.[varietyState.recentTypes.length - 1] || null;
  const prevType2 = varietyState?.recentTypes?.[varietyState.recentTypes.length - 2] || null;
  const straightHere = isStraightAt(x, seed) && isStraightAt(x + 2.2 * jd, seed);
  const highPool = Object.keys(highs).length >= 2 ? highs : Object.keys(allHighs).length >= 2 ? allHighs : highs;
  const highKeys = Object.keys(highPool);
  const onlyHigh = highKeys.length === 1 ? highKeys[0] : null;
  const highSlotsCount = (p) => p.items.filter((it) => it.slot === 'high').length;

  const canPlace = (p) => {
    if (p.id === varietyState?.lastPatternId) return false;
    if (p.setPiece && p.id === varietyState?.lastSetPieceId) return false;
    if (p.onlyStraight && !straightHere) return false;
    if (p.id === 'bench-grind' && (!pool.bench || prevType === 'bench')) return false;
    if (p.id === 'duck-tunnel' && Object.keys(allHighs).length < 2) return false;
    if (onlyHigh && highSlotsCount(p) >= 2 && prevType === onlyHigh) return false;
    if (onlyHigh && highSlotsCount(p) >= 1 && prevType === onlyHigh && prevType2 === onlyHigh) return false;
    if (onlyHigh && highSlotsCount(p) >= 3) return false;
    return p.items.every((it) => {
      if (it.slot === 'low') return Object.keys(lows).length > 0;
      if (it.slot === 'high') return highKeys.length > 0;
      if (it.slot === 'bench') return Boolean(pool.bench);
      if (it.slot === 'bigJump') return Object.keys(lows).length > 0 || Boolean(pool.puddle || pool.cucumber);
      return true;
    });
  };

  // Prefer rotating through set pieces by least-used so all 4 appear in a run and never twice in a row.
  const eligibleSetPieces = PATTERNS.filter((p) => p.setPiece && canPlace(p));
  let pattern = null;
  if (eligibleSetPieces.length && (varietyState.busyCount % 2 === 1 || rng() < 0.42)) {
    const counts = varietyState.setPieceCounts || {};
    eligibleSetPieces.sort((a, b) => {
      const diff = (counts[a.id] || 0) - (counts[b.id] || 0);
      if (diff !== 0) return diff;
      if (a.onlyStraight && !b.onlyStraight) return -1;
      if (!a.onlyStraight && b.onlyStraight) return 1;
      return 0;
    });
    pattern = eligibleSetPieces[0];
  }
  if (!pattern) {
    const fits = patternsFor(difficultyFor(speed, stage.speed, maxSpeed)).filter(canPlace);
    const anyFits = fits.length ? fits : PATTERNS.filter(canPlace);
    if (!anyFits.length) return null;
    pattern = pick(rng, anyFits);
  }
  if (varietyState) {
    varietyState.lastPatternId = pattern.id;
    if (pattern.setPiece) {
      varietyState.lastSetPieceId = pattern.id;
      varietyState.setPieceCounts[pattern.id] = (varietyState.setPieceCounts[pattern.id] || 0) + 1;
    }
  }

  const entities = [];
  let id = nextId;
  let endX = x;
  for (const it of pattern.items) {
    const ax = x + it.at * jd;
    if (it.slot === 'low' || it.slot === 'high' || it.slot === 'bench' || it.slot === 'bigJump') {
      let weights;
      if (it.slot === 'bench') weights = { bench: 1 };
      else if (it.slot === 'bigJump') weights = pool.puddle ? { puddle: 1 } : pool.cucumber ? { cucumber: 1 } : lows;
      else if (it.slot === 'high') weights = pattern.id === 'duck-tunnel' ? allHighs : highPool;
      else weights = lows;
      const type = pickVariedObstacle(rng, weights, varietyState, { trackLane: it.lane, poolDistinctCount });
      const o = OBSTACLES[type];
      entities.push({
        id: id++,
        kind: 'obstacle',
        type,
        trackLane: it.lane,
        x: ax,
        y: o.y,
        w: o.w,
        h: o.h,
        lane: o.lane,
        move: 0,
        bob: Boolean(o.bob),
        warningS: 0,
        pattern: pattern.id,
        ...(pattern.id === 'big-jump' ? { hillTop: true } : {})
      });
      endX = Math.max(endX, ax + o.w);
    } else if (it.slot === 'bigArc') {
      for (let k = -2; k <= 2; k++) {
        const tt = (jd / 2 + k * jd * 0.2) / speed;
        const h = Math.max(14, JUMP_V * tt - (GRAVITY / 2) * tt * tt + 16);
        entities.push({
          id: id++,
          kind: 'treat',
          type: treat,
          trackLane: it.lane,
          x: ax + 24 + k * jd * 0.2 - TREAT_W / 2,
          y: h,
          w: TREAT_W,
          h: TREAT_W,
          pattern: pattern.id
        });
      }
      endX = Math.max(endX, ax + jd * 0.6);
    } else {
      for (let k = -1; k <= 1; k++) {
        if (it.slot === 'arc') {
          const tt = (jd / 2 + k * jd * 0.28) / speed;
          const h = JUMP_V * tt - (GRAVITY / 2) * tt * tt;
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: it.lane, x: ax + 26 + k * jd * 0.28 - TREAT_W / 2, y: h + 6, w: TREAT_W, h: TREAT_W });
        } else {
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: it.lane, x: ax + 26 + k * 26 - TREAT_W / 2, y: 2, w: TREAT_W, h: TREAT_W });
        }
      }
      endX = Math.max(endX, ax + 60);
    }
  }
  return { entities, nextId: id, endX, pattern: pattern.id };
}

// Build one chunk of an endless or chase course across 3 lanes. Deterministic per (seed, chunkIndex).
export function buildChunk(stage, { seed = 1, chunkIndex = 0, startX = 420, nextId = 0, varietyState = null } = {}) {
  const rng = makeRng(hashString(`${seed}:chunk:${chunkIndex}`));
  const treatTypes = COLLECTIBLES[stage.species] || COLLECTIBLES.dog;
  const entities = [];
  let id = nextId;
  let x = startX;
  const endX = startX + CHUNK_LENGTH;
  const maxSpeed = stage.maxSpeed || ENDLESS_MAX_SPEED;
  const warm = warmupDist(stage);
  let powerPlaced = false;
  const vState = varietyState ? cloneVarietyState(varietyState) : makeVarietyState();

  while (x < endX) {
    const progress = Math.min(1, x / 18000);
    const speed = Math.min(maxSpeed, stage.speed + (stage.ramp || 180) * progress);
    const warming = x < warm;
    const baseMix = stageObstaclesAt(stage, x);
    const allowedMix = {};
    for (const [k, w] of Object.entries(baseMix || {})) {
      if (!OBSTACLES[k]) continue;
      if (warming && OBSTACLES[k].move) continue;
      if (isSurpriseObstacleAllowed(stage, k, x)) allowedMix[k] = w;
    }
    const pool = Object.keys(allowedMix).length ? allowedMix : baseMix;
    const poolDistinctCount = Object.keys(pool).length;
    const treat = pick(rng, treatTypes);

    // Every 30-45 s, a 2-3 s treat run across all 3 lanes with no obstacles.
    if (!warming && x >= vState.nextTreatRunDist && stage.treatRuns !== false) {
      const secs = 2.0 + rng() * 1.0;
      const span = speed * secs;
      for (let tx = x; tx <= x + span; tx += 95) {
        for (const lane of LANES) {
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: lane, x: tx, y: 4, w: TREAT_W, h: TREAT_W, treatRun: true });
        }
      }
      vState.nextTreatRunDist = x + span + speed * (30 + rng() * 15);
      vState.busyCount = 0;
      x += span + jumpDistance(speed) * 0.9;
      continue;
    }

    // After each busy patch, a 1.5-2.5 s breather stretch: no obstacles, just a curving line of treats.
    if (!warming && vState.busyCount >= 3) {
      const secs = 1.5 + rng() * 1.0;
      const span = speed * secs;
      const count = 7;
      const dir = rng() < 0.5 ? 1 : -1;
      for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        const lane = dir * Math.round(Math.sin(u * Math.PI) * 1);
        entities.push({ id: id++, kind: 'treat', type: treat, trackLane: lane, x: x + u * span, y: 4, w: TREAT_W, h: TREAT_W, breather: true });
      }
      vState.busyCount = 0;
      x += span + jumpDistance(speed) * 0.65;
      continue;
    }

    // After the warm-up, often a hand-made pattern or set piece instead of a random row.
    if (!warming && rng() < PATTERN_CHANCE) {
      const placed = placePattern(rng, stage, { x, speed, maxSpeed, treat, nextId: id, activeMix: pool, seed, varietyState: vState });
      if (placed) {
        entities.push(...placed.entities);
        id = placed.nextId;
        vState.busyCount += 1;
        x = placed.endX + jumpDistance(speed) * 1.25 + 60 + (rng() * 200) / (stage.density || 1.5);
        continue;
      }
    }

    const laneIdx = pick(rng, LANES);
    const type = pickVariedObstacle(rng, pool, vState, { trackLane: laneIdx, poolDistinctCount });
    const o = OBSTACLES[type];
    const blocked = new Set([laneIdx]);
    entities.push({ id: id++, kind: 'obstacle', type, trackLane: laneIdx, x, y: o.y, w: o.w, h: o.h, lane: o.lane, move: o.move, bob: Boolean(o.bob), warningS: o.warningS || 0 });

    // 40% chance to spawn a second obstacle side-by-side in another lane, always leaving at least one lane open.
    if (!warming && rng() < 0.4) {
      const otherLanes = LANES.filter((l) => l !== laneIdx);
      const secondLane = pick(rng, otherLanes);
      const type2 = pickVariedObstacle(rng, pool, vState, { trackLane: secondLane, poolDistinctCount });
      const o2 = OBSTACLES[type2];
      blocked.add(secondLane);
      entities.push({ id: id++, kind: 'obstacle', type: type2, trackLane: secondLane, x, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: o2.move, bob: Boolean(o2.bob), warningS: o2.warningS || 0 });
    }
    const openLanes = LANES.filter((l) => !blocked.has(l));

    if (rng() < 0.8 || warming) {
      const jd = jumpDistance(speed);
      const centre = x + o.w / 2;
      const guideOpen = openLanes.length && rng() < 0.5;
      const treatLane = guideOpen ? pick(rng, openLanes) : laneIdx;
      for (let k = -1; k <= 1; k++) {
        if (!guideOpen && o.lane === 'low') {
          const tt = (jd / 2 + k * jd * 0.28) / speed;
          const h = JUMP_V * tt - (GRAVITY / 2) * tt * tt;
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: treatLane, x: centre + k * jd * 0.28 - TREAT_W / 2, y: h + 6, w: TREAT_W, h: TREAT_W });
        } else {
          entities.push({ id: id++, kind: 'treat', type: treat, trackLane: treatLane, x: centre + k * 26 - TREAT_W / 2, y: 2, w: TREAT_W, h: TREAT_W });
        }
      }
    }

    let pair = 0;
    // Obstacle combos in endless and chase: either a close high+low double-jump pair, or a jump-then-duck pair.
    if (warming) {
      // one obstacle at a time
    } else if (stage.doubleJumpCombo && rng() < stage.doubleJumpCombo && (chunkIndex > 0 || x > 650)) {
      const lowMix = Object.fromEntries(Object.entries(pool).filter(([k]) => OBSTACLES[k]?.lane === 'low' && !OBSTACLES[k].move));
      const highMix = Object.fromEntries(Object.entries(pool).filter(([k]) => OBSTACLES[k]?.lane === 'high' && !OBSTACLES[k].move));
      const pairMix = o.lane === 'high' && Object.keys(lowMix).length ? lowMix : Object.keys(highMix).length ? highMix : lowMix;
      if (Object.keys(pairMix).length) {
        const pairLane = pick(rng, LANES);
        const t2 = pickVariedObstacle(rng, pairMix, vState, { trackLane: pairLane, poolDistinctCount });
        const o2 = OBSTACLES[t2];
        const x2 = x + o.w + Math.round(jumpDistance(speed) * 0.62);
        entities.push({ id: id++, kind: 'obstacle', type: t2, trackLane: pairLane, x: x2, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: 0, doubleJumpPair: true });
        entities.push({ id: id++, kind: 'treat', type: treat, trackLane: pairLane, x: x2 + o2.w / 2 - TREAT_W / 2, y: 88, w: TREAT_W, h: TREAT_W });
        pair = x2 + o2.w - (x + o.w);
      }
    } else if (stage.combo && rng() < stage.combo && (chunkIndex > 0 || x > 900)) {
      const otherMix = Object.fromEntries(Object.entries(pool).filter(([k]) => OBSTACLES[k]?.lane !== o.lane && !OBSTACLES[k].move));
      if (Object.keys(otherMix).length) {
        const pairLane = pick(rng, LANES);
        const t2 = pickVariedObstacle(rng, otherMix, vState, { trackLane: pairLane, poolDistinctCount });
        const o2 = OBSTACLES[t2];
        const x2 = x + o.w + jumpDistance(speed) * (o.lane === 'low' ? 1 : 0.5) + speed * 0.34;
        entities.push({ id: id++, kind: 'obstacle', type: t2, trackLane: pairLane, x: x2, y: o2.y, w: o2.w, h: o2.h, lane: o2.lane, move: 0 });
        pair = x2 + o2.w - (x + o.w);
      }
    }

    if (!warming) vState.busyCount += 1;
    const minGap = jumpDistance(speed) * (warming ? 1.6 : 1.25) + o.w + 40 + pair;
    const gap = minGap + (rng() * 260) / (stage.density || 1.5);
    const mid = x + o.w + gap / 2;

    if (rng() < 0.55) {
      const rowLane = pick(rng, LANES);
      for (let k = 0; k < 3; k++) {
        entities.push({ id: id++, kind: 'treat', type: treat, trackLane: rowLane, x: mid - 40 + k * 28, y: 2, w: TREAT_W, h: TREAT_W });
      }
    }
    if (!powerPlaced && stage.powerUps?.length && x - startX >= CHUNK_LENGTH * 0.45 && rng() < 0.65) {
      powerPlaced = true;
      entities.push({ id: id++, kind: 'power', type: pick(rng, stage.powerUps), trackLane: pick(rng, LANES), x: mid + 50, y: 46, w: POWER_W, h: POWER_W });
    }
    x += o.w + gap;
  }
  entities.sort((a, b) => a.x - b.x);
  const treatsInChunk = entities.filter((e) => e.kind === 'treat').length;
  return { entities, nextX: x, nextId: id, chunkIndex: chunkIndex + 1, treatsInChunk, varietyState: vState };
}

export function ensureChunks(run) {
  if (!run.stage.endless && !run.stage.chase) return run;
  let { entities, cursor, generatedTo, chunkIndex, nextEntityId, totalTreats, varietyState } = run;
  if (generatedTo - run.dist >= CHUNK_LOOKAHEAD) return run;
  entities = entities.slice();
  if (cursor > 60) {
    entities = entities.slice(cursor);
    cursor = 0;
  }
  while (generatedTo - run.dist < CHUNK_LOOKAHEAD) {
    const chunk = buildChunk(run.stage, { seed: run.seed, chunkIndex, startX: generatedTo, nextId: nextEntityId, varietyState });
    entities.push(...chunk.entities);
    generatedTo = chunk.nextX;
    chunkIndex = chunk.chunkIndex;
    nextEntityId = chunk.nextId;
    totalTreats += chunk.treatsInChunk;
    varietyState = chunk.varietyState;
  }
  return { ...run, entities, cursor, generatedTo, chunkIndex, nextEntityId, totalTreats, varietyState };
}

// --- combos, multiplier and chase gap --------------------------------------

export function multiplierFor(combo = 0) {
  let m = 1;
  for (const t of COMBO_THRESHOLDS) {
    if (combo >= t.combo) m = t.multiplier;
  }
  return m;
}

// Points for picking up treats now: banked at the current multiplier.
export const treatPointsFor = (value = 1, multiplier = 1) => value * TREAT_POINTS * multiplier;

// Endless and chase score: distance points + banked treat points.
export function modeScore({ dist = 0, distance, treatPoints = 0 } = {}) {
  const d = distance != null ? distance : dist;
  return Math.max(0, Math.floor(d / DIST_PER_POINT) + Math.floor(treatPoints));
}

export function chaseShrinkRate(t = 0) {
  const progress = Math.max(0, Math.min(1, (t || 0) / CHASE_RAMP_SECONDS));
  return CHASE_SHRINK_START + (CHASE_SHRINK_END - CHASE_SHRINK_START) * progress;
}

export function stepChaseGap(gap, dt, { hits = 0, treats = 0, cleanStreak = false, speedBoost = false, t = 0 } = {}) {
  let next = gap - chaseShrinkRate(t) * dt;
  if (cleanStreak) next += CHASE_STREAK_GAIN * dt;
  if (speedBoost) next += CHASE_SPEED_GAIN * dt;
  if (treats > 0) next += treats * CHASE_TREAT_GAIN;
  if (hits > 0) next -= hits * CHASE_HIT_DROP;
  return Math.max(0, Math.min(CHASE_GAP_MAX, next));
}

// --- running ---------------------------------------------------------------

export function newRun(stage, { seed = 1, startPowerUps = [], reduceMotion = false, firstRun = false } = {}) {
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
      usePlaceMix: stage.usePlaceMix,
      powerUps: stage.powerUps || [],
      seconds: stage.seconds,
      daily: Boolean(stage.daily),
      endless: Boolean(stage.endless),
      chase: Boolean(stage.chase),
      chaser: stage.chaser || null,
      hearts: stage.hearts || 3
    },
    seed,
    firstRun: Boolean(firstRun),
    warmupDist: isChunked || stage.index === 0 ? warmupDist(stage) : 0,
    place: isChunked ? placeAtDist(0) : (stage.theme || 'garden'),
    placesReached: [isChunked ? placeAtDist(0) : (stage.theme || 'garden')],
    varietyState: makeVarietyState(),
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
    player: {
      height: 0,
      vy: 0,
      xOffset: 0,
      vx: 0,
      trackLane: 0,
      targetLane: 0,
      lanePos: 0,
      laneFrom: 0,
      laneT: null,
      laneHoldTimer: 0,
      justJumpedT: null,
      justLandedT: null,
      fastFall: false,
      prevLeft: false,
      prevRight: false,
      ducking: false,
      duckTimer: 0,
      jumpBuffer: 0,
      doubleJumped: false,
      spinT: null,
      trickClean: false
    },
    treats: 0,
    tricks: 0,
    collected: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    treatPoints: 0,
    score: 0,
    hits: 0,
    jumps: 0,
    nearMissTimer: 0,
    hearts: stage.hearts || 3,
    chaseGap: stage.chase ? CHASE_GAP_START : null,
    cleanTime: 0,
    caught: false,
    failed: false,
    invuln: 0,
    slow: 0,
    power: { speed: 0, magnet: 0, double: 0, shield: false },
    powerUpsUsed: 0,
    continued: false,
    continueOffered: false,
    lastHitObstacle: null,
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
  if (run.firstRun && run.dist < (run.warmupDist || 0)) v *= FIRST_RUN_SPEED;
  if (run.power.speed > 0) v *= SPEED_BOOST;
  if (run.slow > 0) v *= 0.6;
  return v * run.speedScale;
}

// input: { jump, duck, swipeDuck, left, right, laneLeft, laneRight }
export function step(run, dt, input = {}) {
  if (run.done) return run;
  dt = Math.min(Math.max(dt, 0), 1 / 20);
  if (run.stage.endless || run.stage.chase) run = ensureChunks(run);
  const events = [];
  const player = { ...run.player };
  const power = { ...run.power };
  let { treats, tricks = 0, collected, combo = 0, maxCombo = 0, multiplier = 1, treatPoints = 0, hits, jumps = 0, nearMissTimer = 0, invuln, slow, hearts, cleanTime = 0, lastHitObstacle = null } = run;

  // timers
  const prevSpeed = power.speed || 0;
  for (const k of Object.keys(POWER_DURATION)) power[k] = Math.max(0, power[k] - dt);
  invuln = Math.max(0, invuln - dt);
  if (prevSpeed > 0 && power.speed === 0) {
    invuln = Math.max(invuln, ZOOMIES_END_INVULN_S);
  }
  slow = Math.max(0, slow - dt);
  nearMissTimer = Math.max(0, nearMissTimer - dt);

  // 3-lane Left / Right switching
  const leftEdge = Boolean(input.laneLeft) || (Boolean(input.left) && !player.prevLeft);
  const rightEdge = Boolean(input.laneRight) || (Boolean(input.right) && !player.prevRight);
  player.prevLeft = Boolean(input.left);
  player.prevRight = Boolean(input.right);

  // A new target starts a fresh ease from wherever the pet is now, so a second
  // swipe mid-move carries on smoothly (no snap back).
  const retarget = (lane) => {
    const next = Math.max(-1, Math.min(1, lane));
    if (next === (player.targetLane ?? 0)) return;
    player.targetLane = next;
    player.laneFrom = player.lanePos ?? 0;
    player.laneT = 0;
  };
  if (leftEdge && !rightEdge) {
    retarget((player.targetLane ?? 0) - 1);
    player.laneHoldTimer = 0.22;
  } else if (rightEdge && !leftEdge) {
    retarget((player.targetLane ?? 0) + 1);
    player.laneHoldTimer = 0.22;
  } else if ((input.left || input.right) && !(input.left && input.right)) {
    player.laneHoldTimer = Math.max(0, (player.laneHoldTimer || 0) - dt);
    if (player.laneHoldTimer <= 0) {
      if (input.left) retarget((player.targetLane ?? 0) - 1);
      if (input.right) retarget((player.targetLane ?? 0) + 1);
      player.laneHoldTimer = 0.22;
    }
  } else {
    player.laneHoldTimer = 0;
  }

  const targetLane = player.targetLane ?? 0;
  const prevLanePos = player.lanePos ?? 0;
  if (player.laneT != null) {
    player.laneT += dt;
    const from = player.laneFrom ?? prevLanePos;
    player.lanePos = player.laneT >= LANE_EASE_S ? targetLane : from + (targetLane - from) * laneEase(player.laneT / LANE_EASE_S);
    if (player.lanePos === targetLane) player.laneT = player.laneT >= LANE_EASE_S + 0.2 ? null : player.laneT;
  } else {
    player.lanePos = targetLane;
  }
  player.trackLane = Math.round(player.lanePos);
  player.vx = dt > 0 ? (player.lanePos - prevLanePos) / dt : 0;
  player.xOffset = player.lanePos * 34;

  // pet vertical movement
  if (input.swipeDuck) player.duckTimer = SWIPE_DUCK_S;
  else player.duckTimer = Math.max(0, player.duckTimer - dt);
  const wantDuck = Boolean(input.duck) || player.duckTimer > 0;

  // Check if the pet is just about to land on this frame, so a pre-landing tap
  // buffers a full ground jump instead of consuming the air double-jump.
  const nextVy = player.vy - GRAVITY * dt * (wantDuck ? 2.2 : player.doubleJumped && player.vy < 0 ? 1.35 : 1.0);
  const landsThisStep = player.height > 0 && player.height + nextVy * dt <= 0;

  if (input.jump) player.jumpBuffer = JUMP_BUFFER;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

  if (player.justJumpedT != null) player.justJumpedT += dt;
  if (player.justLandedT != null) player.justLandedT += dt;
  player.fastFall = wantDuck && player.height > 0 && player.vy < 0;

  if (player.height <= 0 && player.jumpBuffer > 0) {
    player.justJumpedT = 0;
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
    player.spinT = 0;
    player.trickClean = true;
    events.push('jump');
    events.push('doubleJump');
  } else if (player.spinT != null) {
    player.spinT += dt;
  }
  if (player.height > 0 || player.vy > 0) {
    // Ducking or double-jump descent applies snappier gravity so jumps feel crisp, not floaty.
    const fallMult = wantDuck ? 2.2 : player.doubleJumped && player.vy < 0 ? 1.35 : 1.0;
    player.vy -= GRAVITY * dt * fallMult;
    player.height = Math.min(MAX_JUMP_HEIGHT, Math.max(0, player.height + player.vy * dt));
    if (player.height >= MAX_JUMP_HEIGHT && player.vy > 0) player.vy = 0;
    if (player.height === 0) {
      player.vy = 0;
      player.doubleJumped = false;
      player.justLandedT = 0;
      events.push('land');
      if (player.spinT != null) {
        if (player.trickClean && tricks < TRICK_CAP) {
          tricks += 1;
          treats += TRICK_TREATS;
          events.push('trick');
        }
        player.spinT = null;
        player.trickClean = false;
      }
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
    if (e.x > dist + VIEW_W + 140) break;
    if (e.gone) continue;
    if (e.move) {
      e = { ...e, x: e.x - e.move * dt };
      changed.set(i, e);
    }
    const entityLane = e.trackLane ?? 0;
    const laneDist = e.trackLane == null ? 0 : Math.abs((player.lanePos ?? 0) - entityLane);
    const inObstacleLane = laneDist < 0.55;
    const inPickupLane = laneDist < 0.68 || power.magnet > 0 || power.speed > 0;

    if (e.kind === 'treat' && (power.magnet > 0 || power.speed > 0)) {
      const dx = dist + PLAYER_W / 2 - (e.x + e.w / 2);
      const dy = player.height + PLAYER_H / 2 - (e.y + e.h / 2);
      const d = Math.hypot(dx, dy);
      if (d < MAGNET_RANGE && d > 1) {
        const k = Math.min(1, (MAGNET_PULL * dt) / d);
        const pullLane = entityLane + ((player.lanePos ?? 0) - entityLane) * Math.min(1, dt * 8);
        e = { ...e, x: e.x + dx * k, y: e.y + dy * k, trackLane: pullLane };
        changed.set(i, e);
      }
    }
    if (e.kind === 'obstacle' && !e.hit && !e.nearMissed && e.x + e.w < dist + 2 && e.x + e.w >= dist - 14) {
      if ((inObstacleLane && (player.height > 0 || player.ducking)) || (!inObstacleLane && laneDist < 1.15)) {
        changed.set(i, { ...e, nearMissed: true });
        nearMissTimer = 0.22;
        events.push('nearMiss');
      }
    }
    if (!overlaps(pBox, entityBox(e))) continue;
    if (e.kind === 'treat') {
      if (!inPickupLane) continue;
      const value = power.double > 0 ? 2 : 1;
      treats += value;
      collected += 1;
      frameTreats += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      multiplier = multiplierFor(combo);
      treatPoints += treatPointsFor(value, multiplier);
      changed.set(i, { ...e, gone: true });
      events.push('collect');
    } else if (e.kind === 'power') {
      if (!inPickupLane) continue;
      changed.set(i, { ...e, gone: true });
      if (e.type === 'shield') power.shield = true;
      else power[e.type] = Math.max(power[e.type], POWER_DURATION[e.type]);
      events.push('power');
    } else if (e.kind === 'obstacle' && !e.hit) {
      if (!inObstacleLane) continue;
      if (e.type === 'puddle' && player.height <= 4) {
        events.push('splash');
      }
      if (invuln > 0 || power.speed > 0) {
        if (power.speed > 0) {
          changed.set(i, { ...e, hit: true, smashed: true, gone: true });
          nearMissTimer = 0.22;
          treatPoints += 5 * multiplier;
          events.push('smash', 'nearMiss');
        }
        continue;
      }
      // Skateboard forgiveness: coming down onto something low from a jump
      // grinds over it with a little hop instead of a bump.
      if ((OBSTACLES[e.type]?.lane || e.lane) === 'low' && player.height > 0 && player.vy <= 0 && player.height >= e.y + e.h * GRIND_MIN) {
        changed.set(i, { ...e, hit: true, grinded: true });
        player.height = Math.max(player.height, e.y + e.h);
        player.vy = GRIND_HOP_V;
        events.push('grind');
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
        player.trickClean = false;
        lastHitObstacle = e.type;
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
      speedBoost: power.speed > 0,
      t
    });
    caught = chaseGap <= 0;
  }

  const score = modeScore({ dist, treatPoints });
  const nextPlace = run.stage.endless || run.stage.chase ? placeAtDist(dist) : run.place;
  let placesReached = run.placesReached || [run.place || 'garden'];
  if (nextPlace && nextPlace !== run.place) {
    events.push('placeChange');
    if (!placesReached.includes(nextPlace)) placesReached = [...placesReached, nextPlace];
  }

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

  jumps += events.filter((ev) => ev === 'jump').length;

  let nextRun = {
    ...run,
    t,
    dist,
    place: nextPlace,
    placesReached,
    speed,
    player,
    power,
    treats,
    tricks,
    collected,
    combo,
    maxCombo,
    multiplier,
    treatPoints,
    score,
    hits,
    jumps,
    nearMissTimer,
    hearts,
    chaseGap,
    cleanTime,
    caught,
    failed: outOfHearts && !run.stage.daily && !run.stage.endless,
    invuln,
    slow,
    lastHitObstacle,
    cursor,
    entities: nextEntities,
    done,
    powerUpsUsed: run.powerUpsUsed + events.filter((e) => e === 'power').length,
    events
  };
  if (!done && (run.stage.endless || run.stage.chase)) nextRun = ensureChunks(nextRun);
  return nextRun;
}

// Continue once per Endless or Chase run after running out of hearts or getting caught,
// and only if the run lasted at least 15 seconds.
export function canContinueRun(run) {
  if (!run || !run.done || run.continued || run.continueOffered) return false;
  if (Number(run.t || 0) < CONTINUE_MIN_SECONDS) return false;
  return Boolean(run.stage?.endless || run.stage?.chase);
}

export function continueRun(run) {
  if (!canContinueRun(run)) return run;
  const player = {
    ...run.player,
    laneHoldTimer: 0,
    prevLeft: false,
    prevRight: false,
    ducking: false,
    duckTimer: 0,
    jumpBuffer: 0
  };
  if (run.stage.chase) {
    return {
      ...run,
      player,
      chaseGap: CHASE_CONTINUE_GAP,
      caught: false,
      failed: false,
      done: false,
      continued: true,
      invuln: HIT_INVULN_S,
      slow: 0,
      events: []
    };
  }
  return {
    ...run,
    player,
    hearts: 1,
    caught: false,
    failed: false,
    done: false,
    continued: true,
    invuln: HIT_INVULN_S,
    slow: 0,
    events: []
  };
}

// Entities to draw this frame, with their position on screen.
export function visible(run) {
  const out = [];
  for (let i = run.cursor; i < run.entities.length; i++) {
    const e = run.entities[i];
    const sx = e.x - run.dist + PLAYER_X;
    if (sx > VIEW_W + 140) break;
    if (e.gone || sx + e.w < -60) continue;
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

export const worldToMetres = (dist) => Math.max(0, Math.floor((Number(dist) || 0) / 10));

export function resultOf(run) {
  const isEndlessOrChase = Boolean(run.stage.endless || run.stage.chase);
  const distanceMetres = worldToMetres(run.dist);
  const endCause = run.caught ? 'caught' : run.lastHitObstacle || (run.failed ? 'hit' : 'goal');
  return {
    stageId: run.stage.id,
    theme: run.stage.theme || 'garden',
    nameKey: run.stage.nameKey || 'game.place.garden',
    species: run.stage.species || 'dog',
    mode: run.stage.mode || (run.stage.daily ? 'daily' : 'stage'),
    daily: Boolean(run.stage.daily),
    endless: Boolean(run.stage.endless),
    chase: Boolean(run.stage.chase),
    caught: Boolean(run.caught),
    dist: Math.round(run.dist || 0),
    distanceMetres,
    endCause,
    treats: run.treats,
    collected: run.collected,
    totalTreats: run.totalTreats,
    combo: run.combo || 0,
    maxCombo: run.maxCombo || 0,
    multiplier: run.multiplier || 1,
    treatPoints: run.treatPoints || 0,
    hits: run.hits,
    jumps: run.jumps || 0,
    continued: Boolean(run.continued),
    failed: Boolean(run.failed),
    seconds: Math.round(run.t),
    stars: run.stage.daily || isEndlessOrChase || run.failed ? 0 : starsFor(run),
    score: isEndlessOrChase ? modeScore(run) : run.stage.daily ? scoreFor(run) : 0
  };
}
