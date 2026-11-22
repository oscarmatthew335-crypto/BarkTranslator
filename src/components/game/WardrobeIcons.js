import React from 'react';
import Svg, { G, Circle, Ellipse, Path, Polygon, Rect, Line } from 'react-native-svg';
import { C } from '../../theme';

const INK = C.ink;

export function SlotTabIcon({ slot, active = false, size = 22 }) {
  const stroke = active ? INK : C.tabIconMuted;
  const fill = active ? '#FFFFFF' : 'rgba(255,255,255,0.65)';
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {slot === 'colour' ? (
        <G>
          <Path
            d="M6 12 L7 5 L12 9 Q14 8.5 16 9 L21 5 L22 12 Q24 17 21 21 Q17.5 23.5 14 23.5 Q10.5 23.5 7 21 Q4 17 6 12 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <Circle cx={11} cy={15} r={1.3} fill={stroke} />
          <Circle cx={17} cy={15} r={1.3} fill={stroke} />
          <Polygon points="13,17.5 15,17.5 14,18.8" fill={stroke} />
        </G>
      ) : slot === 'hat' ? (
        <G>
          <Polygon points="8,19 20,19 14,6" fill={active ? C.butter : fill} stroke={stroke} strokeWidth={2.1} strokeLinejoin="round" />
          <Circle cx={14} cy={5.5} r={2} fill={active ? C.pink : stroke} />
          <Line x1={7} y1={19.5} x2={21} y2={19.5} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : slot === 'glasses' ? (
        <G>
          <Rect x={3.5} y={10} width={9} height={6.5} rx={2.5} fill={active ? INK : fill} stroke={stroke} strokeWidth={2} />
          <Rect x={15.5} y={10} width={9} height={6.5} rx={2.5} fill={active ? INK : fill} stroke={stroke} strokeWidth={2} />
          <Line x1={12.5} y1={13} x2={15.5} y2={13} stroke={stroke} strokeWidth={2} />
        </G>
      ) : slot === 'neck' ? (
        <G>
          <Path
            d="M5 9 L10 6 L14 8 L18 6 L23 9 L21 15 L18 14 L18 22 L10 22 L10 14 L7 15 Z"
            fill={active ? C.pinkSoft : fill}
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
      ) : slot === 'collar' ? (
        <G>
          <Path d="M6 12 Q14 17.5 22 12" stroke={active ? C.tomato : stroke} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Circle cx={14} cy={18.5} r={3.5} fill={active ? C.butter : fill} stroke={stroke} strokeWidth={1.8} />
        </G>
      ) : slot === 'characters' ? (
        <G>
          <Polygon
            points="14,4 16.9,10.2 23.6,11 18.6,15.6 20,22.3 14,19 8,22.3 9.4,15.6 4.4,11 11.1,10.2"
            fill={active ? C.butter : fill}
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
      ) : slot === 'packs' ? (
        <G>
          <Rect x={6} y={7} width={16} height={15} rx={4} fill={active ? C.butter : fill} stroke={stroke} strokeWidth={2} />
          <Circle cx={14} cy={14.5} r={3} fill={active ? C.paper : stroke} />
          <Line x1={9} y1={10.5} x2={19} y2={10.5} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        </G>
      ) : slot === 'back' ? (
        <Path d="M18 6 L9 14 L18 22 M10 14 L22 14" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <G>
          <Line x1={8} y1={8} x2={20} y2={20} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
          <Line x1={20} y1={8} x2={8} y2={20} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

export function ColourHeadTileSvg({ species = 'cat', colourObj, size = 46 }) {
  const col = colourObj || { id: 'golden', hex: '#E8B04B' };
  const body = col.hex;
  const cat = species === 'cat';
  const tabby = cat && (col.id === 'grey' || col.id === 'ginger' || col.id === 'golden' || col.id === 'brown');
  const stripeCol = col.id === 'ginger' ? '#C45B1A' : col.id === 'golden' ? '#B87A14' : col.id === 'brown' ? '#5E3818' : '#5F5C74';
  const creamCol = col.id === 'black' ? '#544B63' : '#FFF8ED';
  const irisCol = col.id === 'grey' || col.id === 'ginger' || col.id === 'white' ? '#38B6FF' : '#7A4B2A';

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* ears */}
      {cat ? (
        <>
          <Polygon points="11,17 13,5 21,12" fill={body} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="13.2,14.5 14.5,7.8 19.2,12" fill={C.pinkSoft} />
          <Polygon points="27,12 35,5 37,17" fill={body} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="28.8,12 33.5,7.8 34.8,14.5" fill={C.pinkSoft} />
        </>
      ) : (
        <>
          <Path d="M11 14 C 5 16, 5 28, 10 29 C 12.5 24, 13.5 18, 13 14 Z" fill="#63391F" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M37 14 C 43 16, 43 28, 38 29 C 35.5 24, 34.5 18, 35 14 Z" fill="#63391F" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        </>
      )}

      {/* collar & bell at bottom */}
      <Path d="M16 34 Q24 38 32 34" stroke="#E84855" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Circle cx={24} cy={38} r={2.8} fill={C.butter} stroke={INK} strokeWidth={1.2} />

      {/* head */}
      <Ellipse cx={24} cy={22} rx={13.5} ry={11.5} fill={body} stroke={INK} strokeWidth={2.2} />
      {tabby ? (
        <>
          <Line x1={21.5} y1={11.5} x2={22} y2={15.2} stroke={stripeCol} strokeWidth={1.7} strokeLinecap="round" />
          <Line x1={24} y1={11} x2={24} y2={15.5} stroke={stripeCol} strokeWidth={1.7} strokeLinecap="round" />
          <Line x1={26.5} y1={11.5} x2={26} y2={15.2} stroke={stripeCol} strokeWidth={1.7} strokeLinecap="round" />
        </>
      ) : null}
      {col.spots ? (
        <>
          <Circle cx={17} cy={19} r={3.2} fill={col.spots} />
          <Circle cx={31} cy={24} r={2.3} fill={col.spots} />
        </>
      ) : null}

      {/* cream muzzle & pink cheeks */}
      <Ellipse cx={24} cy={26.8} rx={6.8} ry={4.4} fill={creamCol} opacity={0.94} />
      <Circle cx={15} cy={25.5} r={1.9} fill={C.pinkSoft} opacity={0.65} />
      <Circle cx={33} cy={25.5} r={1.9} fill={C.pinkSoft} opacity={0.65} />

      {/* eyes */}
      <Circle cx={18.5} cy={21.2} r={3.1} fill={irisCol} stroke={INK} strokeWidth={1} />
      <Circle cx={18.5} cy={21.2} r={1.9} fill="#1E1836" />
      <Circle cx={17.5} cy={20.2} r={0.95} fill="#FFFFFF" />

      <Circle cx={29.5} cy={21.2} r={3.1} fill={irisCol} stroke={INK} strokeWidth={1} />
      <Circle cx={29.5} cy={21.2} r={1.9} fill="#1E1836" />
      <Circle cx={28.5} cy={20.2} r={0.95} fill="#FFFFFF" />

      {/* nose & smile */}
      <Polygon points="22.6,24.6 25.4,24.6 24,26.2" fill={cat ? '#FF7BA3' : INK} />
      <Path d="M21.5 27.2 Q22.7 28.4 24 27 Q25.3 28.4 26.5 27.2" stroke={INK} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function ItemTileSvg({ item, size = 46 }) {
  if (!item) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {item.slot === 'hat' ? (
        item.id === 'hat-party' ? (
          <G>
            <Polygon points="14,35 34,35 24,9" fill="#9B7EDE" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <Line x1={19} y1={35} x2={24} y2={15} stroke="#5CC8FF" strokeWidth={2.5} />
            <Line x1={29} y1={35} x2={24} y2={15} stroke="#FF85A2" strokeWidth={2.5} />
            <Path d="M13 35 L16 30 L20 34 L24 29 L28 34 L32 30 L35 35 Z" fill={C.butter} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
            <Circle cx={24} cy={8.5} r={3.2} fill={C.butter} stroke={INK} strokeWidth={1.6} />
          </G>
        ) : item.id === 'hat-crown' ? (
          <Polygon
            points="10,33 38,33 40,16 32,23 24,12 16,23 8,16"
            fill={item.colour}
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : item.id === 'hat-sun' ? (
          <G>
            <Ellipse cx={24} cy={29} rx={17} ry={5.5} fill="#8273B8" stroke={INK} strokeWidth={2} />
            <Path d="M14 28 C14 15 34 15 34 28 Z" fill="#9B8BD1" stroke={INK} strokeWidth={2} />
            <Path d="M14 25 Q24 28 34 25" stroke={item.colour} strokeWidth={3} fill="none" />
          </G>
        ) : item.id === 'hat-cap' ? (
          <G>
            <Path d="M11 29 C11 16 32 16 34 29 Z" fill={item.colour} stroke={INK} strokeWidth={2} />
            <Ellipse cx={33} cy={29} rx={8} ry={3} fill={item.colour} stroke={INK} strokeWidth={2} />
          </G>
        ) : item.id === 'hat-chef' ? (
          <G>
            <Circle cx={17} cy={19} r={6.5} fill={item.colour} stroke={INK} strokeWidth={1.8} />
            <Circle cx={24} cy={16} r={7} fill={item.colour} stroke={INK} strokeWidth={1.8} />
            <Circle cx={31} cy={19} r={6.5} fill={item.colour} stroke={INK} strokeWidth={1.8} />
            <Rect x={14} y={23} width={20} height={10} rx={2} fill={item.colour} stroke={INK} strokeWidth={1.8} />
          </G>
        ) : item.id === 'hat-wizard' ? (
          <G>
            <Ellipse cx={24} cy={33} rx={17} ry={4.5} fill={item.colour} stroke={INK} strokeWidth={2} />
            <Polygon points="15,32 33,32 24,9" fill={item.colour} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <Circle cx={24} cy={22} r={2.6} fill={C.butter} />
          </G>
        ) : item.id === 'hat-halo' ? (
          <Ellipse cx={24} cy={24} rx={15} ry={5.5} fill="none" stroke={item.colour} strokeWidth={4.5} />
        ) : (
          <G>
            <Path d="M11 31 C11 16 37 16 37 31 Z" fill={item.colour} stroke={INK} strokeWidth={2} />
            <Rect x={9.5} y={29} width={29} height={5} rx={2.5} fill={item.colour} stroke={INK} strokeWidth={2} />
            <Circle cx={24} cy={14.5} r={4} fill={C.paper} stroke={INK} strokeWidth={1.6} />
          </G>
        )
      ) : item.slot === 'glasses' ? (
        item.star ? (
          <G>
            <Polygon
              points="15,15 17,20 22,20.5 18.2,23.8 19.5,29 15,26.2 10.5,29 11.8,23.8 8,20.5 13,20"
              fill={item.colour}
              stroke={INK}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            <Polygon
              points="33,15 35,20 40,20.5 36.2,23.8 37.5,29 33,26.2 28.5,29 29.8,23.8 26,20.5 31,20"
              fill={item.colour}
              stroke={INK}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </G>
        ) : item.heart ? (
          <G>
            <Path d="M15 20 c -3 -4.5, -9 0, -4.5 4.5 l 4.5 4.5 l 4.5 -4.5 c 4.5 -4.5, -1.5 -9, -4.5 -4.5 Z" fill={item.colour} stroke={INK} strokeWidth={1.5} />
            <Path d="M33 20 c -3 -4.5, -9 0, -4.5 4.5 l 4.5 4.5 l 4.5 -4.5 c 4.5 -4.5, -1.5 -9, -4.5 -4.5 Z" fill={item.colour} stroke={INK} strokeWidth={1.5} />
          </G>
        ) : item.monocle ? (
          <G>
            <Circle cx={24} cy={22} r={9} fill="rgba(255,255,255,0.4)" stroke={item.colour} strokeWidth={3} />
            <Path d="M31 28 Q34 35 31 41" stroke={item.colour} strokeWidth={2} fill="none" />
          </G>
        ) : item.cyber ? (
          <G>
            <Rect x={7} y={17} width={34} height={13} rx={4} fill={item.colour} stroke={INK} strokeWidth={2} />
            <Line x1={11} y1={23.5} x2={37} y2={23.5} stroke={INK} strokeWidth={2} />
          </G>
        ) : (
          <G>
            <Rect x={6} y={17} width={15} height={11} rx={item.dark ? 3.5 : 5.5} fill={item.dark ? '#1E1A2E' : '#DCEEFF'} stroke={INK} strokeWidth={2} />
            <Rect x={27} y={17} width={15} height={11} rx={item.dark ? 3.5 : 5.5} fill={item.dark ? '#1E1A2E' : '#DCEEFF'} stroke={INK} strokeWidth={2} />
            <Line x1={21} y1={21} x2={27} y2={21} stroke={INK} strokeWidth={2.2} />
            {item.dark ? (
              <>
                <Line x1={9.5} y1={25.5} x2={15.5} y2={19} stroke="rgba(255,255,255,0.6)" strokeWidth={1.6} strokeLinecap="round" />
                <Line x1={30.5} y1={25.5} x2={36.5} y2={19} stroke="rgba(255,255,255,0.6)" strokeWidth={1.6} strokeLinecap="round" />
              </>
            ) : null}
          </G>
        )
      ) : item.slot === 'neck' ? (
        item.cape ? (
          <Path d="M14 14 L34 14 L40 36 L8 36 Z" fill={item.colour} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        ) : item.bowtie ? (
          <G>
            <Polygon points="9,16 24,24 9,32" fill={item.colour} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <Polygon points="39,16 24,24 39,32" fill={item.colour} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <Circle cx={24} cy={24} r={4} fill={item.colour} stroke={INK} strokeWidth={1.8} />
          </G>
        ) : (
          <G>
            <Polygon points="9,16 39,16 24,35" fill={item.colour} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            {item.rainbow ? <Line x1={15} y1={21} x2={33} y2={21} stroke="#5CC8FF" strokeWidth={2.8} strokeLinecap="round" /> : null}
          </G>
        )
      ) : (
        <G>
          <Ellipse cx={24} cy={22} rx={15} ry={7} fill="none" stroke={item.colour} strokeWidth={6} />
          <Ellipse cx={24} cy={22} rx={15} ry={7} fill="none" stroke={INK} strokeWidth={1.6} />
          {item.bell || item.id === 'collar-red' ? (
            <Circle cx={24} cy={31} r={4.5} fill={C.butter} stroke={INK} strokeWidth={1.6} />
          ) : item.gem ? (
            <Polygon points="24,25 28,31 24,37 20,31" fill={item.colour} stroke={INK} strokeWidth={1.5} />
          ) : null}
        </G>
      )}
    </Svg>
  );
}
