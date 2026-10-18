import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../theme';
import { APP_NAME } from '../species';
import { StickerButton } from './ui';
import { useI18n } from '../i18n';

// Explains why the microphone is needed before Android/iOS asks.
export default function MicPrimer({ visible, petName, species, onAllow, onClose }) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <Text style={s.emoji}>🎙️</Text>
          <Text style={s.title}>{t('mic.title', { appName: APP_NAME, petName })}</Text>
          <Text style={s.body}>{t('mic.body', { appName: APP_NAME, petName, sounds: species.sounds })}</Text>
          <View style={{ marginTop: 18 }}>
            <StickerButton label={t('mic.allow')} emoji="🐾" onPress={onAllow} />
          </View>
          <Pressable onPress={onClose} style={s.later} accessibilityRole="button">
            <Text style={s.laterText}>{t('consent.notNow')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,22,74,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: C.bg, borderRadius: 28, borderWidth: INK_WIDTH, borderColor: C.ink, padding: 22 },
  emoji: { fontSize: 44 },
  title: { fontFamily: F.bold, fontSize: 24, lineHeight: 28, color: C.ink, marginTop: 6 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.inkSoft, marginTop: 8 },
  later: { alignSelf: 'center', paddingTop: 14, paddingHorizontal: 12 },
  laterText: { fontFamily: F.semibold, fontSize: 15, color: C.inkSoft }
});
