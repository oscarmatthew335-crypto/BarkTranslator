import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { stagesFor } from '../../game/stages';
import { isUnlocked } from '../../game/progress';
import { THEMES } from './Scenery';

const PLACE_EMOJI = { garden: '🌻', park: '🌳', beach: '🏖️', braai: '🔥', vet: '🩺', home: '🏠' };

export function Stars({ n, size = 16 }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 1 }} accessibilityLabel={`${n} / 3`}>
      {[0, 1, 2].map((i) => (i < n ? '⭐' : '☆')).join('')}
    </Text>
  );
}

// A winding path of stages. Open stages can be played (and replayed) any
// time; a locked one opens when the stage before it is finished.
export default function StageMap({ species, progress, onPlay }) {
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
              onPress={() => open && onPlay(stage)}
              disabled={!open}
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
  map: { gap: 6 },
  row: { flexDirection: 'row' },
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
