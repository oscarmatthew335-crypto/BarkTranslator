// Node test stub for expo-iap
export async function initConnection() {
  return true;
}

export async function endConnection() {
  return true;
}

export async function fetchProducts() {
  return [
    {
      id: 'pawlingo_premium',
      productId: 'pawlingo_premium',
      displayPrice: 'R 49.99',
      price: 49.99
    }
  ];
}

export async function requestPurchase() {
  return null;
}

export async function getAvailablePurchases() {
  return [];
}

export async function finishTransaction() {
  return true;
}

export function purchaseUpdatedListener() {
  return { remove() {} };
}

export function purchaseErrorListener() {
  return { remove() {} };
}

export function isUserCancelledError(err) {
  return Boolean(err && err.code === 'E_USER_CANCELLED');
}
