import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { APP_NAME } from '../../species';
import { useI18n } from '../../i18n';
import { SCORE_SHARE_URL, formatShareHeadline } from '../../game/shareScore';
import PetPreview from './PetPreview';

const W = 360;
const H = 450;

// Portrait 4:5 score card rendered off-screen and captured via view-shot when
// the player taps Share after a new personal best or a 30s+ Chase run.
const ScoreShareCard = forwardRef(function ScoreShareCard(
  { pet, wardrobe, score = 0, isChase = false, chaserLabel = 'bath time' },
  ref
) {
  const { t } = useI18n();
  const headline = formatShareHeadline({
    petName: pet?.name,
    isChase,
    chaserLabel,
    translateFn: t
  });
  return (
    <View style={s.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={s.card}>
        <View style={s.body}>
          <View style={s.petWrap}>
            <PetPreview species={pet?.species || 'dog'} wardrobe={wardrobe} size={160} />
          </View>
          <Text style={s.headline} numberOfLines={2}>
            {headline}
          </Text>
          <View style={s.scorePill}>
            <Text style={s.scoreText}>{t('game.end.score', { n: score })}</Text>
          </View>
        </View>
        <View style={s.footer}>
          <View style={{ flex: 1 }}>
            <Text style={s.brand}>🐾 {APP_NAME}</Text>
            <Text style={s.link} numberOfLines={1}>
              {SCORE_SHARE_URL}
            </Text>
          </View>
          <View style={s.store}>
            <Text style={s.storeText}>{t('game.share.freeOnPlay')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default ScoreShareCard;

const s = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0, width: W, height: H },
  card: {
    width: W,
    height: H,
    backgroundColor: C.bg,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    overflow: 'hidden'
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 56,
    gap: 10
  },
  petWrap: {
    backgroundColor: C.paper,
    borderRadius: 28,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headline: {
    fontFamily: F.bold,
    fontSize: 22,
    color: C.ink,
    textAlign: 'center',
    lineHeight: 28
  },
  scorePill: {
    backgroundColor: C.butter,
    borderRadius: 999,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    paddingHorizontal: 22,
    paddingVertical: 8
  },
  scoreText: {
    fontFamily: F.bold,
    fontSize: 28,
    color: C.ink
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 62,
    backgroundColor: C.butter,
    borderTopWidth: INK_WIDTH,
    borderTopColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 8
  },
  brand: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  link: { fontFamily: F.regular, fontSize: 9, color: C.inkSoft },
  store: {
    backgroundColor: C.ink,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  storeText: { fontFamily: F.semibold, fontSize: 12, color: C.paper }
});
