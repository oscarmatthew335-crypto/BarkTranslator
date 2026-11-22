import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, AppState, PanResponder, useWindowDimensions, BackHandler } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Image as SvgImage, ClipPath, Defs, Circle, Line, Path } from 'react-native-svg';
import { C, F, INK_WIDTH, R, SP } from '../../theme';
import { useI18n } from '../../i18n';
import { VIEW_W, GROUND, PLAYER_X, HIT_INVULN_S, POWER_DURATION, CHASE_GAP_MAX, currentSpeed, newRun, step, visible, resultOf, canContinueRun, continueRun } from '../../game/engine';
import { getColour } from '../../game/wardrobe';
import { runGoalProgress } from '../../game/runFeel';
import { startGameAudio, gameEvent } from '../../game/sfx';
import { count } from '../../game/counters';
import { isRewardedReady, showRewardedAd } from '../../game/ads';
import PetSprite from './PetSprite';
import Thing, { PowerIcon, Chaser } from './Things';
import { Backdrop, Midground, Goal } from './Scenery';
import { ColourHeadTileSvg } from './WardrobeIcons';
import { SPRITES } from './sprites';
import { StickerButton } from '../ui';

const SWIPE_PX = 22;
const COUNTDOWN_STEP_MS = 500;
const REDUCE_MOTION_START_MS = 400;
const CONTINUE_RING_SECONDS = 5;
const MAX_PARTICLES = 12;
const CAM_SHIFT_X = 24; // shifts PLAYER_X (64) to x = 88 so chaser has room on left

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
  onFps
}) {
  const { t } = useI18n();
  const runRef = useRef(null);
  if (!runRef.current) runRef.current = newRun(stage, { seed, startPowerUps, reduceMotion });
  const input = useRef({ jump: false, duck: false, swipeDuck: false });
  const pausedRef = useRef(true);
  const particlesRef = useRef([]);
  const [paused, setPaused] = useState(Boolean(showHowTo));
  const [started, setStarted] = useState(!showHowTo);
  const [countdown, setCountdown] = useState(() => (showHowTo ? null : reduceMotion ? 0 : instantStart ? 1 : 3));
  const [continuePrompt, setContinuePrompt] = useState(false);
  const [continueBusy, setContinueBusy] = useState(false);
  const [continueTimer, setContinueTimer] = useState(CONTINUE_RING_SECONDS);
  const [duckPressed, setDuckPressed] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { height: winHeight } = useWindowDimensions();
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const fpsRef = useRef(onFps);
  fpsRef.current = onFps;
  const premiumRef = useRef(premium);
  premiumRef.current = premium;
  const trackRef = useRef(onTrack);
  trackRef.current = onTrack;

  const setPause = (p) => {
    pausedRef.current = p;
    setPaused(p);
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
    if (countdown === null || paused) return;
    if (reduceMotion) {
      const tm = setTimeout(() => {
        input.current = { jump: false, duck: false, swipeDuck: false };
        setCountdown(null);
        setStarted(true);
        pausedRef.current = false;
      }, REDUCE_MOTION_START_MS);
      return () => clearTimeout(tm);
    }
    if (countdown <= 0) {
      input.current = { jump: false, duck: false, swipeDuck: false };
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
        next.events.forEach(gameEvent);
        if (!reduceMotion) {
          let pool = particlesRef.current
            .map((p) => ({ ...p, age: p.age + dt, x: p.x + p.vx * dt, y: p.y + p.vy * dt }))
            .filter((p) => p.age < p.life);
          const py = GROUND - next.player.height - 4;
          for (const ev of next.events) {
            if (ev === 'jump' || ev === 'doubleJump') pool = spawnParticles(pool, ev, PLAYER_X + CAM_SHIFT_X + 18, py);
            else if (ev === 'land' || ev === 'splash') pool = spawnParticles(pool, ev, PLAYER_X + CAM_SHIFT_X + 20, GROUND - 3);
            else if (ev === 'collect') pool = spawnParticles(pool, ev, PLAYER_X + CAM_SHIFT_X + 34, py - 20);
            else if (ev === 'nearMiss') pool = spawnParticles(pool, ev, PLAYER_X + CAM_SHIFT_X + 10, py - 18);
            else if (ev === 'smash') pool = spawnParticles(pool, ev, PLAYER_X + CAM_SHIFT_X + 40, py - 16);
          }
          particlesRef.current = pool;
        } else if (particlesRef.current.length) {
          particlesRef.current = [];
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
    input.current = { jump: false, duck: false, swipeDuck: false };
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
    input.current = { jump: false, duck: false, swipeDuck: false };
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
  const nearMissFresh = (run.nearMissTimer || 0) > 0;
  const shake = !reduceMotion && (hurtFresh || nearMissFresh) ? Math.sin(run.t * 90) * (hurtFresh ? 3 : 2) : 0;
  const goalProg = runGoal ? runGoalProgress(runGoal, run) : null;
  const blink = run.invuln > 0 && (reduceMotion ? true : Math.floor(run.t * 12) % 2 === 0);
  const pose = run.player.height > 0 ? 'jump' : run.player.ducking ? 'duck' : hurtFresh ? 'hurt' : 'run';
  const isScoreMode = Boolean(run.stage.endless || run.stage.chase);
  const goalX = run.stage.daily || isScoreMode ? null : run.length - run.dist + PLAYER_X + 40;
  const progress = run.stage.chase
    ? Math.max(0, Math.min(1, (run.chaseGap ?? CHASE_GAP_MAX) / CHASE_GAP_MAX))
    : run.stage.daily
    ? Math.min(1, run.t / run.stage.seconds)
    : Math.min(1, run.dist / run.length);
  const playerX = PLAYER_X + CAM_SHIFT_X; // 88 inside zoomed 276-wide view
  const chaserX = run.stage.chase ? Math.round(4 + (1 - progress) * (playerX - 42)) : 12;
  const showChaserDog = Boolean(run.stage.chase || pet.species === 'cat');
  const chaserObj = run.stage.chase ? stage.chaser : { id: 'dog' };
  const lowGap = Boolean(run.stage.chase && progress < 0.3);
  const meterFlash = lowGap && !reduceMotion && Math.floor(run.t * 8) % 2 === 1;
  const chaserBounce = lowGap && !reduceMotion ? Math.abs(Math.sin(run.t * 14)) * 4 : 0;
  const { width, height } = size;
  const cardMaxH = Math.min(480, Math.max(360, Math.round(winHeight * 0.7)));
  const activePowers = Object.keys(POWER_DURATION).filter((k) => run.power[k] > 0);
  if (run.power.shield) activePowers.unshift('shield');
  const shownBest = Math.max(bestScore || 0, run.score || 0);
  const maxStageSpeed = run.stage.endless ? 380 : run.stage.speedEnd || run.stage.speed || 260;
  const panting = currentSpeed(run) > maxStageSpeed * 0.75;
  const happy = nearMissFresh || (run.treatStreak || 0) >= 3;
  const dashWarning = things.some((e) => (e.type === 'catDash' || e.type === 'dogDash') && e.sx > VIEW_W - 60);
  const ringR = 22;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - Math.max(0, Math.min(1, continueTimer / CONTINUE_RING_SECONDS)));
  const petCol = getColour(wardrobe?.colour);
  const pct = Math.round(progress * 100);
  const animPhase = run.dist / 10;

  return (
    <View style={s.wrap}>
      <View style={[s.cardOuter, { maxHeight: cardMaxH }]}>
        <View style={s.cardShadow} />
        <View
          style={s.stage}
          onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...pan.panHandlers}
          accessible={!paused && countdown === null}
          accessibilityLabel={t('game.playAreaA11y')}
        >
          {width > 0 && (
            <Svg width={width} height={height} viewBox="0 -22 276 284" preserveAspectRatio="xMidYMid slice">
              <Defs>
                <ClipPath id="face">
                  <Circle cx={0} cy={0} r={9} />
                </ClipPath>
              </Defs>
              <G transform={shake ? `translate(${shake} 0)` : undefined}>
                <Backdrop theme={stage.theme} dist={run.dist} reduceMotion={reduceMotion} />
                <Midground theme={stage.theme} dist={run.dist} reduceMotion={reduceMotion} />
                {goalX != null && goalX < VIEW_W + 60 ? (
                  <G transform={`translate(${goalX + CAM_SHIFT_X} ${GROUND})`}>
                    <Goal />
                  </G>
                ) : null}
                {things.map((e) => {
                  const sy = e.type === 'bird' && !reduceMotion ? e.sy + Math.sin(run.t * 8 + e.x * 0.05) * 4 : e.sy;
                  return (
                    <G key={e.id} transform={`translate(${e.sx + CAM_SHIFT_X} ${sy})`}>
                      <Thing kind={e.kind} type={e.type} w={e.w} h={e.h} />
                    </G>
                  );
                })}
                {dashWarning ? (
                  <SvgImage
                    href={SPRITES.impactAlert}
                    x={236}
                    y={GROUND - 42}
                    width={34}
                    height={26}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : null}
                {showChaserDog ? (
                  <G transform={`translate(${chaserX} ${GROUND - chaserBounce}) scale(1.12) translate(0 -39)`}>
                    <Chaser chaser={chaserObj} phase={animPhase} />
                  </G>
                ) : null}
                <G transform={`translate(${playerX - 6} ${GROUND - run.player.height}) scale(1.18) translate(0 -44)`} opacity={blink ? 0.5 : 1}>
                  {run.power.shield ? <Circle cx={28} cy={24} r={30} fill="rgba(92,200,255,0.25)" stroke={C.sky} strokeWidth={2} /> : null}
                  <PetSprite
                    species={pet.species}
                    colour={wardrobe.colour}
                    equipped={wardrobe.equipped}
                    character={wardrobe.activeCharacter}
                    phase={animPhase}
                    pose={pose}
                    panting={panting}
                    happy={happy}
                  />
                  {faceUri ? <NameTag name={pet.name} faceUri={faceUri} /> : null}
                </G>
                {particlesRef.current.map((p) => {
                  const alpha = Math.max(0, 1 - p.age / p.life);
                  if (p.kind === 'streak') {
                    return <Line key={p.id} x1={p.x} y1={p.y} x2={p.x - p.r} y2={p.y} stroke={p.color} strokeWidth={2.5} strokeLinecap="round" opacity={alpha} />;
                  }
                  return <Circle key={p.id} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={alpha} />;
                })}
              </G>
            </Svg>
          )}

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
                  <Text style={s.hudBigNum} numberOfLines={1}>
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

            {/* Second HUD row: Treats pill + Dark Navy Progress Bar with pet badge & flag */}
            <View style={s.hudSecondRow} pointerEvents="none">
              <View style={s.treatsPill} accessibilityLabel={t('game.treatsA11y', { n: run.treats })}>
                <Image
                  source={pet.species === 'cat' ? SPRITES.iconFish : SPRITES.iconBone}
                  style={s.treatIconImg}
                  resizeMode="contain"
                />
                <Text style={s.treatsText}>{run.treats}</Text>
              </View>

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

          {activePowers.length > 0 && (
            <View style={s.powers} pointerEvents="none">
              {activePowers.map((k) => (
                <Svg key={k} width={26} height={26} viewBox="0 0 28 28">
                  <PowerIcon type={k} />
                </Svg>
              ))}
            </View>
          )}

          {/* Painted Circular Arcade Controls sitting exclusively inside the dark soil cutaway */}
          {showJumpDuckButtons ? (
            <View style={s.controlsOverlay} pointerEvents="box-none">
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
                  <Image source={SPRITES.btnLeft} style={s.btnSprite} resizeMode="contain" />
                </Pressable>
                <Pressable
                  style={[s.spriteCtrlBtn, { opacity: jumpPressed ? 1 : 0.68 }, jumpPressed && s.circleBtnPressed]}
                  onPressIn={() => {
                    setJumpPressed(true);
                    input.current.jump = true;
                  }}
                  onPressOut={() => setJumpPressed(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('game.jump')}
                >
                  <Image source={SPRITES.btnLeft} style={[s.btnSprite, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
                </Pressable>
              </View>

              <Pressable
                style={[s.spriteCtrlBtn, { opacity: jumpPressed ? 1 : 0.72 }, jumpPressed && s.circleBtnPressed]}
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
          ) : null}

          {!paused && countdown !== null && !reduceMotion && countdown > 0 && (
            <View style={s.countdownOverlay} pointerEvents="none">
              <View style={s.countdownBubble}>
                <Text style={s.countdownText}>{countdown}</Text>
              </View>
            </View>
          )}

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
                <StickerButton label={t('game.quit')} color={C.paper} onPress={onQuit} />
              </View>
            </View>
          )}
        </View>
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
    backgroundColor: C.bg,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardOuter: {
    width: '100%',
    aspectRatio: 0.92,
    paddingRight: 4,
    paddingBottom: 4
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: R.viewport,
    backgroundColor: C.shadow
  },
  stage: {
    flex: 1,
    borderRadius: R.viewport,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.paper,
    overflow: 'hidden'
  },
  hudOverlay: {
    position: 'absolute',
    top: 8,
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
    top: 84,
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
  powers: { position: 'absolute', top: 84, right: 10, flexDirection: 'row', gap: 4, zIndex: 4 },
  controlsOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 6
  },
  ctrlLeftGroup: { flexDirection: 'row', gap: SP.ctrlGap },
  spriteCtrlBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  btnSprite: { width: 50, height: 50 },
  circleBtnPressed: { transform: [{ scale: 0.94 }] },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9, elevation: 9, alignItems: 'center', justifyContent: 'center' },
  countdownBubble: { width: 84, height: 84, borderRadius: 42, borderWidth: INK_WIDTH, borderColor: C.ink, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontFamily: F.bold, fontSize: 44, color: C.ink },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: 'rgba(242,239,252,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayTitle: { fontFamily: F.bold, fontSize: 26, color: C.ink, textAlign: 'center' },
  overlaySub: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  overlayButtons: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }
});
