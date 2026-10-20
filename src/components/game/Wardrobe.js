import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton, ScreenTitle } from '../ui';
import { BODY_COLOURS, ITEMS, SLOTS, canBuy } from '../../game/wardrobe';
import PetPreview from './PetPreview';

// Dress the pet up with treats collected while playing. All cosmetic, all
// free: there is nothing to buy with money.
export default function Wardrobe({ pet, species, wardrobe, bank, onColour, onBuy, onWear, onBack }) {
  const { t } = useI18n();
  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('game.wardrobe.title', { petName: pet.name })} subtitle={t('game.wardrobe.sub')} />
      <Sticker radius={24} innerStyle={s.hero}>
        <PetPreview species={pet.species} wardrobe={wardrobe} size={150} />
        <Text style={s.bank}>
          {treatEmoji} {bank}
        </Text>
      </Sticker>

      <Text style={s.section}>{t('game.wardrobe.colour')}</Text>
      <View style={s.chips}>
        {BODY_COLOURS.map((c) => {
          const on = wardrobe.colour === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onColour(c.id)}
              style={[s.colour, on && s.colourOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`game.colour.${c.id}`)}
            >
              <View style={[s.swatch, { backgroundColor: c.hex }]}>{c.spots ? <View style={s.spot} /> : null}</View>
              <Text style={s.colourText} maxFontSizeMultiplier={1.6}>
                {t(`game.colour.${c.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {SLOTS.map((slot) => (
        <View key={slot}>
          <Text style={s.section}>{t(`game.wardrobe.slot.${slot}`)}</Text>
          <View style={{ gap: 8 }}>
            {ITEMS.filter((i) => i.slot === slot).map((item) => {
              const owned = wardrobe.owned.includes(item.id);
              const wearing = wardrobe.equipped[slot] === item.id;
              const affordable = canBuy(wardrobe, bank, item.id);
              return (
                <View key={item.id} style={[s.item, wearing && s.itemOn]}>
                  <View style={[s.dot, { backgroundColor: item.colour }]} />
                  <Text style={s.itemName} maxFontSizeMultiplier={1.6}>
                    {t(`game.item.${item.id}`)}
                  </Text>
                  {owned ? (
                    <StickerButton
                      small
                      color={wearing ? C.mint : C.paper}
                      label={wearing ? t('game.wardrobe.takeOff') : t('game.wardrobe.wear')}
                      onPress={() => onWear(item.id)}
                    />
                  ) : (
                    <StickerButton
                      small
                      disabled={!affordable}
                      label={`${treatEmoji} ${item.price}`}
                      onPress={() => onBuy(item.id)}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={s.note}>{t('game.wardrobe.note')}</Text>
      <View style={{ marginTop: 14 }}>
        <StickerButton label={t('game.back')} color={C.paper} onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 36 },
  hero: { padding: 14, alignItems: 'center' },
  bank: { fontFamily: F.bold, fontSize: 22, color: C.ink, marginTop: 4 },
  section: { fontFamily: F.bold, fontSize: 18, color: C.ink, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colour: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  colourOn: { backgroundColor: C.butter, borderWidth: INK_WIDTH },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  spot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.ink },
  colourText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(36,22,74,0.2)', padding: 10 },
  itemOn: { borderColor: C.ink, backgroundColor: '#E6FFF3' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.ink },
  itemName: { flex: 1, fontFamily: F.semibold, fontSize: 15, color: C.ink },
  note: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 16, lineHeight: 17 }
});
