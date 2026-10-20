// The game's wardrobe: body colours (free) and cosmetic accessories bought
// with treats collected while playing. Nothing is paid, nothing is random,
// and nothing changes how the game plays.

export const BODY_COLOURS = [
  { id: 'golden', hex: '#E8B04B' },
  { id: 'cream', hex: '#F3E3C3' },
  { id: 'brown', hex: '#9A6338' },
  { id: 'black', hex: '#3A3340' },
  { id: 'grey', hex: '#9C9AAE' },
  { id: 'ginger', hex: '#F08A3C' },
  { id: 'white', hex: '#FBF8F2' },
  { id: 'spotty', hex: '#FFFFFF', spots: '#3A3340' }
];

// slot: where it goes on the pet. price in treats.
export const ITEMS = [
  { id: 'collar-red', slot: 'collar', price: 0, colour: '#FF5A5F' },
  { id: 'collar-blue', slot: 'collar', price: 40, colour: '#5CC8FF' },
  { id: 'collar-bell', slot: 'collar', price: 80, colour: '#FFD43B', bell: true },
  { id: 'hat-party', slot: 'hat', price: 60, colour: '#FF5FA2' },
  { id: 'hat-beanie', slot: 'hat', price: 90, colour: '#2BC48A' },
  { id: 'hat-sun', slot: 'hat', price: 120, colour: '#FFD43B' },
  { id: 'hat-crown', slot: 'hat', price: 250, colour: '#FFC23B' },
  { id: 'bandana-pink', slot: 'neck', price: 50, colour: '#FF5FA2' },
  { id: 'bandana-sa', slot: 'neck', price: 150, colour: '#007A4D' },
  { id: 'glasses-round', slot: 'glasses', price: 70, colour: '#24164A' },
  { id: 'glasses-sun', slot: 'glasses', price: 110, colour: '#24164A', dark: true },
  { id: 'glasses-heart', slot: 'glasses', price: 180, colour: '#FF5A5F', heart: true }
];

export const SLOTS = ['hat', 'glasses', 'neck', 'collar'];
export const getItem = (id) => ITEMS.find((i) => i.id === id) || null;
export const getColour = (id) => BODY_COLOURS.find((c) => c.id === id) || BODY_COLOURS[0];

// A starting colour that fits the breed when it's obvious, else golden (dogs)
// or grey (cats).
const BREED_COLOUR = { boerboel: 'golden', gsd: 'brown', golden: 'golden', frenchie: 'cream', staffie: 'grey', dachshund: 'brown', chihuahua: 'cream' };
export function defaultColour(pet) {
  if (pet?.species === 'cat') return 'grey';
  return BREED_COLOUR[pet?.breedId] || 'golden';
}

export function emptyWardrobe(pet) {
  return { colour: defaultColour(pet), owned: ['collar-red'], equipped: { collar: 'collar-red' } };
}

export function canBuy(wardrobe, bank, itemId) {
  const item = getItem(itemId);
  return Boolean(item) && !wardrobe.owned.includes(itemId) && bank >= item.price;
}

// Returns { wardrobe, bank } after buying (and wearing) an item, or the same
// values when it can't be bought.
export function buy(wardrobe, bank, itemId) {
  if (!canBuy(wardrobe, bank, itemId)) return { wardrobe, bank };
  const item = getItem(itemId);
  return {
    wardrobe: { ...wardrobe, owned: [...wardrobe.owned, itemId], equipped: { ...wardrobe.equipped, [item.slot]: itemId } },
    bank: bank - item.price
  };
}

// Wear an owned item, or take it off if it's already on.
export function toggleWear(wardrobe, itemId) {
  const item = getItem(itemId);
  if (!item || !wardrobe.owned.includes(itemId)) return wardrobe;
  const on = wardrobe.equipped[item.slot] === itemId;
  const equipped = { ...wardrobe.equipped };
  if (on) delete equipped[item.slot];
  else equipped[item.slot] = itemId;
  return { ...wardrobe, equipped };
}

export const setColour = (wardrobe, colour) => (getColour(colour).id === colour ? { ...wardrobe, colour } : wardrobe);
