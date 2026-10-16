import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { StickerButton } from './ui';

// Asks the owner what the sound really meant. This is the training label.
export default function LabelSheet({ visible, species, petName, entry, onSubmit, onClose }) {
  const [contextId, setContextId] = useState(null);
  const [moods, setMoods] = useState([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible && entry) {
      setContextId(entry.contextId || null);
      setMoods([]);
      setComment('');
    }
  }, [visible, entry]);

  const toggleMood = (id) => {
    Haptics.selectionAsync().catch(() => {});
    setMoods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const ready = Boolean(contextId) && moods.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.title}>What was {petName} really saying?</Text>
              <Text style={s.sub}>You know {petName} best. Your answer teaches the model.</Text>

              <Text style={s.label}>What was going on?</Text>
              <View style={s.chips}>
                {species.contexts.map((c) => (
                  <Chip key={c.id} text={c.label} on={contextId === c.id} onPress={() => setContextId(c.id)} color={C.sky} />
                ))}
                <Chip text="🤔 Something else" on={contextId === 'other'} onPress={() => setContextId('other')} color={C.sky} />
              </View>

              <Text style={s.label}>How did {petName} seem? Pick any.</Text>
              <View style={s.chips}>
                {species.moods.map((m) => (
                  <Chip key={m.id} text={m.label} on={moods.includes(m.id)} onPress={() => toggleMood(m.id)} color={C.pink} />
                ))}
              </View>

              <Text style={s.label}>Anything else? (optional)</Text>
              <TextInput
                style={s.input}
                value={comment}
                onChangeText={setComment}
                placeholder={`e.g. ${species.id === 'cat' ? 'meows like this when the gardener arrives' : 'only barks like this at the postman'}`}
                placeholderTextColor={C.inkSoft}
                maxLength={280}
                multiline
              />

              <View style={s.buttons}>
                <StickerButton
                  label="Send"
                  emoji="🧠"
                  disabled={!ready}
                  onPress={() => onSubmit({ contextId, moods, comment })}
                  style={{ flex: 1 }}
                />
                <StickerButton label="Skip" color={C.paper} onPress={onClose} />
              </View>
              {!ready && <Text style={s.hint}>Pick what was going on and at least one mood.</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chip({ text, on, onPress, color }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, on && { backgroundColor: color }]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={s.chipText}>{text}</Text>
    </Pressable>
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
    paddingBottom: 28,
    maxHeight: '88%'
  },
  title: { fontFamily: F.bold, fontSize: 24, lineHeight: 28, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 14, color: C.inkSoft, marginTop: 4, marginBottom: 6 },
  label: { fontFamily: F.semibold, fontSize: 16, color: C.ink, marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  chipText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  input: {
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: F.regular,
    fontSize: 15,
    color: C.ink,
    minHeight: 64,
    textAlignVertical: 'top'
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'center' },
  hint: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 8 }
});
