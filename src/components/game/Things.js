import React, { memo } from 'react';
import { G, Ellipse, Circle, Path, Rect, Line, Polygon } from 'react-native-svg';
import { C } from '../../theme';

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
      <Ellipse cx={w / 2} cy={h / 2 + 2} rx={w / 2} ry={h / 2 + 1} fill={C.sky} stroke={INK} strokeWidth={SW} />
      <Ellipse cx={w / 2 - 8} cy={h / 2} rx={7} ry={2} fill="#BDEBFF" />
    </G>
  ),
  vacuum: ({ w, h }) => (
    <G>
      <Path d={`M${w - 8} ${h - 14} L${w - 2} 0`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Rect x={2} y={h - 24} width={w - 10} height={18} rx={9} fill={C.tomato} stroke={INK} strokeWidth={SW} />
      <Circle cx={10} cy={h - 4} r={4} fill={INK} />
      <Circle cx={w - 16} cy={h - 4} r={4} fill={INK} />
      <Rect x={8} y={h - 20} width={12} height={5} rx={2.5} fill={C.butter} />
    </G>
  ),
  sprinkler: ({ w, h }) => (
    <G>
      <Path d={`M2 ${h} Q ${w / 2} -6 ${w - 2} ${h}`} stroke={C.sky} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d={`M8 ${h} Q ${w / 2} 4 ${w - 8} ${h}`} stroke="#BDEBFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={6} cy={h - 4} r={3} fill={C.sky} />
      <Circle cx={w - 6} cy={h - 2} r={3} fill={C.sky} />
      {/* the sprinkler head down on the grass */}
      <Rect x={w / 2 - 4} y={h + 22} width={8} height={8} rx={2} fill={C.mint} stroke={INK} strokeWidth={1.5} />
      <Line x1={w / 2} y1={h + 22} x2={w / 2} y2={h + 4} stroke={C.sky} strokeWidth={2} strokeDasharray="3 3" />
    </G>
  ),
  postman: ({ w, h }) => (
    <G>
      {/* a parcel held out at head height, with the postman's arm */}
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
      <Ellipse cx={w / 2 - 4} cy={h / 2} rx={w / 2 - 6} ry={h / 2 - 3} fill="#BDEBFF" stroke={C.sky} strokeWidth={3} />
      <Circle cx={8} cy={6} r={3} fill={C.sky} />
      <Circle cx={4} cy={h - 6} r={2.5} fill={C.sky} />
      <Rect x={w - 8} y={h / 2 - 5} width={14} height={10} rx={2} fill={C.pink} stroke={INK} strokeWidth={1.8} />
      <Rect x={w + 2} y={h / 2 - 1} width={10} height={20} rx={3} fill={C.pink} stroke={INK} strokeWidth={1.8} />
    </G>
  ),
  dog: ({ w, h }) => (
    <G>
      <Ellipse cx={w / 2 + 4} cy={h - 14} rx={w / 2 - 6} ry={10} fill="#C98B4B" stroke={INK} strokeWidth={SW} />
      <Circle cx={10} cy={h - 22} r={10} fill="#C98B4B" stroke={INK} strokeWidth={SW} />
      <Ellipse cx={4} cy={h - 19} rx={4} ry={3.5} fill="#C98B4B" stroke={INK} strokeWidth={1.8} />
      <Circle cx={2} cy={h - 20} r={1.8} fill={INK} />
      <Circle cx={9} cy={h - 25} r={1.6} fill={INK} />
      <Path d={`M14 ${h - 30} C 20 ${h - 30}, 20 ${h - 20}, 17 ${h - 18}`} fill={INK} />
      <Line x1={18} y1={h - 6} x2={18} y2={h} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Line x1={w - 8} y1={h - 6} x2={w - 8} y2={h} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Path d={`M${w - 4} ${h - 18} L${w + 4} ${h - 28}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </G>
  )
};

function Treat({ type }) {
  if (type === 'bone')
    return (
      <G>
        <Rect x={5} y={8} width={12} height={6} fill={C.paper} stroke={INK} strokeWidth={1.6} />
        <Circle cx={4.5} cy={8} r={3.6} fill={C.paper} stroke={INK} strokeWidth={1.6} />
        <Circle cx={4.5} cy={14} r={3.6} fill={C.paper} stroke={INK} strokeWidth={1.6} />
        <Circle cx={17.5} cy={8} r={3.6} fill={C.paper} stroke={INK} strokeWidth={1.6} />
        <Circle cx={17.5} cy={14} r={3.6} fill={C.paper} stroke={INK} strokeWidth={1.6} />
        <Rect x={5} y={9} width={12} height={4} fill={C.paper} />
      </G>
    );
  if (type === 'ball')
    return (
      <G>
        <Circle cx={11} cy={11} r={9} fill="#C6E84B" stroke={INK} strokeWidth={1.8} />
        <Path d="M4 6 Q 11 11 4 16 M18 6 Q 11 11 18 16" stroke={C.paper} strokeWidth={1.6} fill="none" />
      </G>
    );
  if (type === 'fish')
    return (
      <G>
        <Ellipse cx={9} cy={11} rx={8} ry={5.5} fill={C.sky} stroke={INK} strokeWidth={1.6} />
        <Polygon points="16,11 22,5 22,17" fill={C.sky} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        <Circle cx={5.5} cy={10} r={1.3} fill={INK} />
      </G>
    );
  return (
    <G>
      <Circle cx={11} cy={11} r={9} fill={C.pink} stroke={INK} strokeWidth={1.8} />
      <Path d="M4 9 Q 11 3 18 9 M3 13 Q 11 7 19 13 M5 17 Q 11 12 17 17" stroke="#FFB3D4" strokeWidth={1.4} fill="none" />
      <Path d="M18 17 Q 24 20 22 24" stroke={C.pink} strokeWidth={1.6} fill="none" />
    </G>
  );
}

const POWER_COLOUR = { speed: C.tomato, shield: C.sky, magnet: C.pink, double: C.butter };

export function PowerIcon({ type, size = 28 }) {
  const s = size / 28;
  return (
    <G transform={`scale(${s})`}>
      <Circle cx={14} cy={14} r={12.5} fill={POWER_COLOUR[type] || C.mint} stroke={INK} strokeWidth={2.2} />
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

export default memo(Thing);
