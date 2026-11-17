// Pure helpers for the end-of-run score share card and share sheet.

export const SCORE_SHARE_URL =
  'https://play.google.com/store/apps/details?id=com.pawlingo.app&referrer=utm_source%3Dshare';

export const CHASE_SHARE_MIN_SECONDS = 30;

export function canShareRunScore(result, { newBest = false, newWeeklyBest = false } = {}) {
  if (!result || typeof result !== 'object') return false;
  if (newBest || newWeeklyBest) return true;
  if (result.chase && Number(result.seconds || 0) >= CHASE_SHARE_MIN_SECONDS) return true;
  return false;
}

export function formatShareHeadline({
  petName = 'My pet',
  characterLabel = null,
  distance = 0,
  place = 'Garden',
  isChase = false,
  chaserLabel = 'bath time',
  translateFn = null
} = {}) {
  const name = String(petName || 'My pet').trim() || 'My pet';
  const chaser = String(chaserLabel || 'bath time').trim() || 'bath time';
  const displayPet = characterLabel ? `${name} as ${characterLabel}` : name;
  const cleanDist = Math.max(0, Math.floor(Number(distance) || 0));
  const cleanPlace = String(place || 'Garden').trim() || 'Garden';
  if (typeof translateFn === 'function') {
    if (isChase) {
      const out = translateFn('game.share.escaped', { petName: displayPet, chaser });
      if (out && out !== 'game.share.escaped') return out;
    } else if (cleanDist > 0) {
      const out = translateFn('game.share.ranPlace', { petName: displayPet, distance: cleanDist, place: cleanPlace });
      if (out && out !== 'game.share.ranPlace') return out;
    } else {
      const out = translateFn('game.share.newBestLine', { petName: displayPet, chaser });
      if (out && out !== 'game.share.newBestLine') return out;
    }
  }
  if (isChase) return `${displayPet} escaped ${chaser}!`;
  if (cleanDist > 0) return `${displayPet} ran ${cleanDist} m in the ${cleanPlace}!`;
  return `${displayPet} set a new personal best!`;
}

export function formatShareChallenge({ species = 'dog', translateFn = null } = {}) {
  const sp = species === 'cat' ? 'cat' : 'dog';
  if (typeof translateFn === 'function') {
    const key = sp === 'cat' ? 'game.share.challengeCat' : 'game.share.challengeDog';
    const out = translateFn(key);
    if (out && out !== key) return out;
  }
  return `Can your ${sp} beat that?`;
}

export function buildScoreShareMessage({
  petName = 'My pet',
  characterLabel = null,
  species = 'dog',
  distance = 0,
  place = 'Garden',
  score = 0,
  isChase = false,
  chaserLabel = 'bath time',
  translateFn = null
} = {}) {
  const headline = formatShareHeadline({ petName, characterLabel, distance, place, isChase, chaserLabel, translateFn });
  const challenge = formatShareChallenge({ species, translateFn });
  const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
  return `${headline} ${challenge} (${cleanScore} pts) 🐾\nFree on Google Play: ${SCORE_SHARE_URL}`;
}
