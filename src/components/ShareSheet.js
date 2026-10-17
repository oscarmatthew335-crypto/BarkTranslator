import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { C, F, INK_WIDTH } from '../theme';
import { StickerButton } from './ui';
import { fileExists } from '../storage/photos';

// "Video or picture?" then a short wait while the server makes the video.
export default function ShareSheet({ job, onVideo, onPicture, onClose }) {
  const item = job?.item;
  const hasSound = Boolean(item && fileExists(item.audioUri));
  return (
    <Modal visible={Boolean(job)} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={job?.step === 'making' ? undefined : onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {job?.step === 'choose' && (
            <>
              <Text style={s.title}>Share {item.petName}'s translation</Text>
              <View style={{ gap: 12, marginTop: 16 }}>
                <StickerButton
                  label={hasSound ? `Video with ${item.petName}'s voice` : 'Video'}
                  emoji="🎬"
                  onPress={() => onVideo(item)}
                />
                <StickerButton label="Picture" emoji="🖼️" color={C.paper} onPress={() => onPicture(item)} />
              </View>
              <Text style={s.note}>Videos are made on our server and deleted straight after.</Text>
            </>
          )}
          {job?.step === 'making' && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <ActivityIndicator size="large" color={C.ink} />
              <Text style={[s.title, { textAlign: 'center', marginTop: 14 }]}>Making {item.petName}'s video…</Text>
              <Text style={[s.body, { textAlign: 'center' }]}>This takes about 10 seconds.</Text>
              <Pressable onPress={onClose} style={s.later} accessibilityRole="button">
                <Text style={s.laterText}>Cancel</Text>
              </Pressable>
            </View>
          )}
          {job?.step === 'error' && (
            <>
              <Text style={s.title}>No video this time</Text>
              <Text style={s.body}>{job.message}</Text>
              <View style={{ marginTop: 16 }}>
                <StickerButton label="Share a picture instead" emoji="🖼️" onPress={() => onPicture(item)} />
              </View>
              <Pressable onPress={onClose} style={s.later} accessibilityRole="button">
                <Text style={s.laterText}>Close</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,22,74,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: C.bg, borderRadius: 28, borderWidth: INK_WIDTH, borderColor: C.ink, padding: 22 },
  title: { fontFamily: F.bold, fontSize: 22, lineHeight: 27, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.inkSoft, marginTop: 8 },
  note: { fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: C.inkSoft, marginTop: 14, textAlign: 'center' },
  later: { alignSelf: 'center', paddingTop: 14, paddingHorizontal: 12 },
  laterText: { fontFamily: F.semibold, fontSize: 15, color: C.inkSoft }
});
