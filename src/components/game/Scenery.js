import React, { memo } from 'react';
import { G, Rect, Circle, Ellipse, Path, Polygon, Line, Defs, LinearGradient, Stop, Image as SvgImage } from 'react-native-svg';
import { C } from '../../theme';
import { parallaxOffsets } from '../../game/parallax';
import { SPRITES } from './sprites';

export { parallaxOffsets };

export const CAM_W = 276;
export const CENTER_X = 138;
export const HORIZON_Y = 62;
export const PLAYER_GROUND_Y = 208;
export const VISIBLE_DEPTH = 480;
export const LANE_WIDTH_NEAR = 68;
export const LANE_WIDTH_FAR = 11;

const INK = C.ink;

// Projects a world offset dx = (worldX - run.dist), trackLane (-1, 0, 1), and height y above ground
// into behind-the-back 3D screen coordinates { x, y, groundY, scale, u, p }.
export function projectBehind(dx, trackLane = 0, heightY = 0) {
  const u = dx / VISIBLE_DEPTH; // 0 at player, 1 at horizon
  const clamped = Math.max(-0.35, Math.min(1.05, u));
  const p = clamped >= 0 ? Math.pow(1 - Math.min(1, clamped), 1.45) : 1 - clamped * 1.15;
  const groundY = HORIZON_Y + (PLAYER_GROUND_Y - HORIZON_Y) * p;
  const scale = 0.18 + 0.82 * p;
  const laneSpread = LANE_WIDTH_FAR + (LANE_WIDTH_NEAR - LANE_WIDTH_FAR) * p;
  const x = CENTER_X + trackLane * laneSpread;
  const y = groundY - heightY * 0.66 * scale;
  return { x, y, groundY, scale, u, p };
}

function edgeX(lane, p) {
  return CENTER_X + lane * (LANE_WIDTH_FAR + (LANE_WIDTH_NEAR - LANE_WIDTH_FAR) * p);
}

// Colours and background props per place (theme ids in src/game/stages.js).
export const THEMES = {
  garden: {
    painted: true,
    sky: '#B2E5FA',
    skyTop: '#7CCDF4',
    skyLow: '#DCF6FD',
    ground: '#6EB83B',
    edge: '#447A1E',
    path: '#F3DFAC',
    far: '#B6DFCB',
    farTree: '#9ECFC0',
    prop: 'tree'
  },
  park: {
    painted: true,
    sky: '#B2E5FA',
    skyTop: '#7CCDF4',
    skyLow: '#DCF6FD',
    ground: '#6EB83B',
    edge: '#447A1E',
    path: '#F3DFAC',
    far: '#B6DFCB',
    farTree: '#9ECFC0',
    prop: 'bench',
    path: '#CFCAC2',
    edge: '#8E8A84',
    roadside: 'park'
  },
  beach: {
    painted: true,
    bg: 'beachBg',
    top: '#A4DDF1',
    roadside: 'beach',
    sky: '#BFEAFF',
    skyTop: '#7ECFF5',
    skyLow: '#E4F7FF',
    ground: '#FFE1AD',
    edge: '#C99A62',
    path: '#E7C08C',
    planks: true,
    far: '#9EDFF7',
    farTree: '#7FD0F0',
    prop: 'umbrella'
  },
  braai: {
    painted: true,
    bg: 'braaiBg',
    top: '#FEA472',
    roadside: 'braai',
    sky: '#FFE2C2',
    skyTop: '#FFC994',
    skyLow: '#FFF3E4',
    ground: '#D3A357',
    edge: '#8E4E3A',
    path: '#C7795C',
    bricks: true,
    far: '#F6D7B0',
    farTree: '#E5BC8B',
    prop: 'braai'
  },
  vet: {
    painted: true,
    bg: 'vetBg',
    top: '#F1DDC5',
    roadside: 'vet',
    sky: '#EEE7FF',
    skyTop: '#D6CAFA',
    skyLow: '#F8F5FF',
    ground: '#DCDEDB',
    edge: '#A9B4BE',
    path: '#F6F7F8',
    tiles: true,
    far: '#E6E0FA',
    farTree: '#D3CAF2',
    prop: 'none' // indoors: no roadside props until the vet props are painted
  },
  home: {
    sky: '#FFF1DA',
    skyTop: '#FFE1B5',
    skyLow: '#FFF8EB',
    ground: '#D9A876',
    edge: '#B98252',
    path: '#F4DFC2',
    far: '#FAE2C6',
    farTree: '#EECDAA',
    prop: 'sofa'
  }
};

const PROP_GAP = 240;

function Prop({ type, index = 0 }) {
  if (type === 'none') return null;
  if (type === 'tree' || type === 'bench') {
    return (
      <G>
        <SvgImage
          href={SPRITES.treesCluster}
          x={index % 2 === 0 ? -54 : -42}
          y={index % 2 === 0 ? -92 : -84}
          width={index % 2 === 0 ? 108 : 96}
          height={index % 2 === 0 ? 106 : 98}
          preserveAspectRatio="xMidYMax meet"
        />
      </G>
    );
  }

  switch (type) {
    case 'umbrella':
      return (
        <G>
          <Line x1={0} y1={-54} x2={0} y2={0} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          <Path d="M-32 -50 Q 0 -82 32 -50 Z" fill={C.pink} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M-12 -50 Q 0 -78 12 -50 Z" fill={C.paper} stroke={INK} strokeWidth={1.6} />
          <Circle cx={0} cy={-67} r={3} fill={C.butter} stroke={INK} strokeWidth={1.5} />
        </G>
      );
    case 'braai':
      return (
        <G>
          <Path d="M-22 -30 Q 0 -8 22 -30 Z" fill="#3A3340" stroke={INK} strokeWidth={2} />
          <Ellipse cx={0} cy={-30} rx={22} ry={4} fill="#585060" stroke={INK} strokeWidth={1.8} />
          <Line x1={-14} y1={-20} x2={-18} y2={0} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Line x1={14} y1={-20} x2={18} y2={0} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Path d="M-8 -36 q 4 -8 0 -14 M2 -36 q 4 -8 0 -14 M12 -36 q 4 -8 0 -14" stroke="#B7AEDB" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'cross':
      return (
        <G>
          <Rect x={-22} y={-60} width={44} height={44} rx={10} fill={C.paper} stroke={INK} strokeWidth={2.2} />
          <Rect x={-5} y={-54} width={10} height={32} rx={2} fill={C.tomato} />
          <Rect x={-16} y={-43} width={32} height={10} rx={2} fill={C.tomato} />
        </G>
      );
    default:
      return (
        <G>
          <Rect x={-34} y={-30} width={68} height={22} rx={8} fill={C.sky} stroke={INK} strokeWidth={2} />
          <Rect x={-38} y={-40} width={14} height={32} rx={6} fill={C.sky} stroke={INK} strokeWidth={2} />
          <Rect x={24} y={-40} width={14} height={32} rx={6} fill={C.sky} stroke={INK} strokeWidth={2} />
          <Line x1={-28} y1={-8} x2={-28} y2={0} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Line x1={28} y1={-8} x2={28} y2={0} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
  }
}

function wrapX(base, offset, span, pad) {
  return ((((base - offset) % span) + span) % span) - pad;
}

const TRACK_BOTTOM_Y = 345;

// sky_bg.jpg is 1080 x 1920; its grass starts 74% of the way down.
const SKY_H = 614;
const SKY_W = SKY_H * (1080 / 1920);
const SKY_HORIZON = 0.74;

// Roadside props, cycled by a stable slot number so each keeps its look while
// it scrolls past. Sizes are in near-lane units (scaled by perspective).
const ROADSIDE = {
  garden: [
    { key: 'treeSingle', w: 81, h: 100 },
    { key: 'bushFlowers', w: 46, h: 38 },
    { key: 'lampPost', w: 27, h: 96 },
    { key: 'bush', w: 46, h: 40 },
  ],
  park: [
    { key: 'parkOak', w: 84, h: 102 },
    { key: 'parkPicnic', w: 60, h: 31 },
    { key: 'parkBin', w: 20, h: 44 },
    { key: 'parkFence', w: 58, h: 38 },
  ],
  beach: [
    { key: 'beachPalm', w: 72, h: 96 },
    { key: 'beachCastle', w: 46, h: 42 },
    { key: 'beachUmbrella', w: 64, h: 76 },
    { key: 'beachFlag', w: 30, h: 66 },
  ],
  braai: [
    { key: 'parkOak', w: 84, h: 102 },
    { key: 'bushFlowers', w: 46, h: 38 },
    { key: 'parkPicnic', w: 60, h: 31 },
    { key: 'bush', w: 46, h: 40 },
  ],
  vet: [],
};
const roadsideFor = (list, n) => list[((n % list.length) + list.length) % list.length];
const TRACK_BOTTOM_P = (TRACK_BOTTOM_Y - HORIZON_Y) / (PLAYER_GROUND_Y - HORIZON_Y);

// Painted behind-the-back park sky + distant horizon hills and trees above HORIZON_Y.
export const Backdrop = memo(function Backdrop({ theme, dist = 0, reduceMotion = false }) {
  const th = THEMES[theme] || THEMES.garden;
  const off = parallaxOffsets(dist, reduceMotion);

  if (th.painted) {
    return (
      <G>
        {/* Seamless sky extension above the painting */}
        <Rect x={-40} y={-800} width={CAM_W + 80} height={820} fill={th.top || '#BFE9E7'} />
        {/* Painted sky, sun, hills and treeline. Its grass line (74% down the
            picture) sits on HORIZON_Y; it is sized so even the tallest phone
            view (2.4:1) shows no gap above it, and the sides crop evenly. */}
        <SvgImage
          href={SPRITES[th.bg || 'skyBg']}
          x={CENTER_X - SKY_W / 2}
          y={HORIZON_Y - SKY_H * SKY_HORIZON}
          width={SKY_W}
          height={SKY_H}
          preserveAspectRatio="none"
        />
      </G>
    );
  }

  return (
    <G>
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={th.skyTop || th.sky} />
          <Stop offset="65%" stopColor={th.sky} />
          <Stop offset="100%" stopColor={th.skyLow || th.sky} />
        </LinearGradient>
      </Defs>
      <Rect x={-40} y={-800} width={CAM_W + 80} height={740} fill={th.skyTop || th.sky} />
      <Rect x={-40} y={-80} width={CAM_W + 80} height={HORIZON_Y + 90} fill="url(#skyGrad)" />
      {[0, 140].map((bx) => (
        <SvgImage
          key={`th-${bx}`}
          href={SPRITES.hillsParallax}
          x={bx - 16 + ((off.far * 0.05) % 12)}
          y={HORIZON_Y - 40}
          width={180}
          height={48}
          preserveAspectRatio="none"
        />
      ))}
    </G>
  );
});

// 3-lane behind-the-back perspective park track, scrolling lane dashes and side trees.
export function Midground({ theme, dist, reduceMotion = false }) {
  const th = THEMES[theme] || THEMES.garden;
  const scroll = reduceMotion ? dist * 0.45 : dist;

  // Perspective polygons from HORIZON_Y (p=0) down to TRACK_BOTTOM_Y (p=TRACK_BOTTOM_P)
  const shoulderPoly = `${edgeX(-1.68, 0)},${HORIZON_Y} ${edgeX(1.68, 0)},${HORIZON_Y} ${edgeX(1.68, TRACK_BOTTOM_P)},${TRACK_BOTTOM_Y} ${edgeX(-1.68, TRACK_BOTTOM_P)},${TRACK_BOTTOM_Y}`;
  const roadPoly = `${edgeX(-1.54, 0)},${HORIZON_Y} ${edgeX(1.54, 0)},${HORIZON_Y} ${edgeX(1.54, TRACK_BOTTOM_P)},${TRACK_BOTTOM_Y} ${edgeX(-1.54, TRACK_BOTTOM_P)},${TRACK_BOTTOM_Y}`;
  const centerLanePoly = `${edgeX(-0.5, 0)},${HORIZON_Y} ${edgeX(0.5, 0)},${HORIZON_Y} ${edgeX(0.5, TRACK_BOTTOM_P)},${TRACK_BOTTOM_Y} ${edgeX(-0.5, TRACK_BOTTOM_P)},${TRACK_BOTTOM_Y}`;

  // Scrolling dashes and side scenery projected back-to-front
  const stepDx = 60;
  const phase = ((scroll % stepDx) + stepDx) % stepDx;
  const marks = [];
  for (let i = 0; i < 10; i++) {
    const dx = VISIBLE_DEPTH - phase - i * stepDx;
    if (dx > -75 && dx < VISIBLE_DEPTH) marks.push(dx);
  }

  const treeStep = 130;
  const treeOffset = ((scroll % treeStep) + treeStep) % treeStep;
  const treeSlots = [];
  const slotBase = Math.floor(scroll / treeStep);
  for (let i = 0; i < 5; i++) {
    const dx = VISIBLE_DEPTH - 20 - treeOffset - i * treeStep;
    if (dx > -70 && dx < VISIBLE_DEPTH - 10) treeSlots.push({ dx, slot: slotBase - i });
  }

  return (
    <G>
      {/* Lush green park grass & verge banks */}
      <Rect x={-40} y={HORIZON_Y} width={CAM_W + 80} height={TRACK_BOTTOM_Y - HORIZON_Y + 40} fill={th.ground} />
      <Line x1={-40} y1={HORIZON_Y} x2={CAM_W + 40} y2={HORIZON_Y} stroke={th.edge} strokeWidth={2.5} />

      {/* Outer road curb / dirt verge */}
      <Polygon points={shoulderPoly} fill={th.edge} stroke={INK} strokeWidth={2} strokeLinejoin="round" />

      {/* Main 3-lane park track */}
      <Polygon points={roadPoly} fill={th.path || '#F3DFAC'} />

      {/* Lighter center lane surface so the 3 lanes read cleanly at a glance */}
      <Polygon points={centerLanePoly} fill="rgba(255,255,255,0.22)" />

      {/* Subtle scrolling cross-track ground bands to reinforce forward speed */}
      {marks.map((dx, i) => {
        const dxFar = Math.min(VISIBLE_DEPTH, dx + 22);
        const a = projectBehind(dx, 0, 0);
        const b = projectBehind(dxFar, 0, 0);
        const l0 = edgeX(-1.52, a.p);
        const r0 = edgeX(1.52, a.p);
        const l1 = edgeX(-1.52, b.p);
        const r1 = edgeX(1.52, b.p);
        const dl0 = edgeX(-0.5, a.p);
        const dr0 = edgeX(0.5, a.p);
        const dl1 = edgeX(-0.5, b.p);
        const dr1 = edgeX(0.5, b.p);
        const hw = Math.max(1.2, 2.2 * a.scale);
        return (
          <G key={`m-${i}`}>
            <Polygon points={`${l1},${b.groundY} ${r1},${b.groundY} ${r0},${a.groundY} ${l0},${a.groundY}`} fill="rgba(182,146,84,0.14)" />
            {/* Boardwalk planks, brick paving or floor tiles: seams across the road */}
            {th.planks || th.bricks || th.tiles ? (
              <Line x1={l0} y1={a.groundY} x2={r0} y2={a.groundY} stroke={th.edge} strokeWidth={Math.max(0.6, 1.6 * a.scale)} opacity={th.tiles ? 0.45 : 0.6} />
            ) : null}
            {/* Left and right lane divider dashes */}
            <Polygon
              points={`${dl1 - hw * 0.6},${b.groundY} ${dl1 + hw * 0.6},${b.groundY} ${dl0 + hw},${a.groundY} ${dl0 - hw},${a.groundY}`}
              fill="rgba(255,252,240,0.82)"
            />
            <Polygon
              points={`${dr1 - hw * 0.6},${b.groundY} ${dr1 + hw * 0.6},${b.groundY} ${dr0 + hw},${a.groundY} ${dr0 - hw},${a.groundY}`}
              fill="rgba(255,252,240,0.82)"
            />
          </G>
        );
      })}

      {/* Outer track ink rails */}
      <Line x1={edgeX(-1.54, 0)} y1={HORIZON_Y} x2={edgeX(-1.54, TRACK_BOTTOM_P)} y2={TRACK_BOTTOM_Y} stroke={INK} strokeWidth={2.2} />
      <Line x1={edgeX(1.54, 0)} y1={HORIZON_Y} x2={edgeX(1.54, TRACK_BOTTOM_P)} y2={TRACK_BOTTOM_Y} stroke={INK} strokeWidth={2.2} />

      {/* Scrolling perspective trees and flower tufts lining both sides of the track */}
      {treeSlots.map(({ dx, slot }, i) => {
        const left = projectBehind(dx, -2.02, 0);
        const right = projectBehind(dx, 2.02, 0);
        const tw = 96 * left.scale;
        const thPx = 92 * left.scale;
        const pOff = projectBehind(Math.min(VISIBLE_DEPTH - 5, dx + 55), 0, 0);
        const pw = 36 * pOff.scale;
        const ph = 28 * pOff.scale;
        const leftFlora = projectBehind(Math.min(VISIBLE_DEPTH - 5, dx + 55), -1.78, 0);
        const rightFlora = projectBehind(Math.min(VISIBLE_DEPTH - 5, dx + 55), 1.78, 0);
        return (
          <G key={`sc-${i}`}>
            <SvgImage
              href={SPRITES.pathDetails}
              x={leftFlora.x - pw / 2}
              y={leftFlora.groundY - ph * 0.8}
              width={pw}
              height={ph}
              preserveAspectRatio="xMidYMax meet"
            />
            <SvgImage
              href={SPRITES.pathDetails}
              x={rightFlora.x - pw / 2}
              y={rightFlora.groundY - ph * 0.8}
              width={pw}
              height={ph}
              preserveAspectRatio="xMidYMax meet"
            />
            {th.painted && (ROADSIDE[th.roadside || 'garden'] || []).length ? (
              <>
                {[
                  [left, roadsideFor(ROADSIDE[th.roadside || 'garden'], slot)],
                  [right, roadsideFor(ROADSIDE[th.roadside || 'garden'], slot + 2)],
                ].map(([pos, prop], side) => (
                  <SvgImage
                    key={side}
                    href={SPRITES[prop.key]}
                    x={pos.x - (prop.w * pos.scale) / 2}
                    y={pos.groundY - prop.h * pos.scale}
                    width={prop.w * pos.scale}
                    height={prop.h * pos.scale}
                    preserveAspectRatio="xMidYMax meet"
                  />
                ))}
              </>
            ) : th.prop === 'tree' || th.prop === 'bench' ? (
              <>
                <SvgImage
                  href={SPRITES.treesCluster}
                  x={left.x - tw / 2}
                  y={left.groundY - thPx}
                  width={tw}
                  height={thPx}
                  preserveAspectRatio="xMidYMax meet"
                />
                <SvgImage
                  href={SPRITES.treesCluster}
                  x={right.x - tw / 2}
                  y={right.groundY - thPx}
                  width={tw}
                  height={thPx}
                  preserveAspectRatio="xMidYMax meet"
                />
              </>
            ) : (
              <>
                <G transform={`translate(${left.x} ${left.groundY}) scale(${left.scale})`}>
                  <Prop type={th.prop} index={i} />
                </G>
                <G transform={`translate(${right.x} ${right.groundY}) scale(${right.scale})`}>
                  <Prop type={th.prop} index={i + 1} />
                </G>
              </>
            )}
          </G>
        );
      })}
    </G>
  );
}

// The goal at the end of a stage: a painted finish arch over all three lanes.
export const Goal = memo(function Goal() {
  const w = 236;
  const h = w * 0.615;
  return <SvgImage href={SPRITES.finishArch} x={-w / 2} y={-h + 6} width={w} height={h} preserveAspectRatio="none" />;
});
