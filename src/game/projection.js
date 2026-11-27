export const CAM_W = 276;
export const CENTER_X = 138;
export const HORIZON_Y = 62;
export const PLAYER_GROUND_Y = 208;
export const VISIBLE_DEPTH = 480;
export const LANE_WIDTH_NEAR = 68;
export const LANE_WIDTH_FAR = 11;

// Projects a world offset dx = (worldX - run.dist), trackLane (-1, 0, 1), and height y above ground
// into behind-the-back 3D screen coordinates { x, y, groundY, scale, u, p, horizonY }.
// When `opts.curve` is non-zero, shifts points horizontally by `curve * depth^2` (depth = u = dx / VISIBLE_DEPTH).
// `opts.hillOffset` shifts HORIZON_Y gently up/down (±12 px) for climbing/dipping hills.
export function projectBehind(dx, trackLane = 0, heightY = 0, opts = {}) {
  const curve = Number(opts?.curve) || 0;
  const hillOffset = Number(opts?.hillOffset) || 0;
  const horizonY = HORIZON_Y + hillOffset;
  const u = dx / VISIBLE_DEPTH; // 0 at player, 1 at horizon
  const clamped = Math.max(-0.35, Math.min(1.05, u));
  const p = clamped >= 0 ? Math.pow(1 - Math.min(1, clamped), 1.45) : 1 - clamped * 1.15;
  const groundY = horizonY + (PLAYER_GROUND_Y - horizonY) * p;
  const scale = 0.18 + 0.82 * p;
  const laneSpread = LANE_WIDTH_FAR + (LANE_WIDTH_NEAR - LANE_WIDTH_FAR) * p;
  const depth = Math.max(0, Math.min(1.05, u));
  const x = CENTER_X + trackLane * laneSpread + curve * depth * depth;
  const y = groundY - heightY * 0.66 * scale;
  return { x, y, groundY, scale, u, p, horizonY };
}
