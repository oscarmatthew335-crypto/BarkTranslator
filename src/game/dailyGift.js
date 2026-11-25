// 7-day daily gift ladder (one gift per calendar day in the phone's time zone).
// Plain functions so they can be unit-tested cleanly with any day key.

import { dayKey, dayNumber } from './daily';

export const GIFT_LADDER = [
  { day: 1, treats: 10, extraSavers: 0 },
  { day: 2, treats: 15, extraSavers: 0 },
  { day: 3, treats: 20, extraSavers: 0 },
  { day: 4, treats: 25, extraSavers: 0 },
  { day: 5, treats: 30, extraSavers: 0 },
  { day: 6, treats: 40, extraSavers: 0 },
  { day: 7, treats: 100, extraSavers: 1 }
];

export const emptyGiftState = () => ({ day: 0, lastClaimedDay: null });

export function giftForDay(day) {
  const n = Math.max(1, Math.floor(Number(day) || 1));
  const idx = ((n - 1) % GIFT_LADDER.length + GIFT_LADDER.length) % GIFT_LADDER.length;
  return { ...GIFT_LADDER[idx] };
}

export function giftStatus(giftState, today = dayKey()) {
  const state = giftState && typeof giftState === 'object' ? giftState : emptyGiftState();
  const prevDay = Math.max(0, Math.floor(Number(state.day) || 0));
  const lastClaimedDay = state.lastClaimedDay || null;

  if (!lastClaimedDay) {
    const reward = giftForDay(1);
    const tomorrow = giftForDay(2);
    return {
      claimedToday: false,
      currentDay: 0,
      nextDay: 1,
      afterGap: false,
      reward,
      tomorrow,
      daysToBigGift: 6
    };
  }

  const gap = dayNumber(today) - dayNumber(lastClaimedDay);
  if (gap <= 0) {
    const currentDay = Math.max(1, Math.min(7, prevDay || 1));
    const nextAfter = currentDay >= 7 ? 1 : currentDay + 1;
    return {
      claimedToday: true,
      currentDay,
      nextDay: nextAfter,
      afterGap: false,
      reward: giftForDay(currentDay),
      tomorrow: giftForDay(nextAfter),
      daysToBigGift: currentDay >= 7 ? 7 : 7 - currentDay
    };
  }

  if (gap === 1 || gap === 2) {
    const nextDay = prevDay >= 7 || prevDay < 1 ? 1 : prevDay + 1;
    const afterNext = nextDay >= 7 ? 1 : nextDay + 1;
    return {
      claimedToday: false,
      currentDay: nextDay,
      nextDay,
      afterGap: gap === 2,
      reward: giftForDay(nextDay),
      tomorrow: giftForDay(afterNext),
      daysToBigGift: nextDay >= 7 ? 7 : 7 - nextDay
    };
  }

  // Missed 2 or more full days (gap >= 3): reset ladder to day 1.
  return {
    claimedToday: false,
    currentDay: 1,
    nextDay: 1,
    afterGap: true,
    reward: giftForDay(1),
    tomorrow: giftForDay(2),
    daysToBigGift: 6
  };
}

export function claimDailyGift(giftState, today = dayKey()) {
  const st = giftStatus(giftState, today);
  const baseGift = giftState && typeof giftState === 'object' ? giftState : emptyGiftState();
  if (st.claimedToday) {
    return {
      claimed: false,
      gift: { day: baseGift.day || st.currentDay, lastClaimedDay: baseGift.lastClaimedDay || null },
      day: st.currentDay,
      treats: 0,
      extraSavers: 0,
      afterGap: false,
      tomorrow: st.tomorrow,
      daysToBigGift: st.daysToBigGift
    };
  }
  const nextGift = { day: st.nextDay, lastClaimedDay: today };
  return {
    claimed: true,
    gift: nextGift,
    day: st.nextDay,
    treats: st.reward.treats,
    extraSavers: st.reward.extraSavers,
    afterGap: st.afterGap,
    tomorrow: st.tomorrow,
    daysToBigGift: st.daysToBigGift
  };
}

export function upcomingGiftForDay(giftState, targetDay) {
  const st = giftStatus(giftState, targetDay);
  if (st.claimedToday) {
    return {
      day: st.currentDay,
      treats: st.reward.treats,
      extraSavers: st.reward.extraSavers,
      claimedToday: true
    };
  }
  return {
    day: st.nextDay,
    treats: st.reward.treats,
    extraSavers: st.reward.extraSavers,
    claimedToday: false
  };
}
