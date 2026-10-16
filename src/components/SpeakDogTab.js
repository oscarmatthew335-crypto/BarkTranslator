import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { HUMAN_TO_DOG_PHRASES } from '../data/speakDogAndDecoder';

export default function SpeakDogTab({ dogName }) {
  const [customText, setCustomText] = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [activePhrase, setActivePhrase] = useState(null);
  const [clickerCount, setClickerCount] = useState(0);

  const playDogSynthesis = (phrase) => {
    Vibration.vibrate([0, 40, 60, 80]);
    setActivePhrase(phrase);
    Speech.stop();
    Speech.speak(phrase.cadence, { pitch: phrase.pitch, rate: phrase.rate });
  };

  const translateCustomHumanText = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    Vibration.vibrate(50);
    const words = trimmed.split(/\s+/);
    const tokens = ['Woof', 'Arf', 'Bork', 'Ruff', 'Yip-yip', 'Awooo', 'Boof'];
    const phonetics = words.slice(0, 6).map((w, i) => tokens[(w.length + i) % tokens.length]).join('-');
    const isQ = trimmed.includes('?');
    const isExc = trimmed.includes('!') || /walk|treat|food|braai|ball|good|park/i.test(trimmed);
    const result = {
      dogPhonetic: `${phonetics}${isQ ? '?! (Head tilt 35°)' : '! (Tail wag)'}`,
      cadence: `${phonetics.replace(/-/g, '! ')}! ${dogName}, ${trimmed}`,
      pitch: isExc ? 1.4 : isQ ? 1.25 : 0.9,
      rate: isExc ? 1.18 : 0.95,
      posture: isExc
        ? `Bend knees slightly and use an upbeat tone so ${dogName} reads your excitement!`
        : `Keep shoulders relaxed, blink softly at ${dogName}, and use a calm cadence.`
    };
    setCustomResult(result);
    Speech.stop();
    Speech.speak(result.cadence, { pitch: result.pitch, rate: result.rate });
  };

  const triggerClicker = (type) => {
    Vibration.vibrate(40);
    if (type === 'click') {
      setClickerCount((c) => c + 1);
      Speech.stop();
      Speech.speak('Click! Good dog!', { pitch: 1.6, rate: 1.35 });
    } else if (type === 'whistle') {
      Speech.stop();
      Speech.speak(`Tweet-wheeeet! ${dogName}, come here!`, { pitch: 1.8, rate: 1.15 });
    } else {
      Speech.stop();
      Speech.speak('Squeak! Squeak-squeak!', { pitch: 1.9, rate: 1.4 });
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.headerTitle}>🐕 Speak Dog (Human → Canine)</Text>
      <Text style={s.headerSub}>Translate your words into canine vocal cadences + posture cues for {dogName}.</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>✨ Custom Human-to-Bark Synthesizer</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={`Type anything to say to ${dogName}...`}
            placeholderTextColor="#777"
            value={customText}
            onChangeText={setCustomText}
            onSubmitEditing={translateCustomHumanText}
          />
          <TouchableOpacity style={s.translateBtn} onPress={translateCustomHumanText}>
            <Text style={s.translateBtnText}>🔊 Bark It</Text>
          </TouchableOpacity>
        </View>
        {customResult && (
          <View style={s.resultBox}>
            <Text style={s.phoneticText}>🐾 "{customResult.dogPhonetic}"</Text>
            <Text style={s.postureText}>💡 {customResult.posture}</Text>
          </View>
        )}
      </View>

      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>🎯 Training Clicker & Attention Cues</Text>
          <Text style={s.streakBadge}>🏆 {clickerCount} Rewards</Text>
        </View>
        <View style={s.toolRow}>
          <TouchableOpacity style={[s.toolBtn, { backgroundColor: '#10B981' }]} onPress={() => triggerClicker('click')}>
            <Text style={s.toolEmoji}>🔘</Text>
            <Text style={s.toolLabel}>Click + Reward</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toolBtn, { backgroundColor: '#3B82F6' }]} onPress={() => triggerClicker('whistle')}>
            <Text style={s.toolEmoji}>😗</Text>
            <Text style={s.toolLabel}>Recall Whistle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toolBtn, { backgroundColor: '#EC4899' }]} onPress={() => triggerClicker('squeak')}>
            <Text style={s.toolEmoji}>🦆</Text>
            <Text style={s.toolLabel}>Squeaky Toy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activePhrase && (
        <View style={s.activeBanner}>
          <Text style={s.activePhonetic}>🔊 {activePhrase.dogPhonetic}</Text>
          <Text style={s.activePosture}>🕺 Body Language Cue: {activePhrase.posture}</Text>
        </View>
      )}

      <Text style={s.sectionHeading}>⚡ Instant Canine Phrasebook</Text>
      <View style={s.grid}>
        {HUMAN_TO_DOG_PHRASES.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.soundCard, activePhrase?.id === item.id && s.soundCardActive]}
            onPress={() => playDogSynthesis(item)}
          >
            <Text style={s.soundEmoji}>{item.emoji}</Text>
            <Text style={s.soundHuman}>{item.human}</Text>
            <Text style={s.soundPhonetic}>{item.dogPhonetic}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  content: { padding: 16, paddingBottom: 32 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: '#9CA3AF', fontSize: 13, marginBottom: 16 },
  card: { backgroundColor: '#161F30', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#26334D' },
  cardTitle: { color: '#FFB800', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#0B0F17', color: '#FFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#2E3C56' },
  translateBtn: { backgroundColor: '#FF6B00', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  translateBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  resultBox: { marginTop: 12, backgroundColor: '#0B0F17', padding: 12, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#FFB800' },
  phoneticText: { color: '#FFB800', fontWeight: '800', fontSize: 15, marginBottom: 4 },
  postureText: { color: '#D1D5DB', fontSize: 12, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  streakBadge: { color: '#10B981', fontWeight: '800', fontSize: 12, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  toolRow: { flexDirection: 'row', gap: 8 },
  toolBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  toolEmoji: { fontSize: 20, marginBottom: 4 },
  toolLabel: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  activeBanner: { backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FF6B00' },
  activePhonetic: { color: '#FFB800', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  activePosture: { color: '#E5E7EB', fontSize: 12, lineHeight: 18 },
  sectionHeading: { color: '#F3F4F6', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  soundCard: { width: '48.5%', backgroundColor: '#161F30', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#26334D' },
  soundCardActive: { borderColor: '#FF6B00', backgroundColor: '#1F293D' },
  soundEmoji: { fontSize: 24, marginBottom: 6 },
  soundHuman: { color: '#FFF', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  soundPhonetic: { color: '#FFB800', fontSize: 11, fontWeight: '600' }
});

