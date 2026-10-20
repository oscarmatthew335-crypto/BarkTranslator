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
  dog: { lane: 'low', w: 50, h: 36, y: 0, move: 45, emoji: '🐕' }
};

export const COLLECTIBLES = {
  dog: ['bone', 'ball'],
  cat: ['fish', 'yarn']
};

export const POWER_UPS = ['speed', 'shield', 'magnet', 'double'];

// hearts: bumps allowed before the stage is lost. combo: chance of a jump-then-duck (or duck-then-jump) pair.
const PLACES = [
  { place: 'garden', seconds: 45, speed: 210, ramp: 45, density: 1.1, hearts: 5, combo: 0 },
  { place: 'park', seconds: 55, speed: 230, ramp: 55, density: 1.3, hearts: 4, combo: 0.1 },
  { place: 'beach', seconds: 60, speed: 250, ramp: 65, density: 1.5, hearts: 3, combo: 0.2 },
  { place: 'braai', seconds: 70, speed: 270, ramp: 75, density: 1.7, hearts: 3, combo: 0.28 },
  { place: 'vet', seconds: 80, speed: 290, ramp: 85, density: 1.9, hearts: 3, combo: 0.35 },
  { place: 'home', seconds: 90, speed: 310, ramp: 95, density: 2.1, hearts: 3, combo: 0.42 }
];

const DOG_MIX = {
  garden: { puddle: 3, sprinkler: 3, postman: 1 },
  park: { puddle: 3, sprinkler: 2, postman: 2 },
  beach: { puddle: 4, sprinkler: 2, postman: 1 },
  braai: { puddle: 2, sprinkler: 2, vacuum: 1, postman: 2 },
  vet: { puddle: 2, vacuum: 3, sprinkler: 2, postman: 1 },
  home: { vacuum: 4, puddle: 1, postman: 3, sprinkler: 1 }
};
const CAT_MIX = {
  garden: { cucumber: 3, spray: 3, dog: 1 },
  park: { cucumber: 2, spray: 2, dog: 3 },
  beach: { cucumber: 3, spray: 3, dog: 2 },
  braai: { cucumber: 3, spray: 2, dog: 2, vacuum: 1 },
  vet: { cucumber: 2, spray: 3, vacuum: 3 },
  home: { vacuum: 4, cucumber: 3, spray: 2, dog: 1 }
};

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
export const getStage = (species, id) => stagesFor(species).find((s) => s.id === id) || null;

// The daily run: one endless-style run (75 s) that mixes every place.
export const DAILY_SECONDS = 75;
export function dailyStage(species) {
  const list = stagesFor(species);
  const obstacles = {};
  list.forEach((s) => Object.entries(s.obstacles).forEach(([k, w]) => (obstacles[k] = (obstacles[k] || 0) + w)));
  return {
    id: `${species}-daily`,
    index: -1,
    species,
    nameKey: 'game.daily.title',
    theme: 'park',
    seconds: DAILY_SECONDS,
    speed: 220,
    ramp: 150,
    density: 1.6,
    hearts: 3,
    combo: 0.25,
    obstacles,
    powerUps: POWER_UPS,
    daily: true
  };
}
