// Android-only Google Play Billing one-time purchase for Pawlingo Premium
// (`pawlingo_premium`). Safe no-op on iOS.
//
// Play requires every non-consumable purchase to be acknowledged within 3 days
// or it is automatically refunded. `finishTransaction({ purchase, isConsumable: false })`
// acknowledges the purchase with Google Play.

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  isUserCancelledError
} from 'expo-iap';
import { count } from './counters';
import { savePremiumState } from './gameStore';
import { track } from './analytics';
import { logMetaPremiumPurchased } from './meta';
import {
  PREMIUM_PRODUCT_ID as STORE_PREMIUM_ID,
  STARTER_PACK_ID,
  ALL_PRODUCT_IDS,
  getTreatPack,
  isConsumableProduct
} from './storeItems';

export const PREMIUM_PRODUCT_ID = STORE_PREMIUM_ID;

export function purchaseProductId(purchase) {
  if (!purchase || typeof purchase !== 'object') return null;
  if (purchase.productId) return purchase.productId;
  if (Array.isArray(purchase.ids) && purchase.ids.length > 0) return purchase.ids[0];
  return null;
}

export function isProductPurchase(purchase, targetId) {
  if (!purchase || typeof purchase !== 'object') return false;
  const matchesId =
    purchase.productId === targetId ||
    (Array.isArray(purchase.ids) && purchase.ids.includes(targetId));
  if (!matchesId) return false;
  // Pending purchases (e.g. cash / EFT vouchers) must not grant until 'purchased'.
  if (purchase.purchaseState && purchase.purchaseState !== 'purchased') return false;
  return true;
}

export function isPremiumPurchase(purchase) {
  return isProductPurchase(purchase, PREMIUM_PRODUCT_ID);
}

export function isPendingPurchase(purchase) {
  return Boolean(purchase && purchase.purchaseState === 'pending');
}

export function purchaseTokenOf(purchase) {
  return (
    purchase?.purchaseToken ||
    purchase?.transactionId ||
    purchase?.orderId ||
    null
  );
}

let connected = false;
let productInfo = null;
let productsById = {};
let updateSub = null;
let errorSub = null;
let pendingWaiters = [];
const listeners = new Set();

function notify(event) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (_) {}
  });
}

function resolveWaiters(result) {
  const list = pendingWaiters;
  pendingWaiters = [];
  list.forEach((resolve) => {
    try {
      resolve(result);
    } catch (_) {}
  });
}

// Grant events for treat packs and the starter pack are kept until the UI has
// stored the reward, and replayed to every new listener. Without this, a
// purchase that lands while the Play tab isn't mounted would be lost.
// Treat packs are only consumed on Play after confirmConsumableGranted(), so an
// unconfirmed pack comes back from getAvailablePurchases() on the next start.
const grantBuffer = new Map();
const unconsumed = new Map();

function notifyGrant(key, event) {
  grantBuffer.set(key, event);
  notify(event);
}

export function onPurchaseEvent(fn) {
  listeners.add(fn);
  grantBuffer.forEach((event) => {
    try {
      fn(event);
    } catch (_) {}
  });
  return () => listeners.delete(fn);
}

export async function confirmConsumableGranted(token) {
  const key = `consumable:${token}`;
  grantBuffer.delete(key);
  const purchase = unconsumed.get(token);
  unconsumed.delete(token);
  if (!purchase) return;
  try {
    await finishTransaction({ purchase, isConsumable: true });
  } catch (_) {}
}

function emitTreatPack(pid, purchase) {
  const pack = getTreatPack(pid);
  const token = purchaseTokenOf(purchase);
  if (!pack || !token) return false;
  unconsumed.set(token, purchase);
  notifyGrant(`consumable:${token}`, {
    type: 'consumable_granted',
    productId: pid,
    treats: pack.treats,
    token,
    purchase
  });
  return true;
}

export function __resetPurchaseBuffersForTests() {
  grantBuffer.clear();
  unconsumed.clear();
  listeners.clear();
}

export function getPremiumProduct() {
  return productInfo || productsById[PREMIUM_PRODUCT_ID] || null;
}

export function getStoreProducts() {
  return { ...productsById };
}

export function purchasePriceDetails(purchase, info = productInfo) {
  const productId =
    purchase?.productId ||
    (Array.isArray(purchase?.ids) && purchase.ids[0]) ||
    info?.id ||
    info?.productId ||
    PREMIUM_PRODUCT_ID;
  const rawPrice = purchase?.price ?? info?.price ?? info?.oneTimePurchaseOfferDetails?.priceAmountMicros;
  let value = Number(rawPrice);
  if (info?.oneTimePurchaseOfferDetails?.priceAmountMicros && rawPrice === info.oneTimePurchaseOfferDetails.priceAmountMicros) {
    value = Number(rawPrice) / 1e6;
  }
  if (!Number.isFinite(value) || value < 0) value = 0;
  const currency =
    String(
      purchase?.currency ||
        info?.currency ||
        info?.oneTimePurchaseOfferDetails?.priceCurrencyCode ||
        'USD'
    ).slice(0, 8);
  return { product_id: String(productId), value, currency };
}

async function acknowledgeAndGrant(purchase, { isNewPurchase = false } = {}) {
  const pid = purchaseProductId(purchase) || PREMIUM_PRODUCT_ID;
  const consumable = isConsumableProduct(pid);
  // Treat packs are consumed only after the UI confirms the treats are stored.
  if (!consumable) {
    try {
      await finishTransaction({ purchase, isConsumable: false });
    } catch (_) {}
  }

  const details = purchasePriceDetails(purchase, productsById[pid] || productInfo);
  if (isNewPurchase) {
    count('purchases');
    track('purchase', details);
  }

  if (pid === PREMIUM_PRODUCT_ID) {
    await savePremiumState(true);
    if (isNewPurchase) {
      logMetaPremiumPurchased({
        price: details.value,
        currency: details.currency,
        productId: details.product_id
      });
    }
    notify({ type: 'granted', productId: pid, purchase });
    resolveWaiters({ status: 'purchased', productId: pid });
    return;
  }

  if (pid === STARTER_PACK_ID) {
    notifyGrant('starter', { type: 'starter_granted', productId: pid, purchase });
    resolveWaiters({ status: 'purchased', productId: pid });
    return;
  }

  if (emitTreatPack(pid, purchase)) {
    resolveWaiters({ status: 'purchased', productId: pid });
  }
}

export async function initPurchases({ onPremiumGranted } = {}) {
  if (Platform.OS !== 'android') return false;
  if (onPremiumGranted) {
    listeners.add((ev) => {
      if (ev?.type === 'granted' || ev?.type === 'restored') onPremiumGranted(true);
    });
  }
  if (connected) return true;

  try {
    const ok = await initConnection();
    connected = Boolean(ok);
    if (!connected) return false;

    updateSub?.remove?.();
    errorSub?.remove?.();

    updateSub = purchaseUpdatedListener(async (purchase) => {
      if (isPendingPurchase(purchase)) {
        notify({ type: 'pending', purchase });
        resolveWaiters({ status: 'pending' });
        return;
      }
      const pid = purchaseProductId(purchase);
      if (pid && ALL_PRODUCT_IDS.includes(pid) && (!purchase.purchaseState || purchase.purchaseState === 'purchased')) {
        await acknowledgeAndGrant(purchase, { isNewPurchase: true });
      }
    });

    errorSub = purchaseErrorListener((err) => {
      const cancelled = Boolean(isUserCancelledError?.(err));
      notify({ type: cancelled ? 'cancelled' : 'error', error: err });
      resolveWaiters({ status: cancelled ? 'cancelled' : 'error', error: err });
    });

    try {
      const products = await fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' });
      if (Array.isArray(products) && products.length > 0) {
        const nextMap = {};
        for (const p of products) {
          const id = p.id || p.productId;
          if (id) nextMap[id] = p;
        }
        productsById = nextMap;
        productInfo = nextMap[PREMIUM_PRODUCT_ID] || products.find((p) => p.id === PREMIUM_PRODUCT_ID || p.productId === PREMIUM_PRODUCT_ID) || null;
        notify({ type: 'products', products: nextMap, product: productInfo });
      }
    } catch (_) {}

    // Re-check owned purchases on app start so a new phone or reinstall restores
    // Premium automatically, and any unacknowledged purchase is acknowledged.
    await restorePremium({ silent: true });
    return true;
  } catch (_) {
    connected = false;
    return false;
  }
}

export async function buyProduct(productId = PREMIUM_PRODUCT_ID) {
  if (Platform.OS !== 'android') return { status: 'unavailable' };
  if (!connected) {
    const ok = await initPurchases();
    if (!ok) return { status: 'unavailable' };
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingWaiters = pendingWaiters.filter((fn) => fn !== finish);
      resolve({ status: 'timeout' });
    }, 60000);

    const finish = (res) => {
      clearTimeout(timer);
      resolve(res);
    };
    pendingWaiters.push(finish);

    Promise.resolve(
      requestPurchase({
        request: {
          google: { skus: [productId] },
          apple: { sku: productId }
        },
        type: 'in-app'
      })
    ).catch((err) => {
      pendingWaiters = pendingWaiters.filter((fn) => fn !== finish);
      clearTimeout(timer);
      const cancelled = Boolean(isUserCancelledError?.(err));
      resolve({ status: cancelled ? 'cancelled' : 'error', error: err });
    });
  });
}

export async function buyPremium() {
  return buyProduct(PREMIUM_PRODUCT_ID);
}

export async function restorePremium({ silent = false } = {}) {
  if (Platform.OS !== 'android') return false;
  if (!connected) {
    try {
      const ok = await initConnection();
      connected = Boolean(ok);
    } catch (_) {
      return false;
    }
  }
  try {
    const owned = await getAvailablePurchases();
    const match = Array.isArray(owned) ? owned.find((p) => isPremiumPurchase(p)) : null;
    const starterMatch = Array.isArray(owned) ? owned.find((p) => isProductPurchase(p, STARTER_PACK_ID)) : null;
    if (starterMatch) {
      try {
        await finishTransaction({ purchase: starterMatch, isConsumable: false });
      } catch (_) {}
      notifyGrant('starter', { type: 'starter_restored', productId: STARTER_PACK_ID, purchase: starterMatch });
    }
    // Treat packs that were paid for but never consumed (app closed before the
    // treats were stored) are granted now; the token check stops double grants.
    if (Array.isArray(owned)) {
      for (const p of owned) {
        const pid = purchaseProductId(p);
        if (pid && isConsumableProduct(pid) && isProductPurchase(p, pid)) emitTreatPack(pid, p);
      }
    }
    if (match) {
      try {
        await finishTransaction({ purchase: match, isConsumable: false });
      } catch (_) {}
      await savePremiumState(true);
      notify({ type: 'restored', productId: PREMIUM_PRODUCT_ID, purchase: match });
      return true;
    }
    if (!silent) notify({ type: 'none' });
    return false;
  } catch (_) {
    return false;
  }
}

export async function closePurchases() {
  try {
    updateSub?.remove?.();
    errorSub?.remove?.();
    updateSub = null;
    errorSub = null;
    if (connected) await endConnection();
  } catch (_) {}
  connected = false;
}
