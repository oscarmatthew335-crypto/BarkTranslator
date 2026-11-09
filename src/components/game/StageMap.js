import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { stagesFor, endlessStage, chaseStage, chaserFor, earnedMilestones } from '../../game/stages';
import { isUnlocked } from '../../game/progress';
import { Sticker } from '../ui';
import { THEMES } from './Scenery';

const PLACE_EMOJI = { garden: '🌻', park: '🌳', beach: '🏖️', braai: '🔥', vet: '🩺', home: '🏠' };

export function Stars({ n, size = 16 }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 1 }} accessibilityLabel={`${n} / 3`}>
      {[0, 1, 2].map((i) => (i < n ? '⭐' : '☆')).join('')}
    </Text>
  );
}

// One large Play button (Endless) and a smaller Chase button next to/under it,
// showing best scores and earned milestone tiers.
export function ModeCards({ species, bestScores = {}, onPlay }) {
  const { t } = useI18n();
  const endless = endlessStage(species);
  const chase = chaseStage(species);
  const chaser = chaserFor(species);
  const endlessBadges = earnedMilestones('endless', bestScores.endless || 0)
    .map((m) => m.emoji)
    .join('');
  const chaseBadges = earnedMilestones('chase', bestScores.chase || 0)
    .map((m) => m.emoji)
    .join('');

  return (
    <View style={s.modesWrap}>
      <Pressable
        onPress={() => onPlay(endless)}
        accessibilityRole="button"
        accessibilityLabel={`${t('game.playButton')} · ${t('game.endless.title')}`}
      >
        <Sticker radius={24} color={C.butter} innerStyle={s.bigPlay}>
          <Text style={s.bigPlayEmoji}>▶️</Text>
          <View style={{ flex: 1 }}>
            <View style={s.modeTitleRow}>
              <Text style={s.bigPlayTitle} maxFontSizeMultiplier={1.5}>
                {t('game.playButton')}
              </Text>
              {endlessBadges ? <Text style={s.badges}>{endlessBadges}</Text> : null}
            </View>
            <Text style={s.bigPlaySub}>
              {bestScores.endless > 0 ? `${t('game.endless.title')} · ${t('game.bestScore', { n: bestScores.endless })}` : t('game.endless.sub')}
            </Text>
          </View>
        </Sticker>
      </Pressable>

      <Pressable
        onPress={() => onPlay(chase)}
        style={[s.modeNode, { backgroundColor: C.pink }]}
        accessibilityRole="button"
        accessibilityLabel={t('game.chase.title')}
      >
        <Text style={s.emoji}>{chaser.emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={s.modeTitleRow}>
            <Text style={s.name} maxFontSizeMultiplier={1.5}>
              {t('game.chase.title')}
            </Text>
            {chaseBadges ? <Text style={s.badges}>{chaseBadges}</Text> : null}
          </View>
          <Text style={s.locked}>
            {bestScores.chase > 0
              ? `${t('game.chase.sub', { chaser: t(chaser.nameKey) })} · ${t('game.bestScore', { n: bestScores.chase })}`
              : t('game.chase.sub', { chaser: t(chaser.nameKey) })}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

// A winding path of stages. Open stages can be played (and replayed) any
// time; a locked one opens when the stage before it is finished.
export default function StageMap({ species, progress, onPlay, onLocked }) {
  const { t } = useI18n();
  const list = stagesFor(species);
  return (
    <View style={s.map}>
      {list.map((stage, i) => {
        const open = isUnlocked(progress, species, stage.id);
        const stars = progress.stars[stage.id] || 0;
        const left = i % 2 === 0;
        return (
          <View key={stage.id} style={[s.row, { justifyContent: left ? 'flex-start' : 'flex-end' }]}>
            <Pressable
              onPress={() => (open ? onPlay(stage) : onLocked?.(stage, list[i - 1]))}
              style={[s.node, { backgroundColor: open ? THEMES[stage.theme].ground : '#DDD6F0', opacity: open ? 1 : 0.75 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !open }}
              accessibilityLabel={
                open ? t('game.map.openA11y', { n: i + 1, stage: t(stage.nameKey), stars }) : t('game.map.lockedA11y', { n: i + 1, stage: t(stage.nameKey) })
              }
            >
              <Text style={s.emoji}>{open ? PLACE_EMOJI[stage.theme] : '🔒'}</Text>
              <View style={{ flexShrink: 1 }}>
                <Text style={s.name} maxFontSizeMultiplier={1.6}>
                  {i + 1}. {t(stage.nameKey)}
                </Text>
                {open ? <Stars n={stars} /> : <Text style={s.locked}>{t('game.map.finishToOpen')}</Text>}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  modesWrap: { gap: 10 },
  bigPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18
  },
  bigPlayEmoji: { fontSize: 34 },
  bigPlayTitle: { fontFamily: F.bold, fontSize: 24, color: C.ink },
  bigPlaySub: { fontFamily: F.medium, fontSize: 14, color: C.inkSoft, marginTop: 2 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badges: { fontSize: 15, letterSpacing: 1 },
  map: { gap: 8 },
  row: { flexDirection: 'row' },
  modeNode: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 14
  },
  node: {
    width: '78%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  emoji: { fontSize: 26 },
  name: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  locked: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft }
});
