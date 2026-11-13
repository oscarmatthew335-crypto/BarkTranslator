const scheduled = [];
let permissionStatus = 'granted';

export const SchedulableTriggerInputTypes = {
  DATE: 'date',
  TIME_INTERVAL: 'timeInterval',
  DAILY: 'daily'
};

export function setNotificationHandler() {}

export async function getPermissionsAsync() {
  return { status: permissionStatus, granted: permissionStatus === 'granted' };
}

export async function requestPermissionsAsync() {
  return { status: permissionStatus, granted: permissionStatus === 'granted' };
}

export async function scheduleNotificationAsync(req) {
  const id = `notif-${scheduled.length + 1}`;
  scheduled.push({ id, ...req });
  return id;
}

export async function cancelScheduledNotificationAsync(id) {
  const idx = scheduled.findIndex((s) => s.id === id);
  if (idx >= 0) scheduled.splice(idx, 1);
}

export async function cancelAllScheduledNotificationsAsync() {
  scheduled.length = 0;
}

export function __getScheduledForTests() {
  return [...scheduled];
}

export function __resetNotificationsForTests(status = 'granted') {
  scheduled.length = 0;
  permissionStatus = status;
}

export default {
  SchedulableTriggerInputTypes,
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync
};
