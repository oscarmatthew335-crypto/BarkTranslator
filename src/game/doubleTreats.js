// Pure rules for the end-of-run rewarded "Double treats" offer.

export const DOUBLE_TREATS_MIN = 10;
export const DOUBLE_TREATS_DAILY_CAP = 3;

export function emptyDoubleTreatsState() {
  return { day: null, count: 0 };
}

export function doubleTreatsUsedToday(state, today) {
  if (!state || state.day !== today) return 0;
  return Math.max(0, Math.floor(Number(state.count) || 0));
}

export function canOfferDoubleTreats(result, state, today, { alreadyClaimed = false } = {}) {
  if (alreadyClaimed) return false;
  const treats = Math.max(0, Math.floor(Number(result?.treats) || 0));
  if (treats < DOUBLE_TREATS_MIN) return false;
  return doubleTreatsUsedToday(state, today) < DOUBLE_TREATS_DAILY_CAP;
}

export function recordDoubleTreats(state, today) {
  const used = doubleTreatsUsedToday(state, today);
  return { day: today, count: used + 1 };
}
