import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../theme';
import { getSpecies, APP_NAME } from '../species';
import SpeechBubble from './SpeechBubble';
import { translate } from '../i18n';

// A 4:5 picture card (photo + speech bubble + branding) rendered off-screen
// and captured as an image for sharing to WhatsApp, Instagram or TikTok.
const ShareCard = forwardRef(function ShareCard({ item }, ref) {
  const sp = getSpecies(item.species || 'dog');
  const name = item.petName || item.dogName;
  return (
    <View style={s.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={s.card}>
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.noPhoto]}>
            <Text style={s.bigPet}>{sp.emoji}</Text>
          </View>
        )}
        <View style={s.bubbleArea}>
          <SpeechBubble name={name} face={item.personalityFace || sp.emoji} text={item.text} size="card" />
        </View>
        <View style={s.footer}>
          <View>
            <Text style={s.brand}>🐾 {APP_NAME}</Text>
            <Text style={s.cta}>{translate('share.cta', { species: translate(`species.${sp.id}`).toLowerCase() })}</Text>
          </View>
          <View style={s.store}>
            <Text style={s.storeSmall}>{translate('share.freeOn')}</Text>
            <Text style={s.storeBig}>Google Play</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default ShareCard;

const W = 360;
const H = 450;

const s = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0, width: W, height: H },
  card: { width: W, height: H, backgroundColor: C.bg, overflow: 'hidden' },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  bigPet: { fontSize: 190, marginBottom: 120 },
  bubbleArea: { position: 'absolute', left: 14, right: 14, bottom: 68 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 58,
    backgroundColor: C.butter,
    borderTopWidth: INK_WIDTH,
    borderTopColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14
  },
  brand: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  cta: { fontFamily: F.medium, fontSize: 11, color: C.ink },
  store: { backgroundColor: C.ink, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  storeSmall: { fontFamily: F.regular, fontSize: 9, color: C.paper },
  storeBig: { fontFamily: F.semibold, fontSize: 13, color: C.paper, marginTop: -2 }
});
