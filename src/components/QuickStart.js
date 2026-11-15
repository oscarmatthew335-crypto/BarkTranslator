import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { SPECIES, MIN_AGE } from '../species';
import { Sticker, StickerButton } from './ui';
import { Checkbox } from './Checkbox';
import { useI18n } from '../i18n';

// First launch: one screen, then straight into the first run.
// Only what the game needs is asked here: dog or cat (the runner and its chaser)
// and the age check (ads and purchases start after it). The pet's name, breed,
// home and first sound are asked the first time the translator is opened
// (Onboarding with mode="details"), not before the game.
export default function QuickStart({ onDone }) {
  const { t } = useI18n();
  const [speciesId, setSpeciesId] = useState(null); // no default: a cat owner must not end up with a dog
  const [ageOk, setAgeOk] = useState(false);
  const ready = Boolean(speciesId && ageOk);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.content}>
        <Text style={s.title} maxFontSizeMultiplier={1.3}>
          {t('quick.title')}
        </Text>
        <Text style={s.sub}>{t('quick.sub')}</Text>

        <View style={s.choices}>
          {Object.values(SPECIES).map((opt) => {
            const active = speciesId === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={{ flex: 1 }}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSpeciesId(opt.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(`species.${opt.id}`)}
                accessibilityState={{ selected: active }}
              >
                <Sticker
                  color={active ? (opt.id === 'dog' ? C.butter : C.pink) : C.paper}
                  radius={28}
                  offset={active ? 6 : 4}
                  innerStyle={s.choiceInner}
                >
                  <Text style={s.choiceEmoji}>{opt.emoji}</Text>
                  <Text style={s.choiceLabel}>{t(`species.${opt.id}`)}</Text>
                </Sticker>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 24 }}>
          <Checkbox checked={ageOk} onToggle={() => setAgeOk((v) => !v)} label={t('onboarding.ageLabel', { minAge: MIN_AGE })} />
        </View>
      </View>

      <View style={s.footer}>
        <StickerButton
          label={t('quick.play')}
          emoji="▶️"
          disabled={!ready}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onDone({ species: speciesId });
          }}
        />
        {!speciesId ? (
          <Text style={s.hint}>{t('onboarding.speciesHint')}</Text>
        ) : (
          !ageOk && <Text style={s.hint}>{t('onboarding.ageHint')}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  title: { fontFamily: F.bold, fontSize: 34, lineHeight: 38, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 16, lineHeight: 23, color: C.inkSoft, marginTop: 8 },
  choices: { flexDirection: 'row', gap: 14, marginTop: 28 },
  choiceInner: { alignItems: 'center', paddingVertical: 22 },
  choiceEmoji: { fontSize: 54 },
  choiceLabel: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 6 },
  footer: { paddingHorizontal: 22, paddingBottom: 16 },
  hint: { fontFamily: F.medium, fontSize: 13, color: C.inkSoft, textAlign: 'center', marginTop: 10 }
});
