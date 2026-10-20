import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton, ScreenTitle, useReduceMotion } from '../ui';
import useGame from '../../game/useGame';
import { stagesFor } from '../../game/stages';
import { recordStage } from '../../game/progress';
import { hashString } from '../../game/random';
import { count, recordFps } from '../../game/counters';
import RunnerScreen from './RunnerScreen';
import PetPreview from './PetPreview';

// The Play tab: a little runner starring the active pet.
export default function PlayTab({ pet, species }) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const { ready, game, options, updateGame } = useGame(pet);
  const [screen, setScreen] = useState({ name: 'hub' });

  const startStage = useCallback(
    (stage) => {
      count('stagesPlayed');
      setScreen({ name: 'run', stage, seed: hashString(`${stage.id}:${Date.now()}`), key: Date.now() });
    },
    []
  );

  const finish = useCallback(
    (result) => {
      count('stagesFinished');
      updateGame((g) => ({ ...g, progress: recordStage(g.progress, result), bank: g.bank + result.treats, lifetimeTreats: g.lifetimeTreats + result.treats }));
      setScreen({ name: 'end', result, stage: screen.stage });
    },
    [screen.stage, updateGame]
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
        reduceMotion={reduceMotion}
        soundOn={options.sound}
        onFinish={finish}
        onQuit={() => setScreen({ name: 'hub' })}
        onFps={recordFps}
      />
    );

  const first = stagesFor(pet.species)[0];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('game.title', { petName: pet.name })} subtitle={t('game.subtitle', { petName: pet.name })} />
      <Sticker radius={24} innerStyle={s.hero}>
        <PetPreview species={pet.species} wardrobe={game.wardrobe} size={110} />
        <Text style={s.bank}>
          {species.id === 'cat' ? '🐟' : '🦴'} {game.bank}
        </Text>
      </Sticker>
      {screen.name === 'end' && (
        <Sticker radius={22} color={C.butter} style={{ marginTop: 14 }} innerStyle={s.card}>
          <Text style={s.cardTitle}>{t('game.end.goal')}</Text>
          <Text style={s.cardSub}>{t('game.end.treats', { n: screen.result.treats })}</Text>
        </Sticker>
      )}
      <View style={{ marginTop: 16 }}>
        <StickerButton label={t('game.playStage', { stage: t(first.nameKey) })} emoji="▶️" onPress={() => startStage(first)} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  hero: { padding: 16, alignItems: 'center' },
  bank: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 6 },
  card: { padding: 16 },
  cardTitle: { fontFamily: F.bold, fontSize: 20, color: C.ink },
  cardSub: { fontFamily: F.regular, fontSize: 15, color: C.ink, marginTop: 4, lineHeight: 21 }
});
