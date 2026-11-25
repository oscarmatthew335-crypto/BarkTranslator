// Local on-device streak reminders via expo-notifications.
// Off by default; schedules at most one notification per day at the player's
// usual play hour (clamped 08:00-20:00, fallback 18:00) from a 1-day streak.

import * as Notifications from 'expo-notifications';
import { dayKey } from './daily';
import { upcomingGiftForDay } from './dailyGift';

export const REMINDER_HOUR_LOCAL = 18;
export const MIN_REMINDER_HOUR = 8;
export const MAX_REMINDER_HOUR = 20;
export const REPROMPT_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_IGNORED_REMINDERS = 3;

export function computeUsualPlayHour(runHours = []) {
  const valid = (Array.isArray(runHours) ? runHours : [])
    .slice(-5)
    .map((h) => Number(h))
    .filter((h) => Number.isFinite(h) && h >= 0 && h <= 23);
  if (valid.length === 0) return REMINDER_HOUR_LOCAL;
  valid.sort((a, b) => a - b);
  const mid = Math.floor(valid.length / 2);
  const median = valid.length % 2 === 1 ? valid[mid] : Math.round((valid[mid - 1] + valid[mid]) / 2);
  return Math.max(MIN_REMINDER_HOUR, Math.min(MAX_REMINDER_HOUR, median));
}

export function shouldOfferReminderPrompt({
  giftClaimed = false,
  giftPromptV1 = false,
  streakCount = 0,
  promptShown = false,
  promptCount = 0,
  promptDismissedAt = null,
  remindersEnabled = false,
  nowMs = Date.now()
} = {}) {
  if (remindersEnabled) return false;
  if (!giftClaimed && Number(streakCount) < 1) return false;
  if (giftClaimed && !giftPromptV1 && (Number(promptCount) >= 2 || (promptShown && promptDismissedAt == null))) {
    return true;
  }
  if (promptDismissedAt != null) {
    return Number(promptCount) < 2 && nowMs - Number(promptDismissedAt) >= REPROMPT_DELAY_MS;
  }
  return !promptShown && Number(promptCount) < 1;
}

// A reminder day that has passed is "ignored" when the player didn't open & claim
// or play on or after that day. Returns the new ignored count and whether to update.
export function settleIgnoredReminder({
  lastReminderDay = null,
  lastPlayedDay = null,
  lastGiftClaimedDay = null,
  today = null,
  ignoredCount = 0
} = {}) {
  const count = Math.max(0, Math.floor(Number(ignoredCount) || 0));
  if (!lastReminderDay || !today || lastReminderDay >= today) return { changed: false, ignoredCount: count };
  const engaged =
    (Boolean(lastPlayedDay) && lastPlayedDay >= lastReminderDay) ||
    (Boolean(lastGiftClaimedDay) && lastGiftClaimedDay >= lastReminderDay);
  return { changed: true, ignoredCount: engaged ? 0 : count + 1 };
}

export function shouldScheduleStreakReminder({
  enabled = false,
  streakCount = 0,
  hasGift = false,
  lastPlayedDay = null,
  giftClaimedDay = null,
  today = null,
  lastScheduledDay = null,
  ignoredCount = 0
} = {}) {
  if (!enabled) return false;
  if (!hasGift && Number(streakCount) < 1) return false;
  if (Number(ignoredCount) >= MAX_IGNORED_REMINDERS) return false;
  if (!today) return false;
  if (giftClaimedDay && giftClaimedDay === today) return false;
  if (!hasGift && lastPlayedDay === today) return false;
  if (lastScheduledDay === today) return false;
  return true;
}

export function nextReminderDate(nowMs = Date.now(), { playedToday = false, claimedToday = false, hour = REMINDER_HOUR_LOCAL } = {}) {
  const clampedHour = Math.max(MIN_REMINDER_HOUR, Math.min(MAX_REMINDER_HOUR, Math.round(Number(hour) || REMINDER_HOUR_LOCAL)));
  const now = new Date(nowMs);
  const target = new Date(nowMs);
  target.setHours(clampedHour, 0, 0, 0);
  if (playedToday || claimedToday || target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
    target.setHours(clampedHour, 0, 0, 0);
  }
  return target;
}

export function buildStreakReminderMessage({
  petName = 'Your pet',
  streakCount = 0,
  gift = null,
  species = 'dog',
  livesEmptyAtClose = false,
  rotationIndex = 0,
  translateFn
} = {}) {
  const cleanName = String(petName || 'Your pet').trim() || 'Your pet';
  const n = Math.max(0, Math.floor(Number(streakCount) || 0));
  const treat = species === 'cat' ? '🐟' : '🦴';
  const tr = (key, vars, fallback) => {
    if (typeof translateFn === 'function') {
      const out = translateFn(key, vars);
      if (out && out !== key) return out;
    }
    return fallback;
  };

  const title = tr('game.reminder.title', { petName: cleanName }, 'Pawlingo');

  if (gift && Number(gift.day) >= 1) {
    const d = Math.max(1, Math.min(7, Math.floor(Number(gift.day) || 1)));
    const amount = Math.max(0, Math.floor(Number(gift.treats) || 0));
    let body;
    if (d === 7) {
      body = tr(
        'game.reminder.giftDay7',
        { petName: cleanName, amount, treat },
        `🎁 ${cleanName}'s big gift is waiting: ${amount} ${treat} + a streak saver`
      );
    } else if (d === 6) {
      body = tr(
        'game.reminder.giftDay6',
        { petName: cleanName, amount, treat },
        `🎁 One more day to ${cleanName}'s big gift (100 ${treat})`
      );
    } else {
      const variants = [
        {
          key: 'game.reminder.giftReady',
          fallback: `🎁 ${cleanName}'s day ${d} gift is ready: ${amount} ${treat}`
        },
        {
          key: 'game.reminder.giftSaved',
          fallback: `🎁 ${cleanName} saved you ${amount} ${treat}. Tap to collect`
        }
      ];
      const chosen = variants[Math.abs(Math.floor(rotationIndex || 0)) % variants.length];
      body = tr(chosen.key, { petName: cleanName, d, amount, treat }, chosen.fallback);
    }
    if (n >= 2) {
      const suffix = tr('game.reminder.streakSuffix', { n }, `…and your ${n}-day streak 🔥`);
      body = `${body} ${suffix}`;
    }
    return { title, body };
  }

  const runN = Math.max(1, n);
  const variants = [{ key: 'game.reminder.dailyReady', fallback: `${cleanName}'s daily run is ready 🐾`, vars: { petName: cleanName } }];
  if (runN >= 2) {
    variants.push({ key: 'game.reminder.body', fallback: `${cleanName} is waiting! Keep your ${runN}-day streak 🔥`, vars: { petName: cleanName, n: runN } });
  }
  if (livesEmptyAtClose) {
    variants.push({ key: 'game.reminder.livesFull', fallback: 'Lives are full: one quick run?', vars: {} });
  }

  const chosen = variants[Math.abs(Math.floor(rotationIndex || 0)) % variants.length];
  const body = tr(chosen.key, chosen.vars, chosen.fallback);
  return { title, body };
}

export async function requestReminderPermission() {
  try {
    const existing = await Notifications.getPermissionsAsync?.();
    if (existing?.granted || existing?.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync?.();
    return Boolean(requested?.granted || requested?.status === 'granted');
  } catch (_) {
    return false;
  }
}

export async function cancelStreakReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync?.();
  } catch (_) {}
}

export async function syncStreakReminder({
  enabled = false,
  streak = null,
  gift = null,
  species = 'dog',
  today = dayKey(),
  petName = 'Your pet',
  translateFn = null,
  nowMs = Date.now(),
  lastScheduledDay = null,
  runHours = [],
  ignoredCount = 0,
  livesEmptyAtClose = false,
  rotationIndex = 0,
  requestPermissionOnSchedule = false
} = {}) {
  const streakCount = Number(streak?.count || 0);
  const hasGiftConfig = Boolean(gift);
  if (!enabled || (!hasGiftConfig && streakCount < 1) || Number(ignoredCount) >= MAX_IGNORED_REMINDERS) {
    await cancelStreakReminders();
    return { scheduled: false, scheduledForDay: null };
  }

  const claimedToday = Boolean(gift?.lastClaimedDay && gift.lastClaimedDay === today);
  const playedToday = !hasGiftConfig && streak?.lastDay === today;
  const hour = computeUsualPlayHour(runHours);
  const triggerDate = nextReminderDate(nowMs, { playedToday, claimedToday, hour });
  const targetDay = dayKey(triggerDate.getTime());
  const upcomingGift = gift ? upcomingGiftForDay(gift, targetDay) : null;

  // Don't notify on a day the gift is already collected.
  if (upcomingGift?.claimedToday) {
    return { scheduled: false, scheduledForDay: lastScheduledDay };
  }

  // At most one local notification per target day.
  if (
    !shouldScheduleStreakReminder({
      enabled,
      streakCount,
      hasGift: Boolean(upcomingGift),
      lastPlayedDay: streak?.lastDay || null,
      giftClaimedDay: gift?.lastClaimedDay || null,
      today: targetDay,
      lastScheduledDay,
      ignoredCount
    })
  ) {
    return { scheduled: false, scheduledForDay: lastScheduledDay };
  }

  const existingPerm = await Notifications.getPermissionsAsync?.();
  let permitted = Boolean(existingPerm?.granted || existingPerm?.status === 'granted');
  if (!permitted && requestPermissionOnSchedule) {
    permitted = await requestReminderPermission();
  }
  if (!permitted) {
    return { scheduled: false, scheduledForDay: null };
  }

  await cancelStreakReminders();
  const { title, body } = buildStreakReminderMessage({
    petName,
    streakCount,
    gift: upcomingGift,
    species,
    livesEmptyAtClose,
    rotationIndex,
    translateFn
  });
  try {
    const triggerType = Notifications.SchedulableTriggerInputTypes?.DATE || 'date';
    await Notifications.scheduleNotificationAsync?.({
      content: {
        title,
        body,
        data: { source: 'reminder', giftDay: upcomingGift?.day || 1 }
      },
      trigger: { type: triggerType, date: triggerDate }
    });
    return { scheduled: true, scheduledForDay: targetDay, triggerDate };
  } catch (_) {
    return { scheduled: false, scheduledForDay: null };
  }
}
