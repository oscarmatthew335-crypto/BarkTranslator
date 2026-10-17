import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { APP_NAME } from '../species';
import { StickerButton } from './ui';

// Asks the owner what the sound really meant. This is the training label.
// Only "what was going on" is needed; mood and comment are optional extras.
export default function LabelSheet({ visible, species, petName, entry, onSubmit, onClose }) {
  const [contextId, setContextId] = useState(null);
  const [moods, setMoods] = useState([]);
  const [comment, setComment] = useState('');
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (visible && entry) {
      // If Pawlingo's guess was wrong, don't pre-pick it; otherwise start
      // from what the owner had picked before listening.
      setContextId(entry.wrongGuess ? null : entry.pickedContextId || entry.contextId || null);
      setMoods([]);
      setComment('');
      setShowMore(false);
    }
  }, [visible, entry]);

  const toggleMood = (id) => {
    Haptics.selectionAsync().catch(() => {});
    setMoods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const wrongId = entry?.wrongGuess ? entry.guess?.contextId : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose}>
          <Pressable style={s.sheet} onPress={Keyboard.dismiss}>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <Text style={s.title} maxFontSizeMultiplier={1.3}>
                {entry?.wrongGuess ? `Oops. What was ${petName} on about?` : `What was ${petName} on about?`}
              </Text>
              <Text style={s.sub}>You know {petName} best. Every answer makes {APP_NAME}'s next guess better.</Text>

              <View style={s.chips}>
                {species.contexts
                  .filter((c) => c.id !== wrongId && c.id !== 'chat')
                  .map((c) => (
                    <Chip key={c.id} text={c.label} on={contextId === c.id} onPress={() => setContextId(c.id)} color={C.sky} />
                  ))}
                <Chip text="🤔 Something else" on={contextId === 'other'} onPress={() => setContextId('other')} color={C.sky} />
              </View>

              {!showMore ? (
                <Pressable onPress={() => setShowMore(true)} style={s.more} accessibilityRole="button">
                  <Text style={s.moreText}>+ Add how {petName} seemed (optional)</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={s.label}>How did {petName} seem?</Text>
                  <View style={s.chips}>
                    {species.moods.map((m) => (
                      <Chip key={m.id} text={m.label} on={moods.includes(m.id)} onPress={() => toggleMood(m.id)} color={C.pink} />
                    ))}
                  </View>
                  <Text style={s.label}>Anything else?</Text>
                  <TextInput
                    style={s.input}
                    value={comment}
                    onChangeText={setComment}
                    placeholder={
                      species.id === 'cat' ? 'e.g. meows like this when the gardener arrives' : 'e.g. only barks like this at the postman'
                    }
                    placeholderTextColor={C.inkSoft}
                    maxLength={280}
                    multiline
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </>
              )}

              <View style={s.buttons}>
                <StickerButton
                  label="Save"
                  emoji="🧠"
                  disabled={!contextId}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSubmit({ contextId, moods, comment });
                  }}
                  style={{ flex: 1 }}
                />
                <StickerButton label="Skip" color={C.paper} onPress={onClose} />
              </View>
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
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={[s.chip, on && { backgroundColor: color }]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={s.chipText} maxFontSizeMultiplier={1.3}>
        {text}
      </Text>
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
  sub: { fontFamily: F.regular, fontSize: 14, color: C.inkSoft, marginTop: 4, marginBottom: 14 },
  label: { fontFamily: F.semibold, fontSize: 16, color: C.ink, marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  chipText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  more: { paddingTop: 16, paddingBottom: 4 },
  moreText: { fontFamily: F.semibold, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
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
  buttons: { flexDirection: 'row', gap: 10, marginTop: 20, alignItems: 'center' }
});
