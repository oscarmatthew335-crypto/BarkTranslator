import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { SPECIES, APP_NAME, MIN_AGE } from '../species';
import { Sticker, StickerButton } from './ui';
import { Checkbox } from './Checkbox';

// First launch: pick dog or cat, name them, confirm age.
export default function Onboarding({ onDone }) {
  const [speciesId, setSpeciesId] = useState(null);
  const [name, setName] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const sp = speciesId ? SPECIES[speciesId] : null;
  const ready = Boolean(sp) && ageOk;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <Text style={s.title} maxFontSizeMultiplier={1.3}>
              Who's doing the talking?
            </Text>
            <Text style={s.sub}>
              Pick your pet. {APP_NAME} learns their language as you go and gets better the more you use it.
            </Text>

            <View style={s.choices}>
              {Object.values(SPECIES).map((opt) => {
                const active = speciesId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={{ flex: 1 }}
                    onPress={() => {
                      Keyboard.dismiss();
                      Haptics.selectionAsync().catch(() => {});
                      setSpeciesId(opt.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
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
          </Pressable>

          {sp && (
            <View style={{ marginTop: 26 }}>
              <Text style={s.label}>What's your {sp.label.toLowerCase()} called?</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder={sp.defaultName}
                placeholderTextColor={C.inkSoft}
                autoCapitalize="words"
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={Keyboard.dismiss}
                maxLength={20}
              />
            </View>
          )}

          <View style={{ marginTop: 22 }}>
            <Checkbox checked={ageOk} onToggle={() => setAgeOk((v) => !v)} label={`I'm ${MIN_AGE} or older`} />
          </View>
        </ScrollView>

        <View style={s.footer}>
          <StickerButton
            label={sp ? `Start translating ${name.trim() || sp.defaultName}` : 'Pick a pet to start'}
            emoji="🐾"
            disabled={!ready}
            onPress={() => {
              Keyboard.dismiss();
              onDone({ species: speciesId, name });
            }}
          />
          {sp && !ageOk && <Text style={s.hint}>Tick the age box to continue.</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 22, paddingTop: 36, paddingBottom: 20 },
  title: { fontFamily: F.bold, fontSize: 36, lineHeight: 40, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 16, lineHeight: 22, color: C.inkSoft, marginTop: 8 },
  choices: { flexDirection: 'row', gap: 14, marginTop: 26 },
  choiceInner: { alignItems: 'center', paddingVertical: 26 },
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
  footer: { paddingHorizontal: 22, paddingBottom: 16, paddingTop: 6 },
  hint: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, textAlign: 'center', marginTop: 8 }
});
