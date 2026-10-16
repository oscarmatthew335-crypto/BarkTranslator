import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';

export function Checkbox({ checked, onToggle, label }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onToggle();
      }}
      style={s.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={6}
    >
      <View style={[s.box, checked && s.boxOn]}>{checked && <Text style={s.tick}>✓</Text>}</View>
      <Text style={s.label}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center'
  },
  boxOn: { backgroundColor: C.mint },
  tick: { fontFamily: F.bold, fontSize: 18, color: C.ink, marginTop: -2 },
  label: { fontFamily: F.semibold, fontSize: 16, color: C.ink, flexShrink: 1 }
});
