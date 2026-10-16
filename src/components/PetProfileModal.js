import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, Switch } from 'react-native';
import { C, F, INK_WIDTH } from '../theme';
import { SPECIES, APP_NAME } from '../species';
import { StickerButton } from './ui';

export default function PetProfileModal({
  visible,
  speciesId,
  petName,
  breedId,
  shareClips,
  onToggleShare,
  onDeleteData,
  onSave,
  onClose
}) {
  const [sp, setSp] = useState(speciesId);
  const [name, setName] = useState(petName);
  const [breed, setBreed] = useState(breedId);

  useEffect(() => {
    if (visible) {
      setSp(speciesId);
      setName(petName);
      setBreed(breedId);
    }
  }, [visible, speciesId, petName, breedId]);

  const species = SPECIES[sp];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>Your pet</Text>

          <View style={s.segment}>
            {Object.values(SPECIES).map((opt) => {
              const active = sp === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[s.segBtn, active && { backgroundColor: opt.id === 'dog' ? C.butter : C.pink }]}
                  onPress={() => {
                    if (opt.id !== sp && (!name || name === SPECIES[sp].defaultName)) setName(opt.defaultName);
                    setSp(opt.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={s.segText}>
                    {opt.emoji} {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder={species.defaultName}
            placeholderTextColor={C.inkSoft}
            maxLength={20}
            autoCapitalize="words"
          />

          {species.breeds && (
            <>
              <Text style={s.label}>Breed (changes the voice)</Text>
              <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 8 }}>
                {species.breeds.map((b) => {
                  const active = (breed || species.breeds[0].id) === b.id;
                  return (
                    <Pressable key={b.id} style={[s.breedRow, active && s.breedRowActive]} onPress={() => setBreed(b.id)}>
                      <Text style={s.breedName}>{b.name}</Text>
                      <Text style={s.breedTrait}>{b.trait}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={s.shareBox}>
            <View style={s.shareRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.shareTitle}>Help {APP_NAME} learn</Text>
                <Text style={s.shareSub}>
                  {shareClips
                    ? 'Short clips and your answers are shared to train a real translator.'
                    : 'Off. Nothing is recorded or sent.'}
                </Text>
              </View>
              <Switch
                value={shareClips}
                onValueChange={onToggleShare}
                trackColor={{ true: C.mint, false: '#CFC6EA' }}
                thumbColor={C.paper}
                accessibilityLabel={`Help ${APP_NAME} learn`}
              />
            </View>
            <Pressable onPress={onDeleteData} accessibilityRole="button" style={{ paddingTop: 8 }}>
              <Text style={s.deleteText}>Delete everything I've shared</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 18 }}>
            <StickerButton label="Save" emoji="✅" onPress={() => onSave({ speciesId: sp, petName: name, breedId: breed })} />
          </View>
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
    paddingBottom: 30
  },
  title: { fontFamily: F.bold, fontSize: 26, color: C.ink, marginBottom: 14 },
  segment: {
    flexDirection: 'row',
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: C.paper,
    marginBottom: 16
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segText: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
  label: { fontFamily: F.semibold, fontSize: 15, color: C.ink, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: C.paper,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: F.medium,
    fontSize: 18,
    color: C.ink,
    marginBottom: 8
  },
  shareBox: {
    marginTop: 14,
    backgroundColor: C.paper,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.ink,
    padding: 12
  },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareTitle: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
  shareSub: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.inkSoft, marginTop: 2 },
  deleteText: { fontFamily: F.semibold, fontSize: 13, color: C.tomato },
  breedRow: { padding: 12, borderRadius: 16, backgroundColor: C.paper, borderWidth: INK_WIDTH, borderColor: 'rgba(36,22,74,0.15)' },
  breedRowActive: { borderColor: C.ink, backgroundColor: C.butter },
  breedName: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  breedTrait: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 2 }
});
