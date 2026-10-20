import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C, F } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton } from '../ui';
import { Checkbox } from '../Checkbox';

// One photo challenge: pick or take a photo of the pet in today's situation,
// add a couple of optional labels, and get a speed boost for the next stage.
// The first time (if the owner shares clips) it also asks, separately and
// unticked, whether photos may be shared too.
export default function PhotoChallenge({ pet, species, breed, situation, askShare, onSave, onCancel, onShowNotice }) {
  const { t } = useI18n();
  const [asset, setAsset] = useState(null);
  const [isPet, setIsPet] = useState(null);
  const [size, setSize] = useState(pet.answers?.size?.value && pet.answers.size.value !== 'unsure' ? pet.answers.size.value : null);
  const [breedConfirmed, setBreedConfirmed] = useState(null);
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const situationText = t(`game.photo.sit.${situation}`, { petName: pet.name });

  const pick = async (camera) => {
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          onShowNotice(t('game.photo.cameraOff'), perm.canAskAgain ? null : { label: t('error.openSettings'), onPress: () => Linking.openSettings() });
          return;
        }
      }
      const options = { mediaTypes: ['images'], quality: 0.9, exif: false, allowsEditing: true, aspect: [1, 1] };
      const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets?.length) return;
      setAsset(res.assets[0]);
    } catch (_) {
      onShowNotice(t('game.photo.cantOpen'));
    }
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave({ asset, labels: { isPet, size, breedConfirmed }, share: askShare ? share : undefined });
    setSaving(false);
    if (!ok) onShowNotice(t('game.photo.cantSave'));
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Sticker radius={24} color={C.butter} innerStyle={s.card}>
        <Text style={s.kicker}>📸 {t('game.photo.title')}</Text>
        <Text style={s.title} maxFontSizeMultiplier={1.6}>
          {t('game.photo.challenge', { situation: situationText })}
        </Text>
        <Text style={s.sub}>{t('game.photo.reward')}</Text>
      </Sticker>

      {!asset ? (
        <View style={s.buttons}>
          <StickerButton label={t('game.photo.take')} emoji="📷" onPress={() => pick(true)} />
          <StickerButton label={t('game.photo.pick')} emoji="🖼️" color={C.paper} onPress={() => pick(false)} />
          <StickerButton label={t('game.photo.notNow')} color={C.paper} onPress={onCancel} />
        </View>
      ) : (
        <Sticker radius={24} style={{ marginTop: 16 }} innerStyle={s.card}>
          <Image source={{ uri: asset.uri }} style={s.preview} accessibilityLabel={situationText} />
          <Text style={s.label}>{t('game.photo.isThisPet', { petName: pet.name })}</Text>
          <Choices value={isPet} onChange={setIsPet} options={[['yes', t('game.photo.yes')], ['no', t('game.photo.no')]]} />
          {pet.species === 'dog' && (
            <>
              <Text style={s.label}>{t('game.photo.size', { petName: pet.name })}</Text>
              <Choices
                value={size}
                onChange={setSize}
                options={['small', 'medium', 'large'].map((o) => [o, t(`q.size.${o}`)])}
              />
            </>
          )}
          {breed && pet.breedId && (
            <>
              <Text style={s.label}>{t('game.photo.breed', { petName: pet.name, breed: breed.name.replace(/^\S+\s/, '') })}</Text>
              <Choices value={breedConfirmed} onChange={setBreedConfirmed} options={[[true, t('game.photo.yes')], [false, t('game.photo.no')]]} />
            </>
          )}
          <Text style={s.note}>{t('game.photo.optional')}</Text>

          {askShare && (
            <View style={s.share}>
              <Checkbox checked={share} onToggle={() => setShare((v) => !v)} label={t('game.photo.shareChoice')} />
              <Text style={s.note}>{t('game.photo.shareNote')}</Text>
            </View>
          )}

          <View style={s.buttons}>
            <StickerButton label={t('game.photo.save')} emoji="⚡" disabled={saving} onPress={save} />
            <StickerButton label={t('game.photo.another')} color={C.paper} disabled={saving} onPress={() => setAsset(null)} />
            <StickerButton label={t('game.photo.notNow')} color={C.paper} disabled={saving} onPress={onCancel} />
          </View>
        </Sticker>
      )}
      <Text style={s.privacy}>{t('game.photo.privacy', { petName: pet.name })}</Text>
    </ScrollView>
  );
}

function Choices({ value, onChange, options }) {
  return (
    <View style={s.chips}>
      {options.map(([id, label]) => {
        const on = value === id;
        return (
          <Pressable
            key={String(id)}
            onPress={() => onChange(on ? null : id)}
            style={[s.chip, on && { backgroundColor: C.mint }]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={s.chipText} maxFontSizeMultiplier={1.6}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  card: { padding: 18 },
  kicker: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  title: { fontFamily: F.bold, fontSize: 24, lineHeight: 30, color: C.ink, marginTop: 4 },
  sub: { fontFamily: F.regular, fontSize: 15, color: C.ink, marginTop: 6, lineHeight: 21 },
  buttons: { gap: 10, marginTop: 16 },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 18, borderWidth: 2, borderColor: C.ink, backgroundColor: C.bg },
  label: { fontFamily: F.semibold, fontSize: 16, color: C.ink, marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  chipText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  note: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 10, lineHeight: 17 },
  share: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(36,22,74,0.15)' },
  privacy: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 16, lineHeight: 17 }
});
