import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { APP_NAME, MIN_AGE } from '../species';
import { StickerButton } from './ui';
import { Checkbox } from './Checkbox';

// Shown once to people who set up before the age check existed.
export default function AgeCheck({ onConfirm }) {
  const [ok, setOk] = useState(false);
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.content}>
        <Text style={s.emoji}>🐾</Text>
        <Text style={s.title} maxFontSizeMultiplier={1.3}>
          One quick check
        </Text>
        <Text style={s.body}>
          {APP_NAME} is for people aged {MIN_AGE} and over, because it can use the microphone and learn from recordings.
        </Text>
        <View style={{ marginTop: 22 }}>
          <Checkbox checked={ok} onToggle={() => setOk((v) => !v)} label={`I'm ${MIN_AGE} or older`} />
        </View>
      </View>
      <View style={s.footer}>
        <StickerButton label="Continue" emoji="🐾" disabled={!ok} onPress={onConfirm} />
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
