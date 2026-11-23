// Hand-made obstacle patterns for Endless and Chase, used after the warm-up.
//
// Positions are in jump distances (`at` x jumpDistance(speed)), so a pattern
// keeps its rhythm at any speed. Lanes are -1, 0, 1. Slots:
//   low   something to jump over (the stage's own low obstacle is swapped in)
//   high  something to duck under (the stage's own high obstacle)
//   line  3 treats on the ground
//   arc   3 treats along a jump over that spot
// difficulty 1 (gentle) to 5 (busy). len: how long the pattern runs, in jumps.

export const PATTERNS = [
  { id: 'breather', difficulty: 1, len: 1.6, items: [{ at: 0, lane: 0, slot: 'line' }, { at: 0.8, lane: -1, slot: 'line' }, { at: 1.6, lane: 1, slot: 'line' }] },
  { id: 'hop', difficulty: 1, len: 1, items: [{ at: 0, lane: 0, slot: 'low' }, { at: 0, lane: 0, slot: 'arc' }] },
  { id: 'gate', difficulty: 1, len: 1, items: [{ at: 0, lane: -1, slot: 'low' }, { at: 0, lane: 1, slot: 'low' }, { at: 0, lane: 0, slot: 'line' }] },
  { id: 'underpass', difficulty: 1, len: 1, items: [{ at: 0, lane: 0, slot: 'high' }, { at: 0, lane: 0, slot: 'line' }] },
  { id: 'stagger', difficulty: 2, len: 1.6, items: [{ at: 0, lane: -1, slot: 'low' }, { at: 1.6, lane: 1, slot: 'low' }, { at: 0, lane: 0, slot: 'line' }, { at: 1.6, lane: 0, slot: 'line' }] },
  { id: 'squeeze', difficulty: 2, len: 1, items: [{ at: 0, lane: -1, slot: 'low' }, { at: 0, lane: 0, slot: 'low' }, { at: -0.6, lane: 0, slot: 'line' }, { at: 0, lane: 1, slot: 'line' }] },
  { id: 'tunnel', difficulty: 2, len: 1, items: [{ at: 0, lane: 0, slot: 'high' }, { at: 1, lane: 0, slot: 'high' }, { at: 0.5, lane: 0, slot: 'line' }] },
  { id: 'slalom', difficulty: 2, len: 2.4, items: [{ at: 0, lane: -1, slot: 'low' }, { at: 1.2, lane: 0, slot: 'low' }, { at: 2.4, lane: 1, slot: 'low' }, { at: 1.2, lane: -1, slot: 'line' }] },
  { id: 'jump-duck', difficulty: 3, len: 1.9, items: [{ at: 0, lane: 0, slot: 'low' }, { at: 1.9, lane: 0, slot: 'high' }, { at: 0, lane: 0, slot: 'arc' }, { at: 1.9, lane: 0, slot: 'line' }] },
  { id: 'zigzag', difficulty: 3, len: 2, items: [{ at: 0, lane: 0, slot: 'low' }, { at: 0, lane: 1, slot: 'low' }, { at: 2, lane: -1, slot: 'low' }, { at: 2, lane: 0, slot: 'low' }, { at: 0, lane: -1, slot: 'line' }, { at: 2, lane: 1, slot: 'line' }] },
  { id: 'mixed-row', difficulty: 3, len: 1, items: [{ at: 0, lane: -1, slot: 'high' }, { at: 0, lane: 0, slot: 'low' }, { at: 0, lane: 1, slot: 'high' }, { at: 0, lane: 0, slot: 'arc' }] },
  { id: 'cross', difficulty: 4, len: 1.8, items: [{ at: 0, lane: -1, slot: 'low' }, { at: 0, lane: 0, slot: 'high' }, { at: 1.8, lane: 1, slot: 'high' }, { at: 1.8, lane: 0, slot: 'low' }, { at: 0, lane: 1, slot: 'line' }, { at: 1.8, lane: -1, slot: 'line' }] },
  { id: 'all-lanes', difficulty: 4, len: 1, items: [{ at: 0, lane: -1, slot: 'high' }, { at: 0, lane: 0, slot: 'low' }, { at: 0, lane: 1, slot: 'low' }, { at: 0, lane: -1, slot: 'line' }] },
  { id: 'gauntlet', difficulty: 5, len: 3.4, items: [
    { at: 0, lane: -1, slot: 'low' }, { at: 0, lane: 0, slot: 'low' }, { at: 0, lane: 1, slot: 'line' },
    { at: 1.7, lane: 0, slot: 'low' }, { at: 1.7, lane: 1, slot: 'low' }, { at: 1.7, lane: -1, slot: 'line' },
    { at: 3.4, lane: -1, slot: 'low' }, { at: 3.4, lane: 0, slot: 'high' }, { at: 3.4, lane: 1, slot: 'line' },
  ] },
];

// Difficulty that suits a speed: 1 at the stage's start speed, 5 at its max.
export function difficultyFor(speed, startSpeed, maxSpeed) {
  if (!(maxSpeed > startSpeed)) return 1;
  const u = Math.max(0, Math.min(1, (speed - startSpeed) / (maxSpeed - startSpeed)));
  return 1 + Math.round(u * 4);
}

// Patterns that fit: up to the target difficulty and no more than 2 below it.
export function patternsFor(difficulty) {
  return PATTERNS.filter((p) => p.difficulty <= difficulty && p.difficulty >= difficulty - 2);
}

// Is there a way through? Walks the pattern row by row with the game's own
// rules: a jump covers one jump distance and must start on the ground; a duck
// needs the pet on the ground; moving one lane takes laneS seconds.
//   jd: jump distance (world units) at this speed; w: obstacle width.
export function hasClearPath(pattern, { jd, speed, laneS = 0.14, w = 58 }) {
  const rows = new Map();
  for (const it of pattern.items) {
    if (it.slot !== 'low' && it.slot !== 'high') continue;
    const key = it.at;
    if (!rows.has(key)) rows.set(key, {});
    rows.get(key)[it.lane] = it.slot;
  }
  const ats = [...rows.keys()].sort((a, b) => a - b);
  // states: lane -> earliest x where the pet is back on the ground
  let states = new Map([[-1, -Infinity], [0, -Infinity], [1, -Infinity]]);
  let prevX = null;
  for (const at of ats) {
    const x = at * jd; // the obstacle's near edge
    const row = rows.get(at);
    const next = new Map();
    for (const [lane, landX] of states) {
      const secs = prevX == null ? Infinity : (x - prevX) / speed;
      for (const to of [-1, 0, 1]) {
        if (Math.abs(to - lane) * laneS > secs) continue;
        const slot = row[to];
        const options = [];
        if (!slot) options.push(landX);
        else if (slot === 'low') {
          // Take off so the arc's middle is over the obstacle.
          const takeOff = x + w / 2 - jd / 2;
          if (takeOff >= landX) options.push(takeOff + jd);
          // Or still in the air from an earlier jump that clears it.
          if (landX - jd <= x - w * 0.2 && landX >= x + w * 1.2) options.push(landX);
        } else if (slot === 'high') {
          if (landX <= x) options.push(landX);
        }
        for (const o of options) if (!next.has(to) || next.get(to) > o) next.set(to, o);
      }
    }
    if (!next.size) return false;
    states = next;
    prevX = x;
  }
  return true;
}
