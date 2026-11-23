import React, { memo } from 'react';
import { G, Ellipse, Circle, Path, Rect, Line, Polygon, Image as SvgImage } from 'react-native-svg';
import { C } from '../../theme';
import { SPRITES } from './sprites';
import { BackRunner } from './PetSprite';

const INK = C.ink;
const SW = 2.2;

// Obstacles, treats and power-ups, each drawn in its own box with the top-left
// corner at 0,0 (sizes match src/game/stages.js).
function Thing({ kind, type, w, h, lift = 0, t = 0 }) {
  if (kind === 'treat') return <Treat type={type} />;
  if (kind === 'power') return <PowerBox type={type} />;
  const Art = OBSTACLE_ART[type];
  return Art ? <Art w={w} h={h} lift={lift} t={t} /> : <Rect width={w} height={h} rx={6} fill={C.tomato} stroke={INK} strokeWidth={SW} />;
}

// Front-on painted props for the behind-the-back view. Art is fitted inside a
// box a little larger than the hit box, bottom-centred on the ground line.
function frontProp(href, padW, padH, shadow = 0.5) {
  return function FrontProp({ w, h }) {
    return (
      <G>
        <Ellipse cx={w / 2} cy={h - 1} rx={w * shadow} ry={3.5} fill="rgba(36,29,59,0.22)" />
        <SvgImage href={href} x={-padW / 2} y={-padH} width={w + padW} height={h + padH} preserveAspectRatio="xMidYMax meet" />
      </G>
    );
  };
}

const benchArt = frontProp(SPRITES.benchFront, 8, 14, 0.52);
const trashArt = frontProp(SPRITES.trashFront, 6, 8);
const hedgeArt = frontProp(SPRITES.hedge, 8, 14, 0.54);
const stoolArt = frontProp(SPRITES.stool, 8, 14);
const cucumberArt = frontProp(SPRITES.obCucumber, 10, 10, 0.5);

// A puddle lies flat on the road, so it's centred on the ground line.
function puddleArt({ w, h }) {
  return <SvgImage href={SPRITES.obPuddle} x={-8} y={h - 15} width={w + 16} height={22} preserveAspectRatio="xMidYMid meet" />;
}

// High obstacles float `lift` units above the ground; their art reaches down to it.
function sprinklerArt({ w, h, lift = 30 }) {
  const ground = h + lift / 1.08;
  return <SvgImage href={SPRITES.obSprinkler} x={-10} y={-6} width={w + 22} height={ground + 6} preserveAspectRatio="none" />;
}

function sprayArt({ w, h }) {
  const ah = (w + 18) * (242 / 512);
  return <SvgImage href={SPRITES.obSpray} x={-9} y={h / 2 - ah / 2 - 2} width={w + 18} height={ah} preserveAspectRatio="xMidYMid meet" />;
}

// Stand-in until the postman is redrawn: a parcel floating at head height.
function parcelArt({ w, h }) {
  const bw = w * 0.8, bh = h * 0.72, x = (w - bw) / 2, y = (h - bh) / 2;
  return (
    <G>
      <Path d={`M ${x} ${y + 5} L ${x + 6} ${y} L ${x + bw + 6} ${y} L ${x + bw} ${y + 5} Z`} fill="#D9A86C" stroke="#6B4423" strokeWidth={1.4} strokeLinejoin="round" />
      <Rect x={x} y={y + 5} width={bw} height={bh - 5} rx={1.5} fill="#C08A52" stroke="#6B4423" strokeWidth={1.4} />
      <Rect x={x + bw / 2 - 3} y={y + 5} width={6} height={bh - 5} fill="#E9CFA4" opacity={0.9} />
      <Rect x={x + bw / 2 - 3} y={y} width={6} height={5} fill="#F1DDB8" opacity={0.9} />
    </G>
  );
}

// A dog running at the camera: two frames swapped by time.
function dogFrontArt({ w, h, t = 0 }) {
  const href = Math.floor(t * 7) % 2 ? SPRITES.obDogFront2 : SPRITES.obDogFront1;
  return (
    <G>
      <Ellipse cx={w / 2} cy={h - 1} rx={w * 0.42} ry={3.5} fill="rgba(36,29,59,0.22)" />
      <SvgImage href={href} x={-4} y={-14} width={w + 8} height={h + 14} preserveAspectRatio="xMidYMax meet" />
    </G>
  );
}

const OBSTACLE_ART = {
  bench: benchArt,
  trash: trashArt,
  puddle: puddleArt,
  vacuum: stoolArt,
  sprinkler: sprinklerArt,
  postman: parcelArt,
  cucumber: cucumberArt,
  spray: sprayArt,
  dog: dogFrontArt,
  catDash: ({ w, h }) => (
    <G transform={`translate(${w} 0) scale(-1 1)`}>
      <SvgImage href={SPRITES.catHero} x={-4} y={-8} width={w + 8} height={h + 12} preserveAspectRatio="xMidYMid meet" />
    </G>
  ),
  dogDash: dogFrontArt,

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
    return <SvgImage href={SPRITES.treatBone} x={-1} y={-1} width={24} height={24} preserveAspectRatio="xMidYMid meet" />;
  if (type === 'ball')
    return <SvgImage href={SPRITES.treatBall} x={0} y={0} width={22} height={22} preserveAspectRatio="xMidYMid meet" />;
  if (type === 'yarn')
    return <SvgImage href={SPRITES.treatYarn} x={-1} y={-1} width={24} height={24} preserveAspectRatio="xMidYMid meet" />;
  if (type === 'fish')
    return <SvgImage href={SPRITES.fishTreat} x={-3} y={-1} width={28} height={23} preserveAspectRatio="xMidYMid meet" />;
  return <SvgImage href={SPRITES.coinGold} x={0} y={0} width={22} height={22} preserveAspectRatio="xMidYMid meet" />;
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
export function Chaser({ chaser, phase = 0, view = 'side' }) {
  const id = chaser?.id || 'bath';
  if (id === 'dog' && view === 'back') {
    return <BackRunner cat={false} phase={phase} cx={24} floor={39} size={0.92} rate={1.9} tint="#9A6338" />;
  }
  if (id === 'dog') {
    const a = (Number(phase) || 0) * 1.9;
    const bounce = Math.abs(Math.sin(a * 0.5));
    const bob = -bounce * 5.5;
    const pitch = Math.cos(a * 0.5) * 7;
    const stretchX = 1 + Math.sin(a) * 0.085;
    const stretchY = 1 - Math.sin(a) * 0.075;

    return (
      <G>
        <Ellipse cx={24} cy={39} rx={(19 * (1 - bounce * 0.14)).toFixed(1)} ry={3.5} fill="rgba(36,29,59,0.24)" />
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
