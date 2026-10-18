import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { playSounds, stopSounds, SOUND_FILES } from '../audio/sounds';
import { Sticker, StickerButton, ScreenTitle } from './ui';
import { useI18n } from '../i18n';

const CARD_COLORS = [C.butter, C.sky, C.pink, C.mint];

// Turn what the owner typed into a short run of pet sounds: one sound per
// word (up to five), rising at the end for a question.
function soundsFor(species, text) {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  const q = text.includes('?');
  const excited = text.includes('!') || /walk|treat|food|braai|ball|good|park|play|dinner|tuna|fish/i.test(text);
  if (species.id === 'cat') {
    const seq = words.map((w, i) => (i % 3 === 2 ? 'cat_unit_mrrp' : 'cat_unit_meow'));
    if (q) seq[seq.length - 1] = 'cat_unit_question';
    return seq;
  }
  return words.map((w, i) => (excited ? (i % 2 ? 'dog_unit_yip' : 'dog_unit_bark') : w.length > 5 ? 'dog_unit_low' : 'dog_unit_bark'));
}

// Human -> pet: say something in pet sounds, use training sounds, or tap a phrase.
export default function SpeakTab({ species, petName }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [custom, setCustom] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => stopSounds, []);

  const translate = () => {
    const trimmed = text.trim();
    Keyboard.dismiss();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const seq = soundsFor(species, trimmed);
    const syl = species.syllables;
    const phonetic = seq.map((_, i) => syl[(trimmed.length + i) % syl.length]).join('-');
    const excited = trimmed.includes('!');
    setCustom({
      phonetic: `${phonetic}${trimmed.includes('?') ? '?' : '!'}`,
      posture: excited
        ? `Use a bright, upbeat voice so ${petName} picks up the excitement.`
        : `Keep it calm and slow, and soften your eyes at ${petName}.`
    });
    playSounds(seq, species.id === 'cat' ? 120 : 110);
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        <ScreenTitle title={species.speakTab} subtitle={t('speak.subtitle', { petName })} />
      </Pressable>

      <Sticker radius={24} innerStyle={s.card} style={{ marginBottom: 18 }}>
        <TextInput
          style={s.input}
          placeholder={t('speak.placeholder', { petName })}
          placeholderTextColor={C.inkSoft}
          value={text}
          onChangeText={setText}
          onSubmitEditing={translate}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          maxLength={120}
        />
        <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
          <StickerButton label={t('speak.sayIt', { species: species.label })} emoji="🔊" onPress={translate} small />
        </View>
        {custom && (
          <View style={s.result}>
            <Text style={s.phonetic}>{custom.phonetic}</Text>
            <Text style={s.posture}>{custom.posture}</Text>
          </View>
        )}
      </Sticker>

      <View style={s.toolRow}>
        {species.tools.map((t, i) => (
          <Pressable
            key={t.id}
            style={{ flex: 1 }}
            onPress={() => {
              Keyboard.dismiss();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              playSounds(`tool_${t.id}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Play ${t.label}`}
          >
            <Sticker color={CARD_COLORS[(i + 1) % CARD_COLORS.length]} radius={20} offset={3} innerStyle={s.tool}>
              <Text style={s.toolEmoji}>{t.emoji}</Text>
              <Text style={s.toolLabel} maxFontSizeMultiplier={1.3}>
                {t.label}
              </Text>
            </Sticker>
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>{t('speak.quickPhrases')}</Text>
      {active && (
        <Sticker color={C.paper} radius={20} style={{ marginBottom: 14 }} innerStyle={s.activeBox}>
          <Text style={s.activePhonetic}>{active.petPhonetic}</Text>
          <Text style={s.posture}>{active.posture}</Text>
        </Sticker>
      )}
      <View style={s.grid}>
        {species.phrases.map((p, i) => {
          const on = active?.id === p.id;
          const sound = `${species.id}_${p.id}`;
          return (
            <Pressable
              key={p.id}
              style={s.gridItem}
              onPress={() => {
                Keyboard.dismiss();
                Haptics.selectionAsync().catch(() => {});
                setActive(p);
                if (SOUND_FILES[sound]) playSounds(sound);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Play: ${p.human}`}
            >
              <Sticker color={on ? CARD_COLORS[i % CARD_COLORS.length] : C.paper} radius={20} offset={3} innerStyle={s.phrase}>
                <Text style={s.phraseEmoji}>{p.emoji}</Text>
                <Text style={s.phraseHuman} maxFontSizeMultiplier={1.3}>
                  {p.human}
                </Text>
              </Sticker>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  card: { padding: 16 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: F.medium,
    fontSize: 16,
    color: C.ink
  },
  result: { marginTop: 14 },
  phonetic: { fontFamily: F.bold, fontSize: 22, color: C.ink, marginBottom: 4 },
  posture: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.inkSoft },
  toolRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  tool: { paddingVertical: 14, alignItems: 'center' },
  toolEmoji: { fontSize: 26 },
  toolLabel: { fontFamily: F.semibold, fontSize: 13, color: C.ink, marginTop: 4, textAlign: 'center' },
  section: { fontFamily: F.bold, fontSize: 22, color: C.ink, marginBottom: 12 },
  activeBox: { padding: 14 },
  activePhonetic: { fontFamily: F.bold, fontSize: 19, color: C.ink, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  gridItem: { width: '48.5%' },
  phrase: { padding: 14, minHeight: 112 },
  phraseEmoji: { fontSize: 28, marginBottom: 6 },
  phraseHuman: { fontFamily: F.semibold, fontSize: 15, lineHeight: 19, color: C.ink }
});
