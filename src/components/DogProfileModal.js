import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { DOG_BREEDS } from '../data/contextsAndBreeds';

export default function DogProfileModal({ visible, dogName, setDogName, selectedBreed, setSelectedBreed, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>🐶 Customize Your Dog's Profile</Text>
          <Text style={s.modalLabel}>Dog's Name:</Text>
          <TextInput
            style={s.modalInput}
            value={dogName}
            onChangeText={setDogName}
            placeholder="e.g. Bruno, Bella, Rex..."
            placeholderTextColor="#777"
          />
          <Text style={s.modalLabel}>Select Breed / Vocal Size (tunes AI voice pitch):</Text>
          <ScrollView style={{ maxHeight: 240 }}>
            {DOG_BREEDS.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[s.breedRow, selectedBreed.id === b.id && s.breedRowActive]}
                onPress={() => setSelectedBreed(b)}
              >
                <Text style={s.breedName}>{b.name}</Text>
                <Text style={s.breedTrait}>{b.trait}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.saveBtn} onPress={onClose}>
            <Text style={s.saveBtnText}>✅ Save Dog Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#161F30', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#FF6B00' },
  modalTitle: { color: '#FFF', fontSize: 19, fontWeight: '800', marginBottom: 12 },
  modalLabel: { color: '#FFB800', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 6 },
  modalInput: { backgroundColor: '#0B0F17', color: '#FFF', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 8, borderWidth: 1, borderColor: '#2E3C56' },
  breedRow: { padding: 10, borderRadius: 12, backgroundColor: '#0B0F17', marginBottom: 6, borderWidth: 1, borderColor: '#26334D' },
  breedRowActive: { borderColor: '#FF6B00', backgroundColor: '#1F293D' },
  breedName: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  breedTrait: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  saveBtn: { backgroundColor: '#FF6B00', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 }
});
