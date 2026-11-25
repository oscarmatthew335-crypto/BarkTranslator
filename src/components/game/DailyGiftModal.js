import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, INK_WIDTH, R } from '../../theme';
import { useI18n } from '../../i18n';
import { GIFT_LADDER } from '../../game/dailyGift';
import { Sticker, StickerButton } from '../ui';

const BURST_OFFSETS = [-44, -22, 0, 22, 44];

// Sticker-styled 7-day daily gift card + post-collect reminder prompt.
export default function DailyGiftModal({
  visible,
  day = 1,
  reward = { day: 1, treats: 10, extraSavers: 0 },
  tomorrow = { day: 2, treats: 15, extraSavers: 0 },
  daysToBigGift = 6,
  claimedToday = false,
  treatEmoji = '🦴',
  showReminderPrompt = false,
  reduceMotion = false,
  onCollect,
  onAcceptReminder,
  onDismissReminder,
  onClose
}) {
  const { t } = useI18n();
  const [bursting, setBursting] = useState(false);
  const burstAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setBursting(false);
      burstAnim.setValue(0);
    }
  }, [visible, burstAnim]);

  const handleCollectPress = () => {
    if (!claimedToday) {
      onCollect?.();
      if (!reduceMotion) {
        setBursting(true);
        burstAnim.setValue(0);
        Animated.timing(burstAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true
        }).start(() => setBursting(false));
      }
      return;
    }
    onClose?.();
  };

  const handleDismissOutside = () => {
    if (!claimedToday) onCollect?.();
    onClose?.();
  };

  const tomorrowLine =
    day === 7
      ? t('game.gift.tomorrowReset', { amount: tomorrow.treats, emoji: treatEmoji })
      : daysToBigGift === 1
      ? t('game.gift.tomorrowBig', { amount: tomorrow.treats, emoji: treatEmoji })
      : t('game.gift.tomorrow', { amount: tomorrow.treats, emoji: treatEmoji, days: daysToBigGift });

  return (
    <Modal visible={Boolean(visible)} transparent animationType="fade" onRequestClose={handleDismissOutside}>
      <Pressable style={s.backdrop} onPress={handleDismissOutside}>
        <Pressable style={s.cardWrap} onPress={() => {}}>
          <Sticker radius={R.viewport} color={C.paper} innerStyle={s.card}>
            <Text style={s.title}>{t('game.gift.title', { day })}</Text>

            <View style={s.ladderRow}>
              {GIFT_LADDER.map((step) => {
                const isToday = step.day === day;
                const isDone = step.day < day || (isToday && claimedToday);
                const bg = isToday ? C.butter : isDone ? C.mint : C.bg;
                return (
                  <View
                    key={step.day}
                    style={[
                      s.stepPill,
                      { backgroundColor: bg },
                      isToday && s.stepToday
                    ]}
                  >
                    <Text style={s.stepDay}>{step.day === 7 ? '🎁' : step.day}</Text>
                    <Text style={s.stepVal}>{isDone && !isToday ? '✓' : step.treats}</Text>
                  </View>
                );
              })}
            </View>

            <View style={s.rewardBox}>
              <Text style={s.amountText}>
                +{reward.treats} {treatEmoji}
              </Text>
              {reward.extraSavers > 0 ? <Text style={s.saverText}>{t('game.gift.saverBonus')}</Text> : null}
              {bursting ? (
                <View style={s.burstLayer} pointerEvents="none">
                  {BURST_OFFSETS.map((dx, i) => (
                    <Animated.Text
                      key={i}
                      style={[
                        s.burstEmoji,
                        {
                          opacity: burstAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                          transform: [
                            { translateX: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                            { translateY: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -76 - (i % 2) * 18] }) },
                            { scale: burstAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 1.25, 0.9] }) }
                          ]
                        }
                      ]}
                    >
                      {treatEmoji}
                    </Animated.Text>
                  ))}
                </View>
              ) : null}
            </View>

            <StickerButton
              label={claimedToday ? t('game.gift.done') : t('game.gift.collect')}
              emoji={claimedToday ? '✅' : '🎁'}
              color={claimedToday ? C.mint : C.butter}
              onPress={handleCollectPress}
            />

            {claimedToday ? <Text style={s.tomorrow}>{tomorrowLine}</Text> : null}

            {claimedToday && showReminderPrompt ? (
              <Sticker radius={18} color={C.bg} style={{ marginTop: 14, width: '100%' }} innerStyle={s.promptBox}>
                <Text style={s.promptText}>🔔 {t('game.reminder.giftPrompt')}</Text>
                <View style={s.promptBtns}>
                  <StickerButton small color={C.mint} label={t('game.reminder.yesPlease')} onPress={onAcceptReminder} />
                  <StickerButton small color={C.paper} label={t('game.photo.notNow')} onPress={onDismissReminder} />
                </View>
              </Sticker>
            ) : null}
          </Sticker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36,29,59,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380
  },
  card: {
    padding: 20,
    alignItems: 'center'
  },
  title: {
    fontFamily: F.bold,
    fontSize: 24,
    color: C.ink,
    textAlign: 'center'
  },
  ladderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 14,
    width: '100%'
  },
  stepPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.ink
  },
  stepToday: {
    borderWidth: INK_WIDTH
  },
  stepDay: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink
  },
  stepVal: {
    fontFamily: F.semibold,
    fontSize: 11,
    color: C.ink,
    marginTop: 2
  },
  rewardBox: {
    marginVertical: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amountText: {
    fontFamily: F.bold,
    fontSize: 34,
    color: C.ink
  },
  saverText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: C.ink,
    marginTop: 4
  },
  burstLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  burstEmoji: {
    position: 'absolute',
    fontSize: 24
  },
  tomorrow: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: C.inkSoft,
    textAlign: 'center',
    marginTop: 10
  },
  promptBox: {
    padding: 12,
    alignItems: 'center',
    gap: 10
  },
  promptText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: C.ink,
    textAlign: 'center',
    lineHeight: 19
  },
  promptBtns: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap'
  }
});
