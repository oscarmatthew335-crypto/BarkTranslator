import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH, R, SP } from '../../theme';
import { useI18n } from '../../i18n';
import { Sticker, StickerButton } from '../ui';
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
import { SlotTabIcon, ColourHeadTileSvg, ItemTileSvg } from './WardrobeIcons';

const SIDE_TABS = ['colour', 'hat', 'glasses', 'neck', 'collar'];
const BOTTOM_TABS = ['colour', 'hat', 'glasses', 'neck', 'collar', 'characters', 'packs'];

// Folder-tab dress-up wardrobe matching the kawaii cartoon style guide.
// All cosmetic, all earned by playing or via optional treat packs.
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
  const [activeTab, setActiveTab] = useState(() => (focusPacks ? 'packs' : 'colour'));
  const [tryCharId, setTryCharId] = useState(null);
  const [products, setProducts] = useState(() => getStoreProducts());
  const [busySku, setBusySku] = useState(null);
  const treatEmoji = species.id === 'cat' ? '🐟' : '🦴';

  const scrollToPacks = () => {
    setActiveTab('packs');
    if (packsY.current != null) scrollRef.current?.scrollTo({ y: Math.max(0, packsY.current - 12), animated: true });
  };

  const onPacksLayout = (e) => {
    packsY.current = e.nativeEvent.layout.y;
    if (focusPacks && !didFocus.current) {
      didFocus.current = true;
      scrollToPacks();
    }
  };

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

  const tabA11yLabel = (tab) => {
    if (tab === 'colour') return t('game.wardrobe.colour');
    if (SLOTS.includes(tab)) return t(`game.wardrobe.slot.${tab}`);
    if (tab === 'characters') return t('game.char.section');
    return t('game.store.treatsTitle');
  };

  return (
    <ScrollView ref={scrollRef} style={s.container} contentContainerStyle={s.content}>
      {/* Top currency bar + close CTA */}
      <View style={s.topBar}>
        <View style={s.currencyPill} accessibilityLabel={t('game.treatsA11y', { n: bank })}>
          <Text style={s.currencyCoin}>🪙</Text>
          <Text style={s.currencyText}>
            {treatEmoji} {bank}
          </Text>
        </View>
        <Text style={s.subHint} numberOfLines={1}>
          {t('game.wardrobe.button')}
        </Text>
      </View>

      {/* Floating "Dress up {pet.name}" hero card with left vertical folder tabs & top-right coral Close */}
      <View style={s.heroStage}>
        <View style={s.sideTabs}>
          {SIDE_TABS.map((tab) => {
            const on = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[s.sideTab, on && s.sideTabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tabA11yLabel(tab)}
              >
                <SlotTabIcon slot={tab} active={on} size={22} />
              </Pressable>
            );
          })}
        </View>

        <View style={s.heroCardWrap}>
          <Sticker radius={R.modal} offset={4} color={C.paper} innerStyle={s.heroCard}>
            <Text style={s.heroTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {t('game.wardrobe.title', { petName: pet.name })}
            </Text>
            <View style={s.previewBox}>
              <PetPreview species={pet.species} wardrobe={wardrobe} character={previewCharId} size={146} pose="front" />
            </View>
            <StickerButton
              small
              color={C.butter}
              label={`+ ${t('game.store.getMore')}`}
              onPress={scrollToPacks}
            />
          </Sticker>

          {/* Circular coral Close button overlapping top-right corner */}
          <Pressable
            onPress={onBack}
            style={s.closeBtnWrap}
            accessibilityRole="button"
            accessibilityLabel={t('game.back')}
          >
            <View style={s.closeShadow} />
            <View style={s.closeBtn}>
              <SlotTabIcon slot="close" active size={18} />
            </View>
          </Pressable>
        </View>
      </View>

      {tryChar ? (
        <Sticker radius={R.modal} color={C.butter} style={{ marginTop: 12 }} innerStyle={{ padding: 12, gap: 8 }}>
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
      ) : null}

      {/* Bottom folder tab bar fused cleanly into the white item tray */}
      <View style={s.bottomTabBar}>
        <Pressable
          onPress={onBack}
          style={s.backTab}
          accessibilityRole="button"
          accessibilityLabel={t('game.back')}
        >
          <SlotTabIcon slot="back" active size={20} />
        </Pressable>
        {BOTTOM_TABS.map((tab) => {
          const on = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.folderTab, on && s.folderTabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tabA11yLabel(tab)}
            >
              <SlotTabIcon slot={tab} active={on} size={22} />
            </Pressable>
          );
        })}
      </View>

      {/* Main White Tray */}
      <Sticker radius={R.modal} offset={4} color={C.paper} innerStyle={s.tray}>
        {activeTab === 'colour' ? (
          <View>
            <Text style={s.trayHeading}>{t('game.wardrobe.colour')}</Text>
            <View style={s.tileGrid}>
              {BODY_COLOURS.map((c) => {
                const on = wardrobe.colour === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onColour(c.id)}
                    style={[s.tile, on && s.tileOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t(`game.colour.${c.id}`)}
                  >
                    <ColourHeadTileSvg species={pet.species} colourObj={c} size={46} />
                    <Text style={s.tileLabel} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                      {t(`game.colour.${c.id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : SLOTS.includes(activeTab) ? (
          <View>
            <Text style={s.trayHeading}>{t(`game.wardrobe.slot.${activeTab}`)}</Text>
            <View style={s.tileGrid}>
              {ITEMS.filter((i) => i.slot === activeTab).map((item) => {
                const owned = wardrobe.owned.includes(item.id);
                const wearing = wardrobe.equipped[activeTab] === item.id;
                const affordable = canBuy(wardrobe, bank, item.id);
                const disabled = !owned && (item.streakOnly || !affordable);
                return (
                  <Pressable
                    key={item.id}
                    disabled={disabled}
                    onPress={() => (owned ? onWear(item.id) : onBuy(item.id))}
                    style={[s.tile, wearing && s.tileOn, disabled && s.tileDim]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: wearing, disabled }}
                    accessibilityLabel={t(`game.item.${item.id}`)}
                  >
                    <ItemTileSvg item={item} size={44} />
                    <Text style={s.tileLabel} numberOfLines={1}>
                      {t(`game.item.${item.id}`)}
                    </Text>
                    <View style={[s.tileBadge, wearing && s.tileBadgeOn, owned && !wearing && s.tileBadgeOwned]}>
                      <Text style={s.tileBadgeText} numberOfLines={1}>
                        {owned
                          ? wearing
                            ? t('game.wardrobe.takeOff')
                            : t('game.wardrobe.wear')
                          : item.streakOnly
                          ? t('game.wardrobe.streak7')
                          : `${treatEmoji} ${item.price}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : activeTab === 'characters' ? (
          <View>
            <Text style={s.trayHeading}>{t('game.char.section')}</Text>
            <View style={s.charGrid}>
              <Pressable
                onPress={() => {
                  setTryCharId(null);
                  onEquipCharacter?.(null);
                }}
                style={[s.charCard, !wardrobe.activeCharacter && s.charCardOn]}
                accessibilityRole="button"
              >
                <PetPreview species={pet.species} wardrobe={wardrobe} character={null} size={78} pose="front" />
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
                    <PetPreview species={pet.species} wardrobe={wardrobe} character={ch.id} size={78} pose="front" />
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
            </View>
          </View>
        ) : null}

        {/* Treat packs always rendered below / anchored for focusPacks scrolling */}
        <View onLayout={onPacksLayout} style={activeTab === 'packs' ? undefined : { marginTop: 18 }}>
          <Text style={s.trayHeading}>{t('game.store.treatsTitle')}</Text>
          {showStarter ? (
            <Sticker radius={R.modal - 4} color={C.butter} style={{ marginBottom: 10 }} innerStyle={s.packCard}>
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
          ) : null}
          <View style={{ gap: 8 }}>
            {TREAT_PACKS.map((pack) => {
              const p = products[pack.id];
              const price = p?.displayPrice || p?.localizedPrice || p?.price || t('game.store.buyBtn');
              return (
                <View key={pack.id} style={s.packRow}>
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
        </View>
      </Sticker>

      <Text style={s.note}>{t('game.wardrobe.note')}</Text>
      <View style={{ marginTop: 14 }}>
        <StickerButton label={t('game.back')} color={C.paper} onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: SP.screenX, paddingTop: 12, paddingBottom: 32 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.pill,
    borderWidth: 2,
    borderColor: C.shadow
  },
  currencyCoin: { fontSize: 15 },
  currencyText: { fontFamily: F.bold, fontSize: 15, color: C.paper, fontVariant: ['tabular-nums'] },
  subHint: { fontFamily: F.bold, fontSize: 18, color: C.ink },

  heroStage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  sideTabs: {
    gap: SP.tabGap,
    zIndex: 2,
    marginRight: -INK_WIDTH
  },
  sideTab: {
    width: 44,
    height: 40,
    backgroundColor: C.tabInactive,
    borderTopLeftRadius: R.tab,
    borderBottomLeftRadius: R.tab,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sideTabOn: {
    backgroundColor: C.paper,
    borderRightColor: C.paper
  },
  heroCardWrap: {
    flex: 1,
    position: 'relative',
    zIndex: 1
  },
  heroCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6
  },
  heroTitle: {
    fontFamily: F.bold,
    fontSize: 19,
    color: C.ink,
    textAlign: 'center'
  },
  previewBox: {
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnWrap: {
    position: 'absolute',
    top: -10,
    right: -6,
    width: 38,
    height: 38
  },
  closeShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 34,
    height: 34,
    borderRadius: R.pill,
    backgroundColor: C.shadow
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: R.pill,
    backgroundColor: C.coral,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },

  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SP.tabGap,
    paddingHorizontal: 4,
    marginBottom: -INK_WIDTH,
    zIndex: 3
  },
  backTab: {
    width: 38,
    height: 36,
    borderTopLeftRadius: R.tab,
    borderTopRightRadius: R.tab,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.tabInactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  folderTab: {
    flex: 1,
    height: 40,
    borderTopLeftRadius: R.tab,
    borderTopRightRadius: R.tab,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.tabInactive,
    alignItems: 'center',
    justifyContent: 'center'
  },
  folderTabOn: {
    height: 44,
    backgroundColor: C.paper,
    borderBottomColor: C.paper
  },

  tray: {
    padding: 14
  },
  trayHeading: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.ink,
    marginBottom: 10
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SP.gridGap
  },
  tile: {
    width: '31.5%',
    minWidth: 88,
    flexGrow: 1,
    backgroundColor: C.tileBg,
    borderRadius: R.tile,
    borderWidth: 2,
    borderColor: C.tileBorder,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4
  },
  tileOn: {
    backgroundColor: C.tileActiveBg,
    borderColor: C.tileActiveBorder,
    borderWidth: INK_WIDTH
  },
  tileDim: {
    opacity: 0.58
  },
  tileLabel: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: C.ink,
    textAlign: 'center'
  },
  tileBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: R.pill,
    backgroundColor: C.butter
  },
  tileBadgeOwned: {
    backgroundColor: C.tabInactive
  },
  tileBadgeOn: {
    backgroundColor: C.lime
  },
  tileBadgeText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.ink
  },

  charGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SP.gridGap
  },
  charCard: {
    width: '48%',
    padding: 10,
    borderRadius: R.tile + 2,
    borderWidth: 2,
    borderColor: C.tileBorder,
    backgroundColor: C.tileBg,
    alignItems: 'center',
    gap: 4
  },
  charCardOn: {
    borderColor: C.tileActiveBorder,
    borderWidth: INK_WIDTH,
    backgroundColor: C.tileActiveBg
  },
  charCardLocked: { opacity: 0.8 },
  charName: { fontFamily: F.bold, fontSize: 13, color: C.ink, textAlign: 'center', minHeight: 32 },
  charBadge: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  charProgWrap: { width: '100%', gap: 3, alignItems: 'center' },
  charProgTrack: { width: '100%', height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.bg, overflow: 'hidden' },
  charProgFill: { height: '100%', backgroundColor: C.lime },
  charProgText: { fontFamily: F.medium, fontSize: 11, color: C.inkSoft },

  packCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.tileBg,
    borderRadius: R.tile,
    borderWidth: 2,
    borderColor: C.tileBorder,
    padding: 10
  },
  packTitle: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  packSub: { fontFamily: F.regular, fontSize: 13, color: C.ink, marginTop: 2 },
  strikePrice: { fontFamily: F.medium, fontSize: 12, color: C.inkSoft, textDecorationLine: 'line-through', marginTop: 2 },
  itemName: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.ink },
  tryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  note: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 14, lineHeight: 17, textAlign: 'center' }
});
