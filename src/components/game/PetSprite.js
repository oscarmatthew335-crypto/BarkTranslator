import React, { memo, useId } from 'react';
import { G, Ellipse, Circle, Path, Rect, Line, Polygon, Defs, Mask, Image as SvgImage } from 'react-native-svg';
import { C } from '../../theme';
import { getColour, getItem } from '../../game/wardrobe';
import { getCharacter, effectiveEquipped } from '../../game/characters';
import { SPRITES } from './sprites';
import { BACK_FRAMES, BACK_HATS, BACK_NECK, BACK_GLASSES, BACK_CHAR, UNIT } from './backArt';

const INK = C.ink;

// The player's pet, drawn in a 56 x 44 box with its feet on y = 44.
// Uses stripped painted sprite bases while running/jumping/ducking and layers
// equipped cosmetics or character skins on top; keeps 'front' SVG pose for wardrobe.
function PetSprite({
  species = 'dog',
  colour = 'golden',
  equipped = {},
  character = null,
  phase = 0,
  pose = 'run',
  panting = false,
  happy = false,
  bank = 0,
  view = 'side',
  rising = true,
  spin = null,
  feel = null,
}) {
  if (view === 'back' && pose !== 'front') {
    return (
      <BackPet
        cat={species === 'cat'}
        phase={phase}
        pose={pose}
        rising={rising}
        spin={spin}
        feel={feel}
        happy={happy}
        bank={bank}
        colour={colour}
        equipped={equipped}
        character={character}
      />
    );
  }
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
  const isJump = pose === 'jump';
  const a = (Number(phase) || 0) * 1.85;
  const strideSin = Math.sin(a);
  const bounce = Math.abs(Math.sin(a * 0.5));
  const bobY = isJump ? 0 : pose === 'hurt' ? 2 : -bounce * 6.5;
  const pitch = isJump ? -13 : pose === 'hurt' ? 6 : Math.cos(a * 0.5) * 7.5 - 2.5;
  const legStretchX = isJump ? 1.09 : 1 + strideSin * 0.095;
  const legStretchY = isJump ? 0.93 : 1 - strideSin * 0.085;

  const hatItem = getItem(shownEquipped.hat);
  const glassesItem = getItem(shownEquipped.glasses);
  const neckItem = getItem(shownEquipped.neck);
  const collarItem = getItem(shownEquipped.collar);

  const transformParts = [];
  if (duck) transformParts.push(`rotate(${(bank * 0.6).toFixed(1)} 28 34) translate(0 16) scale(1.12 0.64)`);
  else {
    if (bobY) transformParts.push(`translate(0 ${bobY.toFixed(2)})`);
    transformParts.push(`rotate(${(pitch + bank).toFixed(1)} 28 28)`);
    transformParts.push(`translate(28 44) scale(${legStretchX.toFixed(3)} ${legStretchY.toFixed(3)}) translate(-28 -44)`);
  }

  return (
    <G>
      {/* Contact shadow under feet on ground when running */}
      {!isJump ? <Ellipse cx={28} cy={44} rx={(18 * (1 - bounce * 0.14)).toFixed(1)} ry={3} fill="rgba(36,29,59,0.22)" /> : null}

      {/* Painted sprint dust puff trailing under hind paws */}
      {pose === 'run' && strideSin > 0.25 ? (
        <SvgImage
          href={SPRITES.dustPuff}
          x={10}
          y={31}
          width={32}
          height={15}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}

      {/* Main animated sprite transform */}
      <G transform={transformParts.join(' ')}>
        {cat ? (
          <SvgImage
            href={SPRITES.catHero}
            x={-4}
            y={-20}
            width={64}
            height={65}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <SvgImage
            href={SPRITES.dogChaser}
            x={-4}
            y={-4}
            width={62}
            height={51}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {/* Character skin accents & overlays (supports all 6 unlockable characters) */}
        <CharacterBodyParts char={char} cat={cat} />
        <CharacterHeadParts char={char} cat={cat} pose={pose} />

        {/* Layered custom cosmetics when different from default */}
        {neckItem ? <NeckItem item={neckItem} /> : null}
        {collarItem && collarItem.id !== 'collar-red' && collarItem.id !== 'collar-bell' ? <CollarItem item={collarItem} /> : null}
        {glassesItem ? <GlassesItem item={glassesItem} /> : null}
        {hatItem && hatItem.id !== 'hat-party' ? <HatItem item={hatItem} cat={cat} /> : null}
      </G>

      {/* Painted glints & sparkles around leaping or streaking pet */}
      {happy && pose !== 'hurt' ? (
        <SvgImage
          href={SPRITES.sparkles}
          x={-4}
          y={-18}
          width={34}
          height={26}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}
    </G>
  );
}

// ---------------------------------------------------------------- back view
// The 3-lane runner shows the pet from behind (art and anchors in backArt.js).

// Fur variants with their own painted frames; frames without one fall back to
// the grey frame tinted with this colour.
const VARIANT_TINT = { gold: '#FFC83D', cyber: '#1F1B2E', zebra: '#FBF8F2', spot: '#FBF8F2' };
export const SPIN_S = 0.45; // seconds for the double-jump spin

// Which painted frame to show, plus the smooth bob and sway between frames.
function backMotion(phase, pose, rising, spin, rate = 1) {
  const a = (Number(phase) || 0) * rate * 0.5;
  const step4 = ((Math.floor(a / (Math.PI / 2)) % 4) + 4) % 4;
  const step = step4 % 2;
  let key = step === 0 ? 'run1' : 'run2';
  let flip = false;
  if (pose === 'jump') {
    key = rising ? 'jumpUp' : 'jumpDown';
    if (spin != null) {
      // back -> side -> front -> other side -> back
      if (spin < 0.15) key = 'jumpUp';
      else if (spin < 0.38) key = 'spinSide';
      else if (spin < 0.62) key = 'spinFront';
      else if (spin < 0.85) { key = 'spinSide'; flip = true; }
      else key = 'jumpDown';
    }
  } else if (pose === 'duck') key = 'duck';
  else if (pose === 'hurt') key = 'hurt';
  else if (pose === 'look') key = 'look';
  else if (pose === 'sit') key = 'sit';
  const running = pose === 'run' || pose === 'look';
  const bounce = Math.abs(Math.sin(a * 2));
  return {
    key,
    step4,
    flip,
    bounce,
    bobY: running ? -bounce * 3 : pose === 'hurt' ? 2 : 0,
    sway: running ? Math.sin(a) * 2.5 : 0,
    squash: running ? 1 - (1 - bounce) * 0.03 : 1,
  };
}

// Squash and stretch around take-off and landing (feel: { jumpT, landT,
// fastFall } in seconds since; null when motion is reduced). Returns [sx, sy].
export function squashStretch(feel, pose, rising) {
  if (!feel) return null;
  const { jumpT, landT, fastFall } = feel;
  if (landT != null && landT < 0.08) {
    const k = 1 - landT / 0.08;
    return [1 + 0.1 * k, 1 - 0.14 * k];
  }
  if (jumpT != null && jumpT < 0.06) {
    const k = 1 - jumpT / 0.06;
    return [1 + 0.08 * k, 1 - 0.12 * k];
  }
  if (pose === 'jump' && rising && jumpT != null && jumpT < 0.3) {
    const k = 1 - (jumpT - 0.06) / 0.24;
    return [1 - 0.06 * k, 1 + 0.08 * k];
  }
  if (pose === 'jump' && fastFall) return [0.95, 1.06];
  return null;
}

const DUST = [SPRITES.fxDust1, SPRITES.fxDust2, SPRITES.fxDust3];

const neckPose = (key) => (key === 'duck' ? 'duck' : key === 'jumpUp' || key === 'jumpDown' || key.startsWith('spin') ? 'jump' : 'run');
const showsFace = (fr) => fr.fx != null;

// A curved collar band across the back of the neck.
function BackCollar({ item, cx, y, w }) {
  const t = Math.max(2, w * 0.13);
  const d = `M ${cx - w / 2} ${y - t * 0.4} Q ${cx} ${y + t * 1.3} ${cx + w / 2} ${y - t * 0.4}`;
  const bits = [];
  if (item.bell) bits.push(<Circle key="b" cx={cx + w * 0.44} cy={y + t * 0.2} r={t * 0.75} fill="#FFC23B" stroke="#7A4B1F" strokeWidth={0.8} />);
  if (item.gem) {
    const n = item.rare ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const u = (i + 1) / (n + 1);
      const gx = cx - w / 2 + w * u;
      const gy = y - t * 0.4 + 2 * (1 - u) * u * t * 1.7 + 0.2;
      bits.push(<Circle key={i} cx={gx} cy={gy} r={t * 0.32} fill={item.rare ? '#FFFFFF' : '#5BE38F'} stroke="#24164A" strokeWidth={0.4} />);
    }
  }
  return (
    <G>
      <Path d={d} stroke="#5A3A24" strokeWidth={t + 1.4} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={item.colour} strokeWidth={t} fill="none" strokeLinecap="round" />
      {bits}
    </G>
  );
}

const Img = ({ art, cx, top, w, opacity }) =>
  art ? <SvgImage href={art.href} x={cx - w / 2} y={top} width={w} height={w * art.ar} preserveAspectRatio="none" opacity={opacity} /> : null;

// A back-view pet with its feet centred on (cx, floor).
// tint: fur colour, or null for the art's own colours. variant: gold | cyber |
// zebra | spot uses that set's painted frames. wear: { hat, collar, neck,
// glasses, royal, astro, ninja, cyberEar } (ids / items to draw).
export function BackRunner({
  cat, phase = 0, pose = 'run', rising = true, spin = null, bank = 0, cx = 28, floor = 44, size = 1, rate,
  tint = null, variant = null, wear = {}, shadow = true, feel = null,
}) {
  const maskId = useId().replace(/:/g, '_');
  const sp = cat ? 'cat' : 'dog';
  const m = backMotion(phase, pose, rising, spin, rate);
  const set = BACK_FRAMES[sp];
  let fr = set[m.key] || set.run1;
  // A set with four run frames (spotty dog) steps through all of them.
  if (variant && (m.key === 'run1' || m.key === 'run2') && set.run3?.[variant]) fr = set[['run1', 'run3', 'run2', 'run4'][m.step4]] || fr;
  if (variant && !fr[variant] && fr.alt && set[fr.alt]?.[variant]) fr = set[fr.alt];
  const u = UNIT[sp] * size;
  const w = fr.pw * u;
  const h = fr.ph * u;
  const hx = m.flip ? 1 - fr.hx : fr.hx;
  // Shift the frame so its head sits over cx: only body, legs and tail change.
  const x0 = cx - hx * w;
  const y0 = floor - h;
  const own = variant ? fr[variant] : null;
  const fill = own ? null : variant ? VARIANT_TINT[variant] : tint;
  const outer = [];
  if (m.bobY) outer.push(`translate(0 ${m.bobY.toFixed(2)})`);
  const tilt = bank * (pose === 'duck' ? 0.6 : 1) + (pose === 'hurt' ? 7 : 0) + m.sway;
  if (tilt) outer.push(`rotate(${tilt.toFixed(1)} ${cx} ${floor})`);
  if (m.squash !== 1) outer.push(`translate(0 ${floor}) scale(1 ${m.squash.toFixed(3)}) translate(0 ${-floor})`);
  const sq = squashStretch(feel, pose, rising);
  if (sq) outer.push(`translate(${cx} ${floor}) scale(${sq[0].toFixed(3)} ${sq[1].toFixed(3)}) translate(${-cx} ${-floor})`);
  const flipT = m.flip ? `translate(${2 * cx} 0) scale(-1 1)` : undefined;

  const headW = fr.hw * w;
  const skullY = y0 + fr.top * h;
  const neckY = y0 + fr.ny * h;
  const face = showsFace(fr);
  const faceX = face ? x0 + fr.fx * w : cx;
  const faceY = face ? y0 + fr.fy * h : 0;
  const np = neckPose(m.key);
  const sideOn = m.key === 'spinSide';

  const neck = wear.royal ? BACK_NECK['char-royal'] : wear.neck ? BACK_NECK[wear.neck] : null;
  const hatId = wear.royal ? 'hat-crown' : wear.hat;
  const hat = hatId ? BACK_HATS[hatId] : null;
  const glasses = wear.glasses ? BACK_GLASSES[wear.glasses] : null;

  const layers = [];
  if (neck && neck.cape) {
    const cw = headW * 1.25;
    layers.push(<Img key="cape" art={neck[np]} cx={cx} top={neckY - headW * 0.18} w={cw} />);
  }
  if (wear.collar && !wear.astro) layers.push(<BackCollar key="collar" item={wear.collar} cx={cx} y={neckY} w={headW * 0.62} />);
  if (neck && !neck.cape && !neck.band) {
    const bw = headW * 0.95;
    const art = neck[np];
    layers.push(<Img key="neck" art={art} cx={cx} top={neckY - bw * art.ar * 0.3} w={bw} />);
  }
  if (neck && neck.band) {
    const art = face ? neck.front : neck.back;
    const bw = headW * (face ? 0.55 : 0.7);
    layers.push(<Img key="bow" art={art} cx={face ? faceX : cx} top={neckY - bw * art.ar * 0.5} w={bw} />);
  }
  if (wear.astro && !face) layers.push(<Img key="pack" art={BACK_CHAR.pack} cx={cx} top={neckY} w={headW * 0.72} />);
  if (wear.ninja) {
    const art = BACK_CHAR.headband[np];
    const bw = headW * 1.05;
    layers.push(<Img key="band" art={art} cx={cx} top={skullY + headW * (face ? 0.1 : 0.28) - bw * art.ar * 0.3} w={bw} />);
    if (face) layers.push(<Img key="mask" art={BACK_CHAR.mask} cx={faceX} top={faceY + headW * 0.12} w={headW * 0.6} />);
  }
  if (glasses && !sideOn) {
    if (face) layers.push(<Img key="gl" art={glasses.front} cx={faceX} top={faceY - fr.fw * w * glasses.front.ar * 0.5} w={fr.fw * w} />);
    else {
      const gw = headW * 1.05;
      layers.push(<Img key="gl" art={glasses.back} cx={cx} top={skullY + headW * 0.42 - gw * glasses.back.ar * 0.5} w={gw} />);
    }
  }
  if (wear.cyberEar) layers.push(<Img key="ear" art={BACK_CHAR.ear} cx={cx + headW * 0.36} top={skullY - headW * 0.02} w={headW * 0.34} />);
  if (hat) {
    const hw2 = headW * hat.k;
    layers.push(<Img key="hat" art={hat} cx={cx} top={skullY + headW * hat.sink - hw2 * hat.ar - headW * hat.lift} w={hw2} />);
  }
  if (wear.astro) {
    // A glass bubble centred on the head, its rim at the neck.
    const hw3 = headW * 1.22;
    const hh = hw3 * BACK_CHAR.helmet.ar;
    layers.push(<Img key="helmet" art={BACK_CHAR.helmet} cx={cx} top={neckY + headW * 0.08 - hh} w={hw3} opacity={0.8} />);
  }

  return (
    <G>
      {shadow && pose !== 'jump' ? (
        <Ellipse cx={cx} cy={floor} rx={(h * 0.22 * (1 - m.bounce * 0.12)).toFixed(1)} ry={3 * size} fill="rgba(36,29,59,0.22)" />
      ) : null}
      <G transform={outer.join(' ') || undefined}>
        <G transform={flipT}>
          <SvgImage href={own || fr.grey} x={x0} y={y0} width={w} height={h} preserveAspectRatio="none" />
          {fill ? (
            <>
              <Defs>
                <Mask id={maskId} maskUnits="userSpaceOnUse" x={x0} y={y0} width={w} height={h}>
                  <SvgImage href={fr.fur} x={x0} y={y0} width={w} height={h} preserveAspectRatio="none" />
                </Mask>
              </Defs>
              <Rect x={x0} y={y0} width={w} height={h} fill={fill} opacity={0.6} mask={`url(#${maskId})`} />
            </>
          ) : null}
        </G>
        {layers}
      </G>
    </G>
  );
}

const GOLD_SPARKLES = [SPRITES.goldSparkle1, SPRITES.goldSparkle2, SPRITES.goldSparkle3];

// The player seen from behind, dressed from the wardrobe and character.
function BackPet({ cat, phase, pose, rising, spin, feel, happy, bank, colour, equipped, character }) {
  const char = typeof character === 'string' ? getCharacter(character) : character;
  const cid = char?.id || null;
  const shown = char ? effectiveEquipped({ equipped }, cid) : equipped || {};
  const col = getColour(colour);
  let variant = null;
  if (cid === 'char-gold') variant = 'gold';
  else if (cid === 'char-cyber') variant = 'cyber';
  else if (cid === 'char-zebra') variant = 'zebra';
  else if (!cid && col.id === 'spotty') variant = 'spot';
  const tint = variant ? null : char?.palette?.body || col.hex;
  const collarItem = shown.collar ? getItem(shown.collar) : null;
  const wear = {
    hat: shown.hat || null,
    collar: collarItem,
    neck: shown.neck || null,
    glasses: shown.glasses || null,
    royal: cid === 'char-royal',
    astro: cid === 'char-astro',
    ninja: cid === 'char-ninja',
    cyberEar: cid === 'char-cyber' && !cat,
  };
  const m = backMotion(phase, pose, rising, spin);
  const sparkle = GOLD_SPARKLES[Math.floor((Number(phase) || 0) * 0.9) % 3];
  return (
    <G>
      {variant === 'gold' && pose !== 'duck' && pose !== 'sit' ? (
        <SvgImage href={sparkle} x={4} y={18} width={48} height={44} preserveAspectRatio="xMidYMid meet" opacity={0.9} />
      ) : null}
      {pose === 'run' && m.bounce > 0.75 ? (
        <SvgImage href={SPRITES.dustPuff} x={12} y={34} width={32} height={15} preserveAspectRatio="xMidYMid meet" opacity={0.8} />
      ) : null}
      {feel?.landT != null && feel.landT < 0.3 ? (
        // A wide dust puff at the feet on landing: grows, then fades.
        <SvgImage
          href={DUST[Math.min(2, Math.floor(feel.landT / 0.1))]}
          x={28 - 32 - feel.landT * 30}
          y={30 - feel.landT * 10}
          width={64 + feel.landT * 60}
          height={26 + feel.landT * 20}
          preserveAspectRatio="none"
          opacity={Math.max(0, 0.9 - feel.landT * 2.6)}
        />
      ) : null}
      <BackRunner cat={cat} phase={phase} pose={pose} rising={rising} spin={spin} bank={bank} tint={tint} variant={variant} wear={wear} feel={feel} />
      {(happy || pose === 'look') && pose !== 'hurt' ? (
        <SvgImage href={SPRITES.sparkles} x={2} y={-30} width={34} height={26} preserveAspectRatio="xMidYMid meet" />
      ) : null}
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
      <Path d="M36 37 C 46 37, 48 25, 43 22" stroke={INK} strokeWidth={6.5} fill="none" strokeLinecap="round" />
      <Path d="M36 37 C 46 37, 48 25, 43 22" stroke={body} strokeWidth={3.6} fill="none" strokeLinecap="round" />
      <Ellipse cx={28} cy={34} rx={10.5} ry={9.5} fill={body} stroke={INK} strokeWidth={2.5} />
      <Ellipse cx={28} cy={35.5} rx={6} ry={6.5} fill={creamCol} opacity={0.92} />
      <Ellipse cx={23.5} cy={41.5} rx={3.3} ry={2.4} fill={creamCol} stroke={INK} strokeWidth={1.8} />
      <Ellipse cx={32.5} cy={41.5} rx={3.3} ry={2.4} fill={creamCol} stroke={INK} strokeWidth={1.8} />
      <Line x1={23.5} y1={35} x2={23.5} y2={39.5} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <Line x1={32.5} y1={35} x2={32.5} y2={39.5} stroke={INK} strokeWidth={2} strokeLinecap="round" />
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
      <Ellipse cx={28} cy={20.2} rx={6.4} ry={4.2} fill={creamCol} opacity={0.95} />
      <Circle cx={19} cy={19} r={2} fill={C.pinkSoft} opacity={0.65} />
      <Circle cx={37} cy={19} r={2} fill={C.pinkSoft} opacity={0.65} />
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
      <Polygon points="26.5,18.2 29.5,18.2 28,19.8" fill={cat ? '#FF7BA3' : INK} stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M25.2 20.6 Q26.6 22 28 20.4 Q29.4 22 30.8 20.6" stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      {cat ? (
        <>
          <Line x1={16} y1={17.5} x2={11} y2={16.5} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={16} y1={19.5} x2={11} y2={20.2} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={40} y1={17.5} x2={45} y2={16.5} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={40} y1={19.5} x2={45} y2={20.2} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
        </>
      ) : null}
      {glasses ? <FrontGlasses item={glasses} /> : null}
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
      <Path d="M36.5 19.5 Q 41 26.5 47.5 25" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M36.5 19.5 Q 41 26.5 47.5 25" stroke={item.colour} strokeWidth={3} fill="none" strokeLinecap="round" />
      {item.bell || item.id === 'collar-red' ? <Circle cx={44.5} cy={27.5} r={2.8} fill={C.butter} stroke={INK} strokeWidth={1.2} /> : null}
      {item.gem ? <Polygon points="44.5,23.5 47,27 44.5,30.5 42,27" fill={item.colour} stroke={INK} strokeWidth={1.1} /> : null}
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
        <Rect x={42} y={10.5} width={11} height={5} rx={2} fill={item.colour} stroke={INK} strokeWidth={1.4} />
        <Line x1={44} y1={13} x2={51} y2={13} stroke={INK} strokeWidth={1.2} />
      </>
    );
  if (item.monocle)
    return (
      <>
        <Circle cx={44.2} cy={14} r={3.6} fill="rgba(255,255,255,0.25)" stroke={item.colour} strokeWidth={1.8} />
        <Path d="M41 16 Q 39 21 40 26" stroke={item.colour} strokeWidth={1.2} fill="none" />
      </>
    );
  return (
    <G>
      <Rect x={40.5} y={11} width={7} height={5.2} rx={item.dark ? 1.5 : 2.6} fill={item.dark ? '#1E1A2E' : 'rgba(255,255,255,0.22)'} stroke={item.colour} strokeWidth={1.6} />
      <Rect x={49.5} y={11} width={5.8} height={5} rx={item.dark ? 1.5 : 2.5} fill={item.dark ? '#1E1A2E' : 'rgba(255,255,255,0.22)'} stroke={item.colour} strokeWidth={1.6} />
      <Line x1={47.5} y1={13.5} x2={49.5} y2={13.5} stroke={item.colour} strokeWidth={1.6} />
      {item.dark ? <Line x1={42} y1={15} x2={45.5} y2={11.5} stroke="rgba(255,255,255,0.55)" strokeWidth={1} strokeLinecap="round" /> : null}
    </G>
  );
}

function HatItem({ item, cat }) {
  if (!item) return null;
  const top = cat ? 2 : 5;
  if (item.id === 'hat-party')
    return null;
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
