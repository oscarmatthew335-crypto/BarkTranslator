import React, { memo } from 'react';
import { G, Rect, Circle, Ellipse, Path, Polygon, Line, Defs, LinearGradient, Stop, Image as SvgImage } from 'react-native-svg';
import { C } from '../../theme';
import { VIEW_W, VIEW_H, GROUND } from '../../game/engine';
import { parallaxOffsets } from '../../game/parallax';
import { SPRITES } from './sprites';

export { parallaxOffsets };

const INK = C.ink;

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
    prop: 'bench'
  },
  beach: {
    sky: '#BFEAFF',
    skyTop: '#7ECFF5',
    skyLow: '#E4F7FF',
    ground: '#F7DE9B',
    edge: '#E3BE62',
    path: '#FFF0C2',
    far: '#9EDFF7',
    farTree: '#7FD0F0',
    prop: 'umbrella'
  },
  braai: {
    sky: '#FFE2C2',
    skyTop: '#FFC994',
    skyLow: '#FFF3E4',
    ground: '#A2CC5E',
    edge: '#759F3A',
    path: '#ECD59F',
    far: '#F6D7B0',
    farTree: '#E5BC8B',
    prop: 'braai'
  },
  vet: {
    sky: '#EEE7FF',
    skyTop: '#D6CAFA',
    skyLow: '#F8F5FF',
    ground: '#D9D2F0',
    edge: '#B7AEDB',
    path: '#F7F5FF',
    far: '#E6E0FA',
    farTree: '#D3CAF2',
    prop: 'cross'
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

// Painted park panorama base layered with scrolling hills and tree clusters.
export const Backdrop = memo(function Backdrop({ theme, dist = 0, reduceMotion = false }) {
  const th = THEMES[theme] || THEMES.garden;
  const off = parallaxOffsets(dist, reduceMotion);
  const farSpan = 420;
  const hillsSpan = 480;

  if (th.painted) {
    return (
      <G>
        <Defs>
          <LinearGradient id="paintedSkyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#9AD9F2" />
            <Stop offset="100%" stopColor="#E0F1F4" />
          </LinearGradient>
        </Defs>
        {/* Seamless sky & soil extension fills for full-screen portrait viewport */}
        <Rect x={-40} y={-800} width={VIEW_W + 80} height={782} fill="url(#paintedSkyGrad)" />
        <Rect x={-40} y={GROUND + 20} width={VIEW_W + 80} height={240} fill="#5C3A21" />
        {/* Painted base park illustration aligned so footpath sits right at GROUND = 186 */}
        <SvgImage
          href={SPRITES.parkBg}
          x={-4}
          y={-22}
          width={284}
          height={286}
          preserveAspectRatio="none"
        />
        {/* Gentle parallax distant hills & tree clusters gliding along the meadow horizon */}
        <G opacity={0.45}>
          {[0, 220].map((bx) => {
            const hx = wrapX(bx, off.far, hillsSpan, 140);
            return (
              <SvgImage
                key={`h-${bx}`}
                href={SPRITES.hillsParallax}
                x={hx}
                y={GROUND - 94}
                width={200}
                height={90}
                preserveAspectRatio="none"
              />
            );
          })}
        </G>
        <G opacity={0.82}>
          {[35, 250].map((bx) => {
            const tx = wrapX(bx, off.far * 1.3, farSpan, 110);
            return (
              <SvgImage
                key={`t-${bx}`}
                href={SPRITES.treesCluster}
                x={tx}
                y={GROUND - 110}
                width={106}
                height={102}
                preserveAspectRatio="xMidYMax meet"
              />
            );
          })}
        </G>
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
      <Rect x={-40} y={-1200} width={VIEW_W + 80} height={1140} fill={th.skyTop || th.sky} />
      <Rect x={-40} y={-80} width={VIEW_W + 80} height={GROUND + 85} fill="url(#skyGrad)" />
      {[0, 220].map((bx) => {
        const hx = wrapX(bx, off.far, hillsSpan, 140);
        return (
          <SvgImage
            key={`th-${bx}`}
            href={SPRITES.hillsParallax}
            x={hx}
            y={GROUND - 88}
            width={220}
            height={90}
            preserveAspectRatio="none"
          />
        );
      })}
    </G>
  );
});

// Scrolling foreground painted props along the footpath + soil cutaway for controls.
export function Midground({ theme, dist, reduceMotion = false }) {
  const th = THEMES[theme] || THEMES.garden;
  const p = parallaxOffsets(dist, reduceMotion);
  const off = -(p.props % PROP_GAP);
  const shiftCount = Math.floor(p.props / PROP_GAP);
  const detailOff = -(p.ground % 180);

  return (
    <G>
      {!th.painted ? (
        <>
          <Rect x={-40} y={GROUND - 14} width={VIEW_W + 80} height={9} fill={th.ground} />
          <Rect x={-40} y={GROUND - 7} width={VIEW_W + 80} height={14} fill={th.path || '#F3DFAC'} />
          <Rect x={-40} y={GROUND + 7} width={VIEW_W + 80} height={VIEW_H + 140} fill="#5C3A21" />
        </>
      ) : null}

      {/* Scrolling painted benches, trash cans & tree props */}
      <G transform={`translate(${off} ${GROUND - 12})`}>
        <PropRow prop={th.prop} shiftCount={shiftCount} />
      </G>

      {/* Subtle scrolling path details (pebbles & wildflowers) */}
      <G transform={`translate(${detailOff} 0)`} opacity={0.85}>
        {[40, 220, 400].map((dx) => (
          <SvgImage
            key={dx}
            href={SPRITES.pathDetails}
            x={dx}
            y={GROUND - 18}
            width={48}
            height={36}
            preserveAspectRatio="xMidYMid meet"
          />
        ))}
      </G>
    </G>
  );
}

const PropRow = memo(function PropRow({ prop, shiftCount = 0 }) {
  const xs = [];
  for (let i = 0; i * PROP_GAP < VIEW_W + PROP_GAP * 2; i++) xs.push(i);
  return (
    <G>
      {xs.map((i) => (
        <G key={i} transform={`translate(${120 + i * PROP_GAP} 0)`}>
          <Prop type={prop} index={i + shiftCount} />
        </G>
      ))}
    </G>
  );
});

// The goal at the end of a stage: a flag with a bowl of treats.
export const Goal = memo(function Goal() {
  return (
    <G>
      <Line x1={0} y1={0} x2={0} y2={-70} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Polygon points="0,-70 36,-60 0,-50" fill={C.butter} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 0 Q 24 -16 40 0 Z" fill={C.pink} stroke={INK} strokeWidth={2} />
    </G>
  );
});
