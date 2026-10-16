import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { SPECIES } from '../species';
import { Sticker, StickerButton } from './ui';

export default function Onboarding({ onDone }) {
  const [speciesId, setSpeciesId] = useState(null);
  const [name, setName] = useState('');
  const sp = speciesId ? SPECIES[speciesId] : null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.content}>
          <Text style={s.title}>Who's doing the talking?</Text>
          <Text style={s.sub}>Pick your pet. You can switch any time.</Text>

          <View style={s.choices}>
            {Object.values(SPECIES).map((opt) => {
              const active = speciesId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={{ flex: 1 }}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSpeciesId(opt.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Sticker
                    color={active ? (opt.id === 'dog' ? C.butter : C.pink) : C.paper}
                    radius={28}
                    offset={active ? 6 : 4}
                    innerStyle={s.choiceInner}
                  >
                    <Text style={s.choiceEmoji}>{opt.emoji}</Text>
                    <Text style={s.choiceLabel}>{opt.label}</Text>
                  </Sticker>
                </Pressable>
              );
            })}
          </View>

          {sp && (
            <View style={{ marginTop: 28 }}>
              <Text style={s.label}>What's your {sp.label.toLowerCase()} called?</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder={sp.defaultName}
                placeholderTextColor={C.inkSoft}
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={20}
              />
            </View>
          )}
        </View>

        <View style={s.footer}>
          <StickerButton
            label={sp ? `Start translating ${name.trim() || sp.defaultName}` : 'Pick a pet to start'}
            emoji="🐾"
            disabled={!sp}
            onPress={() => onDone(speciesId, name)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 40 },
  title: { fontFamily: F.bold, fontSize: 36, lineHeight: 40, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 16, color: C.inkSoft, marginTop: 8 },
  choices: { flexDirection: 'row', gap: 14, marginTop: 30 },
  choiceInner: { alignItems: 'center', paddingVertical: 28 },
  choiceEmoji: { fontSize: 64 },
  choiceLabel: { fontFamily: F.bold, fontSize: 22, color: C.ink, marginTop: 6 },
  label: { fontFamily: F.semibold, fontSize: 17, color: C.ink, marginBottom: 8 },
  input: {
    backgroundColor: C.paper,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: F.medium,
    fontSize: 20,
    color: C.ink
  },
  footer: { paddingHorizontal: 22, paddingBottom: 20 }
});
