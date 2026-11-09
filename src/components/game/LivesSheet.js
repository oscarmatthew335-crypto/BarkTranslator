import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { C, F, INK_WIDTH } from '../../theme';
import { useI18n } from '../../i18n';
import { livesNow, formatWait, MAX_LIVES } from '../../game/lives';
import { Sticker, StickerButton } from '../ui';

// Shown when the player taps Play (Endless) or Chase with 0 lives.
export default function LivesSheet({
  visible,
  livesState,
  premium = false,
  adReady = false,
  onWatchAd,
  onOpenPremium,
  onClose
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const info = livesNow(livesState, now, { premium });
  const waitStr = formatWait(info.msUntilNext);

  const handleWatch = async () => {
    if (watching) return;
    setWatching(true);
    try {
      await onWatchAd?.();
    } finally {
      setWatching(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>{t('game.lives.outTitle')}</Text>
          <Text style={s.sub}>{t('game.lives.outSub', { wait: waitStr })}</Text>

          <Sticker radius={20} color={C.paper} style={{ marginTop: 12 }} innerStyle={s.statusBox}>
            <Text style={s.hearts}>
              {'❤️'.repeat(info.lives)}
              {'🤍'.repeat(Math.max(0, MAX_LIVES - info.lives))}
            </Text>
            <Text style={s.waitText}>
              {info.lives > 0
                ? t('game.lives.readyNow', { n: info.lives, max: MAX_LIVES })
                : t('game.lives.waitLabel', { wait: waitStr })}
            </Text>
          </Sticker>

          <View style={s.buttons}>
            {adReady && (
              <StickerButton
                label={t('game.lives.watchAd')}
                emoji="🎬"
                color={C.butter}
                disabled={watching}
                onPress={handleWatch}
              />
            )}
            <StickerButton
              label={t('game.lives.getPremium')}
              emoji="👑"
              color={C.mint}
              onPress={onOpenPremium}
            />
            <StickerButton
              label={t('game.lives.waitBtn', { wait: waitStr })}
              color={C.paper}
              small
              onPress={onClose}
            />
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
  statusBox: { padding: 14, alignItems: 'center', gap: 6 },
  hearts: { fontSize: 22, letterSpacing: 2 },
  waitText: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  buttons: { gap: 10, marginTop: 16 }
});
