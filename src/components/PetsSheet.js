import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { C, F, INK_WIDTH } from '../theme';
import { SPECIES, getSpecies, APP_NAME } from '../species';
import { StickerButton } from './ui';

// Your pets: switch between them, add one, edit or remove.
// Each pet keeps its own learning and journal entries.
export default function PetsSheet({ visible, pets, activePetId, onSelect, onAdd, onUpdate, onRemove, onClose }) {
  const [mode, setMode] = useState('list'); // list | edit | add
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (visible) {
      setMode('list');
      setEditId(null);
    }
  }, [visible]);

  const editing = pets.find((p) => p.id === editId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose}>
          <Pressable style={s.sheet} onPress={Keyboard.dismiss}>
            {mode === 'list' && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={s.title}>Your pets</Text>
                {pets.map((p) => {
                  const sp = getSpecies(p.species);
                  const active = p.id === activePetId;
                  const breed = sp.breeds?.find((b) => b.id === p.breedId);
                  return (
                    <View key={p.id} style={[s.petRow, active && s.petRowActive]}>
                      <Pressable
                        style={s.petMain}
                        onPress={() => onSelect(p.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.name}${active ? ', selected' : ''}`}
                      >
                        <Text style={s.petEmoji}>{sp.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.petName} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={s.petSub} numberOfLines={1}>
                            {breed ? breed.name.replace(/^\S+\s/, '') : sp.label}
                            {active ? ' (selected)' : ''}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditId(p.id);
                          setMode('edit');
                        }}
                        style={s.editBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${p.name}`}
                        hitSlop={6}
                      >
                        <Text style={s.editText}>Edit</Text>
                      </Pressable>
                    </View>
                  );
                })}
                <View style={{ marginTop: 12 }}>
                  <StickerButton label="Add a pet" emoji="➕" color={C.paper} onPress={() => setMode('add')} />
                </View>
              </ScrollView>
            )}

            {mode === 'edit' && editing && (
              <PetForm
                key={editing.id}
                title={`Edit ${editing.name}`}
                initial={editing}
                canRemove={pets.length > 1}
                onCancel={() => setMode('list')}
                onSave={(fields) => {
                  onUpdate(editing.id, fields);
                  setMode('list');
                }}
                onRemove={() =>
                  Alert.alert(
                    `Remove ${editing.name}?`,
                    `This deletes ${editing.name}'s journal entries and everything ${APP_NAME} learned about them on this phone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          onRemove(editing.id);
                          setMode('list');
                        }
                      }
                    ]
                  )
                }
              />
            )}

            {mode === 'add' && (
              <PetForm
                title="Add a pet"
                initial={{ name: '', species: null, breedId: null, home: null }}
                onCancel={() => setMode('list')}
                onSave={(fields) => {
                  onAdd(fields);
                  onClose();
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PetForm({ title, initial, canRemove, onCancel, onSave, onRemove }) {
  const [species, setSpecies] = useState(initial.species);
  const [name, setName] = useState(initial.name);
  const [breedId, setBreedId] = useState(initial.breedId);
  const [home, setHome] = useState(initial.home);
  const sp = species ? SPECIES[species] : null;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={s.title}>{title}</Text>
      <View style={s.segment}>
        {Object.values(SPECIES).map((opt) => {
          const on = species === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[s.segBtn, on && { backgroundColor: opt.id === 'dog' ? C.butter : C.pink }]}
              onPress={() => {
                Keyboard.dismiss();
                setSpecies(opt.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
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
        placeholder={sp?.defaultName || 'Name'}
        placeholderTextColor={C.inkSoft}
        maxLength={20}
        autoCapitalize="words"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={Keyboard.dismiss}
      />

      {sp && (
        <>
          <Text style={s.label}>Where does {name.trim() || sp.defaultName} hang out?</Text>
          <View style={[s.segment, { marginBottom: 8 }]}>
            {[
              { id: 'indoor', label: '🏠 Indoors' },
              { id: 'garden', label: '🌳 Has a garden' }
            ].map((opt) => {
              const on = (home || sp.defaultHome) === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[s.segBtn, on && { backgroundColor: C.mint }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setHome(opt.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={s.segText}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {sp?.breeds && (
        <>
          <Text style={s.label}>Breed (changes the voice)</Text>
          <View style={{ gap: 8 }}>
            {sp.breeds.map((b) => {
              const on = (breedId || sp.breeds[0].id) === b.id;
              return (
                <Pressable
                  key={b.id}
                  style={[s.breedRow, on && s.breedRowActive]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setBreedId(b.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={s.breedName}>{b.name}</Text>
                  <Text style={s.breedTrait}>{b.trait}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <View style={s.formButtons}>
        <StickerButton
          label="Save"
          emoji="✅"
          disabled={!species}
          style={{ flex: 1 }}
          onPress={() => {
            Keyboard.dismiss();
            onSave({
              species,
              name: name.trim() || SPECIES[species].defaultName,
              breedId: SPECIES[species].breeds ? breedId : null,
              home: home || SPECIES[species].defaultHome
            });
          }}
        />
        <StickerButton label="Cancel" color={C.paper} onPress={onCancel} />
      </View>
      {canRemove && onRemove && (
        <Pressable onPress={onRemove} style={s.remove} accessibilityRole="button">
          <Text style={s.removeText}>Remove this pet</Text>
        </Pressable>
      )}
    </ScrollView>
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
    paddingBottom: 30,
    maxHeight: '88%'
  },
  title: { fontFamily: F.bold, fontSize: 26, color: C.ink, marginBottom: 14 },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.paper,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(36,22,74,0.2)',
    marginBottom: 10,
    paddingRight: 10
  },
  petRowActive: { borderColor: C.ink, backgroundColor: C.butter },
  petMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  petEmoji: { fontSize: 30 },
  petName: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  petSub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft },
  editBtn: { borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontFamily: F.semibold, fontSize: 13, color: C.ink },
  segment: {
    flexDirection: 'row',
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: C.paper,
    marginBottom: 14
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
  breedRow: { padding: 12, borderRadius: 16, backgroundColor: C.paper, borderWidth: INK_WIDTH, borderColor: 'rgba(36,22,74,0.15)' },
  breedRowActive: { borderColor: C.ink, backgroundColor: C.butter },
  breedName: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  breedTrait: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 2 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'center' },
  remove: { alignSelf: 'center', paddingTop: 16 },
  removeText: { fontFamily: F.semibold, fontSize: 14, color: C.tomato }
});
