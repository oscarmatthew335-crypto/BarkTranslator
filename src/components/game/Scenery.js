import React, { memo } from 'react';
import { G, Rect, Circle, Ellipse, Path, Polygon, Line } from 'react-native-svg';
import { C } from '../../theme';
import { VIEW_W, VIEW_H, GROUND } from '../../game/engine';
import { parallaxOffsets } from '../../game/parallax';

export { parallaxOffsets };

const INK = C.ink;

// Colours and background props per place (theme ids in src/game/stages.js).
export const THEMES = {
  garden: { sky: '#AEE4FA', skyTop: '#8AD8F8', ground: '#6EB83B', edge: '#4E8F25', path: '#F3DFAC', far: '#A5D6B8', farTree: '#8CC4A7', prop: 'tree' },
  park: { sky: '#BBEAFC', skyTop: '#8AD8F8', ground: '#6EB83B', edge: '#4E8F25', path: '#F3DFAC', far: '#A5D6B8', farTree: '#8CC4A7', prop: 'bench' },
  beach: { sky: '#BFEAFF', skyTop: '#7ECFF5', ground: '#F7DE9B', edge: '#E3BE62', path: '#FFF0C2', far: '#7FD0F0', farTree: '#63B8DB', prop: 'umbrella' },
  braai: { sky: '#FFE2C2', skyTop: '#FFC994', ground: '#A2CC5E', edge: '#759F3A', path: '#ECD59F', far: '#F2C48D', farTree: '#DBA56E', prop: 'braai' },
  vet: { sky: '#EEE7FF', skyTop: '#DBD0FA', ground: '#D9D2F0', edge: '#B7AEDB', path: '#F7F5FF', far: '#FFFFFF', farTree: '#E3DDF7', prop: 'cross' },
  home: { sky: '#FFF1DA', skyTop: '#FFE1B5', ground: '#D9A876', edge: '#B98252', path: '#F4DFC2', far: '#F7D9B5', farTree: '#E6BE94', prop: 'sofa' }
};

const PROP_GAP = 165;

function Prop({ type, index = 0 }) {
  // For park/garden props, alternate lush layered trees, wooden park benches, flowering bushes & bins.
  if (type === 'tree' || type === 'bench') {
    const slot = (type === 'bench' ? index + 1 : index) % 3;
    if (slot === 0) {
      return (
        <G>
          {/* bush */}
          <Circle cx={44} cy={-8} r={10} fill="#4E8C32" stroke={INK} strokeWidth={1.6} />
          <Circle cx={56} cy={-10} r={12} fill="#5E9E31" stroke={INK} strokeWidth={1.6} />
          <Circle cx={49} cy={-12} r={2} fill="#FFF" />
          <Circle cx={58} cy={-7} r={2} fill="#FFC83B" />
          {/* deciduous park tree */}
          <Path d="M-7 0 L-5 -54 L5 -54 L7 0 Z" fill="#7A4B2A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M-2 -34 L-18 -48 M2 -36 L16 -50" stroke="#5C361C" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={-22} cy={-56} r={17} fill="#4A8223" stroke={INK} strokeWidth={2} />
          <Circle cx={20} cy={-54} r={18} fill="#4A8223" stroke={INK} strokeWidth={2} />
          <Circle cx={0} cy={-74} r={23} fill="#5E9E31" stroke={INK} strokeWidth={2} />
          <Circle cx={-12} cy={-66} r={16} fill="#77B843" />
          <Circle cx={12} cy={-64} r={15} fill="#77B843" />
          <Circle cx={-4} cy={-82} r={13} fill="#8AD055" />
        </G>
      );
    }
    if (slot === 1) {
      return (
        <G>
          {/* slatted park bench */}
          <Rect x={-30} y={-28} width={6} height={28} rx={2} fill="#3A3D45" stroke={INK} strokeWidth={1.6} />
          <Rect x={24} y={-28} width={6} height={28} rx={2} fill="#3A3D45" stroke={INK} strokeWidth={1.6} />
          <Rect x={-34} y={-32} width={68} height={6} rx={2} fill="#C87D44" stroke={INK} strokeWidth={1.8} />
          <Rect x={-34} y={-24} width={68} height={6} rx={2} fill="#B36B35" stroke={INK} strokeWidth={1.8} />
          <Rect x={-36} y={-15} width={72} height={7} rx={2} fill="#C87D44" stroke={INK} strokeWidth={1.8} />
          {/* metal trash can beside bench */}
          <Rect x={44} y={-24} width={16} height={24} rx={2.5} fill="#8C9BAE" stroke={INK} strokeWidth={1.8} />
          <Rect x={42} y={-27} width={20} height={4.5} rx={2} fill="#6B7A8E" stroke={INK} strokeWidth={1.6} />
          <Line x1={49} y1={-20} x2={49} y2={-4} stroke="#526072" strokeWidth={1.4} />
          <Line x1={55} y1={-20} x2={55} y2={-4} stroke="#526072" strokeWidth={1.4} />
        </G>
      );
    }
    return (
      <G>
        <Circle cx={-12} cy={-10} r={12} fill="#4E8C32" stroke={INK} strokeWidth={1.8} />
        <Circle cx={6} cy={-14} r={15} fill="#5E9E31" stroke={INK} strokeWidth={1.8} />
        <Circle cx={20} cy={-9} r={11} fill="#77B843" stroke={INK} strokeWidth={1.8} />
        <Circle cx={-2} cy={-16} r={2.2} fill="#FFE17D" />
        <Circle cx={10} cy={-11} r={2} fill="#FFF" />
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

function Cloud({ cx, cy, scale = 1 }) {
  return (
    <G transform={`translate(${cx} ${cy}) scale(${scale})`} opacity={0.94}>
      <Path
        d="M-36 10 Q-40 -2 -26 -4 Q-20 -18 -2 -16 Q16 -20 24 -4 Q38 -2 36 10 Z"
        fill="#FFFFFF"
      />
      <Path d="M-34 9 Q0 13 34 9" stroke="#DDF2FC" strokeWidth={4} fill="none" strokeLinecap="round" />
    </G>
  );
}

// Sky and clouds drift at 0.1x (wrapping), far hills & silhouette trees at 0.3x.
export const Backdrop = memo(function Backdrop({ theme, dist = 0, reduceMotion = false }) {
  const th = THEMES[theme] || THEMES.garden;
  const off = parallaxOffsets(dist, reduceMotion);
  const cloudSpan = VIEW_W + 140;
  const farSpan = VIEW_W + 320;
  return (
    <G>
      {/* Sky reaching up for tall aspect ratios */}
      <Rect x={0} y={-1200} width={VIEW_W} height={VIEW_H + 1200} fill={th.skyTop || th.sky} />
      <Rect x={0} y={GROUND - 110} width={VIEW_W} height={120} fill={th.sky} opacity={0.75} />

      <Cloud cx={wrapX(70, off.sky, cloudSpan, 70)} cy={-48} scale={0.95} />
      <Cloud cx={wrapX(210, off.sky, cloudSpan, 70)} cy={-86} scale={1.15} />
      <Cloud cx={wrapX(330, off.sky, cloudSpan, 70)} cy={-26} scale={0.85} />
      <Circle cx={VIEW_W - 44} cy={-74} r={17} fill={C.butter} stroke={INK} strokeWidth={2} />

      {/* Distant rolling hills + soft background tree silhouettes */}
      <Ellipse cx={wrapX(90, off.far, farSpan, 160)} cy={GROUND + 8} rx={150} ry={58} fill={th.far} />
      <Ellipse cx={wrapX(310, off.far, farSpan, 160)} cy={GROUND + 10} rx={170} ry={48} fill={th.far} />
      {[40, 155, 290, 415].map((bx) => {
        const fx = wrapX(bx, off.far * 0.85, farSpan, 80);
        return (
          <G key={bx} transform={`translate(${fx} ${GROUND - 10})`} opacity={0.68}>
            <Rect x={-3} y={-16} width={6} height={18} fill={th.farTree || th.far} />
            <Circle cx={0} cy={-28} r={17} fill={th.farTree || th.far} />
            <Circle cx={-12} cy={-20} r={11} fill={th.farTree || th.far} />
            <Circle cx={12} cy={-20} r={11} fill={th.farTree || th.far} />
          </G>
        );
      })}
    </G>
  );
});

// Props scroll at 0.6x for depth; footpath & soil cutaway at 1x.
export function Midground({ theme, dist, reduceMotion = false }) {
  const th = THEMES[theme] || THEMES.garden;
  const p = parallaxOffsets(dist, reduceMotion);
  const off = -(p.props % PROP_GAP);
  const shiftCount = Math.floor(p.props / PROP_GAP);
  const stripe = -(p.ground % 44);
  const pathCol = th.path || '#F3DFAC';
  return (
    <G>
      {/* Midground props along the park/scene horizon */}
      <G transform={`translate(${off} ${GROUND - 14})`}>
        <PropRow prop={th.prop} shiftCount={shiftCount} />
      </G>

      {/* Upper grass verge behind the footpath */}
      <Rect x={0} y={GROUND - 15} width={VIEW_W} height={9} fill={th.ground} />
      <Rect x={0} y={GROUND - 16} width={VIEW_W} height={2.5} fill={th.edge} />

      {/* Warm sandy footpath strip where pets run */}
      <Rect x={0} y={GROUND - 7} width={VIEW_W} height={15} fill={pathCol} />
      <Rect x={0} y={GROUND - 7} width={VIEW_W} height={2} fill="#D8BF84" />

      {/* Green scalloped grass overhanging lip + underground soil cutaway */}
      <Rect x={0} y={GROUND + 8} width={VIEW_W} height={8} fill={th.ground} />
      <Rect x={0} y={GROUND + 16} width={VIEW_W} height={VIEW_H - GROUND} fill="#6E5536" />
      <Rect x={0} y={GROUND + 34} width={VIEW_W} height={VIEW_H - GROUND} fill="#5A532E" />
      <G transform={`translate(${stripe} 0)`}>
        <TurfScallops edgeCol={th.edge} grassCol={th.ground} />
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
        <G key={i} transform={`translate(${64 + i * PROP_GAP} 0)`}>
          <Prop type={prop} index={i + shiftCount} />
        </G>
      ))}
    </G>
  );
});

const TurfScallops = memo(function TurfScallops({ edgeCol, grassCol }) {
  const xs = [];
  for (let x = 0; x < VIEW_W + 88; x += 44) xs.push(x);
  return (
    <G>
      {xs.map((x) => (
        <G key={x}>
          <Circle cx={x + 8} cy={GROUND + 15} r={5} fill={edgeCol} />
          <Circle cx={x + 22} cy={GROUND + 16} r={5.5} fill={grassCol} />
          <Circle cx={x + 36} cy={GROUND + 15} r={4.5} fill={edgeCol} />
          <Ellipse cx={x + 14} cy={GROUND + 26} rx={4.5} ry={2.8} fill="#574126" />
          <Ellipse cx={x + 34} cy={GROUND + 32} rx={3.5} ry={2.2} fill="#4D3920" />
          <Circle cx={x + 18} cy={GROUND + 10} r={1.4} fill="#FFFFFF" opacity={0.85} />
          <Circle cx={x + 30} cy={GROUND + 11} r={1.4} fill="#FFE17D" opacity={0.9} />
        </G>
      ))}
    </G>
  );
});

// The goal at the end of a stage: a checkered/gold flag with a bowl of treats.
export const Goal = memo(function Goal() {
  return (
    <G>
      <Line x1={0} y1={0} x2={0} y2={-70} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Polygon points="0,-70 36,-60 0,-50" fill={C.butter} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 0 Q 24 -16 40 0 Z" fill={C.pink} stroke={INK} strokeWidth={2} />
    </G>
  );
});
