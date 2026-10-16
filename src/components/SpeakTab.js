import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { Sticker, StickerButton, ScreenTitle } from './ui';

const CARD_COLORS = [C.butter, C.sky, C.pink, C.mint];

// Human → pet: type a message and hear it in pet-speak, or tap a phrase.
export default function SpeakTab({ species, petName }) {
  const [text, setText] = useState('');
  const [custom, setCustom] = useState(null);
  const [active, setActive] = useState(null);

  const say = (words, pitch, rate) => {
    Speech.stop();
    Speech.speak(words, { pitch, rate });
  };

  const translate = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const words = trimmed.split(/\s+/);
    const syl = species.syllables;
    const phonetic = words
      .slice(0, 6)
      .map((w, i) => syl[(w.length + i) % syl.length])
      .join('-');
    const isQ = trimmed.includes('?');
    const excited = trimmed.includes('!') || /walk|treat|food|braai|ball|good|park|play|dinner|tuna|fish/i.test(trimmed);
    const pitch = excited ? 1.45 : isQ ? 1.3 : 0.95;
    const rate = excited ? 1.18 : 0.95;
    const result = {
      phonetic: `${phonetic}${isQ ? '?' : '!'}`,
      posture: excited
        ? `Use a bright, upbeat voice so ${petName} picks up the excitement.`
        : `Keep it calm and slow, and soften your eyes at ${petName}.`
    };
    setCustom(result);
    say(`${phonetic.replace(/-/g, '! ')}! ${petName}, ${trimmed}`, pitch, rate);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title={species.speakTab} subtitle={`Say something to ${petName} in their language.`} />

      <Sticker radius={24} innerStyle={s.card} style={{ marginBottom: 18 }}>
        <TextInput
          style={s.input}
          placeholder={`Type something for ${petName}…`}
          placeholderTextColor={C.inkSoft}
          value={text}
          onChangeText={setText}
          onSubmitEditing={translate}
          returnKeyType="send"
        />
        <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
          <StickerButton label={`Say it in ${species.label}`} emoji="🔊" onPress={translate} small />
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              say(t.say.replace('{name}', petName), t.pitch, t.rate);
            }}
            accessibilityRole="button"
            accessibilityLabel={t.label}
          >
            <Sticker color={CARD_COLORS[(i + 1) % CARD_COLORS.length]} radius={20} offset={3} innerStyle={s.tool}>
              <Text style={s.toolEmoji}>{t.emoji}</Text>
              <Text style={s.toolLabel}>{t.label}</Text>
            </Sticker>
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>Quick phrases</Text>
      {active && (
        <Sticker color={C.paper} radius={20} style={{ marginBottom: 14 }} innerStyle={s.activeBox}>
          <Text style={s.activePhonetic}>{active.petPhonetic}</Text>
          <Text style={s.posture}>{active.posture}</Text>
        </Sticker>
      )}
      <View style={s.grid}>
        {species.phrases.map((p, i) => {
          const on = active?.id === p.id;
          return (
            <Pressable
              key={p.id}
              style={s.gridItem}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActive(p);
                say(p.cadence, p.pitch, p.rate);
              }}
              accessibilityRole="button"
              accessibilityLabel={p.human}
            >
              <Sticker
                color={on ? CARD_COLORS[i % CARD_COLORS.length] : C.paper}
                radius={20}
                offset={3}
                innerStyle={s.phrase}
              >
                <Text style={s.phraseEmoji}>{p.emoji}</Text>
                <Text style={s.phraseHuman}>{p.human}</Text>
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
