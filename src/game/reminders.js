// Local on-device streak reminders via expo-notifications.
// Off by default; schedules at most one notification per day at 18:00 local
// time when the player has a streak >= 2 and hasn't played yet that day.

import * as Notifications from 'expo-notifications';
import { dayKey } from './daily';

export const REMINDER_HOUR_LOCAL = 18;

export function shouldOfferReminderPrompt({ streakCount = 0, promptShown = false, remindersEnabled = false } = {}) {
  return Number(streakCount) >= 1 && !promptShown && !remindersEnabled;
}

export function shouldScheduleStreakReminder({
  enabled = false,
  streakCount = 0,
  lastPlayedDay = null,
  today = null,
  lastScheduledDay = null
} = {}) {
  if (!enabled) return false;
  if (Number(streakCount) < 2) return false;
  if (!today) return false;
  if (lastPlayedDay === today) return false;
  if (lastScheduledDay === today) return false;
  return true;
}

// Compute the next 18:00 local Date. If the player hasn't played today and it
// is still before 18:00 local time, returns 18:00 today; otherwise returns
// 18:00 tomorrow (so if they don't play tomorrow before 18:00, it fires once).
export function nextReminderDate(nowMs = Date.now(), { playedToday = false } = {}) {
  const now = new Date(nowMs);
  const target = new Date(nowMs);
  target.setHours(REMINDER_HOUR_LOCAL, 0, 0, 0);
  if (playedToday || target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
    target.setHours(REMINDER_HOUR_LOCAL, 0, 0, 0);
  }
  return target;
}

export function buildStreakReminderMessage({ petName = 'Your pet', streakCount = 2, translateFn } = {}) {
  const cleanName = String(petName || 'Your pet').trim() || 'Your pet';
  const n = Math.max(2, Math.floor(Number(streakCount) || 2));
  if (typeof translateFn === 'function') {
    const body = translateFn('game.reminder.body', { petName: cleanName, n });
    const title = translateFn('game.reminder.title', { petName: cleanName });
    if (body && body !== 'game.reminder.body') {
      return {
        title: title && title !== 'game.reminder.title' ? title : 'Pawlingo',
        body
      };
    }
  }
  return {
    title: 'Pawlingo',
    body: `${cleanName} is waiting! Keep your ${n}-day streak 🔥`
  };
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
  today = dayKey(),
  petName = 'Your pet',
  translateFn = null,
  nowMs = Date.now(),
  lastScheduledDay = null
} = {}) {
  const streakCount = Number(streak?.count || 0);
  if (!enabled || streakCount < 2) {
    await cancelStreakReminders();
    return { scheduled: false, scheduledForDay: null };
  }

  const playedToday = streak?.lastDay === today;
  const triggerDate = nextReminderDate(nowMs, { playedToday });
  const targetDay = dayKey(triggerDate.getTime());

  // At most one local notification per target day.
  if (
    !shouldScheduleStreakReminder({
      enabled,
      streakCount,
      lastPlayedDay: streak?.lastDay || null,
      today: targetDay,
      lastScheduledDay
    })
  ) {
    return { scheduled: false, scheduledForDay: lastScheduledDay };
  }

  const permitted = await requestReminderPermission();
  if (!permitted) {
    return { scheduled: false, scheduledForDay: null };
  }

  await cancelStreakReminders();
  const { title, body } = buildStreakReminderMessage({ petName, streakCount, translateFn });
  try {
    const triggerType = Notifications.SchedulableTriggerInputTypes?.DATE || 'date';
    await Notifications.scheduleNotificationAsync?.({
      content: { title, body },
      trigger: { type: triggerType, date: triggerDate }
    });
    return { scheduled: true, scheduledForDay: targetDay, triggerDate };
  } catch (_) {
    return { scheduled: false, scheduledForDay: null };
  }
}
