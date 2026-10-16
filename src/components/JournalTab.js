import React from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { C, F } from '../theme';
import { getSpecies } from '../species';
import { Sticker, StickerButton, ScreenTitle } from './ui';

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function JournalTab({ history, onReplay, onShare, onClear, onGoScan, onTeach, species }) {
  const rated = history.filter((h) => h.rating);
  const thumbsUp = rated.length ? `${Math.round((rated.filter((h) => h.rating === 'up').length / rated.length) * 100)}%` : '–';
  const totalSounds = history.reduce((sum, h) => sum + (h.soundCount ?? h.barkCount ?? 0), 0);

  const confirmClear = () =>
    Alert.alert('Clear the journal?', 'This deletes every saved translation on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: onClear }
    ]);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title="Journal" subtitle="Every translation, saved on this phone." />

      <View style={s.stats}>
        <Stat value={history.length} label="Translations" color={C.butter} />
        <Stat value={totalSounds} label="Sounds heard" color={C.sky} />
        <Stat value={thumbsUp} label="Spot on" color={C.mint} />
      </View>

      {history.length === 0 ? (
        <Sticker radius={24} innerStyle={s.empty}>
          <Text style={s.emptyEmoji}>{species.emoji}</Text>
          <Text style={s.emptyTitle}>Nothing here yet</Text>
          <Text style={s.emptySub}>Translate your first {species.sound} and it will show up here.</Text>
          <View style={{ marginTop: 14 }}>
            <StickerButton label="Start translating" emoji="🐾" onPress={onGoScan} small />
          </View>
        </Sticker>
      ) : (
        history.map((item) => {
          const sp = getSpecies(item.species || 'dog');
          const name = item.petName || item.dogName;
          const count = item.soundCount ?? item.barkCount;
          return (
            <Sticker key={item.id} radius={22} style={{ marginBottom: 12 }} innerStyle={s.card}>
              <View style={s.cardTop}>
                {item.photoUri ? (
                  <Image source={{ uri: item.photoUri }} style={s.thumb} />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]}>
                    <Text style={{ fontSize: 26 }}>{sp.emoji}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.meta}>
                    {item.personalityFace || ''} {name}
                  </Text>
                  <Text style={s.date}>{item.date ? formatDate(item.date) : item.time}</Text>
                </View>
              </View>
              <Text style={s.quote}>{item.text}</Text>
              <Text style={s.details}>
                {item.contextLabel}
                {count != null ? `, ${count} ${count === 1 ? sp.sound : sp.sounds}` : ''}
                {item.loudness != null ? `, loudness ${item.loudness}` : ''}
              </Text>
              <View style={s.actions}>
                <StickerButton label="Replay" emoji="🔊" small color={C.paper} onPress={() => onReplay(item)} />
                <StickerButton label="Share" emoji="📤" small onPress={() => onShare(item)} />
                {item.clipId && !item.labelled && (
                  <StickerButton label="Teach" emoji="🧠" small color={C.pink} onPress={() => onTeach(item)} />
                )}
              </View>
            </Sticker>
          );
        })
      )}

      {history.length > 0 && (
        <Pressable onPress={confirmClear} style={s.clear} accessibilityRole="button">
          <Text style={s.clearText}>Clear journal</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Stat({ value, label, color }) {
  return (
    <Sticker color={color} radius={18} offset={3} style={{ flex: 1 }} innerStyle={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Sticker>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  stat: { paddingVertical: 12, alignItems: 'center' },
  statValue: { fontFamily: F.bold, fontSize: 24, color: C.ink },
  statLabel: { fontFamily: F.medium, fontSize: 12, color: C.ink, marginTop: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyEmoji: { fontSize: 54 },
  emptyTitle: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 6 },
  emptySub: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 4, lineHeight: 21 },
  card: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  thumb: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: C.ink },
  thumbEmpty: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
  date: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft },
  quote: { fontFamily: F.bold, fontSize: 18, lineHeight: 23, color: C.ink, marginBottom: 6 },
  details: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  clear: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 6 },
  clearText: { fontFamily: F.semibold, fontSize: 14, color: C.tomato }
});
