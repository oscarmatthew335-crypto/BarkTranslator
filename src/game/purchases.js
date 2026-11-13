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

export const PREMIUM_PRODUCT_ID = 'pawlingo_premium';

export function isPremiumPurchase(purchase) {
  if (!purchase || typeof purchase !== 'object') return false;
  const matchesId =
    purchase.productId === PREMIUM_PRODUCT_ID ||
    (Array.isArray(purchase.ids) && purchase.ids.includes(PREMIUM_PRODUCT_ID));
  if (!matchesId) return false;
  // Pending purchases (e.g. cash / EFT vouchers) must not grant until 'purchased'.
  if (purchase.purchaseState && purchase.purchaseState !== 'purchased') return false;
  return true;
}

export function isPendingPurchase(purchase) {
  return Boolean(purchase && purchase.purchaseState === 'pending');
}

let connected = false;
let productInfo = null;
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

export function onPurchaseEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPremiumProduct() {
  return productInfo;
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
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch (_) {}
  await savePremiumState(true);
  if (isNewPurchase) {
    count('purchases');
    const details = purchasePriceDetails(purchase);
    track('purchase', details);
    logMetaPremiumPurchased({
      price: details.value,
      currency: details.currency,
      productId: details.product_id
    });
  }
  notify({ type: 'granted', purchase });
  resolveWaiters({ status: 'purchased' });
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
      if (isPremiumPurchase(purchase)) {
        await acknowledgeAndGrant(purchase, { isNewPurchase: true });
      }
    });

    errorSub = purchaseErrorListener((err) => {
      const cancelled = Boolean(isUserCancelledError?.(err));
      notify({ type: cancelled ? 'cancelled' : 'error', error: err });
      resolveWaiters({ status: cancelled ? 'cancelled' : 'error', error: err });
    });

    try {
      const products = await fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'in-app' });
      if (Array.isArray(products) && products.length > 0) {
        productInfo = products.find((p) => p.id === PREMIUM_PRODUCT_ID || p.productId === PREMIUM_PRODUCT_ID) || products[0];
        notify({ type: 'product', product: productInfo });
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

export async function buyPremium() {
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
          google: { skus: [PREMIUM_PRODUCT_ID] },
          apple: { sku: PREMIUM_PRODUCT_ID }
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
    if (match) {
      try {
        await finishTransaction({ purchase: match, isConsumable: false });
      } catch (_) {}
      await savePremiumState(true);
      notify({ type: 'restored', purchase: match });
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
