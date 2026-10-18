import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { SPECIES, APP_NAME, MIN_AGE } from '../species';
import { Sticker, StickerButton } from './ui';
import { Checkbox } from './Checkbox';
import { useI18n } from '../i18n';

// Short 3-step first-launch welcome:
//   Step 1: Add your pet (pick dog or cat, name, age check)
//   Step 2: Pick breed & indoor or garden
//   Step 3: Teach your first sound (how learning works + pick first situation)
// Shown once when no pet exists yet; skippable; does not affect existing users.
export default function Onboarding({ onDone }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [speciesId, setSpeciesId] = useState('dog');
  const [name, setName] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [home, setHome] = useState(null);
  const [breedId, setBreedId] = useState(null);
  const [firstContextId, setFirstContextId] = useState(null);

  const sp = SPECIES[speciesId] || SPECIES.dog;
  const petName = name.trim() || sp.defaultName;
  const chosenHome = home || sp.defaultHome;
  const chosenBreed = sp.breeds ? breedId || sp.breeds[0].id : null;

  const finish = (overrideContext = firstContextId) => {
    Keyboard.dismiss();
    onDone({
      species: sp.id,
      name: petName,
      breedId: chosenBreed,
      home: chosenHome,
      contextId: overrideContext || null
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar: progress dots + Back / Skip */}
        <View style={s.topBar}>
          {step > 1 ? (
            <Pressable onPress={() => setStep((v) => v - 1)} accessibilityRole="button" hitSlop={8}>
              <Text style={s.navLink}>{t('onboarding.back')}</Text>
            </Pressable>
          ) : (
            <View style={{ width: 54 }} />
          )}
          <View style={s.dots} accessible accessibilityLabel={`Step ${step} of 3`}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={[s.dot, n === step && s.dotActive]} />
            ))}
          </View>
          {ageOk ? (
            <Pressable onPress={() => finish()} accessibilityRole="button" hitSlop={8}>
              <Text style={s.navLink}>{t('onboarding.skip')}</Text>
            </Pressable>
          ) : (
            <View style={{ width: 54 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {step === 1 && (
            <Pressable onPress={Keyboard.dismiss} accessible={false}>
              <Text style={s.title} maxFontSizeMultiplier={1.3}>
                {t('onboarding.title')}
              </Text>
              <Text style={s.sub}>
                {t('onboarding.sub', { appName: APP_NAME })}
              </Text>

              <View style={s.choices}>
                {Object.values(SPECIES).map((opt) => {
                  const active = sp.id === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={{ flex: 1 }}
                      onPress={() => {
                        Keyboard.dismiss();
                        Haptics.selectionAsync().catch(() => {});
                        setSpeciesId(opt.id);
                        setBreedId(null);
                        setHome(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected: active }}
                    >
                      <Sticker
                        color={active ? (opt.id === 'dog' ? C.butter : C.pink) : C.paper}
                        radius={28}
                        offset={active ? 6 : 4}
                        innerStyle={s.choiceInner}
                      >
                        <Text style={s.choiceEmoji}>{opt.emoji}</Text>
                        <Text style={s.choiceLabel}>{opt.label}</Text>
                      </Sticker>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: 24 }}>
                <Text style={s.label}>{t('onboarding.petNameLabel', { species: sp.label.toLowerCase() })}</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={sp.defaultName}
                  placeholderTextColor={C.inkSoft}
                  autoCapitalize="words"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                  maxLength={20}
                />
              </View>

              <View style={{ marginTop: 20 }}>
                <Checkbox checked={ageOk} onToggle={() => setAgeOk((v) => !v)} label={t('onboarding.ageLabel', { minAge: MIN_AGE })} />
              </View>
            </Pressable>
          )}
          {step === 2 && (
            <View>
              <Text style={s.title} maxFontSizeMultiplier={1.3}>
                About {petName}
              </Text>
              <Text style={s.sub}>
                This helps {APP_NAME} pick translations that fit {petName}'s home and voice.
              </Text>

              <Text style={[s.label, { marginTop: 22 }]}>Where does {petName} hang out?</Text>
              <View style={s.segment}>
                {[
                  { id: 'indoor', label: '🏠 Indoors' },
                  { id: 'garden', label: '🌳 Has a garden' }
                ].map((opt) => {
                  const on = chosenHome === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[s.segBtn, on && { backgroundColor: C.mint }]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
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

              {sp.breeds && (
                <>
                  <Text style={[s.label, { marginTop: 20 }]}>Pick {petName}'s breed (changes the voice)</Text>
                  <View style={{ gap: 8 }}>
                    {sp.breeds.map((b) => {
                      const on = chosenBreed === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          style={[s.breedRow, on && s.breedRowOn]}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
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
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={s.title} maxFontSizeMultiplier={1.3}>
                {t('onboarding.step3Title', { petName })}
              </Text>
              <Text style={s.sub}>
                {t('onboarding.step3Sub', { appName: APP_NAME, petName })}
              </Text>

              <Sticker radius={24} innerStyle={s.teachCard} style={{ marginTop: 18 }}>
                <Text style={s.stepLine}>{t('onboarding.step3Point1', { petName, sound: sp.sound })}</Text>
                <Text style={s.stepLine}>{t('onboarding.step3Point2', { appName: APP_NAME, petName })}</Text>
                <Text style={s.stepLine}>{t('onboarding.step3Point3', { appName: APP_NAME, sounds: sp.sounds })}</Text>
              </Sticker>

              <Text style={[s.label, { marginTop: 22 }]}>What is {petName} doing right now? (optional)</Text>
              <View style={s.chips}>
                {sp.contexts
                  .filter((c) => c.id !== 'chat')
                  .map((c) => {
                    const on = firstContextId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[s.chip, on && { backgroundColor: C.sky }]}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setFirstContextId(on ? null : c.id);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={s.chipText}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}
        </ScrollView>
        <View style={s.footer}>
          {step < 3 ? (
            <>
              <StickerButton
                label={t('onboarding.next')}
                emoji="🐾"
                disabled={!ageOk}
                onPress={() => {
                  Keyboard.dismiss();
                  Haptics.selectionAsync().catch(() => {});
                  setStep((v) => v + 1);
                }}
              />
              {!ageOk && <Text style={s.hint}>{t('onboarding.ageHint')}</Text>}
            </>
          ) : (
            <StickerButton
              label={t('onboarding.startTranslatingPet', { petName })}
              emoji="🐾"
              onPress={() => finish(firstContextId)}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14 },
  navLink: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  dotActive: { backgroundColor: C.butter, width: 24 },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20 },
  title: { fontFamily: F.bold, fontSize: 34, lineHeight: 38, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 16, lineHeight: 22, color: C.inkSoft, marginTop: 8 },
  choices: { flexDirection: 'row', gap: 14, marginTop: 22 },
  choiceInner: { alignItems: 'center', paddingVertical: 24 },
  choiceEmoji: { fontSize: 60 },
  choiceLabel: { fontFamily: F.bold, fontSize: 22, color: C.ink, marginTop: 6 },
  label: { fontFamily: F.semibold, fontSize: 17, color: C.ink, marginBottom: 8 },
  input: {
    backgroundColor: C.paper,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: F.medium,
    fontSize: 20,
    color: C.ink
  },
  segment: { flexDirection: 'row', borderWidth: INK_WIDTH, borderColor: C.ink, borderRadius: 999, overflow: 'hidden', backgroundColor: C.paper },
  segBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  segText: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  breedRow: { padding: 12, borderRadius: 16, backgroundColor: C.paper, borderWidth: 2, borderColor: 'rgba(36,22,74,0.18)' },
  breedRowOn: { borderColor: C.ink, backgroundColor: C.butter },
  breedName: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  breedTrait: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 2 },
  teachCard: { padding: 16, gap: 10 },
  stepLine: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  chipText: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  footer: { paddingHorizontal: 22, paddingBottom: 16, paddingTop: 6 },
  hint: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, textAlign: 'center', marginTop: 8 }
});


