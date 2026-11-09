import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { getPremiumProduct, buyPremium, restorePremium, onPurchaseEvent } from '../../game/purchases';
import { Sticker, StickerButton } from '../ui';

// One-time Pawlingo Premium purchase sheet (`pawlingo_premium`).
export default function PremiumSheet({ visible, premium = false, onGranted, onClose }) {
  const { t } = useI18n();
  const [product, setProduct] = useState(() => getPremiumProduct());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!visible) return undefined;
    setProduct(getPremiumProduct());
    setMessage(null);
    return onPurchaseEvent((ev) => {
      if (ev?.type === 'product' && ev.product) setProduct(ev.product);
      if (ev?.type === 'granted' || ev?.type === 'restored') {
        onGranted?.(true);
        setMessage(t('game.premium.unlockedMsg'));
      } else if (ev?.type === 'pending') {
        setMessage(t('game.premium.pendingMsg'));
      }
    });
  }, [visible, onGranted, t]);

  const priceLabel = product?.displayPrice || product?.localizedPrice || product?.price || null;

  const handleBuy = async () => {
    if (busy || premium) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await buyPremium();
      if (res?.status === 'purchased') {
        onGranted?.(true);
        setMessage(t('game.premium.unlockedMsg'));
      } else if (res?.status === 'pending') {
        setMessage(t('game.premium.pendingMsg'));
      } else if (res?.status === 'unavailable' || res?.status === 'error') {
        setMessage(t('game.premium.errorMsg'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const ok = await restorePremium();
      if (ok) {
        onGranted?.(true);
        setMessage(t('game.premium.restoredMsg'));
      } else {
        setMessage(t('game.premium.nothingToRestore'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>👑 {t('game.premium.title')}</Text>
          <Text style={s.sub}>{t('game.premium.sub')}</Text>

          <Sticker radius={20} color={C.paper} style={{ marginTop: 12 }} innerStyle={s.perksBox}>
            <Text style={s.perk}>❤️ {t('game.premium.perkLives')}</Text>
            <Text style={s.perk}>🚫 {t('game.premium.perkNoAds')}</Text>
            <Text style={s.perk}>⚡ {t('game.premium.perkContinue')}</Text>
          </Sticker>

          {message ? (
            <Sticker radius={16} color={C.mint} style={{ marginTop: 12 }} innerStyle={{ padding: 10 }}>
              <Text style={s.msgText}>{message}</Text>
            </Sticker>
          ) : null}

          <View style={s.buttons}>
            {premium ? (
              <Sticker radius={18} color={C.mint} innerStyle={{ padding: 12, alignItems: 'center' }}>
                <Text style={s.activeText}>✅ {t('game.premium.active')}</Text>
              </Sticker>
            ) : (
              <StickerButton
                label={priceLabel ? t('game.premium.buyWithPrice', { price: priceLabel }) : t('game.premium.buy')}
                emoji="👑"
                color={C.butter}
                disabled={busy}
                onPress={handleBuy}
              />
            )}
            <StickerButton
              label={t('game.premium.restore')}
              color={C.paper}
              small
              disabled={busy}
              onPress={handleRestore}
            />
            <StickerButton label={t('game.back')} color={C.paper} small onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,22,74,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    padding: 20,
    paddingBottom: 30
  },
  title: { fontFamily: F.bold, fontSize: 24, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 14, color: C.inkSoft, marginTop: 4, lineHeight: 20 },
  perksBox: { padding: 14, gap: 8 },
  perk: { fontFamily: F.semibold, fontSize: 15, color: C.ink, lineHeight: 21 },
  msgText: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  activeText: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  buttons: { gap: 10, marginTop: 16 }
});
