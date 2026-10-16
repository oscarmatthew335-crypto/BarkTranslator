import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function JournalTab({ history, onReplay, onShare, onClear }) {
  const accurateCount = history.filter((h) => h.rating === 'up').length;
  const ratedCount = history.filter((h) => h.rating).length;
  const thumbsUpPct = ratedCount > 0 ? `${Math.round((accurateCount / ratedCount) * 100)}%` : '—';
  const totalBarks = history.reduce((sum, h) => sum + (h.barkCount || 0), 0);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.rowBetween}>
        <View>
          <Text style={s.headerTitle}>📜 Bark Journal</Text>
          <Text style={s.headerSub}>Every bark you've translated, saved on this phone</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={onClear}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{history.length}</Text>
          <Text style={s.statLabel}>Translations</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: '#10B981' }]}>{thumbsUpPct}</Text>
          <Text style={s.statLabel}>👍 Rating</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: '#FFB800' }]}>{totalBarks}</Text>
          <Text style={s.statLabel}>Barks Heard</Text>
        </View>
      </View>

      {history.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>🎙️</Text>
          <Text style={s.emptyTitle}>No Barks Recorded Yet</Text>
          <Text style={s.emptySub}>Go to the Scanner tab and hold the translate button while your dog barks!</Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.logMeta}>🐾 {item.dogName} • {item.personalityName}</Text>
              <Text style={s.logTime}>{item.date ? formatDate(item.date) : item.time}</Text>
            </View>
            <Text style={s.logQuote}>"{item.text}"</Text>
            <Text style={s.logStats}>
              {item.contextLabel} • {item.intensity} ({item.barkCount ?? '?'} bark{item.barkCount === 1 ? '' : 's'} • {item.duration}s • 🔊 {item.loudness ?? '?'}/100)
            </Text>
            <View style={s.actionRow}>
              <TouchableOpacity style={s.smallBtn} onPress={() => onReplay(item)}>
                <Text style={s.smallBtnText}>🔊 Replay Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.smallBtn} onPress={() => onShare(item)}>
                <Text style={s.smallBtnText}>📤 Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  content: { padding: 16, paddingBottom: 32 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: '#9CA3AF', fontSize: 13, marginBottom: 14 },
  card: { backgroundColor: '#161F30', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#26334D' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#161F30', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#26334D' },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  emptyBox: { backgroundColor: '#161F30', borderRadius: 16, padding: 28, alignItems: 'center', marginTop: 12 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: '#FFF', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  emptySub: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  logMeta: { color: '#FFB800', fontSize: 12, fontWeight: '800' },
  logTime: { color: '#9CA3AF', fontSize: 11 },
  logQuote: { color: '#FFF', fontSize: 16, fontWeight: '800', marginVertical: 6 },
  logStats: { color: '#9CA3AF', fontSize: 11, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { backgroundColor: '#26334D', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  smallBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  clearBtn: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  clearBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' }
});
