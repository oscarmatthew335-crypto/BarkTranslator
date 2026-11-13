import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton } from '../ui';
import { Stars } from './StageMap';
import PetPreview from './PetPreview';
import { nextUnownedItem } from '../../game/wardrobe';
import { nearMissStatus } from '../../game/runFeel';

// The card after a stage, daily, endless or chase run. Play again / next stage
// is always one tap away; the treat round and photo challenge are offered below.
export default function StageEnd({
  pet,
  species,
  wardrobe,
  bank = 0,
  faceUri,
  result,
  stage,
  next,
  bestScore = 0,
  previousBest = 0,
  newBest = false,
  weeklyBest = 0,
  previousWeeklyBest = 0,
  newWeeklyBest = false,
  streakReward = null,
  goalCompleted = null,
  milestones = [],
  rewardLine = null,
  caughtLine = null,
  challengeDone,
  treatRoundCount,
  onNext,
  onReplay,
  onMap,
  onOpenWardrobe,
  onShareScore,
  onDoubleTreats,
  doubleTreatsAmount = 0,
  onTreatRound,
  onPhotoChallenge,
  photoSituation,
  children
}) {
  const { t } = useI18n();
  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';
  const isScoreMode = Boolean(result.endless || result.chase || result.daily);
  const toBeat = !newBest && previousBest > 0 && result.score <= previousBest ? previousBest - result.score + 1 : 0;
  const nearMiss = isScoreMode
    ? nearMissStatus({ score: result.score, previousBest, previousWeeklyBest, newBest, newWeeklyBest })
    : { kind: 'none', diff: 0 };
  const nextUnlock = nextUnownedItem(wardrobe, bank);
  const petQuote = newBest && rewardLine ? rewardLine : result.chase && caughtLine ? caughtLine : null;
  const highestMilestone = milestones.length ? milestones[milestones.length - 1] : null;
  const milestoneTreatSum = milestones.reduce((sum, m) => sum + (m.reward || 0), 0);
  const hasPowerUpOffers = treatRoundCount > 0 || Boolean(onPhotoChallenge);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Sticker radius={26} color={C.butter} innerStyle={s.card}>
        {faceUri ? <Image source={{ uri: faceUri }} style={s.face} accessibilityIgnoresInvertColors /> : <PetPreview species={pet.species} wardrobe={wardrobe} size={100} />}
        <Text style={s.title} maxFontSizeMultiplier={1.5}>
          {result.chase
            ? t('game.end.caughtBy', { chaser: t(stage.chaser?.nameKey || 'game.chaser.bath') })
            : result.endless
            ? t('game.end.endlessDone')
            : result.daily
            ? t('game.end.dailyDone')
            : result.failed
            ? t('game.end.outOfHearts')
            : t('game.end.goalAt', { stage: t(stage.nameKey) })}
        </Text>
        {isScoreMode ? (
          <>
            <Text style={s.big}>{t('game.end.score', { n: result.score })}</Text>
            {nearMiss.kind === 'near_miss' ? (
              <Text style={s.nearMissBig}>{t('game.end.soCloseBest', { n: nearMiss.diff })}</Text>
            ) : nearMiss.kind === 'near_miss_weekly' ? (
              <Text style={s.nearMissBig}>{t('game.end.soCloseWeekly', { n: nearMiss.diff })}</Text>
            ) : newBest ? (
              <Text style={[s.line, s.bold]}>{t('game.end.newBest')}</Text>
            ) : newWeeklyBest ? (
              <Text style={[s.line, s.bold]}>{t('game.end.newWeeklyBest')}</Text>
            ) : toBeat > 0 ? (
              <Text style={s.line}>{t('game.end.toBeatBest', { n: toBeat })}</Text>
            ) : null}
            {weeklyBest > 0 || bestScore > 0 ? (
              <Text style={s.line}>
                {weeklyBest > 0 ? t('game.end.weeklyBest', { n: weeklyBest }) : ''}
                {weeklyBest > 0 && bestScore > 0 ? ' · ' : ''}
                {bestScore > 0 ? t('game.end.best', { n: bestScore }) : ''}
              </Text>
            ) : null}
          </>
        ) : result.failed ? (
          <Text style={s.line}>{t('game.end.outSub', { stage: t(stage.nameKey) })}</Text>
        ) : (
          <Stars n={result.stars} size={34} />
        )}
        {highestMilestone ? (
          <View style={s.milestonePill}>
            <Text style={s.milestoneText}>
              {highestMilestone.emoji} {t(highestMilestone.nameKey)} · +{milestoneTreatSum} {treatEmoji}
            </Text>
          </View>
        ) : null}
        {petQuote ? (
          <View style={s.quoteBox}>
            <Text style={s.quoteText}>{t('game.end.petSays', { petName: pet.name, line: petQuote })}</Text>
          </View>
        ) : null}
        <Text style={s.line}>
          {treatEmoji} {t('game.end.treats', { n: result.treats })}
        </Text>
        {!isScoreMode ? (
          <Text style={s.line}>{result.hits === 0 ? t('game.end.noBumps') : result.hits === 1 ? t('game.end.oneBump') : t('game.end.bumps', { n: result.hits })}</Text>
        ) : null}
        {goalCompleted ? (
          <Text style={[s.line, s.bold]}>
            🎯 {t('game.goal.doneBonus', { n: goalCompleted.bonus, emoji: treatEmoji })}
          </Text>
        ) : null}
        {challengeDone ? <Text style={[s.line, s.bold]}>{t('game.end.challengeDone')}</Text> : null}
        {streakReward?.treats > 0 ? (
          <Text style={[s.line, s.bold]}>
            {streakReward.item
              ? t('game.streak.rewardDay7', { n: streakReward.treats, emoji: treatEmoji })
              : t('game.streak.rewardEarned', { n: streakReward.treats, emoji: treatEmoji })}
          </Text>
        ) : null}
      </Sticker>

      <View style={s.buttons}>
        <StickerButton
          label={result.failed ? t('game.end.tryAgain') : t('game.end.again')}
          emoji="🔁"
          color={C.butter}
          onPress={onReplay}
        />
        {onDoubleTreats && doubleTreatsAmount > 0 ? (
          <StickerButton
            label={t('game.end.doubleTreats', { n: doubleTreatsAmount })}
            emoji="🎬"
            color={C.mint}
            onPress={onDoubleTreats}
          />
        ) : null}
        {onShareScore ? <StickerButton label={t('game.share.btn')} emoji="📤" color={C.mint} onPress={onShareScore} /> : null}
        {!result.endless && !result.chase && next ? (
          <StickerButton label={t('game.end.next', { stage: t(next.nameKey) })} emoji="▶️" color={C.paper} onPress={onNext} />
        ) : null}
        <StickerButton label={t('game.end.map')} emoji="🗺️" color={C.paper} onPress={onMap} />
      </View>

      {nextUnlock && (
        <Pressable onPress={onOpenWardrobe} accessibilityRole="button" style={{ marginTop: 14 }}>
          <Sticker radius={20} color={C.paper} innerStyle={s.unlockBox}>
            <Text style={s.unlockText}>
              🎀 {nextUnlock.needed > 0
                ? t('game.end.nextUnlock', { n: nextUnlock.needed, item: t(`game.item.${nextUnlock.item.id}`) })
                : t('game.end.readyUnlock', { item: t(`game.item.${nextUnlock.item.id}`) })}
            </Text>
            <View style={s.unlockTrack}>
              <View style={[s.unlockFill, { width: `${Math.round(nextUnlock.progress * 100)}%` }]} />
            </View>
          </Sticker>
        </Pressable>
      )}

      {hasPowerUpOffers && (
        <Sticker radius={22} style={{ marginTop: 16 }} innerStyle={s.offer}>
          <Text style={s.offerTitle}>⚡ {t('game.end.earnPowerUpsTitle')}</Text>
          <Text style={s.offerSub}>
            {photoSituation
              ? t('game.end.earnPowerUpsSub', {
                  petName: pet.name,
                  situation: t(`game.photo.sit.${photoSituation}`, { petName: pet.name })
                })
              : t('game.round.offerSub', { n: treatRoundCount, petName: pet.name })}
          </Text>
          <View style={s.offerButtons}>
            {treatRoundCount > 0 ? <StickerButton label={t('game.round.start')} emoji="🍪" small onPress={onTreatRound} /> : null}
            {onPhotoChallenge ? <StickerButton label={t('game.photo.title')} emoji="📸" small color={C.pink} onPress={onPhotoChallenge} /> : null}
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
  face: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: C.ink, marginBottom: 4 },
  title: { fontFamily: F.bold, fontSize: 24, color: C.ink, textAlign: 'center' },
  big: { fontFamily: F.bold, fontSize: 34, color: C.ink },
  nearMissBig: { fontFamily: F.bold, fontSize: 20, color: C.tomato, textAlign: 'center', marginTop: 2 },
  line: { fontFamily: F.medium, fontSize: 16, color: C.ink, textAlign: 'center' },
  bold: { fontFamily: F.bold },
  milestonePill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper
  },
  milestoneText: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  quoteBox: { marginTop: 6, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  quoteText: { fontFamily: F.semibold, fontSize: 15, color: C.ink, textAlign: 'center', lineHeight: 20 },
  buttons: { gap: 10, marginTop: 16 },
  unlockBox: { padding: 12, gap: 6 },
  unlockText: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  unlockTrack: { height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.bg, overflow: 'hidden' },
  unlockFill: { height: '100%', backgroundColor: C.mint },
  offer: { padding: 14 },
  offerTitle: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  offerSub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 4, lineHeight: 19 },
  offerButtons: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }
});
