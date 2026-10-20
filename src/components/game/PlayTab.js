import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Svg from 'react-native-svg';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton, ScreenTitle, useReduceMotion } from '../ui';
import useGame from '../../game/useGame';
import { recordStage, nextStageAfter, totalStars, suggestedStage, isUnlocked } from '../../game/progress';
import { stagesFor } from '../../game/stages';
import { hashString } from '../../game/random';
import { count, recordFps } from '../../game/counters';
import RunnerScreen from './RunnerScreen';
import PetPreview from './PetPreview';
import StageMap from './StageMap';
import StageEnd from './StageEnd';
import { PowerIcon } from './Things';
import TreatRound from './TreatRound';
import { pickQuestions, recordAnswer, petChangesFor, rememberAskedClip, usableAnswer } from '../../game/treatRound';
import { UNSURE } from '../../game/questions';
import { fileExists, keepMoment } from '../../storage/photos';
import { playFile } from '../../audio/sounds';
import PhotoChallenge from './PhotoChallenge';
import Moments from './Moments';
import useMoments from '../../game/useMoments';
import { challengeSituation, saveMoment, reencodeWithoutMetadata, shouldUploadPhoto, uploadMeta, PHOTO_REWARD } from '../../game/photoChallenge';
import { queuePhoto } from '../../contribute/contributions';
import { dayKey, dailySeed, updateStreak, streakShown, saverAvailable, challengeFor, advanceChallenge, CHALLENGE_REWARD } from '../../game/daily';
import { dailyStage } from '../../game/stages';
import { buy, toggleWear, setColour } from '../../game/wardrobe';
import { setGameSound } from '../../game/sfx';
import Wardrobe from './Wardrobe';

const MAX_WAITING_POWER_UPS = 4;

// The Play tab: a little runner starring the active pet. Screens:
// hub (map and extras) -> run -> end card -> next stage / map.
export default function PlayTab({ pet, species, breed, history, onTeach, onUpdatePet, shareClips, settings, onUpdateSettings }) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const { ready, game, options, updateGame, setOptions } = useGame(pet);
  const [screen, setScreen] = useState({ name: 'hub' });
  const moments = useMoments();
  const petMoments = moments.all.filter((m) => m.petId === pet.id);
  const faceUri = petMoments.find((m) => m.id === game?.faceMomentId)?.uri || null;
  const today = dayKey();
  const photosToday = game?.photoDay === today ? game.photosToday || 0 : 0;
  const situation = challengeSituation(today, pet.id, photosToday);
  const showNotice = useCallback(
    (message, action) =>
      Alert.alert(
        '',
        message,
        action ? [{ text: t('pets.cancel'), style: 'cancel' }, { text: action.label, onPress: action.onPress }] : undefined
      ),
    [t]
  );

  // Power-ups waiting from a treat round or photo challenge go into the
  // next stage played.
  const startStage = useCallback(
    (stage, extraPowerUps = []) => {
      count(stage.daily ? 'dailyRuns' : 'stagesPlayed');
      const powerUps = [...(game?.powerUps || []), ...extraPowerUps].slice(-MAX_WAITING_POWER_UPS);
      if (game?.powerUps?.length) updateGame((g) => ({ ...g, powerUps: [] }));
      // The daily run is the same course for everyone with this pet type today.
      const seed = stage.daily ? dailySeed(dayKey(), stage.species) : hashString(`${stage.id}:${Date.now()}`);
      setScreen({ name: 'run', stage, seed, powerUps, key: Date.now() });
    },
    [game, updateGame]
  );

  const finish = useCallback(
    (result) => {
      if (!result.daily && !result.failed) count('stagesFinished');
      if (result.failed) count('stagesLost');
      const day = dayKey();
      const current = game.challenge?.day === day ? game.challenge : challengeFor(day, pet.species, game.progress);
      const { challenge, justDone } = advanceChallenge(current, result);
      updateGame((g) => ({
        ...g,
        progress: result.daily || result.failed ? g.progress : recordStage(g.progress, result),
        bank: g.bank + result.treats + (justDone ? CHALLENGE_REWARD : 0),
        lifetimeTreats: g.lifetimeTreats + result.treats,
        streak: updateStreak(g.streak, day).streak,
        challenge,
        daily: result.daily
          ? { day, best: g.daily.day === day ? Math.max(g.daily.best, result.score) : result.score, plays: (g.daily.day === day ? g.daily.plays : 0) + 1 }
          : g.daily
      }));
      // Questions for the optional treat round, worked out once per end card.
      const roundItems = pickQuestions({
        pet,
        history,
        roundIndex: game?.round.rounds || 0,
        askedClipIds: game?.round.askedClipIds || [],
        hasAudio: (e) => fileExists(e.audioUri)
      });
      if (roundItems.length) count('treatRoundsOffered');
      setScreen((sc) => ({ name: 'end', result, stage: sc.stage, roundItems, challengeDone: justDone }));
    },
    [updateGame, pet, history, game]
  );

  // A treat-round answer. Recordings go through the same path as the
  // journal's "teach" sheet (this pet's learning, plus the shared model only
  // if the owner shares clips). "Not sure" teaches nothing.
  const answerRound = useCallback(
    (item, value) => {
      count('questionsAnswered');
      if (value === UNSURE) count('notSure');
      if (item.kind === 'clip') {
        if (value !== UNSURE) {
          count('clipsLabelled');
          onTeach(item.entry, { contextId: value });
        }
        updateGame((g) => ({ ...g, round: rememberAskedClip(g.round, item.entry.id) }));
        return;
      }
      const answers = recordAnswer(pet.answers || {}, item, value);
      const id = item.question.id;
      const usable = usableAnswer(answers, id);
      onUpdatePet(pet.id, { answers, ...(usable ? petChangesFor(id, usable) : {}) });
    },
    [onTeach, onUpdatePet, pet, updateGame]
  );

  const startRound = useCallback(() => {
    count('treatRoundsStarted');
    count('questionsAsked', screen.roundItems.length);
    updateGame((g) => ({ ...g, round: { ...g.round, rounds: g.round.rounds + 1 } }));
    setScreen((sc) => ({ ...sc, name: 'treat' }));
  }, [screen.roundItems, updateGame]);

  // "Play <next stage>" goes straight into it with the power-ups just earned;
  // "Back to the results" keeps them waiting for whatever is played next.
  const finishRound = useCallback(
    ({ powerUps, go }) => {
      const next = screen.stage && !screen.stage.daily ? nextStageAfter(pet.species, screen.stage.id) : null;
      if (go === 'next' && next) {
        startStage(next, powerUps);
        return;
      }
      if (powerUps.length) updateGame((g) => ({ ...g, powerUps: [...g.powerUps, ...powerUps].slice(-MAX_WAITING_POWER_UPS) }));
      setScreen((sc) => ({ ...sc, name: 'end', roundItems: [] }));
    },
    [updateGame, startStage, screen.stage, pet.species]
  );

  // Save a photo-challenge photo (EXIF stripped first), share it only with
  // both opt-ins, and put a speed boost on the next stage.
  const savePhoto = async ({ asset, labels, share }) => {
    let sharePhotos = settings.sharePhotos === true;
    if (share !== undefined) {
      sharePhotos = share;
      onUpdateSettings({ sharePhotos: share, photoShareAsked: true });
    }
    const canUpload = shouldUploadPhoto({ shareClips, sharePhotos });
    const moment = await saveMoment(
      { asset, pet, situation, labels },
      {
        reencode: reencodeWithoutMetadata,
        keep: keepMoment,
        canUpload,
        upload: (m) => queuePhoto({ photoId: m.id, uri: m.uri, meta: uploadMeta(m, pet) })
      }
    );
    if (!moment) return false;
    moments.add(moment);
    count('photoChallenges');
    if (canUpload) count('photosShared');
    updateGame((g) => ({
      ...g,
      powerUps: [...g.powerUps, PHOTO_REWARD].slice(-MAX_WAITING_POWER_UPS),
      photoDay: today,
      photosToday: (g.photoDay === today ? g.photosToday || 0 : 0) + 1,
      faceMomentId: g.faceMomentId || (labels.isPet === 'no' ? null : moment.id)
    }));
    setScreen({ name: 'hub', notice: t('game.photo.saved', { petName: pet.name }) });
    return true;
  };

  if (!ready || !game || !moments.ready) return <View style={s.container} />;

  if (screen.name === 'photo')
    return (
      <PhotoChallenge
        pet={pet}
        species={species}
        breed={breed}
        situation={situation}
        askShare={shareClips === true && !settings.photoShareAsked}
        onSave={savePhoto}
        onCancel={() => setScreen({ name: 'hub' })}
        onShowNotice={showNotice}
      />
    );

  if (screen.name === 'wardrobe')
    return (
      <Wardrobe
        pet={pet}
        species={species}
        wardrobe={game.wardrobe}
        bank={game.bank}
        onColour={(c) => updateGame((g) => ({ ...g, wardrobe: setColour(g.wardrobe, c) }))}
        onBuy={(id) => updateGame((g) => ({ ...g, ...buy(g.wardrobe, g.bank, id) }))}
        onWear={(id) => updateGame((g) => ({ ...g, wardrobe: toggleWear(g.wardrobe, id) }))}
        onBack={() => setScreen({ name: 'hub' })}
      />
    );

  if (screen.name === 'moments')
    return (
      <Moments
        pet={pet}
        moments={petMoments}
        faceMomentId={game.faceMomentId}
        onSetFace={(id) => updateGame((g) => ({ ...g, faceMomentId: id }))}
        onDelete={(m) => {
          moments.remove(m);
          if (game.faceMomentId === m.id) updateGame((g) => ({ ...g, faceMomentId: null }));
        }}
        onBack={() => setScreen({ name: 'hub' })}
        onChallenge={() => setScreen({ name: 'photo' })}
      />
    );

  if (screen.name === 'run')
    return (
      <RunnerScreen
        key={screen.key}
        stage={screen.stage}
        pet={pet}
        wardrobe={game.wardrobe}
        faceUri={faceUri}
        seed={screen.seed}
        startPowerUps={screen.powerUps}
        reduceMotion={reduceMotion}
        soundOn={options.sound}
        onFinish={finish}
        onQuit={() => setScreen({ name: 'hub' })}
        onFps={recordFps}
      />
    );

  if (screen.name === 'treat')
    return (
      <TreatRound
        pet={pet}
        species={species}
        items={screen.roundItems}
        nextName={screen.stage && !screen.stage.daily && nextStageAfter(pet.species, screen.stage.id) ? t(nextStageAfter(pet.species, screen.stage.id).nameKey) : null}
        onPlayClip={(entry) => playFile(entry.audioUri)}
        onAnswer={answerRound}
        onFinish={finishRound}
      />
    );

  if (screen.name === 'end') {
    // After a daily run the next thing is the stage to continue with (the daily run is a bonus, not a stage).
    const after = screen.stage.daily ? suggestedStage(game.progress, pet.species) : nextStageAfter(pet.species, screen.stage.id);
    const next = after && isUnlocked(game.progress, pet.species, after.id) ? after : null;
    return (
      <StageEnd
        pet={pet}
        species={species}
        wardrobe={game.wardrobe}
        faceUri={faceUri}
        result={screen.result}
        stage={screen.stage}
        next={next}
        challengeDone={screen.challengeDone}
        treatRoundCount={screen.roundItems?.length || 0}
        onTreatRound={startRound}
        onNext={() => startStage(next)}
        onReplay={() => startStage(screen.stage)}
        onMap={() => setScreen({ name: 'hub' })}
      >
        <PhotoCard pet={pet} situation={situation} onPress={() => setScreen({ name: 'photo' })} />
      </StageEnd>
    );
  }

  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';
  const streak = streakShown(game.streak, today);
  const challenge = game.challenge?.day === today ? game.challenge : challengeFor(today, pet.species, game.progress);
  const dailyBest = game.daily.day === today ? game.daily.best : null;
  const continueStage = suggestedStage(game.progress, pet.species);
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('game.title', { petName: pet.name })} subtitle={t('game.subtitle', { petName: pet.name })} />
      <Sticker radius={24} innerStyle={s.hero}>
        <PetPreview species={pet.species} wardrobe={game.wardrobe} size={96} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.heroLine} accessibilityLabel={t('game.treatsA11y', { n: game.bank })}>
            {treatEmoji} {game.bank}
          </Text>
          <Text style={s.heroLine}>⭐ {totalStars(game.progress)}</Text>
          <Text style={s.heroSmall}>
            {streak > 0 ? t('game.streak.days', { n: streak }) : t('game.streak.none')}
            {streak > 0 && saverAvailable(game.streak, today) ? ` · ${t('game.streak.saverNote')}` : ''}
          </Text>
          {game.powerUps.length > 0 && (
            <View style={s.ready}>
              <Text style={s.readyText}>{t('game.readyPowerUps')}</Text>
              {game.powerUps.map((p, i) => (
                <Svg key={`${p}${i}`} width={22} height={22} viewBox="0 0 28 28" accessibilityLabel={t(`game.power.${p}`)}>
                  <PowerIcon type={p} />
                </Svg>
              ))}
            </View>
          )}
        </View>
      </Sticker>

      {screen.notice ? (
        <Sticker radius={18} color={C.mint} style={{ marginTop: 12 }} innerStyle={s.notice}>
          <Text style={s.noticeText}>{screen.notice}</Text>
        </Sticker>
      ) : null}

      <Sticker radius={22} color={C.butter} style={{ marginTop: 14 }} innerStyle={s.photoCard}>
        <Text style={s.photoTitle}>
          🏁 {t('game.continue.title', { n: stagesFor(pet.species).findIndex((x) => x.id === continueStage.id) + 1, stage: t(continueStage.nameKey) })}
        </Text>
        <Text style={s.photoSub}>{t('game.continue.sub')}</Text>
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
          <StickerButton label={t('game.continue.play', { stage: t(continueStage.nameKey) })} emoji="▶️" color={C.paper} onPress={() => startStage(continueStage)} />
        </View>
      </Sticker>

      <Sticker radius={22} color={C.sky} style={{ marginTop: 14 }} innerStyle={s.photoCard}>
        <Text style={s.photoTitle}>🌅 {t('game.daily.title')}</Text>
        <Text style={s.photoSub}>
          {dailyBest != null ? t('game.daily.best', { n: dailyBest }) : t('game.daily.sub', { seconds: dailyStage(pet.species).seconds })}
        </Text>
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
          <StickerButton label={t('game.daily.play')} emoji="▶️" small onPress={() => startStage(dailyStage(pet.species))} />
        </View>
      </Sticker>

      <Sticker radius={22} color={challenge.done ? C.mint : C.paper} style={{ marginTop: 14 }} innerStyle={s.photoCard}>
        <Text style={s.photoTitle}>
          🎯 {t('game.challenge.title')}
          {challenge.done ? ' ✅' : ''}
        </Text>
        <Text style={s.photoSub}>
          {t(`game.challenge.${challenge.type}`, {
            n: challenge.target,
            stage: challenge.stageId ? t(`game.place.${challenge.stageId.split('-')[1]}`) : '',
            emoji: treatEmoji
          })}
        </Text>
        <Text style={s.photoSub}>
          {challenge.done ? t('game.challenge.done') : t('game.challenge.progress', { n: challenge.count, total: challenge.target, bonus: CHALLENGE_REWARD })}
        </Text>
      </Sticker>

      <PhotoCard pet={pet} situation={situation} onPress={() => setScreen({ name: 'photo' })} />
      <View style={s.row}>
        <StickerButton label={t('game.wardrobe.button')} emoji="🎀" small color={C.butter} onPress={() => setScreen({ name: 'wardrobe' })} />
        <StickerButton
          label={t('game.moments.button', { petName: pet.name, n: petMoments.length })}
          emoji="🖼️"
          small
          color={C.paper}
          onPress={() => setScreen({ name: 'moments' })}
        />
      </View>

      <Text style={s.section}>{t('game.map.title')}</Text>
      <StageMap
        species={pet.species}
        progress={game.progress}
        onPlay={startStage}
        onLocked={(stage, before) => showNotice(t('game.map.lockedNotice', { stage: t(stage.nameKey), before: t(before.nameKey) }))}
      />

      <View style={[s.row, { marginTop: 18 }]}>
        <StickerButton
          small
          color={C.paper}
          emoji={options.sound ? '🔊' : '🔇'}
          label={options.sound ? t('game.sound.on') : t('game.sound.off')}
          onPress={() => {
            setGameSound(!options.sound);
            setOptions({ sound: !options.sound });
          }}
        />
      </View>
      <Text style={s.footnote}>{t('game.footnote')}</Text>
    </ScrollView>
  );
}

// The day's photo challenge, offered on the hub and after a stage. Optional.
function PhotoCard({ pet, situation, onPress }) {
  const { t } = useI18n();
  return (
    <Sticker radius={22} style={{ marginTop: 14 }} innerStyle={s.photoCard}>
      <Text style={s.photoTitle}>📸 {t('game.photo.challenge', { situation: t(`game.photo.sit.${situation}`, { petName: pet.name }) })}</Text>
      <Text style={s.photoSub}>{t('game.photo.reward')}</Text>
      <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
        <StickerButton label={t('game.photo.start')} emoji="📸" small color={C.pink} onPress={onPress} />
      </View>
    </Sticker>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  hero: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLine: { fontFamily: F.bold, fontSize: 20, color: C.ink },
  heroSmall: { fontFamily: F.medium, fontSize: 13, color: C.ink, lineHeight: 18 },
  footnote: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 12, lineHeight: 17 },
  ready: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  readyText: { fontFamily: F.medium, fontSize: 13, color: C.inkSoft },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  notice: { padding: 12 },
  noticeText: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  photoCard: { padding: 14 },
  photoTitle: { fontFamily: F.bold, fontSize: 17, color: C.ink, lineHeight: 23 },
  photoSub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 2 },
  section: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 18, marginBottom: 10 }
});
