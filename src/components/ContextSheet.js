import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';

export default function ContextSheet({ visible, contexts, selected, petName, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>What's {petName} on about?</Text>
          <ScrollView contentContainerStyle={s.grid}>
            {contexts.map((c) => {
              const active = c.id === selected;
              return (
                <Pressable
                  key={c.id}
                  style={[s.item, active && s.itemActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onSelect(c.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={s.itemText}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,22,74,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '75%'
  },
  title: { fontFamily: F.bold, fontSize: 24, color: C.ink, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.paper
  },
  itemActive: { backgroundColor: C.sky },
  itemText: { fontFamily: F.semibold, fontSize: 16, color: C.ink }
});
