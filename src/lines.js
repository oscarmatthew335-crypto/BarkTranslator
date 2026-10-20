// Picks what the pet "says": from the personality's lines for the situation,
// leaving out lines that don't fit (outdoor talk for an indoor pet, night talk
// at lunchtime) and lines it said recently. If filtering leaves nothing, it
// falls back to the full list, so there's always something to say.
// Lines are picked in English and then shown in the app language: the English
// line carries the place/time words the filters read, so a translation always
// fits exactly where its English line does.

import { localizeLine } from './data/i18n/index';

export const CHAT_CONTEXT = 'chat';
export const CONTEXT_MINUTES = 20; // a picked situation wears off after this

const OUTDOOR =
  /\b(braais?|snoek|garden|yard|lawn|walls?|street|pavement|gates?|outside|outdoors|neighbou?rs?'?s?|roofs?|stoep|suburb|beach|fence|lizards?|gecko|squirrel|pool|car|bakkie)\b/i;
const NIGHT = /\b(night|midnight|tonight|bedtime|[1-4] ?am)\b/i;
const MORNING = /\b(morning|breakfast|sunrise)\b/i;
const EVENING = /\b(supper|dinner)\b/i;

export function fitsTime(line, hour) {
  if (NIGHT.test(line) && !(hour >= 20 || hour < 5)) return false;
  if (MORNING.test(line) && !(hour >= 5 && hour < 11)) return false;
  if (EVENING.test(line) && !(hour >= 16 && hour < 22)) return false;
  return true;
}

export function fitsPlace(line, home) {
  return home !== 'indoor' || !OUTDOOR.test(line);
}

// The situation to use now: the picked one while it's fresh, else chatting.
export function activeContext(pet, now = Date.now()) {
  if (!pet?.contextId || pet.contextId === CHAT_CONTEXT) return CHAT_CONTEXT;
  const at = pet.contextSetAt || 0;
  return now - at <= CONTEXT_MINUTES * 60 * 1000 ? pet.contextId : CHAT_CONTEXT;
}

// pool: { short: [...], long: [...] }; size: 'short' | 'long'
export function pickLine({ pool, size, home, contextId, recent = [], now = new Date(), random = Math.random }) {
  const main = pool[size] || pool.short || [];
  const other = pool[size === 'long' ? 'short' : 'long'] || [];
  const hour = now.getHours();
  const timeOk = (l) => contextId === 'zoomies' || fitsTime(l, hour); // "3AM zoomies" is picked on purpose
  const tries = [
    (l) => fitsPlace(l, home) && timeOk(l) && !recent.includes(l),
    (l) => fitsPlace(l, home) && timeOk(l),
    (l) => fitsPlace(l, home)
  ];
  for (const ok of tries) {
    for (const list of [main, other]) {
      const fit = list.filter(ok);
      if (fit.length) return fit[Math.floor(random() * fit.length)];
    }
  }
  return main[Math.floor(random() * main.length)] || other[0] || '...';
}

// pickLine, then the picked line in `lang`. `recent` may hold English or
// translated lines. Returns { key: English line, text: line to show }.
export function pickLocalizedLine({ species, pack, lang = 'en', pool, recent = [], ...opts }) {
  const tr = (l) => localizeLine(l, { species, pack, lang });
  const said = new Set(recent);
  const recentKeys = [...(pool.short || []), ...(pool.long || [])].filter((l) => said.has(l) || said.has(tr(l)));
  const key = pickLine({ ...opts, pool, recent: recentKeys });
  return { key, text: tr(key) };
}
