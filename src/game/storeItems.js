// Store product definitions, idempotent token tracking, and Starter Pack
// 48-hour visibility & strike-through pricing helpers.

export const PREMIUM_PRODUCT_ID = 'pawlingo_premium';
export const PREMIUM_BONUS_TREATS = 500;

export const STARTER_PACK_ID = 'starter_pack';
export const STARTER_PACK_TRIGGER_RUN = 3;
export const STARTER_PACK_WINDOW_MS = 48 * 60 * 60 * 1000;

export const TREAT_PACKS = [
  { id: 'treats_small', treats: 300, consumable: true },
  { id: 'treats_medium', treats: 800, consumable: true },
  { id: 'treats_large', treats: 2000, consumable: true }
];

export const STARTER_PACK = {
  id: STARTER_PACK_ID,
  treats: 500,
  itemId: 'hat-crown',
  extraSavers: 3,
  consumable: false
};

export const ALL_PRODUCT_IDS = [
  PREMIUM_PRODUCT_ID,
  ...TREAT_PACKS.map((p) => p.id),
  STARTER_PACK_ID
];

export function getTreatPack(productId) {
  return TREAT_PACKS.find((p) => p.id === productId) || null;
}

export function isConsumableProduct(productId) {
  return Boolean(getTreatPack(productId));
}

// Idempotent consumable grant: only grants if `token` has not been processed.
export function grantConsumableOnce(processedTokens = [], token, amount = 0) {
  const cleanToken = String(token || '').trim();
  const cleanAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const list = Array.isArray(processedTokens) ? processedTokens : [];
  if (!cleanToken || cleanAmount <= 0 || list.includes(cleanToken)) {
    return { granted: 0, tokens: list };
  }
  const next = [...list, cleanToken].slice(-100);
  return { granted: cleanAmount, tokens: next };
}

export function shouldTriggerStarterOffer(storeState, totalRuns) {
  if (storeState?.starterBought) return false;
  if (storeState?.starterOfferedAt != null) return false;
  return Number(totalRuns) >= STARTER_PACK_TRIGGER_RUN;
}

export function isStarterPackVisible(storeState, now = Date.now()) {
  if (!storeState || storeState.starterBought) return false;
  if (storeState.starterOfferedAt == null) return false;
  const elapsed = Math.max(0, now - Number(storeState.starterOfferedAt));
  return elapsed < STARTER_PACK_WINDOW_MS;
}

export function starterPackRemainingMs(storeState, now = Date.now()) {
  if (!isStarterPackVisible(storeState, now)) return 0;
  return Math.max(0, Number(storeState.starterOfferedAt) + STARTER_PACK_WINDOW_MS - now);
}

function numericPrice(product) {
  if (!product) return null;
  const micros = product?.oneTimePurchaseOfferDetails?.priceAmountMicros;
  if (micros != null && Number.isFinite(Number(micros))) {
    return Number(micros) / 1e6;
  }
  const p = Number(product?.price);
  if (Number.isFinite(p) && p > 0) return p;
  return null;
}

function currencyOf(product) {
  return (
    product?.currency ||
    product?.oneTimePurchaseOfferDetails?.priceCurrencyCode ||
    null
  );
}

// Calculates the normal price of 500 treats from treats_small (300) and
// treats_medium (800). Returns a formatted strike-through string ONLY if both
// prices are known in the same currency AND the normal value is strictly
// greater than starter_pack's actual store price.
export function starterPackStrikethrough(productsById = {}) {
  const small = productsById.treats_small;
  const medium = productsById.treats_medium;
  const starter = productsById[STARTER_PACK_ID];
  const smallPrice = numericPrice(small);
  const mediumPrice = numericPrice(medium);
  const starterPrice = numericPrice(starter);
  if (smallPrice == null || starterPrice == null) return null;

  const curr = currencyOf(starter) || currencyOf(small);
  if (currencyOf(small) && currencyOf(starter) && currencyOf(small) !== currencyOf(starter)) {
    return null;
  }

  // Value of 500 treats based on treats_small (300 treats) + treats_medium (800 treats)
  // Using the per-treat rate from treats_small (or average of small & medium if same currency)
  const useMedium = mediumPrice != null && (!currencyOf(medium) || !curr || currencyOf(medium) === curr);
  const ratePerTreat = useMedium
    ? (smallPrice + mediumPrice) / (300 + 800)
    : smallPrice / 300;
  const normalValue = ratePerTreat * STARTER_PACK.treats;
  if (!(normalValue > starterPrice)) return null;

  const sample = starter?.displayPrice || starter?.localizedPrice || small?.displayPrice || small?.localizedPrice || '';
  const rounded = normalValue.toFixed(2);
  const prefixMatch = String(sample).match(/^([^\d\s.,-]+)/);
  if (prefixMatch) return `${prefixMatch[1]}${rounded}`;
  if (curr) return `${curr} ${rounded}`;
  return rounded;
}
