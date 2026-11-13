import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState, PanResponder, useWindowDimensions, BackHandler } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Image as SvgImage, ClipPath, Defs, Circle } from 'react-native-svg';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { VIEW_W, VIEW_H, GROUND, PLAYER_X, HIT_INVULN_S, POWER_DURATION, CHASE_GAP_MAX, newRun, step, visible, resultOf, canContinueRun, continueRun } from '../../game/engine';
import { runGoalProgress } from '../../game/runFeel';
import { startGameAudio, gameEvent } from '../../game/sfx';
import { count } from '../../game/counters';
import { isRewardedReady, showRewardedAd } from '../../game/ads';
import PetSprite from './PetSprite';
import Thing, { PowerIcon, Chaser } from './Things';
import { Backdrop, Midground, Goal } from './Scenery';
import { StickerButton } from '../ui';

const SWIPE_PX = 22;
const COUNTDOWN_STEP_MS = 500;
const REDUCE_MOTION_START_MS = 400;

// One stage, daily, endless or chase run: the game loop, the drawing and the controls.
// Tap (or the Jump button) to jump (and double-jump in the air); swipe down (or hold Duck) to duck.
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
  const [paused, setPaused] = useState(Boolean(showHowTo));
  const [started, setStarted] = useState(!showHowTo);
  const [countdown, setCountdown] = useState(() => (showHowTo ? null : reduceMotion ? 0 : instantStart ? 1 : 3));
  const [continuePrompt, setContinuePrompt] = useState(false);
  const [continueBusy, setContinueBusy] = useState(false);
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { height: winHeight } = useWindowDimensions();
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const fpsRef = useRef(onFps);
  fpsRef.current = onFps;
  const premiumRef = useRef(premium);
  premiumRef.current = premium;

  const setPause = (p) => {
    pausedRef.current = p;
    setPaused(p);
  };

  // Android back during a run pauses it (the pause screen has Resume and
  // Quit), so a stray swipe never ends a run or closes the app.
  const continueRef = useRef(false);
  continueRef.current = continuePrompt;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pausedRef.current && !continueRef.current) setPause(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  // Pause whenever the app leaves the screen (call, home button, lock).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') setPause(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    startGameAudio(soundOn, vibrationOn);
  }, [soundOn, vibrationOn]);

  // Short 3-2-1 countdown (~1.5 s total) when skipping the "Go!" instructions
  // overlay. When reduce-motion is on, skip the countdown animation and start
  // after a short pause.
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
          if (canContinueRun(next) && (premiumRef.current || isRewardedReady('continue'))) {
            pausedRef.current = true;
            count('continuesOffered');
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
    // Forget presses made while the overlay was up, so the pet doesn't jump on start.
    input.current = { jump: false, duck: false, swipeDuck: false };
    setStarted(true);
    if (countdown !== null) {
      setPaused(false);
      pausedRef.current = true;
    } else {
      setPause(false);
    }
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
        count('continuesTaken');
        runRef.current = continueRun(runRef.current);
        input.current = { jump: false, duck: false, swipeDuck: false };
        setContinuePrompt(false);
        setPaused(false);
        pausedRef.current = true;
        setCountdown(reduceMotion ? 0 : 3);
        setTick((n) => (n + 1) % 1000000);
      } else {
        setContinuePrompt(false);
        finishRef.current(resultOf(runRef.current));
      }
    } finally {
      setContinueBusy(false);
    }
  };

  const handleDeclineContinue = () => {
    setContinuePrompt(false);
    finishRef.current(resultOf(runRef.current));
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
  const nearMissFresh = (run.nearMissTimer || 0) > 0;
  const shake = !reduceMotion && (hurtFresh || nearMissFresh) ? Math.sin(run.t * 90) * (hurtFresh ? 3 : 2) : 0;
  const goalProg = runGoal ? runGoalProgress(runGoal, run) : null;
  const blink = run.invuln > 0 && (reduceMotion ? true : Math.floor(run.t * 12) % 2 === 0);
  const pose = run.player.height > 0 ? 'jump' : run.player.ducking ? 'duck' : hurtFresh ? 'hurt' : 'run';
  const petTop = GROUND - run.player.height - 44;
  const isScoreMode = Boolean(run.stage.endless || run.stage.chase);
  const goalX = run.stage.daily || isScoreMode ? null : run.length - run.dist + PLAYER_X + 40;
  const progress = run.stage.chase
    ? Math.max(0, Math.min(1, (run.chaseGap ?? CHASE_GAP_MAX) / CHASE_GAP_MAX))
    : run.stage.daily
    ? Math.min(1, run.t / run.stage.seconds)
    : Math.min(1, run.dist / run.length);
  const chaserX = run.stage.chase ? Math.round(2 + (1 - progress) * (PLAYER_X - 24)) : 0;
  const lowGap = Boolean(run.stage.chase && progress < 0.3);
  const meterFlash = lowGap && !reduceMotion && Math.floor(run.t * 8) % 2 === 1;
  const chaserBounce = lowGap && !reduceMotion ? Math.abs(Math.sin(run.t * 14)) * 5 : 0;
  // The world is VIEW_W wide; a taller screen just shows more sky above it.
  const { width, height } = size;
  const viewH = width ? Math.max(VIEW_H, (VIEW_W * height) / width) : VIEW_H;
  const activePowers = Object.keys(POWER_DURATION).filter((k) => run.power[k] > 0);
  if (run.power.shield) activePowers.unshift('shield');
  const shownBest = Math.max(bestScore || 0, run.score || 0);
  const stageTargetH = Math.max(260, Math.round(winHeight * 0.6));

  return (
    <View style={s.wrap}>
      <View style={s.hud}>
        <Pressable onPress={() => setPause(true)} style={s.hudBtn} accessibilityRole="button" accessibilityLabel={t('game.pause')} hitSlop={8}>
          <Text style={s.hudBtnText}>⏸</Text>
        </Pressable>
        {run.stage.chase ? (
          <View style={s.chaseMeterWrap}>
            <Text style={s.chaserEmoji}>{stage.chaser?.emoji || '🛁'}</Text>
            <Text style={s.gapLabel}>{t('game.chase.gapLabel')}</Text>
            <View
              style={[s.progressTrack, meterFlash && { borderColor: C.tomato, backgroundColor: '#FFD6D6' }]}
              accessibilityLabel={t('game.chase.gapA11y', { pct: Math.round(progress * 100) })}
            >
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: lowGap ? C.tomato : C.mint,
                    opacity: meterFlash ? 0.45 : 1
                  }
                ]}
              />
            </View>
          </View>
        ) : !run.stage.endless ? (
          <View style={s.progressTrack} accessibilityLabel={t('game.progressA11y', { pct: Math.round(progress * 100) })}>
            <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        ) : null}
        {isScoreMode && (
          <View style={[s.scoreBox, run.stage.chase && s.scoreBoxStacked]}>
            <Text style={s.scoreLive} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {t('game.hud.score', { n: run.score })}
            </Text>
            <Text style={s.scoreBest} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {t('game.hud.best', { n: shownBest })}
            </Text>
          </View>
        )}
        {!run.stage.chase && (
          <Text style={s.hearts} accessibilityLabel={t('game.heartsA11y', { n: run.hearts })} maxFontSizeMultiplier={1.3}>
            {'❤️'.repeat(run.hearts)}
            {'🤍'.repeat(Math.max(0, run.stage.hearts - run.hearts))}
          </Text>
        )}
        <Text style={s.treats} accessibilityLabel={t('game.treatsA11y', { n: run.treats })}>
          {pet.species === 'cat' ? '🐟' : '🦴'} {run.treats}
        </Text>
      </View>

      <View
        style={[s.stage, { minHeight: stageTargetH }]}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
        accessible={!paused && countdown === null}
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
              {run.stage.chase && (
                <G transform={`translate(${chaserX} ${GROUND - 38 - chaserBounce})`}>
                  <Chaser chaser={stage.chaser} />
                </G>
              )}
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
        {run.multiplier > 1 && (
          <View style={s.multFloat} accessibilityLabel={t('game.multiplierA11y', { n: run.multiplier })} pointerEvents="none">
            <Text style={s.multText} numberOfLines={1}>{t('game.multiplier', { n: run.multiplier })}</Text>
          </View>
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
        {goalProg && (
          <View style={[s.goalChip, goalProg.done && s.goalChipDone]} pointerEvents="none">
            <Text style={s.goalChipText} numberOfLines={1}>
              {goalProg.done ? '✓ ' : '🎯 '}
              {t(`game.goal.${runGoal.type}`, { n: goalProg.target })} ({goalProg.current}/{goalProg.target})
            </Text>
          </View>
        )}
        {!paused && countdown !== null && !reduceMotion && countdown > 0 && (
          <View style={s.countdownOverlay} pointerEvents="none">
            <View style={s.countdownBubble}>
              <Text style={s.countdownText}>{countdown}</Text>
            </View>
          </View>
        )}
        {continuePrompt && (
          <View style={s.overlay}>
            <Text style={s.overlayTitle}>
              {stage.chase
                ? t('game.end.caughtBy', { chaser: t(stage.chaser?.nameKey || 'game.chaser.bath') })
                : t('game.end.endlessDone')}
            </Text>
            <Text style={s.overlaySub}>
              {stage.chase ? t('game.continueRun.chaseSub') : t('game.continueRun.endlessSub')}
            </Text>
            <View style={s.overlayButtons}>
              <StickerButton
                label={premium ? t('game.continueRun.freeBtn') : t('game.continueRun.adBtn')}
                emoji={premium ? '👑' : '🎬'}
                color={C.butter}
                disabled={continueBusy}
                onPress={handleContinue}
              />
              <StickerButton
                label={t('game.continueRun.endBtn')}
                color={C.paper}
                disabled={continueBusy}
                onPress={handleDeclineContinue}
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
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  hudBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  hudBtnText: { fontSize: 18 },
  hearts: { fontSize: 17, letterSpacing: -1 },
  chaseMeterWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chaserEmoji: { fontSize: 18 },
  gapLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  progressTrack: { flex: 1, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.mint },
  scoreBox: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  // Chase: the gap meter takes the spare width, so score and best sit on two fixed lines.
  scoreBoxStacked: { flex: 0, flexDirection: 'column', alignItems: 'flex-end', gap: 0, minWidth: 92 },
  scoreLive: { fontFamily: F.bold, fontSize: 17, color: C.ink, fontVariant: ['tabular-nums'] },
  scoreBest: { fontFamily: F.medium, fontSize: 13, color: C.inkSoft, fontVariant: ['tabular-nums'] },
  multFloat: { position: 'absolute', top: 6, right: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 2, borderColor: C.ink, backgroundColor: C.butter },
  multText: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  treats: { fontFamily: F.bold, fontSize: 20, color: C.ink, minWidth: 50, textAlign: 'right' },
  // About 60% of the screen height goes to the game view so jumps have room on screen.
  stage: { flex: 1, minHeight: 260, borderTopWidth: INK_WIDTH, borderBottomWidth: INK_WIDTH, borderColor: C.ink, backgroundColor: C.paper },
  powers: { position: 'absolute', top: 6, left: 8, flexDirection: 'row', gap: 4 },
  goalChip: { position: 'absolute', top: 38, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 2, borderColor: C.ink, backgroundColor: 'rgba(255,255,255,0.9)' },
  goalChipDone: { backgroundColor: C.mint },
  goalChipText: { fontFamily: F.semibold, fontSize: 12, color: C.ink },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9, elevation: 9, alignItems: 'center', justifyContent: 'center' },
  countdownBubble: { width: 84, height: 84, borderRadius: 42, borderWidth: INK_WIDTH, borderColor: C.ink, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontFamily: F.bold, fontSize: 44, color: C.ink },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: 'rgba(238,231,255,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayTitle: { fontFamily: F.bold, fontSize: 26, color: C.ink, textAlign: 'center' },
  overlaySub: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  overlayButtons: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  controls: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, height: 92 },
  ctrl: { flex: 1, height: '100%', borderRadius: 22, borderWidth: INK_WIDTH, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  ctrlText: { fontFamily: F.bold, fontSize: 19, color: C.ink, textAlign: 'center' }
});
