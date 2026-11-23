import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, AppState, PanResponder, BackHandler } from 'react-native';
import Svg, { G, Rect, Ellipse, Text as SvgText, Image as SvgImage, ClipPath, Defs, Circle, Line } from 'react-native-svg';
import { C, F, INK_WIDTH, R, SP } from '../../theme';
import { useI18n } from '../../i18n';
import { VIEW_W, PLAYER_X, HIT_INVULN_S, POWER_DURATION, CHASE_GAP_MAX, currentSpeed, newRun, step, visible, resultOf, canContinueRun, continueRun, laneLean } from '../../game/engine';
import { getColour } from '../../game/wardrobe';
import { runGoalProgress } from '../../game/runFeel';
import { startGameAudio, gameEvent, setGameReduceMotion } from '../../game/sfx';
import { track as trackEvent } from '../../game/analytics';
import { count } from '../../game/counters';
import { isRewardedReady, showRewardedAd } from '../../game/ads';
import PetSprite, { SPIN_S } from './PetSprite';
import Thing, { PowerIcon, Chaser } from './Things';
import { CAM_W, HORIZON_Y, PLAYER_GROUND_Y, VISIBLE_DEPTH, projectBehind, Backdrop, Midground, Goal } from './Scenery';
import { ColourHeadTileSvg } from './WardrobeIcons';
import { SPRITES } from './sprites';
import { StickerButton } from '../ui';

// A swipe counts after about 6% of the screen width (24-48 px), so it feels
// the same on small and large phones.
export const swipeThreshold = (width) => Math.max(24, Math.min(48, Math.round((width || 0) * 0.06)));
const SWIPE_HINT_RUNS = 3;
const SWIPE_HINT_S = 4;
const FPS_WINDOW_S = 2;
let controlsModeSent = false;

// Painted effects drawn in the world: a sparkle ring on a treat, a bonk on a bump.
const FX_ART = {
  pop: [SPRITES.fxPop1, SPRITES.fxPop2, SPRITES.fxPop3],
  bonk: [SPRITES.fxBonk1, SPRITES.fxBonk2],
};
const FX_LIFE = { pop: 0.3, bonk: 0.45, plus: 0.4 };
const MAX_FX = 8;
const COUNTDOWN_ART = { 3: SPRITES.cd3, 2: SPRITES.cd2, 1: SPRITES.cd1 };
const COUNTDOWN_STEP_MS = 500;
const REDUCE_MOTION_START_MS = 400;
const CONTINUE_RING_SECONDS = 5;
const MAX_PARTICLES = 12;

function spawnParticles(pool, kind, x, y) {
  const next = pool.slice();
  const push = (p) => {
    if (next.length >= MAX_PARTICLES) next.shift();
    next.push({ id: `${Date.now()}-${Math.random()}`, age: 0, ...p });
  };
  if (kind === 'jump' || kind === 'doubleJump' || kind === 'land') {
    for (let i = 0; i < 3; i++) {
      push({ kind: 'dot', x: x + (i - 1) * 6, y, vx: -40 - i * 18, vy: -18 - i * 12, life: 0.35, r: 3.2, color: C.paper });
    }
  } else if (kind === 'splash') {
    for (let i = 0; i < 4; i++) {
      push({ kind: 'dot', x: x + (i - 1.5) * 5, y, vx: (i - 1.5) * 32, vy: -60 - (i % 2) * 20, life: 0.42, r: 2.8, color: C.sky });
    }
  } else if (kind === 'collect') {
    for (let i = 0; i < 3; i++) {
      push({ kind: 'dot', x: x + (i - 1) * 7, y: y - i * 4, vx: 15 - i * 18, vy: -45, life: 0.38, r: 2.6, color: C.butter });
    }
  } else if (kind === 'nearMiss') {
    push({ kind: 'streak', x, y: y - 4, vx: -120, vy: 0, life: 0.32, r: 16, color: C.tomato });
    push({ kind: 'streak', x: x + 4, y: y + 4, vx: -130, vy: 0, life: 0.32, r: 12, color: C.butter });
  } else if (kind === 'smash') {
    for (let i = 0; i < 4; i++) {
      push({ kind: 'dot', x: x + i * 3, y: y + (i % 2) * 6 - 3, vx: 40 + i * 22, vy: -35 + (i % 2) * 30, life: 0.45, r: 4, color: C.butter });
    }
  }
  return next;
}

// One stage, daily, endless or chase run: close-up framed runner card with
// multi-layered scenery, translucent pill HUD, and non-overlapping soil controls.
export default function RunnerScreen({
  stage,
  pet,
  wardrobe,
  faceUri,
  seed,
  startPowerUps = [],
  bestScore = 0,
  runGoal = null,
  instantStart = false,
  showHowTo = true,
  showJumpDuckButtons = true,
  treatBalance = 0,
  continueTreatCost = 30,
  onPayContinueTreats = null,
  onTrack = null,
  reduceMotion,
  soundOn,
  vibrationOn = true,
  premium = false,
  onFinish,
  onQuit,
  onFps,
  runNumber = 0
}) {
  const { t } = useI18n();
  const runRef = useRef(null);
  if (!runRef.current) runRef.current = newRun(stage, { seed, startPowerUps, reduceMotion, firstRun: runNumber === 1 });
  const fxRef = useRef([]);
  const goUntilRef = useRef(0);
  const newBestAtRef = useRef(null);
  const swipePxRef = useRef(swipeThreshold(0));
  const fpsStatRef = useRef({ avg: 0, min: 0, dts: [] });
  const fpsTapsRef = useRef({ n: 0, at: 0 });
  const [fpsShown, setFpsShown] = useState(false);
  const [duckPressed, setDuckPressed] = useState(false);
  const showSwipeHint = !showJumpDuckButtons && runNumber > 0 && runNumber <= SWIPE_HINT_RUNS;
  const input = useRef({ jump: false, duck: false, swipeDuck: false, left: false, right: false, laneLeft: false, laneRight: false });
  const pausedRef = useRef(true);
  const particlesRef = useRef([]);
  const lookUntilRef = useRef(0);
  const [paused, setPaused] = useState(Boolean(showHowTo));
  const [started, setStarted] = useState(!showHowTo);
  const [countdown, setCountdown] = useState(() => (showHowTo ? null : reduceMotion ? 0 : instantStart ? 1 : 3));
  const [continuePrompt, setContinuePrompt] = useState(false);
  const [continueBusy, setContinueBusy] = useState(false);
  const [continueTimer, setContinueTimer] = useState(CONTINUE_RING_SECONDS);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const fpsRef = useRef(onFps);
  fpsRef.current = onFps;
  const premiumRef = useRef(premium);
  premiumRef.current = premium;
  const trackRef = useRef(onTrack);
  trackRef.current = onTrack;

  const resetInputs = () => {
    input.current = { jump: false, duck: false, swipeDuck: false, left: false, right: false, laneLeft: false, laneRight: false };
    setLeftPressed(false);
    setRightPressed(false);
    setJumpPressed(false);
  };

  const setPause = (p) => {
    pausedRef.current = p;
    setPaused(p);
    if (p) resetInputs();
  };

  const continueRef = useRef(false);
  continueRef.current = continuePrompt;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pausedRef.current && !continueRef.current) setPause(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') setPause(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    startGameAudio(soundOn, vibrationOn);
  }, [soundOn, vibrationOn]);

  useEffect(() => {
    setGameReduceMotion(reduceMotion);
  }, [reduceMotion]);

  // Which controls this player uses, once per session.
  useEffect(() => {
    if (controlsModeSent) return;
    controlsModeSent = true;
    trackEvent('controls_mode', { mode: showJumpDuckButtons ? 'buttons' : 'swipe' });
  }, []);

  useEffect(() => {
    if (countdown === null || paused) return;
    if (reduceMotion) {
      const tm = setTimeout(() => {
        resetInputs();
        setCountdown(null);
        setStarted(true);
        pausedRef.current = false;
      }, REDUCE_MOTION_START_MS);
      return () => clearTimeout(tm);
    }
    if (countdown <= 0) {
      resetInputs();
      goUntilRef.current = Date.now() + 600;
      setCountdown(null);
      setStarted(true);
      pausedRef.current = false;
      return;
    }
    const tm = setTimeout(() => setCountdown((c) => (c != null ? c - 1 : null)), COUNTDOWN_STEP_MS);
    return () => clearTimeout(tm);
  }, [countdown, paused, reduceMotion]);

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
        input.current.laneLeft = false;
        input.current.laneRight = false;
        next.events.forEach(gameEvent);
        // The pet glances back at the camera after a close call or a landed trick.
        if (next.events.includes('nearMiss') || next.events.includes('trick')) lookUntilRef.current = next.t + 0.7;
        if (!reduceMotion) {
          let pool = particlesRef.current
            .map((p) => ({ ...p, age: p.age + dt, x: p.x + p.vx * dt, y: p.y + p.vy * dt }))
            .filter((p) => p.age < p.life);
          const pProj = projectBehind(0, next.player.lanePos ?? 0, next.player.height);
          for (const ev of next.events) {
            if (ev === 'jump' || ev === 'doubleJump') pool = spawnParticles(pool, ev, pProj.x, pProj.y - 4);
            else if (ev === 'land' || ev === 'splash') pool = spawnParticles(pool, ev, pProj.x, pProj.groundY - 2);
            else if (ev === 'collect') pool = spawnParticles(pool, ev, pProj.x, pProj.y - 24);
            else if (ev === 'trick') {
              pool = spawnParticles(pool, 'collect', pProj.x - 8, pProj.y - 26);
              pool = spawnParticles(pool, 'collect', pProj.x + 8, pProj.y - 30);
            }
            else if (ev === 'nearMiss') pool = spawnParticles(pool, ev, pProj.x, pProj.y - 20);
            else if (ev === 'smash') pool = spawnParticles(pool, ev, pProj.x, pProj.y - 18);
          }
          particlesRef.current = pool;
          let fx = fxRef.current.map((f) => ({ ...f, age: f.age + dt })).filter((f) => f.age < FX_LIFE[f.kind]);
          const addFx = (f) => {
            fx.push({ id: `${next.t}-${Math.random()}`, age: 0, ...f });
            if (fx.length > MAX_FX) fx = fx.slice(-MAX_FX);
          };
          for (const ev of next.events) {
            if (ev === 'collect') {
              addFx({ kind: 'pop', x: pProj.x, y: pProj.y - 24 });
              addFx({ kind: 'plus', x: pProj.x + 10, y: pProj.y - 40 });
            } else if (ev === 'trick') addFx({ kind: 'pop', x: pProj.x, y: pProj.y - 30 });
            else if (ev === 'hit' || ev === 'shield') addFx({ kind: 'bonk', x: pProj.x, y: pProj.y - 34 });
          }
          fxRef.current = fx;
        } else if (particlesRef.current.length || fxRef.current.length) {
          particlesRef.current = [];
          fxRef.current = [];
        }
        // fps over the last 2 seconds (shown in test builds only).
        const st = fpsStatRef.current;
        if (dt > 0) {
          st.dts.push(dt);
          let sum = st.dts.reduce((a, b) => a + b, 0);
          while (sum > FPS_WINDOW_S && st.dts.length > 1) sum -= st.dts.shift();
          st.avg = st.dts.length / sum;
          st.min = 1 / Math.max(...st.dts);
        }
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
          const canPayTreats = Boolean(onPayContinueTreats && treatBalance >= continueTreatCost);
          if (canContinueRun(next) && (premiumRef.current || isRewardedReady('continue') || canPayTreats)) {
            pausedRef.current = true;
            count('continuesOffered');
            trackRef.current?.('continue_offered', { stage_id: next.stage?.id });
            setContinueTimer(CONTINUE_RING_SECONDS);
            setContinuePrompt(true);
          } else {
            finishRef.current(resultOf(next));
            return;
          }
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
    resetInputs();
    setStarted(true);
    if (countdown !== null) {
      setPaused(false);
      pausedRef.current = true;
    } else {
      setPause(false);
    }
  };

  const acceptContinue = (method) => {
    count('continuesTaken');
    trackRef.current?.('continue_taken', { stage_id: stage.id, method });
    runRef.current = continueRun(runRef.current);
    resetInputs();
    setContinuePrompt(false);
    setPaused(false);
    pausedRef.current = true;
    setCountdown(reduceMotion ? 0 : 3);
    setTick((n) => (n + 1) % 1000000);
  };

  const handleDeclineContinue = (reason = 'declined') => {
    trackRef.current?.('continue_declined', { stage_id: stage.id, reason });
    setContinuePrompt(false);
    finishRef.current(resultOf(runRef.current));
  };

  const handleContinue = async () => {
    if (continueBusy) return;
    setContinueBusy(true);
    try {
      let granted = Boolean(premium);
      if (!granted) {
        const res = await showRewardedAd('continue');
        granted = Boolean(res?.rewarded);
      }
      if (granted) {
        acceptContinue(premium ? 'premium' : 'ad');
      } else {
        handleDeclineContinue('ad_dismissed');
      }
    } finally {
      setContinueBusy(false);
    }
  };

  const handleContinueTreats = () => {
    if (continueBusy || !onPayContinueTreats) return;
    if (onPayContinueTreats(continueTreatCost)) {
      acceptContinue('treats');
    }
  };

  useEffect(() => {
    if (!continuePrompt || continueBusy) return;
    const iv = setInterval(() => {
      setContinueTimer((prev) => {
        const next = Math.max(0, +(prev - 0.1).toFixed(1));
        if (next <= 0) {
          clearInterval(iv);
          handleDeclineContinue('timeout');
        }
        return next;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [continuePrompt, continueBusy]);

  const pan = useMemo(() => {
    let swiped = false;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        swiped = false;
      },
      onPanResponderMove: (_, g) => {
        if (swiped || pausedRef.current) return;
        const px = swipePxRef.current;
        if (Math.abs(g.dx) > px && Math.abs(g.dx) >= Math.abs(g.dy)) {
          swiped = true;
          if (g.dx < 0) input.current.laneLeft = true;
          else input.current.laneRight = true;
        } else if (Math.abs(g.dy) > px) {
          swiped = true;
          if (g.dy > 0) input.current.swipeDuck = true;
          else input.current.jump = true;
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
  const nearMissFresh = (run.nearMissTimer || 0) > 0;
  const shake = !reduceMotion && (hurtFresh || nearMissFresh) ? Math.sin(run.t * 90) * (hurtFresh ? 3 : 2) : 0;
  const goalProg = runGoal ? runGoalProgress(runGoal, run) : null;
  const blink = run.invuln > 0 && (reduceMotion ? true : Math.floor(run.t * 12) % 2 === 0);
  const basePose = run.player.height > 0 ? 'jump' : run.player.ducking ? 'duck' : hurtFresh ? 'hurt' : 'run';
  // Sits facing the road during the countdown; glances back after a close call or trick.
  const pose = countdown !== null ? 'sit' : basePose === 'run' && run.t < lookUntilRef.current ? 'look' : basePose;
  const spinP = run.player.spinT != null && run.player.height > 0 ? Math.min(1, run.player.spinT / SPIN_S) : null;
  const isScoreMode = Boolean(run.stage.endless || run.stage.chase);
  const goalDx = run.stage.daily || isScoreMode ? null : run.length - run.dist;
  const progress = run.stage.chase
    ? Math.max(0, Math.min(1, (run.chaseGap ?? CHASE_GAP_MAX) / CHASE_GAP_MAX))
    : run.stage.daily
    ? Math.min(1, run.t / run.stage.seconds)
    : Math.min(1, run.dist / run.length);
  const showChaser = Boolean(run.stage.chase);
  const showProgressTrack = Boolean(run.stage.chase || !run.stage.endless);
  const lowGap = Boolean(run.stage.chase && progress < 0.3);
  const meterFlash = lowGap && !reduceMotion && Math.floor(run.t * 8) % 2 === 1;
  const chaserBounce = lowGap && !reduceMotion ? Math.abs(Math.sin(run.t * 14)) * 4 : 0;
  const { width, height } = size;
  const aspect = width > 0 && height > 0 ? Math.max(1.03, Math.min(2.4, height / width)) : 1.75;
  const totalViewH = Math.round(CAM_W * aspect);
  // Road shown below the pet's feet. Room for the chaser to run behind it in
  // the same lane, and it puts the pet further up the screen (less empty sky).
  const bottomTrackMargin = 118;
  const viewMaxY = PLAYER_GROUND_Y + bottomTrackMargin;
  const viewMinY = viewMaxY - totalViewH;
  const activePowers = Object.keys(POWER_DURATION).filter((k) => run.power[k] > 0);
  if (run.power.shield) activePowers.unshift('shield');
  const shownBest = Math.max(bestScore || 0, run.score || 0);
  const maxStageSpeed = run.stage.endless ? 410 : run.stage.speedEnd || run.stage.speed || 260;
  const panting = currentSpeed(run) > maxStageSpeed * 0.75;
  const happy = nearMissFresh || (run.treatStreak || 0) >= 3;
  const dashAlertItem = things.find((e) => (e.type === 'catDash' || e.type === 'dogDash') && e.x - run.dist > 110 && e.x - run.dist <= VISIBLE_DEPTH);
  const ringR = 22;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - Math.max(0, Math.min(1, continueTimer / CONTINUE_RING_SECONDS)));
  const petCol = getColour(wardrobe?.colour);
  const pct = Math.round(progress * 100);
  const animPhase = run.dist / 10;

  // Project visible obstacles, treats and power-ups into behind-the-back 3D perspective sorted back-to-front
  const projected = things
    .map((e) => ({ ...e, dx: e.x - run.dist }))
    .filter((e) => e.dx >= -45 && e.dx <= VISIBLE_DEPTH)
    .sort((a, b) => b.dx - a.dx);
  const entitiesAhead = projected.filter((e) => e.dx > 8);
  const entitiesBehind = projected.filter((e) => e.dx <= 8);

  const playerLanePos = run.player.lanePos ?? 0;
  const playerProj = projectBehind(0, playerLanePos, run.player.height);
  // Leans into a lane change: peaks early, upright again on arrival.
  const playerBank = reduceMotion ? 0 : laneLean(run.player);
  const feel = reduceMotion ? null : { jumpT: run.player.justJumpedT, landT: run.player.justLandedT, fastFall: run.player.fastFall };
  const maxSpeedNow = (isScoreMode ? run.stage.maxSpeed || 410 : (run.stage.speed || 260) + (run.stage.ramp || 0)) * (run.speedScale || 1);
  const fast = !reduceMotion && countdown === null && (run.power.speed > 0 || currentSpeed(run) > maxSpeedNow * 0.85);
  const showGo = !reduceMotion && countdown === null && Date.now() < goUntilRef.current;
  if (isScoreMode && bestScore > 0 && run.score > bestScore && newBestAtRef.current == null) newBestAtRef.current = run.t;
  const newBestT = newBestAtRef.current == null ? null : run.t - newBestAtRef.current;
  const hintT = countdown === null && started ? run.t : 0;
  const playerScale = playerProj.scale * 1.18;
  const playerShadowRx = Math.max(8, 21 - run.player.height * 0.08);

  // The chaser runs in the pet's lane, behind it and nearer the camera: closer
  // (higher on screen) as the gap shrinks, never on top of the pet.
  const chaserDx = -(0.26 + 0.09 * progress) * VISIBLE_DEPTH;
  const chaserLane = playerLanePos;
  const chaserProj = showChaser ? projectBehind(chaserDx, chaserLane, chaserBounce) : null;

  const renderProjectedThing = (e) => {
    const proj = projectBehind(e.dx, e.trackLane ?? 0, e.y);
    const drawY = proj.y + (e.type === 'bird' && !reduceMotion ? Math.sin(run.t * 8 + e.x * 0.05) * 4 * proj.scale : 0);
    const sScale = proj.scale * (e.kind === 'obstacle' ? 1.08 : 1.15);
    return (
      <G key={e.id}>
        {e.y > 0 ? (
          <Ellipse
            cx={proj.x}
            cy={proj.groundY}
            rx={Math.max(4, e.w * 0.34 * proj.scale)}
            ry={Math.max(1.5, 3 * proj.scale)}
            fill="rgba(36,29,59,0.2)"
          />
        ) : null}
        <G transform={`translate(${proj.x} ${drawY}) scale(${sScale}) translate(${-e.w / 2} ${-e.h})`}>
          <Thing kind={e.kind} type={e.type} w={e.w} h={e.h} lift={e.y} t={run.t} />
        </G>
      </G>
    );
  };

  return (
    <View style={s.wrap}>
      <View
        style={s.stage}
        onLayout={(e) => {
          swipePxRef.current = swipeThreshold(e.nativeEvent.layout.width);
          setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
        }}
      >
        <View
          style={s.touchCanvas}
          {...(!paused && !continuePrompt ? pan.panHandlers : {})}
          accessible={!paused && countdown === null}
          accessibilityLabel={t('game.playAreaA11y')}
        >
          {width > 0 && (
            <Svg width={width} height={height} viewBox={`0 ${viewMinY} ${CAM_W} ${totalViewH}`} preserveAspectRatio="xMidYMax slice">
                <Defs>
                  <ClipPath id="face">
                    <Circle cx={0} cy={0} r={9} />
                  </ClipPath>
                </Defs>
                <G transform={shake ? `translate(${shake} 0)` : undefined}>
                  <Backdrop theme={stage.theme} dist={run.dist} reduceMotion={reduceMotion} />
                  <Midground theme={stage.theme} dist={run.dist} reduceMotion={reduceMotion} />
                  {goalDx != null && goalDx <= VISIBLE_DEPTH && goalDx >= -20 ? (
                    (() => {
                      const gp = projectBehind(goalDx, 0, 0);
                      return (
                        <G transform={`translate(${gp.x} ${gp.groundY}) scale(${gp.scale})`}>
                          <Goal />
                        </G>
                      );
                    })()
                  ) : null}
                  {entitiesAhead.map(renderProjectedThing)}
                  {dashAlertItem ? (
                    <SvgImage
                      href={SPRITES.impactAlert}
                      x={projectBehind(dashAlertItem.x - run.dist, dashAlertItem.trackLane ?? 0, 0).x - 16}
                      y={HORIZON_Y - 26}
                      width={32}
                      height={24}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : null}
                  {run.player.height > 0 ? (
                    <Ellipse cx={playerProj.x} cy={playerProj.groundY} rx={playerShadowRx} ry={3.2} fill="rgba(36,29,59,0.22)" opacity={blink ? 0.5 : 1} />
                  ) : null}
                  <G transform={`translate(${playerProj.x} ${playerProj.y}) scale(${playerScale}) translate(-28 -44)`} opacity={blink ? 0.5 : 1}>
                    {run.power.magnet > 0 ? (
                      <SvgImage
                        href={Math.floor(run.t * 5) % 2 ? SPRITES.fxMagnet2 : SPRITES.fxMagnet1}
                        x={-14}
                        y={-16}
                        width={84}
                        height={84}
                        opacity={0.75}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    ) : null}
                    <PetSprite
                      species={pet.species}
                      colour={wardrobe.colour}
                      equipped={wardrobe.equipped}
                      character={wardrobe.activeCharacter}
                      phase={animPhase}
                      pose={pose}
                      panting={panting}
                      happy={happy}
                      bank={playerBank}
                      rising={run.player.vy > 0}
                      spin={reduceMotion ? null : spinP}
                      feel={feel}
                      view="back"
                    />
                    {run.power.shield ? (
                      <SvgImage href={SPRITES.fxShield} x={-8} y={-14} width={72} height={72} opacity={0.45} preserveAspectRatio="xMidYMid meet" />
                    ) : null}
                    {run.power.double > 0 ? (
                      <SvgImage href={SPRITES.fxDouble} x={18} y={-26 + (reduceMotion ? 0 : Math.sin(run.t * 6) * 2)} width={22} height={16} preserveAspectRatio="xMidYMid meet" />
                    ) : null}
                    {faceUri ? <NameTag name={pet.name} faceUri={faceUri} /> : null}
                  </G>
                  {entitiesBehind.map(renderProjectedThing)}
                  {showChaser && chaserProj ? (
                    <G transform={`translate(${chaserProj.x} ${chaserProj.y}) scale(${chaserProj.scale * 1.08}) translate(-24 -39)`}>
                      <Chaser chaser={stage.chaser} phase={animPhase} view="back" />
                    </G>
                  ) : null}
                  {particlesRef.current.map((p) => {
                    const alpha = Math.max(0, 1 - p.age / p.life);
                    if (p.kind === 'streak') {
                      return <Line key={p.id} x1={p.x} y1={p.y} x2={p.x - p.r} y2={p.y} stroke={p.color} strokeWidth={2.5} strokeLinecap="round" opacity={alpha} />;
                    }
                    return <Circle key={p.id} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={alpha} />;
                  })}
                  {fxRef.current.map((f) => {
                    const u = f.age / FX_LIFE[f.kind];
                    if (f.kind === 'plus') {
                      return (
                        <SvgText key={f.id} x={f.x} y={f.y - u * 14} fontSize={10} fontWeight="bold" fill={C.butter} stroke={C.ink} strokeWidth={0.8} opacity={1 - u} textAnchor="middle">
                          +1
                        </SvgText>
                      );
                    }
                    const frames = FX_ART[f.kind];
                    const href = frames[Math.min(frames.length - 1, Math.floor(u * frames.length))];
                    const sz = f.kind === 'pop' ? 26 + u * 14 : 34;
                    return <SvgImage key={f.id} href={href} x={f.x - sz / 2} y={f.y - sz / 2} width={sz} height={sz} opacity={f.kind === 'pop' ? 1 - u * 0.6 : 1} preserveAspectRatio="xMidYMid meet" />;
                  })}
                  {fast ? (
                    // Speed lines streaming past both edges.
                    <G opacity={run.power.speed > 0 ? 0.55 : 0.3}>
                      <SvgImage href={Math.floor(run.t * 12) % 2 ? SPRITES.fxSpeed2 : SPRITES.fxSpeed1} x={-6} y={viewMinY + totalViewH * 0.22} width={60} height={totalViewH * 0.56} preserveAspectRatio="none" />
                      <G transform={`translate(${CAM_W} 0) scale(-1 1)`}>
                        <SvgImage href={Math.floor(run.t * 12) % 2 ? SPRITES.fxSpeed1 : SPRITES.fxSpeed2} x={-6} y={viewMinY + totalViewH * 0.22} width={60} height={totalViewH * 0.56} preserveAspectRatio="none" />
                      </G>
                    </G>
                  ) : null}
                </G>
              </Svg>
            )}
          </View>

          {/* Overlaid Translucent Pill HUD */}
          <View style={s.hudOverlay} pointerEvents="box-none">
            <View style={s.hudTopRow}>
              <View style={s.avatarPill}>
                <View style={s.avatarRing}>
                  {faceUri ? (
                    <Image source={{ uri: faceUri }} style={s.avatarImg} />
                  ) : (
                    <ColourHeadTileSvg species={pet.species} colourObj={petCol} size={26} />
                  )}
                </View>
                <View>
                  <Text style={s.hudMiniLabel} numberOfLines={1}>
                    {t(stage.nameKey)}
                  </Text>
                  <Text
                    style={s.hudBigNum}
                    numberOfLines={1}
                    onPress={() => {
                      // Hidden: tap the score 5 times to show the fps counter.
                      const now = Date.now();
                      const tp = fpsTapsRef.current;
                      tp.n = now - tp.at < 800 ? tp.n + 1 : 1;
                      tp.at = now;
                      if (tp.n >= 5) {
                        tp.n = 0;
                        setFpsShown((v) => !v);
                      }
                    }}
                  >
                    {isScoreMode ? run.score : `${pct}%`}
                  </Text>
                </View>
              </View>

              {isScoreMode ? (
                <View style={s.scorePill}>
                  <Text style={s.scoreLine} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {t('game.hud.score', { n: run.score })}
                  </Text>
                  <Text style={s.bestLine} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {t('game.hud.best', { n: shownBest })}
                  </Text>
                </View>
              ) : (
                <View style={s.scorePill}>
                  <Text
                    style={s.heartsText}
                    accessibilityLabel={t('game.heartsA11y', { n: run.hearts })}
                    maxFontSizeMultiplier={1.3}
                  >
                    {'❤️'.repeat(run.hearts)}
                    {'🤍'.repeat(Math.max(0, run.stage.hearts - run.hearts))}
                  </Text>
                </View>
              )}

              <View style={s.hudRightCluster}>
                {run.stage.chase ? (
                  <View style={s.gapPill}>
                    <Text style={s.gapLabel}>{t('game.chase.gapLabel')}</Text>
                    <View style={[s.gapPlus, lowGap && { backgroundColor: C.coral }]}>
                      <Text style={s.gapPlusText}>{lowGap ? '!' : '+'}</Text>
                    </View>
                  </View>
                ) : isScoreMode ? (
                  <View style={s.heartsPill}>
                    <Text
                      style={s.heartsText}
                      accessibilityLabel={t('game.heartsA11y', { n: run.hearts })}
                      maxFontSizeMultiplier={1.3}
                    >
                      {'❤️'.repeat(run.hearts)}
                      {'🤍'.repeat(Math.max(0, run.stage.hearts - run.hearts))}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => setPause(true)}
                  style={s.pauseBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('game.pause')}
                  hitSlop={8}
                >
                  <View style={s.pauseHighlight} />
                  <Text style={s.pauseIcon}>⏸</Text>
                </Pressable>
              </View>
            </View>

            {/* Second HUD row: Treats pill + mode progress bar when active */}
            <View style={s.hudSecondRow} pointerEvents="none">
              <View style={s.treatsPill} accessibilityLabel={t('game.treatsA11y', { n: run.treats })}>
                <Image
                  source={pet.species === 'cat' ? SPRITES.iconFish : SPRITES.iconBone}
                  style={s.treatIconImg}
                  resizeMode="contain"
                />
                <Text style={s.treatsText}>{run.treats}</Text>
              </View>

              {showProgressTrack ? (
                <View style={s.progressBarWrap}>
                  <View style={s.progressHeadBadge}>
                    <ColourHeadTileSvg species={pet.species} colourObj={petCol} size={18} />
                  </View>
                  <View
                    style={[s.progressTrack, meterFlash && { borderColor: C.coral }]}
                    accessibilityLabel={
                      run.stage.chase
                        ? t('game.chase.gapA11y', { pct })
                        : t('game.progressA11y', { pct })
                    }
                  >
                    <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: lowGap ? C.coral : C.lime }]} />
                    <Text style={s.flagText}>🏁</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {(run.multiplier > 1 || goalProg) ? (
              <View style={s.goalRow} pointerEvents="none">
                {run.multiplier > 1 ? (
                  <Text style={s.multText} accessibilityLabel={t('game.multiplierA11y', { n: run.multiplier })}>
                    {t('game.multiplier', { n: run.multiplier })}
                  </Text>
                ) : null}
                {goalProg ? (
                  <View style={[s.goalChip, goalProg.done && s.goalChipDone]}>
                    <Text style={s.goalChipText} numberOfLines={1}>
                      {goalProg.done ? '✓ ' : ''}
                      {t(`game.goal.${runGoal.type}`, { n: goalProg.target })} ({goalProg.current}/{goalProg.target})
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Left vertical meter */}
          {showProgressTrack ? (
            <View style={s.vertMeterWrap} pointerEvents="none">
              <View style={s.vertMeterTop}>
                <ColourHeadTileSvg species={pet.species} colourObj={petCol} size={16} />
              </View>
              <View style={s.vertMeterTrack}>
                <View
                  style={[
                    s.vertMeterFill,
                    { height: `${pct}%`, backgroundColor: lowGap ? C.coral : C.lime }
                  ]}
                />
              </View>
            </View>
          ) : null}

          {activePowers.length > 0 && (
            <View style={s.powers} pointerEvents="none">
              {activePowers.map((k) => (
                <Svg key={k} width={26} height={26} viewBox="0 0 28 28">
                  <PowerIcon type={k} />
                </Svg>
              ))}
            </View>
          )}

          {/* Painted Circular Arcade Controls wired to Left / Right / Jump inputs */}
          {showJumpDuckButtons ? (
            <View style={s.controlsOverlay} pointerEvents="box-none">
              <View style={s.ctrlLeftGroup}>
                <Pressable
                  style={[s.spriteCtrlBtn, leftPressed && s.circleBtnPressed]}
                  onPressIn={() => {
                    setLeftPressed(true);
                    input.current.laneLeft = true;
                    input.current.left = true;
                  }}
                  onPressOut={() => {
                    setLeftPressed(false);
                    input.current.left = false;
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Move left"
                >
                  <Image source={SPRITES.btnLeft} style={s.btnSprite} resizeMode="contain" />
                </Pressable>
                <Pressable
                  style={[s.spriteCtrlBtn, rightPressed && s.circleBtnPressed]}
                  onPressIn={() => {
                    setRightPressed(true);
                    input.current.laneRight = true;
                    input.current.right = true;
                  }}
                  onPressOut={() => {
                    setRightPressed(false);
                    input.current.right = false;
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Move right"
                >
                  <Image source={SPRITES.btnLeft} style={[s.btnSprite, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={s.ctrlLeftGroup}>
                <Pressable
                  style={[s.spriteCtrlBtn, duckPressed && s.circleBtnPressed]}
                  onPressIn={() => {
                    setDuckPressed(true);
                    input.current.duck = true;
                  }}
                  onPressOut={() => {
                    setDuckPressed(false);
                    input.current.duck = false;
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('game.duck')}
                >
                  <Image source={SPRITES.btnDown} style={s.btnSprite} resizeMode="contain" />
                </Pressable>
                <Pressable
                  style={[s.spriteCtrlBtn, jumpPressed && s.circleBtnPressed]}
                  onPressIn={() => {
                    setJumpPressed(true);
                    input.current.jump = true;
                  }}
                  onPressOut={() => setJumpPressed(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('game.jump')}
                >
                  <Image source={SPRITES.btnUp} style={s.btnSprite} resizeMode="contain" />
                </Pressable>
              </View>
            </View>
          ) : null}

          {!paused && countdown !== null && !reduceMotion && countdown > 0 && (
            <View style={s.countdownOverlay} pointerEvents="none" accessibilityLabel={String(countdown)}>
              <Image key={countdown} source={COUNTDOWN_ART[countdown] || SPRITES.cd1} style={s.countdownSign} resizeMode="contain" />
            </View>
          )}
          {!paused && showGo ? (
            <View style={s.countdownOverlay} pointerEvents="none">
              <Image source={SPRITES.cdGo} style={s.goSign} resizeMode="contain" />
            </View>
          ) : null}

          {newBestT != null && newBestT < 1.8 ? (
            <View style={s.newBestWrap} pointerEvents="none" accessibilityLabel={t('game.newBestBanner')}>
              <Image
                source={SPRITES.newBest}
                style={[s.newBestImg, !reduceMotion && { transform: [{ scale: Math.min(1, 0.6 + newBestT * 3) }] }, { opacity: newBestT > 1.4 ? Math.max(0, (1.8 - newBestT) / 0.4) : 1 }]}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {showSwipeHint && hintT < SWIPE_HINT_S && !paused ? (
            <View style={s.swipeHintWrap} pointerEvents="none">
              <Text style={[s.swipeHint, { opacity: hintT > SWIPE_HINT_S - 1 ? SWIPE_HINT_S - hintT : 1 }]}>{t('game.swipeHint')}</Text>
            </View>
          ) : null}

          {__DEV__ || fpsShown ? (
            <View style={s.fpsBox} pointerEvents="none">
              <Text style={s.fpsText}>
                {Math.round(fpsStatRef.current.avg)} fps · min {Math.round(fpsStatRef.current.min)}
              </Text>
            </View>
          ) : null}

          {continuePrompt && (
            <View style={s.overlay}>
              <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Svg width={58} height={58} viewBox="0 0 58 58">
                  <Circle cx={29} cy={29} r={ringR} stroke={C.paper} strokeWidth={5} fill="none" />
                  <Circle
                    cx={29}
                    cy={29}
                    r={ringR}
                    stroke={C.coral}
                    strokeWidth={5}
                    fill="none"
                    strokeDasharray={`${ringCirc} ${ringCirc}`}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 29 29)"
                  />
                  <SvgText x={29} y={35} fontSize={18} fontFamily={F.bold} fill={C.ink} textAnchor="middle">
                    {Math.ceil(continueTimer)}
                  </SvgText>
                </Svg>
              </View>
              <Text style={s.overlayTitle}>
                {stage.chase
                  ? t('game.end.caughtBy', { chaser: t(stage.chaser?.nameKey || 'game.chaser.bath') })
                  : t('game.end.endlessDone')}
              </Text>
              <Text style={s.overlaySub}>
                {stage.chase ? t('game.continueRun.chaseSub') : t('game.continueRun.endlessSub')}
              </Text>
              <View style={s.overlayButtons}>
                {(premium || isRewardedReady('continue')) ? (
                  <StickerButton
                    label={premium ? t('game.continueRun.freeBtn') : t('game.continueRun.adBtn')}
                    emoji={premium ? '👑' : '🎬'}
                    color={C.butter}
                    disabled={continueBusy}
                    onPress={handleContinue}
                  />
                ) : null}
                {onPayContinueTreats && treatBalance >= continueTreatCost ? (
                  <StickerButton
                    label={t('game.continueRun.treatBtn', { n: continueTreatCost })}
                    emoji={pet.species === 'cat' ? '🐟' : '🦴'}
                    color={C.mint}
                    disabled={continueBusy}
                    onPress={handleContinueTreats}
                  />
                ) : null}
                <StickerButton
                  label={t('game.continueRun.endBtn')}
                  color={C.paper}
                  disabled={continueBusy}
                  onPress={() => handleDeclineContinue('declined')}
                />
              </View>
            </View>
          )}

          {paused && !continuePrompt && (
            <View style={s.overlay}>
              <Text style={s.overlayTitle}>{started ? t('game.paused') : t(stage.nameKey)}</Text>
              {!started && (
                <Text style={s.overlaySub}>
                  {t('game.howTo')}{' '}
                  {stage.chase
                    ? t('game.chase.howTo', { chaser: t(stage.chaser?.nameKey || 'game.chaser.bath') })
                    : stage.endless
                    ? t('game.endless.howTo')
                    : t('game.howToHearts')}
                </Text>
              )}
              <View style={s.overlayButtons}>
                <StickerButton label={started ? t('game.resume') : t('game.go')} emoji="▶️" onPress={begin} />
                <StickerButton label={t('game.quit')} color={C.paper} onPress={() => onQuit?.(resultOf(runRef.current))} />
              </View>
            </View>
          )}
      </View>
    </View>
  );
}

// The pet's name above its head when a face photo is active.
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
  wrap: {
    flex: 1,
    backgroundColor: '#9AD9F2'
  },
  stage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#9AD9F2',
    overflow: 'hidden'
  },
  touchCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  },
  hudOverlay: {
    position: 'absolute',
    top: 10,
    left: SP.hudPadX,
    right: SP.hudPadX,
    zIndex: 6,
    gap: SP.hudGap
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5
  },
  avatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.hudPill,
    borderRadius: R.pill,
    paddingLeft: 3,
    paddingRight: 10,
    paddingVertical: 3
  },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.butter,
    backgroundColor: '#FDE8D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImg: { width: 28, height: 28, borderRadius: 14 },
  hudMiniLabel: { fontFamily: F.semibold, fontSize: 10, color: '#E2EFF8', maxWidth: 74 },
  hudBigNum: { fontFamily: F.bold, fontSize: 13, color: C.paper, fontVariant: ['tabular-nums'] },
  scorePill: {
    backgroundColor: C.hudPill,
    borderRadius: R.hudPill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreLine: { fontFamily: F.bold, fontSize: 12, color: C.paper, fontVariant: ['tabular-nums'] },
  bestLine: { fontFamily: F.medium, fontSize: 11, color: '#D7EBF7', fontVariant: ['tabular-nums'] },
  heartsPill: {
    backgroundColor: C.hudPill,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  heartsText: { fontSize: 13, letterSpacing: -1 },
  hudRightCluster: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.hudPill,
    borderRadius: R.pill,
    paddingLeft: 8,
    paddingRight: 3,
    paddingVertical: 3
  },
  gapLabel: { fontFamily: F.bold, fontSize: 11, color: C.paper },
  gapPlus: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.lime,
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gapPlusText: { fontFamily: F.bold, fontSize: 12, color: C.paper, lineHeight: 14 },
  pauseBtn: {
    width: 34,
    height: 34,
    borderRadius: R.pauseBtn,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.arcadeBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  pauseHighlight: {
    position: 'absolute',
    top: 2,
    left: 5,
    right: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)'
  },
  pauseIcon: { fontSize: 14, color: C.paper },
  hudSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  treatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.hudPill,
    borderRadius: R.pill,
    paddingHorizontal: 9,
    paddingVertical: 2
  },
  treatIconImg: { width: 16, height: 14 },
  treatsText: { fontFamily: F.bold, fontSize: 12, color: C.paper, fontVariant: ['tabular-nums'] },
  progressBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressHeadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF8ED',
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
    zIndex: 2
  },
  progressTrack: {
    flex: 1,
    height: 13,
    borderRadius: R.progress,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.hudTrack,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressFill: { height: '100%', backgroundColor: C.lime },
  flagText: { position: 'absolute', right: 3, fontSize: 10 },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  multText: { fontFamily: F.bold, fontSize: 15, color: C.amber },
  goalChip: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: R.pill,
    backgroundColor: C.hudPill
  },
  goalChipDone: { backgroundColor: C.limeDark },
  goalChipText: { fontFamily: F.semibold, fontSize: 11, color: C.paper },
  vertMeterWrap: {
    position: 'absolute',
    left: 10,
    top: 96,
    alignItems: 'center',
    gap: 2,
    zIndex: 4
  },
  vertMeterTop: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.hudTrack,
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  vertMeterTrack: {
    width: 9,
    height: 68,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.hudTrack,
    overflow: 'hidden',
    justifyContent: 'flex-end'
  },
  vertMeterFill: { width: '100%', backgroundColor: C.lime },
  powers: { position: 'absolute', top: 96, right: 10, flexDirection: 'row', gap: 4, zIndex: 4 },
  controlsOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 6
  },
  ctrlLeftGroup: { flexDirection: 'row', gap: SP.ctrlGap },
  spriteCtrlBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  btnSprite: { width: 52, height: 52 },
  circleBtnPressed: { transform: [{ scale: 0.94 }] },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9, elevation: 9, alignItems: 'center', justifyContent: 'center' },
  countdownSign: { width: 96, height: 146 },
  goSign: { width: 190, height: 113 },
  newBestWrap: { position: 'absolute', top: 118, left: 0, right: 0, alignItems: 'center', zIndex: 8 },
  newBestImg: { width: 220, height: 90 },
  swipeHintWrap: { position: 'absolute', bottom: 28, left: 16, right: 16, alignItems: 'center', zIndex: 6 },
  swipeHint: { fontFamily: F.bold, fontSize: 15, color: C.paper, backgroundColor: 'rgba(36,29,59,0.62)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, overflow: 'hidden', textAlign: 'center' },
  fpsBox: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, zIndex: 20 },
  fpsText: { color: '#9CFF9C', fontSize: 11, fontFamily: F.bold },
  countdownBubble: { width: 84, height: 84, borderRadius: 42, borderWidth: INK_WIDTH, borderColor: C.ink, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontFamily: F.bold, fontSize: 44, color: C.ink },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: 'rgba(242,239,252,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayTitle: { fontFamily: F.bold, fontSize: 26, color: C.ink, textAlign: 'center' },
  overlaySub: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  overlayButtons: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }
});
