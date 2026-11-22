import React, { memo } from 'react';
import { G, Ellipse, Circle, Path, Rect, Line, Polygon } from 'react-native-svg';
import { C } from '../../theme';
import { getColour, getItem } from '../../game/wardrobe';
import { getCharacter, effectiveEquipped } from '../../game/characters';

const INK = C.ink;

// The player's pet, drawn in a 56 x 44 box with its feet on y = 44.
// `phase` (0-3) moves the legs while running; `pose` is run | jump | duck | hurt | front.
function PetSprite({
  species = 'dog',
  colour = 'golden',
  equipped = {},
  character = null,
  phase = 0,
  pose = 'run',
  panting = false,
  happy = false,
}) {
  const col = getColour(colour);
  const char = typeof character === 'string' ? getCharacter(character) : character;
  const body = char ? char.palette.body : col.hex;
  const shownEquipped = char ? effectiveEquipped({ equipped }, char.id) : equipped;
  const cat = species === 'cat';

  if (pose === 'front') {
    return (
      <FrontPet
        cat={cat}
        col={col}
        body={body}
        char={char}
        shownEquipped={shownEquipped}
        panting={panting}
        happy={happy}
      />
    );
  }

  const duck = pose === 'duck';
  const legSwing = pose === 'jump' ? 4 : [3.5, 0, -3.5, 0][phase % 4];
  const frame3 = phase % 3;
  const tabby = cat && !char && (col.id === 'grey' || col.id === 'ginger' || col.id === 'golden' || col.id === 'brown');
  const stripeCol = col.id === 'ginger' ? '#C45B1A' : col.id === 'golden' ? '#B87A14' : col.id === 'brown' ? '#5E3818' : '#5F5C74';
  const bellyCol = col.id === 'black' ? '#544B63' : '#FFF8EE';
  const irisCol = char?.palette?.eye || (col.id === 'grey' || col.id === 'white' ? '#38B6FF' : '#241D3B');

  const catTailD =
    pose === 'hurt'
      ? 'M8 27 C 0 26, -1 18, 2 14'
      : ['M8 26 C -3 20, 0 6, 7 4', 'M8 26 C -4 18, 1 5, 9 5', 'M8 26 C -1 22, -2 8, 5 3'][frame3];
  const dogTailD =
    pose === 'hurt'
      ? 'M9 27 L1 33'
      : ['M9 25 C 2 20, 1 15, 2 13', 'M9 25 C 2 21, 0 17, 1 16', 'M9 25 C 3 19, 3 13, 5 11'][frame3];
  const earDy = pose === 'jump' ? -2 : [0, 1.5, -1][frame3];
  const headBob = pose === 'run' ? [0, -1, 0, 1][phase % 4] : happy ? -1.5 : 0;
  const outerTransform = duck
    ? 'translate(0 17) scale(1 0.62)'
    : happy && pose !== 'hurt'
      ? 'translate(0 -2)'
      : undefined;

  return (
    <G transform={outerTransform}>
      {/* tail */}
      {cat ? (
        <>
          <Path d={catTailD} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d={catTailD} stroke={body} strokeWidth={4} fill="none" strokeLinecap="round" />
          {tabby ? <Circle cx={5.5} cy={5} r={1.8} fill={stripeCol} /> : null}
        </>
      ) : (
        <>
          <Path d={dogTailD} stroke={INK} strokeWidth={6.5} fill="none" strokeLinecap="round" />
          <Path d={dogTailD} stroke={body} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </>
      )}

      {/* legs with white paw tips */}
      <Leg x1={14} y1={32} x2={14 + legSwing} y2={43} pawCol={bellyCol} />
      <Leg x1={22} y1={32} x2={22 - legSwing} y2={43} pawCol={bellyCol} />
      <Leg x1={32} y1={32} x2={32 + legSwing} y2={43} pawCol={bellyCol} />
      <Leg x1={39} y1={32} x2={39 - legSwing} y2={43} pawCol={bellyCol} />

      {/* body */}
      <Ellipse cx={26} cy={27} rx={cat ? 17 : 19} ry={cat ? 9.2 : 10.5} fill={body} stroke={INK} strokeWidth={2.5} />
      <Ellipse cx={27} cy={31.5} rx={cat ? 11 : 12.5} ry={4.2} fill={bellyCol} opacity={0.88} />
      {tabby ? (
        <>
          <Path d="M18 19 Q20 22 18 25" stroke={stripeCol} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Path d="M24 18.5 Q26 22 24 25" stroke={stripeCol} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        </>
      ) : null}
      {!char && col.spots ? (
        <>
          <Circle cx={20} cy={25} r={3.5} fill={col.spots} />
          <Circle cx={30} cy={29} r={2.5} fill={col.spots} />
        </>
      ) : null}
      <CharacterBodyParts char={char} cat={cat} />

      {/* neck items under the head */}
      <NeckItem item={getItem(shownEquipped.neck)} />
      <CollarItem item={getItem(shownEquipped.collar)} />

      {/* head + accessories bob together so hats stay aligned */}
      <G transform={headBob ? `translate(0 ${headBob})` : undefined}>
        {cat ? (
          <>
            <Polygon points="37,10 39,0 45,7" fill={body} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
            <Polygon points="39,9 40,2.8 43.5,7.2" fill={C.pinkSoft} />
            <Polygon points="47,7 53,0 54,11" fill={body} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
            <Polygon points="48.5,7.5 52.3,3 53,9.8" fill={C.pinkSoft} />
            <Circle cx={46} cy={15} r={10.2} fill={body} stroke={INK} strokeWidth={2.5} />
            {/* soft muzzle patch */}
            <Ellipse cx={51.5} cy={18.2} rx={5} ry={3.8} fill={bellyCol} opacity={0.92} />
            {tabby ? (
              <>
                <Line x1={43.5} y1={6} x2={44.5} y2={9.2} stroke={stripeCol} strokeWidth={1.8} strokeLinecap="round" />
                <Line x1={47} y1={5.8} x2={47.5} y2={9} stroke={stripeCol} strokeWidth={1.8} strokeLinecap="round" />
              </>
            ) : null}
            <Line x1={52} y1={17.5} x2={59} y2={16} stroke={INK} strokeWidth={1} strokeLinecap="round" />
            <Line x1={52} y1={19.5} x2={59} y2={20.5} stroke={INK} strokeWidth={1} strokeLinecap="round" />
          </>
        ) : (
          <>
            <Circle cx={45} cy={15} r={10.5} fill={body} stroke={INK} strokeWidth={2.5} />
            <Ellipse cx={53} cy={19} rx={5.2} ry={4.2} fill={bellyCol} stroke={INK} strokeWidth={2.2} />
            <Path
              d="M38 8 C 32.5 10.5, 32.5 21, 37 22.5 C 40 18.5, 41 13, 41 9 Z"
              fill={char?.palette?.ear || (col.id === 'black' ? '#5B5266' : '#63391F')}
              stroke={INK}
              strokeWidth={1.6}
              strokeLinejoin="round"
              transform={earDy ? `translate(0 ${earDy})` : undefined}
            />
          </>
        )}

        {panting && pose !== 'hurt' ? (
          <Path
            d={cat ? 'M50 20 Q52 24 49 24 Q47 23 48 20 Z' : 'M51 22 Q53 26.5 50 26.5 Q48 25 49 22 Z'}
            fill={C.pink}
            stroke={INK}
            strokeWidth={1.2}
          />
        ) : null}

        {pose === 'hurt' ? (
          <Path d="M44 11 L49 13.5 L44 16" stroke={char?.palette?.eye || INK} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <G>
            <Circle cx={47.8} cy={13.2} r={2.8} fill={irisCol} stroke={INK} strokeWidth={0.9} />
            <Circle cx={47.8} cy={13.2} r={1.6} fill={INK} />
            <Circle cx={47} cy={12.3} r={0.85} fill="#FFFFFF" />
          </G>
        )}
        <Circle
          cx={cat ? 54.8 : 57.5}
          cy={cat ? 16.5 : 18}
          r={cat ? 1.6 : 2.3}
          fill={char?.palette?.accent && char.parts === 'cyber' ? char.palette.accent : cat ? '#FF7BA3' : INK}
        />

        <GlassesItem item={getItem(shownEquipped.glasses)} />
        <HatItem item={getItem(shownEquipped.hat)} cat={cat} />
        <CharacterHeadParts char={char} cat={cat} pose={pose} />

        {happy && pose !== 'hurt' ? (
          <Path
            d="M54 2 c -1.5 -2, -4.5 0, -2 2.5 l 2 2 l 2 -2 c 2.5 -2.5, -0.5 -4.5, -2 -2.5 Z"
            fill={C.pink}
            stroke={INK}
            strokeWidth={1}
          />
        ) : null}
      </G>
    </G>
  );
}

function Leg({ x1, y1, x2, y2, pawCol }) {
  return (
    <G>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={5.2} strokeLinecap="round" />
      <Circle cx={x2} cy={y2} r={2.2} fill={pawCol} stroke={INK} strokeWidth={1.2} />
    </G>
  );
}

// Cute front-facing kawaii pet pose for the Wardrobe hero dress-up preview.
function FrontPet({ cat, col, body, char, shownEquipped, happy }) {
  const tabby = cat && !char && (col.id === 'grey' || col.id === 'ginger' || col.id === 'golden' || col.id === 'brown');
  const stripeCol = col.id === 'ginger' ? '#C45B1A' : col.id === 'golden' ? '#B87A14' : col.id === 'brown' ? '#5E3818' : '#5F5C74';
  const creamCol = col.id === 'black' ? '#544B63' : '#FFF9F0';
  const irisCol = char?.palette?.eye || (col.id === 'grey' || col.id === 'ginger' || col.id === 'white' ? '#38B6FF' : '#7A4B2A');
  const collar = getItem(shownEquipped.collar);
  const neck = getItem(shownEquipped.neck);
  const glasses = getItem(shownEquipped.glasses);
  const hat = getItem(shownEquipped.hat);

  return (
    <G>
      {/* curled tail on right side */}
      <Path d="M36 37 C 46 37, 48 25, 43 22" stroke={INK} strokeWidth={6.5} fill="none" strokeLinecap="round" />
      <Path d="M36 37 C 46 37, 48 25, 43 22" stroke={body} strokeWidth={3.6} fill="none" strokeLinecap="round" />

      {/* seated body */}
      <Ellipse cx={28} cy={34} rx={10.5} ry={9.5} fill={body} stroke={INK} strokeWidth={2.5} />
      <Ellipse cx={28} cy={35.5} rx={6} ry={6.5} fill={creamCol} opacity={0.92} />

      {/* front paws */}
      <Ellipse cx={23.5} cy={41.5} rx={3.3} ry={2.4} fill={creamCol} stroke={INK} strokeWidth={1.8} />
      <Ellipse cx={32.5} cy={41.5} rx={3.3} ry={2.4} fill={creamCol} stroke={INK} strokeWidth={1.8} />
      <Line x1={23.5} y1={35} x2={23.5} y2={39.5} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <Line x1={32.5} y1={35} x2={32.5} y2={39.5} stroke={INK} strokeWidth={2} strokeLinecap="round" />

      {/* neck accessory */}
      {neck ? (
        neck.bowtie ? (
          <G transform="translate(28 28.5)">
            <Polygon points="-5,-2.5 0,0 -5,2.5" fill={neck.colour} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
            <Polygon points="5,-2.5 0,0 5,2.5" fill={neck.colour} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
            <Circle cx={0} cy={0} r={1.8} fill={neck.colour} stroke={INK} strokeWidth={1.1} />
          </G>
        ) : (
          <Polygon points="20,25 36,25 28,33" fill={neck.colour} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        )
      ) : null}

      {/* collar */}
      {collar ? (
        <G>
          <Path d="M19.5 25 Q28 28.5 36.5 25" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d="M19.5 25 Q28 28.5 36.5 25" stroke={collar.colour} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          {collar.bell || collar.id === 'collar-red' ? (
            <Circle cx={28} cy={28.8} r={2.7} fill={C.butter} stroke={INK} strokeWidth={1.3} />
          ) : collar.gem ? (
            <Polygon points="28,25.5 30.5,28.8 28,32 25.5,28.8" fill={collar.colour} stroke={INK} strokeWidth={1.2} />
          ) : null}
        </G>
      ) : null}

      {/* ears */}
      {cat ? (
        <>
          <Polygon points="16,13 18,1 25,8" fill={body} stroke={INK} strokeWidth={2.3} strokeLinejoin="round" />
          <Polygon points="18,11 19.2,3.6 23.6,8.2" fill={C.pinkSoft} />
          <Polygon points="31,8 38,1 40,13" fill={body} stroke={INK} strokeWidth={2.3} strokeLinejoin="round" />
          <Polygon points="32.4,8.2 36.8,3.6 38,11" fill={C.pinkSoft} />
        </>
      ) : (
        <>
          <Path d="M16 10 C 9 12, 9 23, 14.5 24 C 17 20, 18 14, 17.5 10 Z" fill={char?.palette?.ear || '#63391F'} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M40 10 C 47 12, 47 23, 41.5 24 C 39 20, 38 14, 38.5 10 Z" fill={char?.palette?.ear || '#63391F'} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        </>
      )}

      {/* round kawaii head */}
      <Ellipse cx={28} cy={15.5} rx={12.8} ry={11} fill={body} stroke={INK} strokeWidth={2.5} />
      {tabby ? (
        <>
          <Line x1={25.5} y1={5.5} x2={26} y2={9.2} stroke={stripeCol} strokeWidth={1.8} strokeLinecap="round" />
          <Line x1={28} y1={5} x2={28} y2={9.6} stroke={stripeCol} strokeWidth={1.8} strokeLinecap="round" />
          <Line x1={30.5} y1={5.5} x2={30} y2={9.2} stroke={stripeCol} strokeWidth={1.8} strokeLinecap="round" />
        </>
      ) : null}
      {!char && col.spots ? (
        <>
          <Circle cx={21} cy={13} r={3.4} fill={col.spots} />
          <Circle cx={35} cy={18} r={2.4} fill={col.spots} />
        </>
      ) : null}

      {/* cream muzzle & pink cheeks */}
      <Ellipse cx={28} cy={20.2} rx={6.4} ry={4.2} fill={creamCol} opacity={0.95} />
      <Circle cx={19} cy={19} r={2} fill={C.pinkSoft} opacity={0.65} />
      <Circle cx={37} cy={19} r={2} fill={C.pinkSoft} opacity={0.65} />

      {/* big shiny kawaii eyes */}
      <G>
        <Circle cx={22} cy={14.8} r={3.5} fill={irisCol} stroke={INK} strokeWidth={1.1} />
        <Circle cx={22} cy={14.8} r={2.2} fill="#1E1836" />
        <Circle cx={20.9} cy={13.5} r={1.1} fill="#FFFFFF" />
        <Circle cx={23.1} cy={15.8} r={0.55} fill="#FFFFFF" />

        <Circle cx={34} cy={14.8} r={3.5} fill={irisCol} stroke={INK} strokeWidth={1.1} />
        <Circle cx={34} cy={14.8} r={2.2} fill="#1E1836" />
        <Circle cx={32.9} cy={13.5} r={1.1} fill="#FFFFFF" />
        <Circle cx={35.1} cy={15.8} r={0.55} fill="#FFFFFF" />
      </G>

      {/* cute pink nose + 'w' smile */}
      <Polygon points="26.5,18.2 29.5,18.2 28,19.8" fill={cat ? '#FF7BA3' : INK} stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M25.2 20.6 Q26.6 22 28 20.4 Q29.4 22 30.8 20.6" stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" />

      {/* whiskers */}
      {cat ? (
        <>
          <Line x1={16} y1={17.5} x2={11} y2={16.5} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={16} y1={19.5} x2={11} y2={20.2} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={40} y1={17.5} x2={45} y2={16.5} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={40} y1={19.5} x2={45} y2={20.2} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
        </>
      ) : null}

      {/* front-view glasses */}
      {glasses ? <FrontGlasses item={glasses} /> : null}
      {/* front-view hat centered on cx = 28 */}
      {hat ? (
        <G transform="translate(-17 0)">
          <HatItem item={hat} cat={cat} />
        </G>
      ) : null}
      {char ? (
        <G transform="translate(-18 0)">
          <CharacterHeadParts char={char} cat={cat} />
        </G>
      ) : null}
      {happy ? (
        <Path d="M41 2 c -1.5 -2, -4.5 0, -2 2.5 l 2 2 l 2 -2 c 2.5 -2.5, -0.5 -4.5, -2 -2.5 Z" fill={C.pink} stroke={INK} strokeWidth={1} />
      ) : null}
    </G>
  );
}

function FrontGlasses({ item }) {
  if (item.star) {
    return (
      <G>
        <Polygon points="22,10.5 23.3,13.5 26.5,13.8 24,15.8 24.8,18.8 22,17.2 19.2,18.8 20,15.8 17.5,13.8 20.7,13.5" fill={item.colour} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        <Polygon points="34,10.5 35.3,13.5 38.5,13.8 36,15.8 36.8,18.8 34,17.2 31.2,18.8 32,15.8 29.5,13.8 32.7,13.5" fill={item.colour} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        <Line x1={26} y1={14.5} x2={30} y2={14.5} stroke={INK} strokeWidth={1.5} />
      </G>
    );
  }
  if (item.heart) {
    return (
      <G>
        <Path d="M22 12 c -2 -3, -6 0, -3 3 l 3 3 l 3 -3 c 3 -3, -1 -6, -3 -3 Z" fill={item.colour} stroke={INK} strokeWidth={1.1} />
        <Path d="M34 12 c -2 -3, -6 0, -3 3 l 3 3 l 3 -3 c 3 -3, -1 -6, -3 -3 Z" fill={item.colour} stroke={INK} strokeWidth={1.1} />
        <Line x1={25.5} y1={14.5} x2={30.5} y2={14.5} stroke={INK} strokeWidth={1.4} />
      </G>
    );
  }
  if (item.cyber) {
    return (
      <G>
        <Rect x={16.5} y={11.5} width={23} height={6.2} rx={2.5} fill={item.colour} stroke={INK} strokeWidth={1.6} />
        <Line x1={19} y1={14.6} x2={37} y2={14.6} stroke={INK} strokeWidth={1.2} />
      </G>
    );
  }
  if (item.monocle) {
    return (
      <G>
        <Circle cx={34} cy={14.8} r={4.5} fill="rgba(255,255,255,0.28)" stroke={item.colour} strokeWidth={2} />
        <Path d="M37 18 Q39 24 37.5 29" stroke={item.colour} strokeWidth={1.2} fill="none" />
      </G>
    );
  }
  const fill = item.dark ? '#1E1A2E' : 'rgba(255,255,255,0.22)';
  return (
    <G>
      <Rect x={16.5} y={11} width={9.5} height={6.8} rx={item.dark ? 2 : 3.4} fill={fill} stroke={item.colour} strokeWidth={1.8} />
      <Rect x={30} y={11} width={9.5} height={6.8} rx={item.dark ? 2 : 3.4} fill={fill} stroke={item.colour} strokeWidth={1.8} />
      <Line x1={26} y1={14} x2={30} y2={14} stroke={item.colour} strokeWidth={1.8} />
      {item.dark ? (
        <>
          <Line x1={18.5} y1={16} x2={22.5} y2={12} stroke="rgba(255,255,255,0.55)" strokeWidth={1.3} strokeLinecap="round" />
          <Line x1={32} y1={16} x2={36} y2={12} stroke="rgba(255,255,255,0.55)" strokeWidth={1.3} strokeLinecap="round" />
        </>
      ) : null}
    </G>
  );
}

function CharacterBodyParts({ char, cat }) {
  if (!char) return null;
  if (char.parts === 'cyber') {
    return (
      <>
        <Line x1={16} y1={22} x2={24} y2={22} stroke={char.palette.accent} strokeWidth={2.4} strokeLinecap="round" />
        <Line x1={18} y1={28} x2={31} y2={28} stroke={char.palette.accent} strokeWidth={2} strokeLinecap="round" />
      </>
    );
  }
  if (char.parts === 'royal') {
    return <Path d="M36 19 L10 23 L12 32 L38 25 Z" fill={char.palette.accent} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />;
  }
  if (char.parts === 'astro') {
    return (
      <>
        <Rect x={14} y={18} width={10} height={11} rx={3} fill={char.palette.suit} stroke={INK} strokeWidth={1.8} />
        <Line x1={25} y1={20} x2={25} y2={34} stroke={char.palette.trim} strokeWidth={2.5} strokeLinecap="round" />
      </>
    );
  }
  if (char.parts === 'ninja') {
    return (
      <>
        <Line x1={23} y1={18} x2={23} y2={36} stroke={char.palette.band} strokeWidth={3} />
        <Line x1={18} y1={23} x2={34} y2={30} stroke={char.palette.band} strokeWidth={2} strokeLinecap="round" />
      </>
    );
  }
  if (char.parts === 'zebra') {
    return (
      <>
        <Line x1={17} y1={20} x2={19} y2={33} stroke={char.palette.stripe} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={24} y1={19} x2={26} y2={34} stroke={char.palette.stripe} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={31} y1={20} x2={33} y2={33} stroke={char.palette.stripe} strokeWidth={2.5} strokeLinecap="round" />
      </>
    );
  }
  if (char.parts === 'gold') {
    return (
      <>
        <Ellipse cx={26} cy={23} rx={cat ? 9 : 11} ry={3} fill={char.palette.shine} opacity={0.75} />
        <Polygon points="19,26 20.2,28.5 23,29 20.2,29.5 19,32 17.8,29.5 15,29 17.8,28.5" fill={char.palette.shine} />
      </>
    );
  }
  return null;
}

function CharacterHeadParts({ char, cat }) {
  if (!char) return null;
  const top = cat ? 2 : 5;
  if (char.parts === 'cyber') {
    return <Line x1={40} y1={9} x2={48} y2={9} stroke={char.palette.accent} strokeWidth={2} strokeLinecap="round" />;
  }
  if (char.parts === 'royal') {
    return (
      <Polygon
        points={`39,${top + 4} 51,${top + 4} 52,${top - 5} 48,${top - 1} 45,${top - 7} 42,${top - 1} 38,${top - 5}`}
        fill={char.palette.crown}
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    );
  }
  if (char.parts === 'astro') {
    return <Circle cx={46} cy={14} r={14} fill="rgba(126,232,250,0.28)" stroke={char.palette.visor} strokeWidth={2} />;
  }
  if (char.parts === 'ninja') {
    return (
      <>
        <Rect x={35} y={8} width={20} height={3.5} rx={1.5} fill={char.palette.band} stroke={INK} strokeWidth={1.2} />
        <Path d="M35 10 L26 6 M35 11 L27 14" stroke={char.palette.band} strokeWidth={2.5} strokeLinecap="round" />
      </>
    );
  }
  if (char.parts === 'zebra') {
    return (
      <>
        <Line x1={41} y1={7} x2={43} y2={11} stroke={char.palette.stripe} strokeWidth={2} strokeLinecap="round" />
        <Line x1={47} y1={6} x2={49} y2={10} stroke={char.palette.stripe} strokeWidth={2} strokeLinecap="round" />
      </>
    );
  }
  if (char.parts === 'gold') {
    return <Polygon points="54,2 55.2,4.5 58,5 55.2,5.5 54,8 52.8,5.5 50,5 52.8,4.5" fill={char.palette.shine} stroke={INK} strokeWidth={0.8} />;
  }
  return null;
}

function CollarItem({ item }) {
  if (!item) return null;
  return (
    <>
      <Path d="M38 19 Q 41 26 47 25" stroke={item.colour} strokeWidth={4} fill="none" strokeLinecap="round" />
      {item.bell || item.id === 'collar-red' ? <Circle cx={43} cy={27} r={2.6} fill={C.butter} stroke={INK} strokeWidth={1.2} /> : null}
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
      <Circle cx={47.5} cy={13} r={3.8} fill={item.dark ? '#1E1A2E' : 'rgba(255,255,255,0.22)'} stroke={item.colour} strokeWidth={1.7} />
      {item.dark ? <Line x1={45.5} y1={15} x2={49.5} y2={11} stroke="rgba(255,255,255,0.55)" strokeWidth={1.1} strokeLinecap="round" /> : null}
      <Line x1={51} y1={13} x2={54} y2={13.5} stroke={item.colour} strokeWidth={1.6} />
    </>
  );
}

function HatItem({ item, cat }) {
  if (!item) return null;
  const top = cat ? 2 : 5;
  if (item.id === 'hat-party')
    return (
      <G>
        <Polygon points={`39,${top + 4} 51,${top + 4} 45,${top - 12}`} fill="#9B7EDE" stroke={INK} strokeWidth={1.7} strokeLinejoin="round" />
        <Line x1={42.2} y1={top + 4} x2={45} y2={top - 8} stroke="#5CC8FF" strokeWidth={1.6} />
        <Line x1={47.8} y1={top + 4} x2={45} y2={top - 8} stroke="#FF85A2" strokeWidth={1.6} />
        <Path d={`M38 ${top + 4} L40 ${top + 1} L42.5 ${top + 3.5} L45 ${top} L47.5 ${top + 3.5} L50 ${top + 1} L52 ${top + 4} Z`} fill={C.butter} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
        <Circle cx={45} cy={top - 12.5} r={2.2} fill={C.butter} stroke={INK} strokeWidth={1.2} />
      </G>
    );
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
