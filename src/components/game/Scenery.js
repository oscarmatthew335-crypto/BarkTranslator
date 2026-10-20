import React, { memo } from 'react';
import { G, Rect, Circle, Ellipse, Path, Polygon, Line } from 'react-native-svg';
import { C } from '../../theme';
import { VIEW_W, VIEW_H, GROUND } from '../../game/engine';

const INK = C.ink;

// Colours and background props per place (theme ids in src/game/stages.js).
export const THEMES = {
  garden: { sky: '#CFF1FF', ground: '#7BD389', edge: '#4FAF62', far: '#A9E5B4', prop: 'tree' },
  park: { sky: '#E3F6FF', ground: '#8FD47A', edge: '#5DAE4E', far: '#B9E3A7', prop: 'bench' },
  beach: { sky: '#BFEAFF', ground: '#F7DE9B', edge: '#E3BE62', far: '#7FD0F0', prop: 'umbrella' },
  braai: { sky: '#FFE2C2', ground: '#B9D97A', edge: '#86AE4B', far: '#F2C48D', prop: 'braai' },
  vet: { sky: '#EEE7FF', ground: '#D9D2F0', edge: '#B7AEDB', far: '#FFFFFF', prop: 'cross' },
  home: { sky: '#FFF1DA', ground: '#D9A876', edge: '#B98252', far: '#F7D9B5', prop: 'sofa' }
};

const PROP_GAP = 220;

function Prop({ type }) {
  switch (type) {
    case 'tree':
      return (
        <G>
          <Rect x={-5} y={-30} width={10} height={30} fill="#9A6338" stroke={INK} strokeWidth={2} />
          <Circle cx={0} cy={-44} r={22} fill="#4FAF62" stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'bench':
      return (
        <G>
          <Rect x={-26} y={-22} width={52} height={7} rx={2} fill="#C98B4B" stroke={INK} strokeWidth={2} />
          <Rect x={-26} y={-34} width={52} height={7} rx={2} fill="#C98B4B" stroke={INK} strokeWidth={2} />
          <Line x1={-20} y1={-15} x2={-20} y2={0} stroke={INK} strokeWidth={3} />
          <Line x1={20} y1={-15} x2={20} y2={0} stroke={INK} strokeWidth={3} />
        </G>
      );
    case 'umbrella':
      return (
        <G>
          <Line x1={0} y1={-50} x2={0} y2={0} stroke={INK} strokeWidth={3} />
          <Path d="M-30 -48 Q 0 -78 30 -48 Z" fill={C.pink} stroke={INK} strokeWidth={2} />
          <Path d="M-10 -48 Q 0 -74 10 -48" fill={C.paper} stroke={INK} strokeWidth={1.5} />
        </G>
      );
    case 'braai':
      return (
        <G>
          <Path d="M-22 -30 Q 0 -10 22 -30 Z" fill="#3A3340" stroke={INK} strokeWidth={2} />
          <Line x1={-14} y1={-20} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
          <Line x1={14} y1={-20} x2={18} y2={0} stroke={INK} strokeWidth={3} />
          <Path d="M-8 -34 q 4 -8 0 -14 M2 -34 q 4 -8 0 -14 M12 -34 q 4 -8 0 -14" stroke="#B7AEDB" strokeWidth={2} fill="none" />
        </G>
      );
    case 'cross':
      return (
        <G>
          <Rect x={-22} y={-60} width={44} height={44} rx={8} fill={C.paper} stroke={INK} strokeWidth={2} />
          <Rect x={-5} y={-54} width={10} height={32} fill={C.tomato} />
          <Rect x={-16} y={-43} width={32} height={10} fill={C.tomato} />
        </G>
      );
    default:
      return (
        <G>
          <Rect x={-34} y={-30} width={68} height={22} rx={8} fill={C.sky} stroke={INK} strokeWidth={2} />
          <Rect x={-38} y={-40} width={14} height={32} rx={6} fill={C.sky} stroke={INK} strokeWidth={2} />
          <Rect x={24} y={-40} width={14} height={32} rx={6} fill={C.sky} stroke={INK} strokeWidth={2} />
          <Line x1={-28} y1={-8} x2={-28} y2={0} stroke={INK} strokeWidth={3} />
          <Line x1={28} y1={-8} x2={28} y2={0} stroke={INK} strokeWidth={3} />
        </G>
      );
  }
}

// Sky and far hills never move, so they are drawn once.
export const Backdrop = memo(function Backdrop({ theme }) {
  const th = THEMES[theme] || THEMES.garden;
  return (
    <G>
      <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={th.sky} />
      <Circle cx={VIEW_W - 50} cy={36} r={18} fill={C.butter} stroke={INK} strokeWidth={2} />
      <Ellipse cx={90} cy={GROUND + 6} rx={140} ry={60} fill={th.far} />
      <Ellipse cx={320} cy={GROUND + 10} rx={160} ry={50} fill={th.far} />
    </G>
  );
});

// Props scroll at half speed for depth; the ground stripes at full speed.
// Both repeat, so only the offset changes from frame to frame.
export function Midground({ theme, dist }) {
  const th = THEMES[theme] || THEMES.garden;
  const off = -((dist * 0.5) % PROP_GAP);
  const stripe = -(dist % 40);
  return (
    <G>
      <G transform={`translate(${off} 0)`}>
        <PropRow prop={th.prop} />
      </G>
      <Rect x={0} y={GROUND} width={VIEW_W} height={VIEW_H - GROUND} fill={th.ground} />
      <Rect x={0} y={GROUND} width={VIEW_W} height={4} fill={th.edge} />
      <G transform={`translate(${stripe} 0)`}>
        <Stripes colour={th.edge} />
      </G>
    </G>
  );
}

const PropRow = memo(function PropRow({ prop }) {
  const xs = [];
  for (let x = 60; x < VIEW_W + PROP_GAP * 2; x += PROP_GAP) xs.push(x);
  return (
    <G>
      {xs.map((x) => (
        <G key={x} transform={`translate(${x} ${GROUND})`}>
          <Prop type={prop} />
        </G>
      ))}
    </G>
  );
});

const Stripes = memo(function Stripes({ colour }) {
  const xs = [];
  for (let x = 0; x < VIEW_W + 80; x += 40) xs.push(x);
  return (
    <G>
      {xs.map((x) => (
        <Polygon key={x} points={`${x},${GROUND + 14} ${x + 14},${GROUND + 14} ${x + 8},${GROUND + 20} ${x - 6},${GROUND + 20}`} fill={colour} opacity={0.6} />
      ))}
    </G>
  );
});

// The goal at the end of a stage: a flag with a bowl of treats.
export const Goal = memo(function Goal() {
  return (
    <G>
      <Line x1={0} y1={0} x2={0} y2={-70} stroke={INK} strokeWidth={3} />
      <Polygon points="0,-70 34,-60 0,-50" fill={C.butter} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 0 Q 24 -16 40 0 Z" fill={C.pink} stroke={INK} strokeWidth={2} />
    </G>
  );
});
