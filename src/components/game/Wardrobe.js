import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton, ScreenTitle } from '../ui';
import { BODY_COLOURS, ITEMS, SLOTS, canBuy } from '../../game/wardrobe';
import {
  TREAT_PACKS,
  STARTER_PACK,
  isStarterPackVisible,
  starterPackStrikethrough
} from '../../game/storeItems';
import { getStoreProducts, buyProduct, onPurchaseEvent } from '../../game/purchases';
import PetPreview from './PetPreview';

// Dress the pet up with treats collected while playing. All cosmetic, all
// earned by playing or via optional treat packs.
export default function Wardrobe({ pet, species, wardrobe, bank, storeState, onColour, onBuy, onWear, onBack, focusPacks = false }) {
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const packsY = useRef(null);
  const didFocus = useRef(false);
  const scrollToPacks = () => {
    if (packsY.current != null) scrollRef.current?.scrollTo({ y: Math.max(0, packsY.current - 12), animated: true });
  };
  const onPacksLayout = (e) => {
    packsY.current = e.nativeEvent.layout.y;
    if (focusPacks && !didFocus.current) {
      didFocus.current = true;
      scrollToPacks();
    }
  };
  const [products, setProducts] = useState(() => getStoreProducts());
  const [busySku, setBusySku] = useState(null);
  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';

  useEffect(() => {
    setProducts(getStoreProducts());
    return onPurchaseEvent((ev) => {
      if (ev?.type === 'products' && ev.products) setProducts(ev.products);
    });
  }, []);

  const showStarter = isStarterPackVisible(storeState);
  const strikePrice = showStarter ? starterPackStrikethrough(products) : null;
  const starterProduct = products[STARTER_PACK.id];
  const starterPriceLabel =
    starterProduct?.displayPrice || starterProduct?.localizedPrice || starterProduct?.price || null;

  const handleBuyPack = async (sku) => {
    if (busySku) return;
    setBusySku(sku);
    try {
      await buyProduct(sku);
    } finally {
      setBusySku(null);
    }
  };
  return (
    <ScrollView ref={scrollRef} style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('game.wardrobe.title', { petName: pet.name })} subtitle={t('game.wardrobe.sub')} />
      <Sticker radius={24} innerStyle={s.hero}>
        <PetPreview species={pet.species} wardrobe={wardrobe} size={150} />
        <Text style={s.bank}>
          {treatEmoji} {bank}
        </Text>
        <StickerButton small color={C.butter} label={`+ ${t('game.store.getMore')}`} onPress={scrollToPacks} />
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
                  ) : item.streakOnly ? (
                    <StickerButton small disabled label={t('game.wardrobe.streak7')} onPress={() => {}} />
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
      <Text style={s.section} onLayout={onPacksLayout}>
        {t('game.store.treatsTitle')}
      </Text>
      {showStarter && (
        <Sticker radius={20} color={C.butter} style={{ marginBottom: 10 }} innerStyle={s.packCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.packTitle}>👑 {t('game.store.starterTitle')}</Text>
            <Text style={s.packSub}>{t('game.store.starterSub', { emoji: treatEmoji })}</Text>
            {strikePrice ? <Text style={s.strikePrice}>{strikePrice}</Text> : null}
          </View>
          <StickerButton
            small
            color={C.paper}
            disabled={Boolean(busySku)}
            label={starterPriceLabel || t('game.store.buyBtn')}
            onPress={() => handleBuyPack(STARTER_PACK.id)}
          />
        </Sticker>
      )}
      <View style={{ gap: 8 }}>
        {TREAT_PACKS.map((pack) => {
          const p = products[pack.id];
          const price = p?.displayPrice || p?.localizedPrice || p?.price || t('game.store.buyBtn');
          return (
            <View key={pack.id} style={s.item}>
              <Text style={s.itemName}>
                {treatEmoji} {t(`game.store.${pack.id}`, { n: pack.treats })}
              </Text>
              <StickerButton
                small
                color={C.butter}
                disabled={Boolean(busySku)}
                label={String(price)}
                onPress={() => handleBuyPack(pack.id)}
              />
            </View>
          );
        })}
      </View>

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
  packCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  packTitle: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  packSub: { fontFamily: F.regular, fontSize: 13, color: C.ink, marginTop: 2 },
  strikePrice: { fontFamily: F.medium, fontSize: 12, color: C.inkSoft, textDecorationLine: 'line-through', marginTop: 2 },
  note: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 16, lineHeight: 17 }
});
