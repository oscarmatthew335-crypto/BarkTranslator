import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { APP_NAME, MIN_AGE } from '../species';
import { StickerButton } from './ui';
import { Checkbox } from './Checkbox';
import { useI18n } from '../i18n';

// Shown once to people who set up before the age check existed.
export default function AgeCheck({ onConfirm }) {
  const [ok, setOk] = useState(false);
  const { t } = useI18n();
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.content}>
        <Text style={s.emoji}>🐾</Text>
        <Text style={s.title} maxFontSizeMultiplier={1.3}>
          {t('age.title')}
        </Text>
        <Text style={s.body}>
          {t('age.body', { appName: APP_NAME, minAge: MIN_AGE })}
        </Text>
        <View style={{ marginTop: 22 }}>
          <Checkbox checked={ok} onToggle={() => setOk((v) => !v)} label={t('onboarding.ageLabel', { minAge: MIN_AGE })} />
        </View>
      </View>
      <View style={s.footer}>
        <StickerButton label={t('age.continue')} emoji="🐾" disabled={!ok} onPress={onConfirm} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  emoji: { fontSize: 50 },
  title: { fontFamily: F.bold, fontSize: 32, color: C.ink, marginTop: 8 },
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 23, color: C.inkSoft, marginTop: 8 },
  footer: { paddingHorizontal: 22, paddingBottom: 16 }
});
