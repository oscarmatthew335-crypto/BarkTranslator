import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F } from '../theme';
import { Sticker, ScreenTitle } from './ui';

// Real behaviour tips for the selected species.
export default function DecoderTab({ species }) {
  const categories = ['All', ...Array.from(new Set(species.decoder.map((i) => i.category)))];
  const [filter, setFilter] = useState('All');
  useEffect(() => setFilter('All'), [species.id]);
  const items = filter === 'All' ? species.decoder : species.decoder.filter((i) => i.category === filter);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle
        title={`${species.label} decoder`}
        subtitle={`What ${species.sounds} and body language really mean.`}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={{ marginBottom: 16 }}>
        {categories.map((cat) => {
          const on = filter === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              style={[s.filter, on && s.filterOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={s.filterText}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {items.map((item) => (
        <Sticker key={item.id} radius={22} style={{ marginBottom: 14 }} innerStyle={s.card}>
          <View style={[s.badge, { backgroundColor: item.color }]}>
            <Text style={s.badgeText}>{item.badge}</Text>
          </View>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.summary}>{item.summary}</Text>
          <Text style={s.science}>{item.science}</Text>
        </Sticker>
      ))}

      <Text style={s.note}>
        How Pawlingo works: the lines are written for fun, and your pet's real sounds choose which ones you get. Every
        time you teach Pawlingo what a {species.sound} meant, it learns your pet's own language a little better, and as
        owners share, it learns what {species.sounds} mean in general. It's a companion that grows with your pet, not a
        word-for-word translator. The tips on this page are real.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  filters: { gap: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  filterOn: { backgroundColor: C.butter },
  filterText: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  card: { padding: 16 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  badgeText: { fontFamily: F.semibold, fontSize: 12, color: C.ink },
  title: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginBottom: 6 },
  summary: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink, marginBottom: 8 },
  science: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.inkSoft },
  note: { fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: C.inkSoft, marginTop: 6 }
});
