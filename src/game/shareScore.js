// Pure helpers for the end-of-run score share card and share sheet.

export const SCORE_SHARE_URL =
  'https://play.google.com/store/apps/details?id=com.pawlingo.app&referrer=utm_source%3Dshare';

export const CHASE_SHARE_MIN_SECONDS = 30;

export function canShareRunScore(result, { newBest = false } = {}) {
  if (!result || typeof result !== 'object') return false;
  if (newBest) return true;
  if (result.chase && Number(result.seconds || 0) >= CHASE_SHARE_MIN_SECONDS) return true;
  return false;
}

export function formatShareHeadline({ petName = 'My pet', isChase = false, chaserLabel = 'bath time', translateFn = null } = {}) {
  const name = String(petName || 'My pet').trim() || 'My pet';
  const chaser = String(chaserLabel || 'bath time').trim() || 'bath time';
  if (typeof translateFn === 'function') {
    const key = isChase ? 'game.share.escaped' : 'game.share.newBestLine';
    const out = translateFn(key, { petName: name, chaser });
    if (out && out !== key) return out;
  }
  return isChase ? `${name} escaped ${chaser}!` : `${name} set a new personal best!`;
}

export function buildScoreShareMessage({
  petName = 'My pet',
  score = 0,
  isChase = false,
  chaserLabel = 'bath time',
  translateFn = null
} = {}) {
  const headline = formatShareHeadline({ petName, isChase, chaserLabel, translateFn });
  const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
  return `${headline} Score: ${cleanScore} 🐾\nFree on Google Play: ${SCORE_SHARE_URL}`;
}
