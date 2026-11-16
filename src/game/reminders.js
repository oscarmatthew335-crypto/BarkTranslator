// Local on-device streak reminders via expo-notifications.
// Off by default; schedules at most one notification per day at the player's
// usual play hour (clamped 08:00-20:00, fallback 18:00) from a 1-day streak.

import * as Notifications from 'expo-notifications';
import { dayKey } from './daily';

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
  streakCount = 0,
  promptShown = false,
  promptCount = 0,
  promptDismissedAt = null,
  remindersEnabled = false,
  nowMs = Date.now()
} = {}) {
  if (remindersEnabled) return false;
  if (Number(streakCount) < 1) return false;
  if (promptDismissedAt != null) {
    return Number(promptCount) < 2 && nowMs - Number(promptDismissedAt) >= REPROMPT_DELAY_MS;
  }
  return !promptShown && Number(promptCount) < 1;
}

export function shouldScheduleStreakReminder({
  enabled = false,
  streakCount = 0,
  lastPlayedDay = null,
  today = null,
  lastScheduledDay = null,
  ignoredCount = 0
} = {}) {
  if (!enabled) return false;
  if (Number(streakCount) < 1) return false;
  if (Number(ignoredCount) >= MAX_IGNORED_REMINDERS) return false;
  if (!today) return false;
  if (lastPlayedDay === today) return false;
  if (lastScheduledDay === today) return false;
  return true;
}

export function nextReminderDate(nowMs = Date.now(), { playedToday = false, hour = REMINDER_HOUR_LOCAL } = {}) {
  const clampedHour = Math.max(MIN_REMINDER_HOUR, Math.min(MAX_REMINDER_HOUR, Math.round(Number(hour) || REMINDER_HOUR_LOCAL)));
  const now = new Date(nowMs);
  const target = new Date(nowMs);
  target.setHours(clampedHour, 0, 0, 0);
  if (playedToday || target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
    target.setHours(clampedHour, 0, 0, 0);
  }
  return target;
}

export function buildStreakReminderMessage({
  petName = 'Your pet',
  streakCount = 1,
  livesEmptyAtClose = false,
  rotationIndex = 0,
  translateFn
} = {}) {
  const cleanName = String(petName || 'Your pet').trim() || 'Your pet';
  const n = Math.max(1, Math.floor(Number(streakCount) || 1));

  const variants = [{ key: 'game.reminder.dailyReady', fallback: `${cleanName}'s daily run is ready 🐾`, vars: { petName: cleanName } }];
  if (n >= 2) {
    variants.push({ key: 'game.reminder.body', fallback: `${cleanName} is waiting! Keep your ${n}-day streak 🔥`, vars: { petName: cleanName, n } });
  }
  if (livesEmptyAtClose) {
    variants.push({ key: 'game.reminder.livesFull', fallback: 'Lives are full: one quick run?', vars: {} });
  }

  const chosen = variants[Math.abs(Math.floor(rotationIndex || 0)) % variants.length];
  let body = chosen.fallback;
  let title = 'Pawlingo';

  if (typeof translateFn === 'function') {
    const trBody = translateFn(chosen.key, chosen.vars);
    const trTitle = translateFn('game.reminder.title', { petName: cleanName });
    if (trBody && trBody !== chosen.key) body = trBody;
    if (trTitle && trTitle !== 'game.reminder.title') title = trTitle;
  }

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
  if (!enabled || streakCount < 1 || Number(ignoredCount) >= MAX_IGNORED_REMINDERS) {
    await cancelStreakReminders();
    return { scheduled: false, scheduledForDay: null };
  }

  const playedToday = streak?.lastDay === today;
  const hour = computeUsualPlayHour(runHours);
  const triggerDate = nextReminderDate(nowMs, { playedToday, hour });
  const targetDay = dayKey(triggerDate.getTime());

  // At most one local notification per target day.
  if (
    !shouldScheduleStreakReminder({
      enabled,
      streakCount,
      lastPlayedDay: streak?.lastDay || null,
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
    livesEmptyAtClose,
    rotationIndex,
    translateFn
  });
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
