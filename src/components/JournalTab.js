import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { C, F } from '../theme';
import { getSpecies } from '../species';
import { Sticker, StickerButton, ScreenTitle } from './ui';
import LearningCard from './LearningCard';
import { useI18n } from '../i18n';

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function JournalTab({ history, pets, pet, onReplay, onShare, onClear, onGoScan, onTeach, species, progress }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('pet'); // 'pet' (the selected pet) or 'all'
  const shown = filter === 'all' || pets.length < 2 ? history : history.filter((h) => !h.petId || h.petId === pet.id);
  // How often Pawlingo's guesses were confirmed by the owner
  const judged = shown.filter((h) => h.guess && h.labelled && h.taughtContextId);
  const rightPct = judged.length
    ? `${Math.round((judged.filter((h) => h.taughtContextId === h.guess.contextId).length / judged.length) * 100)}%`
    : '–';
  const totalSounds = shown.reduce((sum, h) => sum + (h.soundCount ?? h.barkCount ?? 0), 0);

  const confirmClear = () =>
    Alert.alert(t('journal.clearTitle'), t('journal.clearBody'), [
      { text: t('pets.cancel'), style: 'cancel' },
      { text: t('journal.clear'), style: 'destructive', onPress: onClear }
    ]);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('journal.title')} subtitle={t('journal.subtitle')} />

      <LearningCard progress={progress} species={species} petName={pet.name} />

      {pets.length > 1 && (
        <View style={s.filters}>
          {[
            ['pet', pet.name],
            ['all', t('journal.allPets')]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              style={[s.filter, filter === id && s.filterOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === id }}
            >
              <Text style={s.filterText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.stats}>
        <Stat value={shown.length} label={t('journal.translations')} color={C.butter} />
        <Stat value={totalSounds} label={t('journal.soundsHeard')} color={C.sky} />
        <Stat value={rightPct} label={t('journal.guessedRight')} color={C.mint} />
      </View>

      {shown.length === 0 ? (
        <Sticker radius={24} innerStyle={s.empty}>
          <Text style={s.emptyEmoji}>{species.emoji}</Text>
          <Text style={s.emptyTitle}>{t('journal.emptyTitle')}</Text>
          <Text style={s.emptySub}>{t('journal.emptySub', { petName: pet.name, sound: species.sound })}</Text>
          <View style={{ marginTop: 14 }}>
            <StickerButton label={t('journal.startTranslating')} emoji="🐾" onPress={onGoScan} small />
          </View>
        </Sticker>
      ) : (
        shown.map((item) => {
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
                <StickerButton label={t('scanner.replay')} emoji="🔊" small color={C.paper} onPress={() => onReplay(item)} />
                <StickerButton label={t('scanner.share')} emoji="📤" small onPress={() => onShare(item)} />
                {item.features && !item.labelled && (!item.petId || pets.some((p) => p.id === item.petId)) && (
                  <StickerButton label={t('journal.teach')} emoji="🧠" small color={C.pink} onPress={() => onTeach(item)} />
                )}
              </View>
            </Sticker>
          );
        })
      )}

      {history.length > 0 && (
        <Pressable onPress={confirmClear} style={s.clear} accessibilityRole="button">
          <Text style={s.clearText}>{t('journal.clear')}</Text>
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  filterOn: { backgroundColor: C.butter },
  filterText: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
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
