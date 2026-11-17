// Unlockable character skins: full-body SVG looks worn by the player's own pet.
// All cosmetic — no speed, score or treat bonuses.

export const CHARACTERS = [
  {
    id: 'char-cyber',
    nameKey: 'game.char.cyber',
    species: ['dog', 'cat'],
    price: 1500,
    productId: null,
    blockedSlots: ['glasses'],
    palette: { body: '#1F1B2E', ear: '#141122', accent: '#00F5D4', eye: '#00F5D4' },
    parts: 'cyber'
  },
  {
    id: 'char-royal',
    nameKey: 'game.char.royal',
    species: ['dog', 'cat'],
    price: 1200,
    productId: null,
    blockedSlots: ['hat', 'neck'],
    palette: { body: '#F6EAD4', ear: '#D9C3A3', accent: '#E63946', crown: '#FFD43B' },
    parts: 'royal'
  },
  {
    id: 'char-astro',
    nameKey: 'game.char.astro',
    species: ['dog', 'cat'],
    price: 2000,
    productId: null,
    blockedSlots: ['hat', 'glasses'],
    palette: { body: '#FBF8F2', ear: '#DCE4EE', suit: '#E6EEF8', visor: '#7EE8FA', trim: '#FF8A5B' },
    parts: 'astro'
  },
  {
    id: 'char-ninja',
    nameKey: 'game.char.ninja',
    species: ['dog', 'cat'],
    price: 1800,
    productId: null,
    blockedSlots: ['hat', 'glasses'],
    palette: { body: '#242030', ear: '#17141F', mask: '#17141F', band: '#E63946' },
    parts: 'ninja'
  },
  {
    id: 'char-zebra',
    nameKey: 'game.char.zebra',
    species: ['dog', 'cat'],
    price: 900,
    productId: null,
    blockedSlots: [],
    palette: { body: '#FBF8F2', ear: '#24164A', stripe: '#24164A' },
    parts: 'zebra'
  },
  {
    id: 'char-gold',
    nameKey: 'game.char.gold',
    species: ['dog', 'cat'],
    price: null,
    productId: 'char_gold',
    blockedSlots: [],
    palette: { body: '#FFC83D', ear: '#E89B1E', shine: '#FFF4B8', accent: '#E89B1E' },
    parts: 'gold'
  }
];

export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) || null;

export const getCharacterByProductId = (productId) =>
  CHARACTERS.find((c) => c.productId && c.productId === productId) || null;

export function isCharacterOwned(wardrobe, id) {
  return Array.isArray(wardrobe?.ownedCharacters) && wardrobe.ownedCharacters.includes(id);
}

export function canUnlockCharacter(wardrobe, bank, id) {
  const ch = getCharacter(id);
  if (!ch || ch.productId || ch.price == null) return false;
  if (isCharacterOwned(wardrobe, id)) return false;
  return Number(bank || 0) >= ch.price;
}

export function unlockCharacter(wardrobe, id, { equip = false } = {}) {
  const ch = getCharacter(id);
  if (!ch) return wardrobe;
  const owned = Array.isArray(wardrobe?.ownedCharacters) ? wardrobe.ownedCharacters : [];
  const nextOwned = owned.includes(id) ? owned : [...owned, id];
  return {
    ...wardrobe,
    ownedCharacters: nextOwned,
    activeCharacter: equip ? id : (wardrobe?.activeCharacter ?? null)
  };
}

export function buyCharacter(wardrobe, bank, id) {
  if (!canUnlockCharacter(wardrobe, bank, id)) return { wardrobe, bank };
  const ch = getCharacter(id);
  return {
    wardrobe: unlockCharacter(wardrobe, id, { equip: true }),
    bank: bank - ch.price
  };
}

export function equipCharacter(wardrobe, id) {
  if (id == null) return { ...wardrobe, activeCharacter: null };
  const ch = getCharacter(id);
  if (!ch || !isCharacterOwned(wardrobe, id)) return wardrobe;
  return { ...wardrobe, activeCharacter: id };
}

export function effectiveEquipped(wardrobe, characterId) {
  const eq = wardrobe?.equipped || {};
  const ch = getCharacter(characterId);
  if (!ch || !ch.blockedSlots?.length) return eq;
  const out = {};
  for (const [slot, itemId] of Object.entries(eq)) {
    if (!ch.blockedSlots.includes(slot)) out[slot] = itemId;
  }
  return out;
}

export function cheapestLockedTreatCharacter(wardrobe) {
  const locked = CHARACTERS.filter((c) => c.price != null && !c.productId && !isCharacterOwned(wardrobe, c.id));
  if (!locked.length) return null;
  return locked.slice().sort((a, b) => a.price - b.price)[0];
}

export function characterNudge(wardrobe, bank) {
  const ch = cheapestLockedTreatCharacter(wardrobe);
  if (!ch) return null;
  const b = Math.max(0, Math.floor(Number(bank) || 0));
  if (b < ch.price && b >= Math.ceil(ch.price * 0.8)) {
    return { character: ch, remaining: ch.price - b };
  }
  return null;
}
