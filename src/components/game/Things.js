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
    <G>
      <Ellipse cx={w / 2 + 4} cy={h - 14} rx={w / 2 - 6} ry={10} fill="#B8733E" stroke={INK} strokeWidth={SW} />
      <Circle cx={10} cy={h - 22} r={10} fill="#B8733E" stroke={INK} strokeWidth={SW} />
      <Ellipse cx={4} cy={h - 19} rx={4} ry={3.5} fill="#E0A97B" stroke={INK} strokeWidth={1.8} />
      <Circle cx={2} cy={h - 20} r={1.8} fill={INK} />
      <Circle cx={9} cy={h - 25} r={1.6} fill={INK} />
      <Path d={`M14 ${h - 30} C 20 ${h - 30}, 20 ${h - 20}, 17 ${h - 18}`} fill="#63391F" stroke={INK} strokeWidth={1.5} />
      <Line x1={18} y1={h - 6} x2={18} y2={h} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Line x1={w - 8} y1={h - 6} x2={w - 8} y2={h} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Path d={`M${w - 4} ${h - 18} L${w + 4} ${h - 28}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  catDash: ({ w, h }) => (
    <G>
      <Ellipse cx={w / 2} cy={h + 1} rx={w / 2 - 2} ry={3.5} fill="rgba(26,18,43,0.22)" />
      <Ellipse cx={w / 2 + 3} cy={h - 11} rx={w / 2 - 5} ry={8} fill="#7B6D8D" stroke={INK} strokeWidth={SW} />
      <Circle cx={10} cy={h - 18} r={8.5} fill="#7B6D8D" stroke={INK} strokeWidth={SW} />
      <Polygon points={`4,${h - 24} 6,${h - 32} 11,${h - 25}`} fill="#7B6D8D" stroke={INK} strokeWidth={1.8} />
      <Polygon points={`12,${h - 25} 16,${h - 32} 17,${h - 23}`} fill="#7B6D8D" stroke={INK} strokeWidth={1.8} />
      <Circle cx={7} cy={h - 19} r={1.5} fill={C.butter} />
      <Circle cx={3} cy={h - 16} r={1.4} fill={C.pink} />
      <Path d={`M${w - 3} ${h - 14} C ${w + 5} ${h - 22}, ${w + 2} ${h - 30}, ${w - 4} ${h - 28}`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </G>
  ),
  dogDash: ({ w, h }) => (
    <G>
      <Ellipse cx={w / 2} cy={h + 1} rx={w / 2 - 2} ry={3.5} fill="rgba(26,18,43,0.22)" />
      <Ellipse cx={w / 2 + 4} cy={h - 12} rx={w / 2 - 5} ry={9} fill="#B8733E" stroke={INK} strokeWidth={SW} />
      <Circle cx={10} cy={h - 20} r={9.5} fill="#B8733E" stroke={INK} strokeWidth={SW} />
      <Ellipse cx={4} cy={h - 17} rx={3.5} ry={3} fill="#E0A97B" stroke={INK} strokeWidth={1.8} />
      <Circle cx={2} cy={h - 18} r={1.6} fill={INK} />
      <Circle cx={9} cy={h - 22} r={1.5} fill={INK} />
      <Path d={`M14 ${h - 27} C 19 ${h - 27}, 19 ${h - 18}, 16 ${h - 16}`} fill="#63391F" />
      <Path d={`M${w - 3} ${h - 16} L${w + 5} ${h - 25}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
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
    return (
      <G>
        <Circle cx={11} cy={11} r={10} fill={C.butter} stroke={INK} strokeWidth={1.6} />
        <Circle cx={11} cy={11} r={7.2} fill={C.butterLight} stroke={C.butterDark} strokeWidth={1} />
        <Rect x={6.5} y={8.8} width={9} height={4.4} fill={C.paper} stroke={INK} strokeWidth={1.3} />
        <Circle cx={6} cy={8.5} r={2.5} fill={C.paper} stroke={INK} strokeWidth={1.2} />
        <Circle cx={6} cy={13.5} r={2.5} fill={C.paper} stroke={INK} strokeWidth={1.2} />
        <Circle cx={16} cy={8.5} r={2.5} fill={C.paper} stroke={INK} strokeWidth={1.2} />
        <Circle cx={16} cy={13.5} r={2.5} fill={C.paper} stroke={INK} strokeWidth={1.2} />
      </G>
    );
  if (type === 'ball')
    return (
      <G>
        <Circle cx={11} cy={11} r={9.5} fill="#85E06F" stroke={INK} strokeWidth={1.8} />
        <Path d="M4.5 6 Q 11 11 4.5 16 M17.5 6 Q 11 11 17.5 16" stroke={C.paper} strokeWidth={1.8} fill="none" />
      </G>
    );
  if (type === 'fish')
    return (
      <G>
        <Polygon points="15.5,11 22.5,5.5 20.5,11 22.5,16.5" fill="#48B8F8" stroke="#1E5B8A" strokeWidth={1.6} strokeLinejoin="round" />
        <Ellipse cx={9.5} cy={11} rx={8} ry={5.5} fill="#48B8F8" stroke="#1E5B8A" strokeWidth={1.6} />
        <Ellipse cx={9.5} cy={9} rx={5.5} ry={2.1} fill="#85D4FF" opacity={0.85} />
        <Path d="M10.5 7.5 Q12 11 10.5 14.5" stroke="#1E5B8A" strokeWidth={1.3} fill="none" />
        <Circle cx={5.5} cy={10} r={1.4} fill="#FFFFFF" />
        <Circle cx={5.5} cy={10} r={0.8} fill={INK} />
      </G>
    );
  return (
    <G>
      <Circle cx={11} cy={11} r={9.5} fill={C.butter} stroke={INK} strokeWidth={1.8} />
      <Circle cx={11} cy={11} r={6.8} fill={C.butterLight} stroke={C.butterDark} strokeWidth={1.1} />
      <Circle cx={11} cy={12.5} r={2.4} fill={C.butterDark} />
      <Circle cx={8.2} cy={8.6} r={1.1} fill={C.butterDark} />
      <Circle cx={11} cy={7.8} r={1.1} fill={C.butterDark} />
      <Circle cx={13.8} cy={8.6} r={1.1} fill={C.butterDark} />
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
export function Chaser({ chaser }) {
  const id = chaser?.id || 'bath';
  if (id === 'dog') {
    // Expressive cartoon brown chasing dog facing right toward the cat.
    return (
      <G>
        <Ellipse cx={23} cy={38} rx={19} ry={3.5} fill="rgba(36,29,59,0.2)" />
        {/* wagging tail */}
        <Path d="M4 20 Q -4 14 -2 8" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M4 20 Q -4 14 -2 8" stroke="#B8733E" strokeWidth={3.2} fill="none" strokeLinecap="round" />
        {/* running legs */}
        <Path d="M12 30 L5 37" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        <Path d="M18 31 L14 38" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        <Path d="M31 30 L38 36" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        {/* body + tan belly */}
        <Ellipse cx={22} cy={24} rx={16.5} ry={10} fill="#B8733E" stroke={INK} strokeWidth={SW} />
        <Ellipse cx={24} cy={28} rx={10} ry={4.2} fill="#E0A97B" opacity={0.9} />
        {/* red collar */}
        <Path d="M31 19 Q34 25 32 29" stroke="#E84855" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        {/* head, snout & floppy dark ear */}
        <Circle cx={38} cy={16} r={10} fill="#B8733E" stroke={INK} strokeWidth={SW} />
        <Ellipse cx={45.5} cy={18.5} rx={5.2} ry={4.2} fill="#E0A97B" stroke={INK} strokeWidth={1.8} />
        {/* open barking/panting mouth + pink tongue */}
        <Path d="M41 20 Q46 22 49 19.5 Q47 26 42 24 Z" fill="#8C2D42" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d="M43 22.5 Q45 28.5 42 29 Q39.5 27.5 41 22.5 Z" fill="#FF6B8B" stroke={INK} strokeWidth={1.1} />
        <Polygon points="44,20 45.5,20 44.8,21.5" fill="#FFFFFF" />
        {/* big wide eye + nose */}
        <Circle cx={40} cy={13} r={2.8} fill="#FFFFFF" stroke={INK} strokeWidth={1.1} />
        <Circle cx={40.7} cy={13} r={1.6} fill={INK} />
        <Circle cx={48.8} cy={17.2} r={2} fill={INK} />
        {/* floppy dark brown ear */}
        <Path d="M34 8 C 27 8.5, 27.5 20, 32 21.5 C 35 18, 36 12, 35.5 8 Z" fill="#63391F" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
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
