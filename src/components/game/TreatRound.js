import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n, DICTS } from '../../i18n';
import { Sticker, StickerButton } from '../ui';
import { POWER_UPS } from '../../game/stages';
import { UNSURE } from '../../game/questions';
import { roundReward } from '../../game/treatRound';
import { PowerIcon } from './Things';

// The optional treat round: one question at a time, "Not sure" always
// offered and rewarded the same as any answer, and a way out on every card.
export default function TreatRound({ pet, species, items, onPlayClip, onAnswer, onFinish }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [picked, setPicked] = useState([]);
  const done = index >= items.length;
  const earned = roundReward(answered);

  const answer = (value) => {
    Haptics.selectionAsync().catch(() => {});
    onAnswer(items[index], value);
    setAnswered((n) => n + 1);
    setIndex((i) => i + 1);
  };

  if (done || items.length === 0) {
    const togglePick = (p) =>
      setPicked((list) => (list.includes(p) ? list.filter((x) => x !== p) : list.length < earned ? [...list, p] : list));
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Sticker radius={24} color={C.butter} innerStyle={s.card}>
          <Text style={s.title}>{earned ? t('game.round.thanks', { petName: pet.name }) : t('game.round.noAnswers')}</Text>
          {earned > 0 && <Text style={s.sub}>{t('game.round.pick', { n: earned })}</Text>}
          {earned > 0 && (
            <View style={s.chips}>
              {POWER_UPS.map((p) => {
                const on = picked.includes(p);
                return (
                  <Pressable
                    key={p}
                    onPress={() => togglePick(p)}
                    style={[s.power, on && s.powerOn]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={t(`game.power.${p}`)}
                  >
                    <Svg width={28} height={28} viewBox="0 0 28 28">
                      <PowerIcon type={p} />
                    </Svg>
                    <Text style={s.powerText} maxFontSizeMultiplier={1.6}>
                      {t(`game.power.${p}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Sticker>
        <View style={{ marginTop: 16 }}>
          <StickerButton
            label={t('game.round.backToGame')}
            emoji="▶️"
            disabled={earned > 0 && picked.length === 0}
            onPress={() => onFinish({ answered, powerUps: picked })}
          />
        </View>
      </ScrollView>
    );
  }

  const item = items[index];
  const isClip = item.kind === 'clip';
  const options = isClip
    ? species.contexts.filter((c) => c.id !== 'chat').map((c) => ({ id: c.id, label: c.label }))
    : item.question.options.map((o) => ({ id: o, label: t(optionKey(item.question.id, o)) }));
  const questionText = isClip
    ? t('game.round.clipQuestion', { petName: pet.name })
    : t(`q.${item.question.id}`, { petName: pet.name });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.counter}>{t('game.round.counter', { n: index + 1, total: items.length })}</Text>
      <Sticker radius={24} innerStyle={s.card}>
        <Text style={s.title} maxFontSizeMultiplier={1.6}>
          {questionText}
        </Text>
        {isClip && (
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <StickerButton label={t('game.round.playClip')} emoji="🔊" small color={C.sky} onPress={() => onPlayClip(item.entry)} />
          </View>
        )}
        <View style={s.chips}>
          {options.map((o) => (
            <Pressable key={o.id} onPress={() => answer(o.id)} style={s.chip} accessibilityRole="button">
              <Text style={s.chipText} maxFontSizeMultiplier={1.6}>
                {o.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={() => answer(UNSURE)} style={[s.chip, s.unsure]} accessibilityRole="button">
            <Text style={s.chipText} maxFontSizeMultiplier={1.6}>
              🤷 {t('game.round.notSure')}
            </Text>
          </Pressable>
        </View>
        <Text style={s.note}>{t('game.round.sameReward')}</Text>
      </Sticker>
      <Pressable onPress={() => setIndex(items.length)} style={s.skip} accessibilityRole="button">
        <Text style={s.skipText}>{t('game.round.skipRest')}</Text>
      </Pressable>
    </ScrollView>
  );
}

// Answer text: q.<question>.<option>, or a shared q.opt.<option>.
export function optionKey(id, option) {
  return DICTS.en[`q.${id}.${option}`] ? `q.${id}.${option}` : `q.opt.${option}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  counter: { fontFamily: F.semibold, fontSize: 14, color: C.inkSoft, marginBottom: 8 },
  card: { padding: 18 },
  title: { fontFamily: F.bold, fontSize: 22, lineHeight: 28, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 15, color: C.ink, marginTop: 6, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  unsure: { backgroundColor: C.bg },
  chipText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  note: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 14, lineHeight: 17 },
  skip: { alignSelf: 'center', padding: 14 },
  skipText: { fontFamily: F.semibold, fontSize: 15, color: C.ink, textDecorationLine: 'underline' },
  power: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.paper
  },
  powerOn: { backgroundColor: C.mint },
  powerText: { fontFamily: F.semibold, fontSize: 14, color: C.ink }
});
