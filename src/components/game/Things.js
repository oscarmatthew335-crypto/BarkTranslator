import React, { memo } from 'react';
import { G, Ellipse, Circle, Path, Rect, Line, Polygon, Image as SvgImage } from 'react-native-svg';
import { C } from '../../theme';
import { SPRITES } from './sprites';

const INK = C.ink;
const SW = 2.2;

// Obstacles, treats and power-ups, each drawn in its own box with the top-left
// corner at 0,0 (sizes match src/game/stages.js).
function Thing({ kind, type, w, h }) {
  if (kind === 'treat') return <Treat type={type} />;
  if (kind === 'power') return <PowerBox type={type} />;
  const Art = OBSTACLE_ART[type];
  return Art ? <Art w={w} h={h} /> : <Rect width={w} height={h} rx={6} fill={C.tomato} stroke={INK} strokeWidth={SW} />;
}

const OBSTACLE_ART = {
  puddle: ({ w, h }) => (
    <G>
      <Ellipse cx={w / 2} cy={h / 2 + 2} rx={w / 2} ry={h / 2 + 1} fill={C.arcadeBlue} stroke={INK} strokeWidth={SW} />
      <Ellipse cx={w / 2 - 8} cy={h / 2} rx={8} ry={2.4} fill="#BDEBFF" />
    </G>
  ),
  vacuum: ({ w, h }) => (
    <G>
      <Path d={`M${w - 8} ${h - 14} L${w - 2} 0`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Rect x={2} y={h - 24} width={w - 10} height={18} rx={9} fill={C.coral} stroke={INK} strokeWidth={SW} />
      <Circle cx={10} cy={h - 4} r={4} fill={INK} />
      <Circle cx={w - 16} cy={h - 4} r={4} fill={INK} />
      <Rect x={8} y={h - 20} width={12} height={5} rx={2.5} fill={C.butter} />
    </G>
  ),
  sprinkler: ({ w, h }) => (
    <G>
      <Path d={`M2 ${h} Q ${w / 2} -6 ${w - 2} ${h}`} stroke={C.arcadeBlue} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d={`M8 ${h} Q ${w / 2} 4 ${w - 8} ${h}`} stroke="#BDEBFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={6} cy={h - 4} r={3} fill={C.arcadeBlue} />
      <Circle cx={w - 6} cy={h - 2} r={3} fill={C.arcadeBlue} />
      <Rect x={w / 2 - 4} y={h + 22} width={8} height={8} rx={2} fill={C.lime} stroke={INK} strokeWidth={1.5} />
      <Line x1={w / 2} y1={h + 22} x2={w / 2} y2={h + 4} stroke={C.arcadeBlue} strokeWidth={2} strokeDasharray="3 3" />
    </G>
  ),
  postman: ({ w, h }) => (
    <G>
      <Path d={`M${w} ${h / 2} L${w + 18} ${h / 2 - 4}`} stroke="#1E5AA8" strokeWidth={7} strokeLinecap="round" />
      <Circle cx={w + 26} cy={h / 2 - 10} r={9} fill="#F2C9A0" stroke={INK} strokeWidth={SW} />
      <Rect x={w + 17} y={h / 2 - 22} width={18} height={6} rx={2} fill="#1E5AA8" stroke={INK} strokeWidth={1.5} />
      <Rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill="#C99A62" stroke={INK} strokeWidth={SW} />
      <Line x1={w / 2} y1={2} x2={w / 2} y2={h - 2} stroke="#8C6239" strokeWidth={3} />
    </G>
  ),
  cucumber: ({ w, h }) => (
    <G>
      <Rect x={1} y={1} width={w - 2} height={h - 2} rx={h / 2} fill="#4CAF50" stroke={INK} strokeWidth={SW} />
      <Circle cx={12} cy={h / 2 - 2} r={1.6} fill="#A5D6A7" />
      <Circle cx={22} cy={h / 2 + 2} r={1.6} fill="#A5D6A7" />
      <Circle cx={32} cy={h / 2 - 1} r={1.6} fill="#A5D6A7" />
    </G>
  ),
  spray: ({ w, h }) => (
    <G>
      <Ellipse cx={w / 2 - 4} cy={h / 2} rx={w / 2 - 6} ry={h / 2 - 3} fill="#BDEBFF" stroke={C.arcadeBlue} strokeWidth={3} />
      <Circle cx={8} cy={6} r={3} fill={C.arcadeBlue} />
      <Circle cx={4} cy={h - 6} r={2.5} fill={C.arcadeBlue} />
      <Rect x={w - 8} y={h / 2 - 5} width={14} height={10} rx={2} fill={C.pink} stroke={INK} strokeWidth={1.8} />
      <Rect x={w + 2} y={h / 2 - 1} width={10} height={20} rx={3} fill={C.pink} stroke={INK} strokeWidth={1.8} />
    </G>
  ),
  dog: ({ w, h }) => (
    <G transform={`translate(${w} 0) scale(-1 1)`}>
      <SvgImage href={SPRITES.dogChaser} x={0} y={-2} width={w + 8} height={h + 4} preserveAspectRatio="xMidYMid meet" />
    </G>
  ),
  catDash: ({ w, h }) => (
    <G transform={`translate(${w} 0) scale(-1 1)`}>
      <SvgImage href={SPRITES.catHero} x={-4} y={-8} width={w + 8} height={h + 12} preserveAspectRatio="xMidYMid meet" />
    </G>
  ),
  dogDash: ({ w, h }) => (
    <G transform={`translate(${w} 0) scale(-1 1)`}>
      <SvgImage href={SPRITES.dogChaser} x={-4} y={-2} width={w + 10} height={h + 4} preserveAspectRatio="xMidYMid meet" />
    </G>
  ),
  bird: ({ w, h }) => (
    <G>
      <Ellipse cx={w / 2 + 2} cy={h / 2 + 2} rx={w / 2 - 4} ry={h / 2 - 4} fill={C.arcadeBlue} stroke={INK} strokeWidth={SW} />
      <Path d={`M${w / 2 - 4} ${h / 2 - 2} Q ${w / 2 + 2} -4 ${w / 2 + 10} ${h / 2 - 2}`} fill={C.paper} stroke={INK} strokeWidth={1.8} />
      <Polygon points={`2,${h / 2 + 1} 8,${h / 2 - 2} 8,${h / 2 + 4}`} fill={C.butter} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <Circle cx={11} cy={h / 2 - 1} r={1.6} fill={INK} />
    </G>
  )
};

function Treat({ type }) {
  if (type === 'bone')
    return <SvgImage href={SPRITES.iconBone} x={0} y={0} width={22} height={22} preserveAspectRatio="xMidYMid meet" />;
  if (type === 'ball')
    return <SvgImage href={SPRITES.iconStar} x={0} y={0} width={22} height={22} preserveAspectRatio="xMidYMid meet" />;
  if (type === 'fish')
    return <SvgImage href={SPRITES.fish} x={-2} y={0} width={26} height={21} preserveAspectRatio="xMidYMid meet" />;
  return (
    <G>
      <Circle cx={11} cy={11} r={10} fill={C.butter} stroke={INK} strokeWidth={1.5} />
      <SvgImage href={SPRITES.iconPaw} x={3.5} y={3.5} width={15} height={15} preserveAspectRatio="xMidYMid meet" />
    </G>
  );
}

const POWER_COLOUR = { speed: C.coral, shield: C.arcadeBlue, magnet: C.pink, double: C.butter };

export function PowerIcon({ type, size = 28 }) {
  const s = size / 28;
  return (
    <G transform={`scale(${s})`}>
      <Circle cx={14} cy={14} r={12.5} fill={POWER_COLOUR[type] || C.lime} stroke={INK} strokeWidth={2.2} />
      {type === 'speed' && <Polygon points="15,4 8,16 13,16 11,24 20,11 15,11" fill={C.paper} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />}
      {type === 'shield' && <Path d="M14 5 L21 8 Q 21 18 14 23 Q 7 18 7 8 Z" fill={C.paper} stroke={INK} strokeWidth={1.6} />}
      {type === 'magnet' && (
        <Path d="M8 7 L8 14 A 6 6 0 0 0 20 14 L20 7 L16 7 L16 14 A 2 2 0 0 1 12 14 L12 7 Z" fill={C.paper} stroke={INK} strokeWidth={1.4} />
      )}
      {type === 'double' && <Path d="M9 10 Q 9 6 13 6 Q 17 6 17 10 Q 17 13 9 20 L18 20" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </G>
  );
}

function PowerBox({ type }) {
  return <PowerIcon type={type} />;
}

// The chaser drawn behind the pet on the left of the screen in Chase mode.
export function Chaser({ chaser, phase = 0 }) {
  const id = chaser?.id || 'bath';
  if (id === 'dog') {
    const a = (Number(phase) || 0) * 1.45;
    const bob = Math.sin(a * 2) * 2.2;
    const pitch = Math.sin(a) * 5;
    const stretchX = 1 + Math.cos(a) * 0.04;
    const stretchY = 1 - Math.sin(a) * 0.04;

    return (
      <G>
        <Ellipse cx={24} cy={39} rx={19} ry={3.5} fill="rgba(36,29,59,0.24)" />
        {Math.sin(a) > 0.2 ? (
          <SvgImage href={SPRITES.dustPuff} x={-22} y={24} width={28} height={14} preserveAspectRatio="xMidYMid meet" />
        ) : null}
        <G transform={`translate(0 ${bob.toFixed(2)}) rotate(${pitch.toFixed(1)} 24 24) translate(24 39) scale(${stretchX.toFixed(3)} ${stretchY.toFixed(3)}) translate(-24 -39)`}>
          <SvgImage href={SPRITES.dogChaser} x={-4} y={-6} width={58} height={47} preserveAspectRatio="xMidYMid meet" />
        </G>
      </G>
    );
  }
  // Glossy bathtub with soap bubbles (bath time).
  return (
    <G>
      <Circle cx={10} cy={4} r={5} fill="#BDEBFF" stroke={C.arcadeBlue} strokeWidth={1.6} />
      <Circle cx={22} cy={0} r={6} fill="#BDEBFF" stroke={C.arcadeBlue} strokeWidth={1.6} />
      <Circle cx={33} cy={5} r={4.5} fill="#BDEBFF" stroke={C.arcadeBlue} strokeWidth={1.6} />
      <Circle cx={6} cy={-5} r={3.5} fill="#E3F6FF" stroke={C.arcadeBlue} strokeWidth={1.4} />
      <Path d="M2 12 L44 12 Q 42 32 23 32 Q 4 32 2 12 Z" fill={C.paper} stroke={INK} strokeWidth={SW} />
      <Rect x={0} y={9} width={46} height={5} rx={2.5} fill={C.arcadeBlue} stroke={INK} strokeWidth={1.8} />
      <Circle cx={11} cy={35} r={4.5} fill={C.butter} stroke={INK} strokeWidth={2} />
      <Circle cx={35} cy={35} r={4.5} fill={C.butter} stroke={INK} strokeWidth={2} />
    </G>
  );
}

export default memo(Thing);
