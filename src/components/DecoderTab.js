import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { DECODER_GUIDE } from '../data/speakDogAndDecoder';

export default function DecoderTab() {
  const [filter, setFilter] = useState('All');
  const categories = ['All', 'Vocalizations', 'Body Language', 'SA Pet Safety'];
  const items = filter === 'All' ? DECODER_GUIDE : DECODER_GUIDE.filter((i) => i.category === filter);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.headerTitle}>🧠 Canine Behaviour & Bark Decoder</Text>
      <Text style={s.headerSub}>Backed by animal behaviour science & South African veterinary tips.</Text>

      <View style={s.pillRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.filterPill, filter === cat && s.filterPillActive]}
            onPress={() => setFilter(cat)}
          >
            <Text style={s.filterPillText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {items.map((item) => (
        <View key={item.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: item.color }]}>
          <View style={s.rowBetween}>
            <Text style={s.categoryTag}>{item.category.toUpperCase()}</Text>
            <Text style={[s.badge, { color: item.color }]}>{item.badge}</Text>
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.summaryText}>{item.summary}</Text>
          <View style={s.scienceBox}>
            <Text style={s.scienceLabel}>🔬 Why Dogs Do This:</Text>
            <Text style={s.scienceText}>{item.science}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  content: { padding: 16, paddingBottom: 32 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: '#9CA3AF', fontSize: 13, marginBottom: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterPill: { backgroundColor: '#161F30', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#26334D' },
  filterPillActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  filterPillText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#161F30', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#26334D' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryTag: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  badge: { fontSize: 11, fontWeight: '800' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  summaryText: { color: '#E5E7EB', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  scienceBox: { backgroundColor: '#0B0F17', padding: 10, borderRadius: 10 },
  scienceLabel: { color: '#FFB800', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  scienceText: { color: '#9CA3AF', fontSize: 12, lineHeight: 17 }
});
