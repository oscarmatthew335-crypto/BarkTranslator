import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, StyleSheet, Alert } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { loadCounters, retention, sessionsPerDay, rate, resetCounters } from '../../game/counters';
import { dayKey } from '../../game/daily';
import { StickerButton } from '../ui';

// The owner's hidden numbers screen (long-press the version in Settings).
// Everything here is counted on this phone only and never sent anywhere.
export default function GameStatsSheet({ visible, onClose }) {
  const { t } = useI18n();
  const [c, setC] = useState(null);
  useEffect(() => {
    if (visible) loadCounters().then((x) => setC({ ...x }));
  }, [visible]);

  const today = dayKey();
  const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}%`);
  const yesNo = (v) => (v == null ? t('game.stats.notYet') : v ? t('game.photo.yes') : t('game.photo.no'));
  const r = c ? retention(c, today) : {};
  const fps = c?.fpsSamples?.length ? c.fpsSamples.reduce((a, b) => a + b, 0) / c.fpsSamples.length : null;
  const rows = c
    ? [
        [t('game.stats.firstOpen'), c.firstOpenDay || '–'],
        [t('game.stats.sessionsToday'), c.sessionsByDay[today] || 0],
        [t('game.stats.sessionsPerDay'), sessionsPerDay(c).toFixed(1)],
        [t('game.stats.daysActive'), Object.keys(c.sessionsByDay).length],
        [t('game.stats.d1'), yesNo(r.d1)],
        [t('game.stats.d7'), yesNo(r.d7)],
        [t('game.stats.d30'), yesNo(r.d30)],
        [t('game.stats.stagesPlayed'), c.stagesPlayed],
        [t('game.stats.stagesFinished'), c.stagesFinished],
        [t('game.stats.dailyRuns'), c.dailyRuns],
        [t('game.stats.roundsOffered'), c.treatRoundsOffered],
        [t('game.stats.roundsStarted'), `${c.treatRoundsStarted} (${pct(rate(c.treatRoundsStarted, c.treatRoundsOffered))})`],
        [t('game.stats.answerRate'), pct(rate(c.questionsAnswered, c.questionsAsked))],
        [t('game.stats.notSureRate'), pct(rate(c.notSure, c.questionsAnswered))],
        [t('game.stats.clipsLabelled'), c.clipsLabelled],
        [t('game.stats.photoChallenges'), c.photoChallenges],
        [t('game.stats.photosShared'), c.photosShared],
        [t('game.stats.fps'), fps == null ? '–' : fps.toFixed(1)]
      ]
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <ScrollView>
            <Text style={s.title}>{t('game.stats.title')}</Text>
            <Text style={s.sub}>{t('game.stats.sub')}</Text>
            <View style={s.box}>
              {rows.map(([k, v], i) => (
                <View key={k} style={[s.row, i > 0 && s.divider]}>
                  <Text style={s.key}>{k}</Text>
                  <Text style={s.value}>{String(v)}</Text>
                </View>
              ))}
            </View>
            <View style={s.buttons}>
              <StickerButton label={t('game.back')} color={C.paper} small onPress={onClose} />
              <StickerButton
                label={t('game.stats.reset')}
                color={C.paper}
                small
                onPress={() =>
                  Alert.alert(t('game.stats.reset'), '', [
                    { text: t('pets.cancel'), style: 'cancel' },
                    { text: t('game.stats.reset'), style: 'destructive', onPress: () => resetCounters().then((x) => setC({ ...x })) }
                  ])
                }
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,22,74,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: INK_WIDTH, borderColor: C.ink, padding: 20, paddingBottom: 30, maxHeight: '88%' },
  title: { fontFamily: F.bold, fontSize: 24, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  box: { backgroundColor: C.paper, borderRadius: 16, borderWidth: 2, borderColor: C.ink, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6, flexWrap: 'wrap' },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(36,22,74,0.12)' },
  key: { fontFamily: F.medium, fontSize: 14, color: C.ink, flexShrink: 1 },
  value: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }
});
