import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState, PanResponder } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Image as SvgImage, ClipPath, Defs, Circle } from 'react-native-svg';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { VIEW_W, VIEW_H, GROUND, PLAYER_X, HIT_INVULN_S, POWER_DURATION, newRun, step, visible, resultOf } from '../../game/engine';
import { startGameAudio, gameEvent } from '../../game/sfx';
import PetSprite from './PetSprite';
import Thing, { PowerIcon } from './Things';
import { Backdrop, Midground, Goal } from './Scenery';
import { StickerButton } from '../ui';

const SWIPE_PX = 22;

// One stage or daily run: the game loop, the drawing and the controls.
// Tap (or the Jump button) to jump; swipe down (or hold Duck) to duck.
export default function RunnerScreen({ stage, pet, wardrobe, faceUri, seed, startPowerUps = [], reduceMotion, soundOn, onFinish, onQuit, onFps }) {
  const { t } = useI18n();
  const runRef = useRef(null);
  if (!runRef.current) runRef.current = newRun(stage, { seed, startPowerUps, reduceMotion });
  const input = useRef({ jump: false, duck: false, swipeDuck: false });
  const pausedRef = useRef(true);
  const [paused, setPaused] = useState(true);
  const [started, setStarted] = useState(false);
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const fpsRef = useRef(onFps);
  fpsRef.current = onFps;

  const setPause = (p) => {
    pausedRef.current = p;
    setPaused(p);
  };

  // Pause whenever the app leaves the screen (call, home button, lock).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') setPause(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    startGameAudio(soundOn);
  }, [soundOn]);

  useEffect(() => {
    let raf = 0;
    let last = null;
    let frames = 0;
    let frameTime = 0;
    const frame = (ts) => {
      const dt = last == null ? 0 : (ts - last) / 1000;
      last = ts;
      if (!pausedRef.current) {
        const next = step(runRef.current, dt, input.current);
        input.current.jump = false;
        input.current.swipeDuck = false;
        next.events.forEach(gameEvent);
        runRef.current = next;
        frames += 1;
        frameTime += dt;
        if (frameTime >= 5) {
          fpsRef.current?.(frames / frameTime);
          frames = 0;
          frameTime = 0;
        }
        setTick((n) => (n + 1) % 1000000);
        if (next.done) {
          finishRef.current(resultOf(next));
          return;
        }
      } else {
        frames = 0;
        frameTime = 0;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const begin = () => {
    // Forget presses made while the overlay was up, so the pet doesn't jump on start.
    input.current = { jump: false, duck: false, swipeDuck: false };
    setStarted(true);
    setPause(false);
  };

  const pan = useMemo(() => {
    let swiped = false;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        swiped = false;
      },
      onPanResponderMove: (_, g) => {
        if (!swiped && g.dy > SWIPE_PX && Math.abs(g.dy) > Math.abs(g.dx)) {
          swiped = true;
          input.current.swipeDuck = true;
        }
      },
      onPanResponderRelease: () => {
        if (!swiped && !pausedRef.current) input.current.jump = true;
      }
    });
  }, []);

  const run = runRef.current;
  const things = visible(run);
  const hurtFresh = run.invuln > HIT_INVULN_S - 0.25 && run.hits > 0;
  const shake = !reduceMotion && hurtFresh ? Math.sin(run.t * 90) * 3 : 0;
  const blink = run.invuln > 0 && (reduceMotion ? true : Math.floor(run.t * 12) % 2 === 0);
  const pose = run.player.height > 0 ? 'jump' : run.player.ducking ? 'duck' : hurtFresh ? 'hurt' : 'run';
  const petTop = GROUND - run.player.height - 44;
  const goalX = run.stage.daily ? null : run.length - run.dist + PLAYER_X + 40;
  const progress = run.stage.daily ? Math.min(1, run.t / run.stage.seconds) : Math.min(1, run.dist / run.length);
  // The world is VIEW_W wide; a taller screen just shows more sky above it.
  const { width, height } = size;
  const viewH = width ? Math.max(VIEW_H, (VIEW_W * height) / width) : VIEW_H;
  const activePowers = Object.keys(POWER_DURATION).filter((k) => run.power[k] > 0);
  if (run.power.shield) activePowers.unshift('shield');

  return (
    <View style={s.wrap}>
      <View style={s.hud}>
        <Pressable onPress={() => setPause(true)} style={s.hudBtn} accessibilityRole="button" accessibilityLabel={t('game.pause')} hitSlop={8}>
          <Text style={s.hudBtnText}>⏸</Text>
        </Pressable>
        <View style={s.progressTrack} accessibilityLabel={t('game.progressA11y', { pct: Math.round(progress * 100) })}>
          <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={s.treats} accessibilityLabel={t('game.treatsA11y', { n: run.treats })}>
          {pet.species === 'cat' ? '🐟' : '🦴'} {run.treats}
        </Text>
      </View>

      <View
        style={s.stage}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
        accessible
        accessibilityLabel={t('game.playAreaA11y')}
      >
        {width > 0 && (
          <Svg width={width} height={height} viewBox={`0 ${VIEW_H - viewH} ${VIEW_W} ${viewH}`} preserveAspectRatio="xMidYMax meet">
            <Defs>
              <ClipPath id="face">
                <Circle cx={0} cy={0} r={9} />
              </ClipPath>
            </Defs>
            <G transform={shake ? `translate(${shake} 0)` : undefined}>
              <Backdrop theme={stage.theme} />
              <Midground theme={stage.theme} dist={run.dist} />
              {goalX != null && goalX < VIEW_W + 60 ? (
                <G transform={`translate(${goalX} ${GROUND})`}>
                  <Goal />
                </G>
              ) : null}
              {things.map((e) => (
                <G key={e.id} transform={`translate(${e.sx} ${e.sy})`}>
                  <Thing kind={e.kind} type={e.type} w={e.w} h={e.h} />
                </G>
              ))}
              <G transform={`translate(${PLAYER_X - 6} ${petTop})`} opacity={blink ? 0.5 : 1}>
                {run.power.shield ? <Circle cx={28} cy={24} r={30} fill="rgba(92,200,255,0.25)" stroke={C.sky} strokeWidth={2} /> : null}
                <PetSprite
                  species={pet.species}
                  colour={wardrobe.colour}
                  equipped={wardrobe.equipped}
                  phase={Math.floor(run.dist / 18)}
                  pose={pose}
                />
                <NameTag name={pet.name} faceUri={faceUri} />
              </G>
            </G>
          </Svg>
        )}
        {activePowers.length > 0 && (
          <View style={s.powers} pointerEvents="none">
            {activePowers.map((k) => (
              <Svg key={k} width={26} height={26} viewBox="0 0 28 28">
                <PowerIcon type={k} />
              </Svg>
            ))}
          </View>
        )}
        {paused && (
          <View style={s.overlay}>
            <Text style={s.overlayTitle}>{started ? t('game.paused') : t(stage.nameKey)}</Text>
            {!started && <Text style={s.overlaySub}>{t('game.howTo')}</Text>}
            <View style={s.overlayButtons}>
              <StickerButton label={started ? t('game.resume') : t('game.go')} emoji="▶️" onPress={begin} />
              <StickerButton label={t('game.quit')} color={C.paper} onPress={onQuit} />
            </View>
          </View>
        )}
      </View>

      <View style={s.controls}>
        <Pressable
          style={[s.ctrl, { backgroundColor: C.sky }]}
          onPressIn={() => {
            input.current.duck = true;
          }}
          onPressOut={() => {
            input.current.duck = false;
          }}
          accessibilityRole="button"
          accessibilityLabel={t('game.duck')}
        >
          <Text style={s.ctrlText} maxFontSizeMultiplier={1.6}>
            ⬇️ {t('game.duck')}
          </Text>
        </Pressable>
        <Pressable
          style={[s.ctrl, { backgroundColor: C.butter }]}
          onPressIn={() => {
            input.current.jump = true;
          }}
          accessibilityRole="button"
          accessibilityLabel={t('game.jump')}
        >
          <Text style={s.ctrlText} maxFontSizeMultiplier={1.6}>
            ⬆️ {t('game.jump')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// The pet's name above its head, with its face photo when there is one.
const NameTag = React.memo(function NameTag({ name, faceUri }) {
  const label = String(name || '').slice(0, 14);
  const w = Math.max(40, label.length * 7 + (faceUri ? 30 : 16));
  const x = 28 - w / 2;
  return (
    <G transform={`translate(${x} -24)`}>
      <Rect x={0} y={0} width={w} height={20} rx={10} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      {faceUri ? (
        <G transform="translate(11 10)">
          <SvgImage href={{ uri: faceUri }} x={-9} y={-9} width={18} height={18} preserveAspectRatio="xMidYMid slice" clipPath="url(#face)" />
          <Circle cx={0} cy={0} r={9} fill="none" stroke={C.ink} strokeWidth={1.5} />
        </G>
      ) : null}
      <SvgText x={faceUri ? 24 : 8} y={14} fontSize={12} fontFamily={F.semibold} fill={C.ink}>
        {label}
      </SvgText>
    </G>
  );
});

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  hudBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  hudBtnText: { fontSize: 18 },
  progressTrack: { flex: 1, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.mint },
  treats: { fontFamily: F.bold, fontSize: 20, color: C.ink, minWidth: 60, textAlign: 'right' },
  // A little sky above the 400 x 220 world, so jumps have room on screen.
  stage: { aspectRatio: VIEW_W / 330, borderTopWidth: INK_WIDTH, borderBottomWidth: INK_WIDTH, borderColor: C.ink, backgroundColor: C.paper },
  powers: { position: 'absolute', top: 6, left: 8, flexDirection: 'row', gap: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(238,231,255,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayTitle: { fontFamily: F.bold, fontSize: 26, color: C.ink, textAlign: 'center' },
  overlaySub: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  overlayButtons: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  controls: { flex: 1, flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-end', minHeight: 110 },
  ctrl: { flex: 1, height: '100%', maxHeight: 170, minHeight: 80, borderRadius: 24, borderWidth: INK_WIDTH, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  ctrlText: { fontFamily: F.bold, fontSize: 20, color: C.ink, textAlign: 'center' }
});
