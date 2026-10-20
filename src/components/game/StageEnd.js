import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton } from '../ui';
import { Stars } from './StageMap';
import PetPreview from './PetPreview';

// The card after a stage or daily run. The next stage is always one tap away;
// the treat round and photo challenge are offered alongside, never in the way.
export default function StageEnd({ pet, species, wardrobe, faceUri, result, stage, next, challengeDone, treatRoundCount, onNext, onReplay, onMap, onTreatRound, children }) {
  const { t } = useI18n();
  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Sticker radius={26} color={C.butter} innerStyle={s.card}>
        {faceUri ? <Image source={{ uri: faceUri }} style={s.face} accessibilityIgnoresInvertColors /> : <PetPreview species={pet.species} wardrobe={wardrobe} size={110} />}
        <Text style={s.title} maxFontSizeMultiplier={1.5}>
          {result.daily ? t('game.end.dailyDone') : result.failed ? t('game.end.outOfHearts') : t('game.end.goalAt', { stage: t(stage.nameKey) })}
        </Text>
        {result.daily ? (
          <Text style={s.big}>{t('game.end.score', { n: result.score })}</Text>
        ) : result.failed ? (
          <Text style={s.line}>{t('game.end.outSub', { stage: t(stage.nameKey) })}</Text>
        ) : (
          <Stars n={result.stars} size={34} />
        )}
        <Text style={s.line}>
          {treatEmoji} {t('game.end.treats', { n: result.treats })}
        </Text>
        <Text style={s.line}>{result.hits === 0 ? t('game.end.noBumps') : result.hits === 1 ? t('game.end.oneBump') : t('game.end.bumps', { n: result.hits })}</Text>
        {challengeDone ? <Text style={[s.line, s.bold]}>{t('game.end.challengeDone')}</Text> : null}
      </Sticker>

      <View style={s.buttons}>
        {result.failed ? <StickerButton label={t('game.end.tryAgain')} emoji="🔁" onPress={onReplay} /> : null}
        {next ? <StickerButton label={t('game.end.next', { stage: t(next.nameKey) })} emoji="▶️" color={result.failed ? C.paper : C.butter} onPress={onNext} /> : null}
        {!result.failed ? <StickerButton label={t('game.end.again')} emoji="🔁" color={C.paper} onPress={onReplay} /> : null}
        <StickerButton label={t('game.end.map')} emoji="🗺️" color={C.paper} onPress={onMap} />
      </View>

      {treatRoundCount > 0 && (
        <Sticker radius={22} style={{ marginTop: 16 }} innerStyle={s.offer}>
          <Text style={s.offerTitle}>{t('game.round.offerTitle')}</Text>
          <Text style={s.offerSub}>{t('game.round.offerSub', { n: treatRoundCount, petName: pet.name })}</Text>
          <View style={s.offerButtons}>
            <StickerButton label={t('game.round.start')} emoji="🍪" small onPress={onTreatRound} />
          </View>
        </Sticker>
      )}
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  card: { padding: 18, alignItems: 'center', gap: 4 },
  face: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: C.ink, marginBottom: 4 },
  title: { fontFamily: F.bold, fontSize: 26, color: C.ink, textAlign: 'center' },
  big: { fontFamily: F.bold, fontSize: 30, color: C.ink },
  line: { fontFamily: F.medium, fontSize: 16, color: C.ink, textAlign: 'center' },
  bold: { fontFamily: F.bold },
  buttons: { gap: 10, marginTop: 16 },
  offer: { padding: 16 },
  offerTitle: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  offerSub: { fontFamily: F.regular, fontSize: 14, color: C.inkSoft, marginTop: 4, lineHeight: 20 },
  offerButtons: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }
});
