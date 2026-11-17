import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton, ScreenTitle } from '../ui';
import { BODY_COLOURS, ITEMS, SLOTS, canBuy } from '../../game/wardrobe';
import { CHARACTERS, getCharacter, isCharacterOwned, canUnlockCharacter } from '../../game/characters';
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
export default function Wardrobe({
  pet,
  species,
  wardrobe,
  bank,
  storeState,
  onColour,
  onBuy,
  onWear,
  onBuyCharacter,
  onEquipCharacter,
  onViewCharacter,
  onTryCharacter,
  onBack,
  focusPacks = false
}) {
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const packsY = useRef(null);
  const didFocus = useRef(false);
  const [tryCharId, setTryCharId] = useState(null);
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
  const previewCharId = tryCharId ?? wardrobe.activeCharacter ?? null;
  const tryChar = tryCharId ? getCharacter(tryCharId) : null;
  const tryProduct = tryChar?.productId ? products[tryChar.productId] : null;
  const tryPlayPrice = tryProduct?.displayPrice || tryProduct?.localizedPrice || tryProduct?.price || null;
  const tryNeed = tryChar && tryChar.price != null ? Math.max(0, tryChar.price - bank) : 0;

  return (
    <ScrollView ref={scrollRef} style={s.container} contentContainerStyle={s.content}>
      <ScreenTitle title={t('game.wardrobe.title', { petName: pet.name })} subtitle={t('game.wardrobe.sub')} />
      <Sticker radius={24} innerStyle={s.hero}>
        <PetPreview species={pet.species} wardrobe={wardrobe} character={previewCharId} size={150} />
        <Text style={s.bank}>
          {treatEmoji} {bank}
        </Text>
        <StickerButton small color={C.butter} label={`+ ${t('game.store.getMore')}`} onPress={scrollToPacks} />
      </Sticker>

      {tryChar && (
        <Sticker radius={20} color={C.butter} style={{ marginTop: 12 }} innerStyle={{ padding: 12, gap: 8 }}>
          <Text style={s.packTitle}>{t('game.char.petAs', { petName: pet.name, character: t(tryChar.nameKey) })}</Text>
          <View style={s.tryRow}>
            {tryChar.productId ? (
              <StickerButton
                small
                color={C.mint}
                disabled={!tryPlayPrice || Boolean(busySku)}
                label={tryPlayPrice ? String(tryPlayPrice) : t('game.char.unavailable')}
                onPress={() => handleBuyPack(tryChar.productId)}
              />
            ) : canUnlockCharacter(wardrobe, bank, tryChar.id) ? (
              <StickerButton
                small
                color={C.mint}
                label={t('game.char.unlockFor', { n: tryChar.price, emoji: treatEmoji })}
                onPress={() => {
                  onBuyCharacter?.(tryChar.id);
                  setTryCharId(null);
                }}
              />
            ) : (
              <StickerButton
                small
                color={C.paper}
                label={t('game.char.needMore', { n: tryNeed })}
                onPress={scrollToPacks}
              />
            )}
            <StickerButton small color={C.paper} label={t('game.back')} onPress={() => setTryCharId(null)} />
          </View>
        </Sticker>
      )}

      <Text style={s.section}>{t('game.char.section')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.charRow}>
        <Pressable
          onPress={() => {
            setTryCharId(null);
            onEquipCharacter?.(null);
          }}
          style={[s.charCard, !wardrobe.activeCharacter && s.charCardOn]}
          accessibilityRole="button"
        >
          <PetPreview species={pet.species} wardrobe={wardrobe} character={null} size={84} />
          <Text style={s.charName} numberOfLines={1}>{t('game.char.myPet')}</Text>
          <Text style={s.charBadge}>
            {!wardrobe.activeCharacter ? t('game.char.wearing') : t('game.wardrobe.wear')}
          </Text>
        </Pressable>
        {CHARACTERS.map((ch) => {
          const owned = isCharacterOwned(wardrobe, ch.id);
          const wearing = wardrobe.activeCharacter === ch.id;
          const p = ch.productId ? products[ch.productId] : null;
          const playPrice = p?.displayPrice || p?.localizedPrice || p?.price || null;
          const pct = ch.price ? Math.min(1, Math.max(0, bank / ch.price)) : 0;
          return (
            <Pressable
              key={ch.id}
              onPress={() => {
                onViewCharacter?.(ch.id);
                if (owned) {
                  setTryCharId(null);
                  onEquipCharacter?.(ch.id);
                } else {
                  setTryCharId(ch.id);
                  onTryCharacter?.(ch.id);
                }
              }}
              style={[s.charCard, wearing && s.charCardOn, !owned && s.charCardLocked]}
              accessibilityRole="button"
            >
              <PetPreview species={pet.species} wardrobe={wardrobe} character={ch.id} size={84} />
              <Text style={s.charName} numberOfLines={2}>
                {t('game.char.petAs', { petName: pet.name, character: t(ch.nameKey) })}
              </Text>
              {owned ? (
                <Text style={s.charBadge}>{wearing ? t('game.char.wearing') : t('game.wardrobe.wear')}</Text>
              ) : ch.productId ? (
                <Text style={s.charBadge}>{playPrice || t('game.char.unavailable')}</Text>
              ) : (
                <View style={s.charProgWrap}>
                  <View style={s.charProgTrack}>
                    <View style={[s.charProgFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                  <Text style={s.charProgText}>
                    {Math.min(bank, ch.price)} / {ch.price} {treatEmoji}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

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
  note: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 16, lineHeight: 17 },
  tryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  charRow: { gap: 10, paddingVertical: 4 },
  charCard: { width: 132, padding: 10, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(36,22,74,0.2)', backgroundColor: C.paper, alignItems: 'center', gap: 4 },
  charCardOn: { borderColor: C.ink, borderWidth: INK_WIDTH, backgroundColor: '#E6FFF3' },
  charCardLocked: { opacity: 0.78 },
  charName: { fontFamily: F.bold, fontSize: 13, color: C.ink, textAlign: 'center', minHeight: 32 },
  charBadge: { fontFamily: F.semibold, fontSize: 12, color: C.ink },
  charProgWrap: { width: '100%', gap: 3, alignItems: 'center' },
  charProgTrack: { width: '100%', height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.bg, overflow: 'hidden' },
  charProgFill: { height: '100%', backgroundColor: C.mint },
  charProgText: { fontFamily: F.medium, fontSize: 11, color: C.inkSoft }
});
