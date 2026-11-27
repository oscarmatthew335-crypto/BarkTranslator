// What a Play stage is made of. Everything is data so more stages (or a new
// species) can be added here without touching the engine:
//   id          unique per species, also the key for saved stars
//   nameKey     i18n key of the place name
//   theme       background art (see components/game/Scenery.js)
//   seconds     roughly how long the stage takes at its base speed (45-90)
//   speed       base running speed (world units per second; the view is 400 wide)
//   ramp        extra speed reached by the end of the stage
//   density     obstacles per stretch (1 = relaxed, 2 = busy)
//   obstacles   which obstacle types appear, with weights
//   powerUps    power-up pickups placed along the way

export const OBSTACLES = {
  // lane 'low' = jump over it; 'high' = duck under it. y is how far the
  // bottom of the box is above the ground. move = its own speed toward the pet.
  puddle: { lane: 'low', w: 52, h: 10, y: 0, move: 0, emoji: '💧' },
  vacuum: { lane: 'low', w: 44, h: 34, y: 0, move: 70, emoji: '🧹' },
  sprinkler: { lane: 'high', w: 46, h: 30, y: 30, move: 0, emoji: '💦' },
  postman: { lane: 'high', w: 40, h: 34, y: 30, move: 30, emoji: '📦' },
  cucumber: { lane: 'low', w: 46, h: 16, y: 0, move: 0, emoji: '🥒' },
  spray: { lane: 'high', w: 44, h: 28, y: 30, move: 0, emoji: '💦' },
  bench: { lane: 'low', w: 58, h: 28, y: 0, move: 0, emoji: '🪑' },
  trash: { lane: 'low', w: 34, h: 32, y: 0, move: 0, emoji: '🗑️' },
  dog: { lane: 'low', w: 50, h: 36, y: 0, move: 45, emoji: '🐕' },
  catDash: { lane: 'low', w: 46, h: 30, y: 0, move: 110, emoji: '🐈', warningS: 0.6 },
  dogDash: { lane: 'low', w: 50, h: 34, y: 0, move: 110, emoji: '🐕', warningS: 0.6 },
  bird: { lane: 'high', w: 40, h: 26, y: 32, move: 55, bob: true, emoji: '🐦' }
};

export const SURPRISE_OBSTACLES = new Set(['catDash', 'dogDash', 'bird']);
export const SURPRISE_ENDLESS_DIST = 5000; // 500 m (10 world units per metre)

export function isSurpriseObstacleAllowed(stage, type, dist = 0) {
  if (!SURPRISE_OBSTACLES.has(type)) return true;
  if (!stage) return false;
  if (stage.endless) return Number(dist || 0) >= SURPRISE_ENDLESS_DIST;
  if (stage.chase) return Number(dist || 0) >= SURPRISE_ENDLESS_DIST;
  return Number(stage.index ?? -1) >= 3;
}

export const COLLECTIBLES = {
  dog: ['bone', 'ball'],
  cat: ['fish', 'yarn']
};

export const POWER_UPS = ['speed', 'shield', 'magnet', 'double'];

export const PLACE_CYCLE = ['garden', 'park', 'beach', 'braai', 'vet', 'home'];
export const PLACE_SPAN_DIST = 4000; // 400 m (10 world units per metre)
export const PLACE_EMOJIS = {
  garden: '🌻',
  park: '🌳',
  beach: '🏖️',
  braai: '🔥',
  vet: '🩺',
  home: '🏠'
};

export function placeAtDist(dist = 0) {
  const d = Math.max(0, Number(dist) || 0);
  const idx = Math.floor(d / PLACE_SPAN_DIST) % PLACE_CYCLE.length;
  return PLACE_CYCLE[idx];
}

// hearts: bumps allowed before the stage is lost. combo: chance of a jump-then-duck (or duck-then-jump) pair.
const PLACES = [
  { place: 'garden', seconds: 45, speed: 210, ramp: 45, density: 1.1, hearts: 5, combo: 0 },
  { place: 'park', seconds: 55, speed: 230, ramp: 55, density: 1.3, hearts: 4, combo: 0.1 },
  { place: 'beach', seconds: 60, speed: 250, ramp: 65, density: 1.5, hearts: 3, combo: 0.2 },
  { place: 'braai', seconds: 70, speed: 270, ramp: 75, density: 1.7, hearts: 3, combo: 0.28 },
  { place: 'vet', seconds: 80, speed: 290, ramp: 85, density: 1.9, hearts: 3, combo: 0.35 },
  { place: 'home', seconds: 90, speed: 310, ramp: 95, density: 2.1, hearts: 3, combo: 0.42 }
];

export const DOG_MIX = {
  garden: { puddle: 3, sprinkler: 3, postman: 1 },
  park: { puddle: 3, sprinkler: 2, postman: 2 },
  beach: { puddle: 4, sprinkler: 2, postman: 1 },
  braai: { puddle: 2, sprinkler: 2, vacuum: 1, postman: 2, catDash: 1, bird: 1 },
  vet: { puddle: 2, vacuum: 3, sprinkler: 2, postman: 1, catDash: 1, bird: 1 },
  home: { vacuum: 4, puddle: 1, postman: 3, sprinkler: 1, catDash: 2, bird: 2 }
};
export const CAT_MIX = {
  garden: { cucumber: 3, spray: 3, dog: 1 },
  park: { cucumber: 2, spray: 2, dog: 3 },
  beach: { cucumber: 3, spray: 3, dog: 2 },
  braai: { cucumber: 3, spray: 2, dog: 2, vacuum: 1, dogDash: 1, bird: 1 },
  vet: { cucumber: 2, spray: 3, vacuum: 3, dogDash: 1, bird: 1 },
  home: { vacuum: 4, cucumber: 3, spray: 2, dog: 1, dogDash: 2, bird: 2 }
};

export function placeObstaclesFor(species, place) {
  const mix = species === 'cat' ? CAT_MIX : DOG_MIX;
  const base = mix[place] || mix.garden;
  return { ...base, bench: 1, trash: 1 };
}

export function stageObstaclesAt(stage, dist = 0) {
  if (!stage) return {};
  const obs = stage.obstacles || {};
  const isDefaultEndlessMix =
    (stage.endless || stage.chase) &&
    stage.usePlaceMix !== false &&
    obs.bench === 3 &&
    obs.trash === 3 &&
    Object.keys(obs).length === 2;
  if (isDefaultEndlessMix) {
    return placeObstaclesFor(stage.species, placeAtDist(dist));
  }
  return obs;
}

const build = (species, mix) =>
  PLACES.map((p, i) => ({
    id: `${species}-${p.place}`,
    index: i,
    species,
    nameKey: `game.place.${p.place}`,
    theme: p.place,
    seconds: p.seconds,
    speed: p.speed,
    ramp: p.ramp,
    density: p.density,
    hearts: p.hearts,
    combo: p.combo,
    obstacles: mix[p.place],
    powerUps: i === 0 ? ['shield'] : i === 1 ? ['shield', 'magnet'] : POWER_UPS
  }));

export const STAGES = {
  dog: build('dog', DOG_MIX),
  cat: build('cat', CAT_MIX)
};

export const stagesFor = (species) => STAGES[species] || STAGES.dog;

// Chasers for Chase mode, kept as data (emoji + nameKey) so they are easy to swap.
export const CHASER_OPTIONS = {
  bath: { id: 'bath', emoji: '🛁', nameKey: 'game.chaser.bath' },
  dog: { id: 'dog', emoji: '🐕', nameKey: 'game.chaser.dog' },
  vetVan: { id: 'vetVan', emoji: '🚐', nameKey: 'game.chaser.vetVan' },
  catcher: { id: 'catcher', emoji: '🥅', nameKey: 'game.chaser.catcher' }
};

export const CHASERS = {
  dog: CHASER_OPTIONS.bath,
  cat: CHASER_OPTIONS.dog
};

export const chaserFor = (species) => CHASERS[species] || CHASERS.dog;

export const ENDLESS_MAX_SPEED = 420;

function mixedObstacles(species) {
  const list = stagesFor(species);
  const obstacles = {};
  list.forEach((s) => Object.entries(s.obstacles).forEach(([k, w]) => (obstacles[k] = (obstacles[k] || 0) + w)));
  return obstacles;
}

// Endless mode: run until out of hearts, no finish line, course generated in chunks.
export function endlessStage(species) {
  const sp = STAGES[species] ? species : 'dog';
  return {
    id: `${sp}-endless`,
    mode: 'endless',
    endless: true,
    index: -2,
    species: sp,
    nameKey: 'game.endless.title',
    theme: 'garden',
    speed: 285,
    ramp: 125,
    maxSpeed: 410,
    density: 1.5,
    hearts: 3,
    combo: 0.22,
    doubleJumpCombo: 0.22,
    obstacles: { bench: 3, trash: 3 },
    powerUps: POWER_UPS
  };
}

// Chase mode: chased by bath time (dog) or a dog (cat); caught when the gap hits 0.
export function chaseStage(species) {
  const sp = STAGES[species] ? species : 'dog';
  return {
    id: `${sp}-chase`,
    mode: 'chase',
    chase: true,
    chaser: chaserFor(sp),
    index: -3,
    species: sp,
    nameKey: 'game.chase.title',
    theme: 'park',
    speed: 292,
    ramp: 123,
    maxSpeed: 415,
    density: 1.55,
    hearts: 99,
    combo: 0.22,
    doubleJumpCombo: 0.2,
    obstacles: { bench: 3, trash: 3 },
    powerUps: POWER_UPS
  };
}

export const modesFor = (species) => [endlessStage(species), chaseStage(species)];

// The daily run: one endless-style run (75 s) that mixes every place.
export const DAILY_SECONDS = 75;
export function dailyStage(species) {
  const sp = STAGES[species] ? species : 'dog';
  return {
    id: `${sp}-daily`,
    mode: 'daily',
    index: -1,
    species: sp,
    nameKey: 'game.daily.title',
    theme: 'park',
    seconds: DAILY_SECONDS,
    speed: 220,
    ramp: 150,
    density: 1.6,
    hearts: 3,
    combo: 0.25,
    obstacles: mixedObstacles(sp),
    powerUps: POWER_UPS,
    daily: true
  };
}

export function getStage(species, id) {
  const found = stagesFor(species).find((s) => s.id === id);
  if (found) return found;
  if (id === `${species}-endless`) return endlessStage(species);
  if (id === `${species}-chase`) return chaseStage(species);
  if (id === `${species}-daily`) return dailyStage(species);
  return null;
}

export { MILESTONES, milestonesFor, milestonesReached, earnedMilestones, milestoneReward } from './milestones';
