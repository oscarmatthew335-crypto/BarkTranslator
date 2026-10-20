import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, ScreenTitle, useReduceMotion } from '../ui';
import useGame from '../../game/useGame';
import { recordStage, nextStageAfter, totalStars } from '../../game/progress';
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
import { fileExists } from '../../storage/photos';
import { playFile } from '../../audio/sounds';

const MAX_WAITING_POWER_UPS = 4;

// The Play tab: a little runner starring the active pet. Screens:
// hub (map and extras) -> run -> end card -> next stage / map.
export default function PlayTab({ pet, species, history, onTeach, onUpdatePet }) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const { ready, game, options, updateGame } = useGame(pet);
  const [screen, setScreen] = useState({ name: 'hub' });

  // Power-ups waiting from a treat round or photo challenge go into the
  // next stage played.
  const startStage = useCallback(
    (stage) => {
      count('stagesPlayed');
      const powerUps = game?.powerUps || [];
      if (powerUps.length) updateGame((g) => ({ ...g, powerUps: [] }));
      setScreen({ name: 'run', stage, seed: hashString(`${stage.id}:${Date.now()}`), powerUps, key: Date.now() });
    },
    [game, updateGame]
  );

  const finish = useCallback(
    (result) => {
      count('stagesFinished');
      updateGame((g) => ({
        ...g,
        progress: recordStage(g.progress, result),
        bank: g.bank + result.treats,
        lifetimeTreats: g.lifetimeTreats + result.treats
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
      setScreen((sc) => ({ name: 'end', result, stage: sc.stage, roundItems }));
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

  const finishRound = useCallback(
    ({ powerUps }) => {
      if (powerUps.length) updateGame((g) => ({ ...g, powerUps: [...g.powerUps, ...powerUps].slice(-MAX_WAITING_POWER_UPS) }));
      setScreen((sc) => ({ ...sc, name: 'end', roundItems: [] }));
    },
    [updateGame]
  );

  if (!ready || !game) return <View style={s.container} />;

  if (screen.name === 'run')
    return (
      <RunnerScreen
        key={screen.key}
        stage={screen.stage}
        pet={pet}
        wardrobe={game.wardrobe}
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
        onPlayClip={(entry) => playFile(entry.audioUri)}
        onAnswer={answerRound}
        onFinish={finishRound}
      />
    );

  if (screen.name === 'end') {
    const next = screen.stage.daily ? null : nextStageAfter(pet.species, screen.stage.id);
    return (
      <StageEnd
        pet={pet}
        species={species}
        wardrobe={game.wardrobe}
        result={screen.result}
        stage={screen.stage}
        next={next}
        treatRoundCount={screen.roundItems?.length || 0}
        onTreatRound={startRound}
        onNext={() => startStage(next)}
        onReplay={() => startStage(screen.stage)}
        onMap={() => setScreen({ name: 'hub' })}
      />
    );
  }

  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';
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

      <Text style={s.section}>{t('game.map.title')}</Text>
      <StageMap species={pet.species} progress={game.progress} onPlay={startStage} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  hero: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLine: { fontFamily: F.bold, fontSize: 20, color: C.ink },
  ready: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  readyText: { fontFamily: F.medium, fontSize: 13, color: C.inkSoft },
  section: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 18, marginBottom: 10 }
});
