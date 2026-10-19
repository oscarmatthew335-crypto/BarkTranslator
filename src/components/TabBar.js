import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { useI18n } from '../i18n';

export default function TabBar({ active, onChange, disabled, species, journalCount }) {
  const { t } = useI18n();
  const tabs = [
    { id: 'scanner', icon: '🎙️', label: t('tab.translate') },
    { id: 'speak', icon: species.emoji, label: species.speakTab },
    { id: 'decoder', icon: '🧠', label: t('tab.decoder') },
    { id: 'journal', icon: '📒', label: journalCount ? t('tab.journalCount', { count: journalCount }) : t('tab.journal') }
  ];
  return (
    <View style={s.bar}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            style={s.item}
            disabled={disabled}
            onPress={() => {
              if (!on) Haptics.selectionAsync().catch(() => {});
              onChange(t.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
          >
            <View style={[s.pill, on && s.pillOn]}>
              <Text style={s.icon}>{t.icon}</Text>
            </View>
            <Text style={[s.label, on && s.labelOn]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.paper,
    borderTopWidth: INK_WIDTH,
    borderTopColor: C.ink,
    paddingTop: 8,
    paddingBottom: 6
  },
  item: { flex: 1, alignItems: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  pillOn: { backgroundColor: C.butter, borderColor: C.ink },
  icon: { fontSize: 20 },
  label: { fontFamily: F.medium, fontSize: 12, color: C.inkSoft, marginTop: 3 },
  labelOn: { fontFamily: F.bold, color: C.ink }
});
