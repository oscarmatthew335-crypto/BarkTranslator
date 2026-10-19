import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { APP_NAME } from '../species';
import { Sticker, StickerButton } from './ui';

const POINTS = [
  ['🎙️', 'We keep a short recording each time you translate, up to 15 seconds.'],
  ['🧠', 'Your answers about what was really going on are shared too. That is the part that teaches the model.'],
  ['🔊', 'Recordings can pick up background sound, including people talking. Avoid translating during private conversations.'],
  ['🙈', "We don't collect your name, your pet's name, contacts or location. Clips are linked to a random ID, not to you."],
  ['⚙️', "Turn it off, or delete everything you've shared, any time from your pet's settings."]
];

// Opt-in for sharing clips. Shown once at setup (and once to people who
// installed before this existed). "Not now" changes nothing about the app.
export default function ConsentScreen({ petName, onChoose }) {
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Help {APP_NAME} learn real pet language</Text>
        <Text style={s.sub}>
          {APP_NAME} grows with {petName || 'your pet'}. It learns {petName || 'your pet'}'s own sounds on this phone
          whatever you choose here. Sharing clips also teaches it what barks and meows mean across every pet, so its
          guesses get better for everyone.
        </Text>

        <Sticker radius={24} innerStyle={s.card} style={{ marginTop: 20 }}>
          <Text style={s.cardTitle}>If you say yes</Text>
          {POINTS.map(([icon, text]) => (
            <View key={text} style={s.point}>
              <Text style={s.pointIcon}>{icon}</Text>
              <Text style={s.pointText}>{text}</Text>
            </View>
          ))}
        </Sticker>

        <Text style={s.no}>
          If you say not now, no recordings are kept or sent. {APP_NAME} still learns {petName || 'your pet'}'s sounds
          privately on this phone. If you pick a clip from your phone, it is sent to our server only to read the sound,
          and deleted straight away.
        </Text>
      </ScrollView>

      <View style={s.footer}>
        <StickerButton label="Yes, I'll help" emoji="🐾" onPress={() => onChoose(true)} />
        <View style={{ height: 10 }} />
        <StickerButton label="Not now" color={C.paper} onPress={() => onChoose(false)} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 22, paddingTop: 32, paddingBottom: 16 },
  title: { fontFamily: F.bold, fontSize: 32, lineHeight: 36, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 16, lineHeight: 22, color: C.inkSoft, marginTop: 10 },
  card: { padding: 18 },
  cardTitle: { fontFamily: F.bold, fontSize: 19, color: C.ink, marginBottom: 10 },
  point: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  pointIcon: { fontSize: 20, width: 26 },
  pointText: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink, flex: 1 },
  no: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 16 },
  footer: { paddingHorizontal: 22, paddingBottom: 16, paddingTop: 8 }
});
