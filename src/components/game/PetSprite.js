import React, { memo } from 'react';
import { G, Ellipse, Circle, Path, Rect, Line, Polygon } from 'react-native-svg';
import { C } from '../../theme';
import { getColour, getItem } from '../../game/wardrobe';

const INK = C.ink;

// The player's pet, drawn in a 56 x 44 box with its feet on y = 44.
// `phase` (0-3) moves the legs while running; `pose` is run | jump | duck | hurt.
function PetSprite({ species = 'dog', colour = 'golden', equipped = {}, phase = 0, pose = 'run' }) {
  const col = getColour(colour);
  const body = col.hex;
  const cat = species === 'cat';
  const duck = pose === 'duck';
  const legSwing = pose === 'jump' ? 0 : [3, 0, -3, 0][phase % 4];
  return (
    <G transform={duck ? 'translate(0 17) scale(1 0.62)' : undefined}>
      {/* tail */}
      {cat ? (
        <Path d="M8 26 C -2 20, 0 6, 6 4" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
      ) : (
        <Path d={pose === 'hurt' ? 'M9 27 L1 33' : 'M9 25 L1 16'} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      )}
      {cat ? (
        <Path d="M8 26 C -2 20, 0 6, 6 4" stroke={body} strokeWidth={4} fill="none" strokeLinecap="round" />
      ) : (
        <Path d={pose === 'hurt' ? 'M9 27 L1 33' : 'M9 25 L1 16'} stroke={body} strokeWidth={3.5} strokeLinecap="round" />
      )}
      {/* legs */}
      <Line x1={14} y1={32} x2={14 + legSwing} y2={43} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <Line x1={22} y1={32} x2={22 - legSwing} y2={43} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <Line x1={32} y1={32} x2={32 + legSwing} y2={43} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <Line x1={39} y1={32} x2={39 - legSwing} y2={43} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {/* body */}
      <Ellipse cx={26} cy={27} rx={cat ? 17 : 19} ry={cat ? 9 : 10.5} fill={body} stroke={INK} strokeWidth={2.5} />
      {col.spots ? (
        <>
          <Circle cx={20} cy={25} r={3.5} fill={col.spots} />
          <Circle cx={30} cy={29} r={2.5} fill={col.spots} />
        </>
      ) : null}
      {/* neck items under the head */}
      <NeckItem item={getItem(equipped.neck)} />
      <CollarItem item={getItem(equipped.collar)} />
      {/* head */}
      {cat ? (
        <>
          <Polygon points="37,10 39,0 45,7" fill={body} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <Polygon points="47,7 53,0 54,11" fill={body} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <Circle cx={46} cy={15} r={10} fill={body} stroke={INK} strokeWidth={2.5} />
          <Line x1={51} y1={18} x2={58} y2={16} stroke={INK} strokeWidth={1} />
          <Line x1={51} y1={20} x2={58} y2={21} stroke={INK} strokeWidth={1} />
        </>
      ) : (
        <>
          <Circle cx={45} cy={15} r={10.5} fill={body} stroke={INK} strokeWidth={2.5} />
          <Ellipse cx={53} cy={19} rx={5} ry={4} fill={body} stroke={INK} strokeWidth={2.2} />
          <Path d="M38 8 C 33 10, 33 20, 37 22 C 40 18, 41 13, 41 9 Z" fill={col.id === 'black' ? '#5B5266' : INK} />
        </>
      )}
      {pose === 'hurt' ? (
        <Path d="M45 11 l4 4 M49 11 l-4 4" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      ) : (
        <Circle cx={47.5} cy={13} r={2} fill={INK} />
      )}
      <Circle cx={cat ? 55 : 57.5} cy={cat ? 16 : 18} r={cat ? 1.6 : 2.4} fill={cat ? C.pink : INK} />
      <GlassesItem item={getItem(equipped.glasses)} />
      <HatItem item={getItem(equipped.hat)} cat={cat} />
    </G>
  );
}

function CollarItem({ item }) {
  if (!item) return null;
  return (
    <>
      <Path d="M38 19 Q 41 26 47 25" stroke={item.colour} strokeWidth={4} fill="none" strokeLinecap="round" />
      {item.bell ? <Circle cx={43} cy={27} r={2.6} fill={C.butter} stroke={INK} strokeWidth={1.2} /> : null}
      {item.gem ? <Polygon points="43,23 45.5,26.5 43,30 40.5,26.5" fill={item.colour} stroke={INK} strokeWidth={1.1} /> : null}
    </>
  );
}

function NeckItem({ item }) {
  if (!item) return null;
  if (item.cape) {
    return <Path d="M36 18 L10 22 L12 31 L38 24 Z" fill={item.colour} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />;
  }
  if (item.bowtie) {
    return (
      <>
        <Polygon points="37,22 42,25 37,28" fill={item.colour} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
        <Polygon points="47,22 42,25 47,28" fill={item.colour} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
        <Circle cx={42} cy={25} r={1.8} fill={item.colour} stroke={INK} strokeWidth={1.2} />
      </>
    );
  }
  return (
    <>
      <Polygon points="35,19 49,23 40,31" fill={item.colour} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      {item.rainbow ? <Line x1={38} y1={22} x2={44} y2={24} stroke="#5CC8FF" strokeWidth={2} strokeLinecap="round" /> : null}
      {item.id === 'bandana-champ' ? <Circle cx={41} cy={25} r={2} fill="#FFF" stroke={INK} strokeWidth={1} /> : null}
    </>
  );
}

function GlassesItem({ item }) {
  if (!item) return null;
  if (item.heart)
    return (
      <Path
        d="M44 11 c -2 -3, -6 0, -3 3 l 3 3 l 3 -3 c 3 -3, -1 -6, -3 -3 Z"
        fill={item.colour}
        stroke={INK}
        strokeWidth={1}
        transform="translate(3 -1)"
      />
    );
  if (item.star)
    return (
      <Polygon
        points="47.5,8.5 48.8,11.5 52,11.8 49.5,13.9 50.3,17 47.5,15.3 44.7,17 45.5,13.9 43,11.8 46.2,11.5"
        fill={item.colour}
        stroke={INK}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    );
  if (item.cyber)
    return (
      <>
        <Rect x={43} y={10.5} width={10} height={5} rx={2} fill={item.colour} stroke={INK} strokeWidth={1.4} />
        <Line x1={45} y1={13} x2={51} y2={13} stroke={INK} strokeWidth={1.2} />
      </>
    );
  if (item.monocle)
    return (
      <>
        <Circle cx={47.5} cy={13} r={3.6} fill="rgba(255,255,255,0.25)" stroke={item.colour} strokeWidth={1.8} />
        <Path d="M44 15 Q 42 21 43 26" stroke={item.colour} strokeWidth={1.2} fill="none" />
      </>
    );
  return (
    <>
      <Circle cx={47.5} cy={13} r={3.6} fill={item.dark ? INK : 'none'} stroke={item.colour} strokeWidth={1.6} />
      <Line x1={51} y1={13} x2={54} y2={13.5} stroke={item.colour} strokeWidth={1.6} />
    </>
  );
}

function HatItem({ item, cat }) {
  if (!item) return null;
  const top = cat ? 2 : 5;
  if (item.id === 'hat-party')
    return <Polygon points={`40,${top + 4} 50,${top + 4} 45,${top - 12}`} fill={item.colour} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />;
  if (item.id === 'hat-crown')
    return (
      <Polygon
        points={`38,${top + 4} 52,${top + 4} 53,${top - 6} 49,${top - 1} 45,${top - 8} 41,${top - 1} 37,${top - 6}`}
        fill={item.colour}
        stroke={INK}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    );
  if (item.id === 'hat-sun')
    return (
      <>
        <Ellipse cx={45} cy={top + 3} rx={12} ry={3} fill={item.colour} stroke={INK} strokeWidth={1.6} />
        <Rect x={39} y={top - 5} width={12} height={8} rx={4} fill={item.colour} stroke={INK} strokeWidth={1.6} />
      </>
    );
  if (item.id === 'hat-cap')
    return (
      <>
        <Path d={`M37 ${top + 4} Q 45 ${top - 8} 53 ${top + 4} Z`} fill={item.colour} stroke={INK} strokeWidth={1.6} />
        <Line x1={48} y1={top + 4} x2={58} y2={top + 4} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      </>
    );
  if (item.id === 'hat-chef')
    return (
      <>
        <Circle cx={42} cy={top - 4} r={4.5} fill={item.colour} stroke={INK} strokeWidth={1.5} />
        <Circle cx={48} cy={top - 4} r={4.5} fill={item.colour} stroke={INK} strokeWidth={1.5} />
        <Rect x={39} y={top - 2} width={12} height={6} fill={item.colour} stroke={INK} strokeWidth={1.5} />
      </>
    );
  if (item.id === 'hat-wizard')
    return (
      <>
        <Ellipse cx={45} cy={top + 4} rx={11} ry={2.8} fill={item.colour} stroke={INK} strokeWidth={1.6} />
        <Polygon points={`39,${top + 3} 51,${top + 3} 45,${top - 13}`} fill={item.colour} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        <Circle cx={45} cy={top - 4} r={1.8} fill={C.butter} />
      </>
    );
  if (item.id === 'hat-halo')
    return <Ellipse cx={45} cy={top - 5} rx={9} ry={2.8} fill="none" stroke={item.colour} strokeWidth={2.6} />;
  return (
    <>
      <Path d={`M36 ${top + 5} Q 45 ${top - 10} 54 ${top + 5} Z`} fill={item.colour} stroke={INK} strokeWidth={1.8} />
      <Circle cx={45} cy={top - 4} r={2.6} fill={C.paper} stroke={INK} strokeWidth={1.2} />
    </>
  );
}

export default memo(PetSprite);
