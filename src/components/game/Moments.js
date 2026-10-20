import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton, ScreenTitle } from '../ui';

// "<name>'s moments": the photo-challenge photos, kept on the phone.
// Tap one to make it the pet's face in the game, or to delete it.
export default function Moments({ pet, moments, faceMomentId, onSetFace, onDelete, onBack, onChallenge }) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const cols = width > 500 ? 4 : 3;
  const size = Math.floor((width - 36 - (cols - 1) * 10) / cols);

  const open = (m) =>
    Alert.alert(t(`game.photo.sit.${m.situation}`, { petName: pet.name }), new Date(m.createdAt).toLocaleDateString(), [
      { text: t('game.moments.useAsFace', { petName: pet.name }), onPress: () => onSetFace(m.id) },
      {
        text: t('game.moments.delete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('game.moments.deleteTitle'), m.shared ? t('game.moments.deleteShared') : t('game.moments.deleteLocal'), [
            { text: t('pets.cancel'), style: 'cancel' },
            { text: t('game.moments.delete'), style: 'destructive', onPress: () => onDelete(m) }
          ])
      },
      { text: t('pets.cancel'), style: 'cancel' }
    ]);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('game.moments.title', { petName: pet.name })} subtitle={t('game.moments.sub', { petName: pet.name })} />
      {moments.length === 0 ? (
        <Sticker radius={22} innerStyle={s.empty}>
          <Text style={s.emptyEmoji}>📸</Text>
          <Text style={s.emptyText}>{t('game.moments.empty', { petName: pet.name })}</Text>
          <View style={{ marginTop: 12 }}>
            <StickerButton label={t('game.photo.title')} emoji="📸" small onPress={onChallenge} />
          </View>
        </Sticker>
      ) : (
        <View style={s.grid}>
          {moments.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => open(m)}
              accessibilityRole="button"
              accessibilityLabel={t(`game.photo.sit.${m.situation}`, { petName: pet.name })}
              style={{ width: size }}
            >
              <Image source={{ uri: m.uri }} style={[s.photo, { width: size, height: size }, m.id === faceMomentId && s.face]} />
              <Text style={s.caption} numberOfLines={2}>
                {m.id === faceMomentId ? '⭐ ' : ''}
                {t(`game.photo.sitShort.${m.situation}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ marginTop: 18 }}>
        <StickerButton label={t('game.back')} color={C.paper} onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { borderRadius: 16, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  face: { borderWidth: 4, borderColor: C.butter },
  caption: { fontFamily: F.medium, fontSize: 12, color: C.ink, marginTop: 4 },
  empty: { padding: 22, alignItems: 'center' },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 21 }
});
