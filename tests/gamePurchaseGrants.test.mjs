import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  onPurchaseEvent,
  confirmConsumableGranted,
  restorePremium,
  __resetPurchaseBuffersForTests
} from '../src/game/purchases.js';

const pack = (token) => ({
  productId: 'treats_small',
  purchaseToken: token,
  purchaseState: 'purchased'
});

function reset() {
  __resetPurchaseBuffersForTests();
  globalThis.__iapOwned = [];
  globalThis.__iapFinished = [];
}

test('an unconsumed treat pack found at start is replayed to a listener that subscribes later', async () => {
  reset();
  globalThis.__iapOwned = [pack('tok-1')];
  await restorePremium({ silent: true });

  // Nobody was listening yet, and the pack must not have been consumed.
  assert.equal(globalThis.__iapFinished.length, 0);

  const seen = [];
  const off = onPurchaseEvent((ev) => seen.push(ev));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, 'consumable_granted');
  assert.equal(seen[0].token, 'tok-1');
  assert.equal(seen[0].treats, 300);
  off();
});

test('a treat pack is consumed only after the UI confirms the grant, and is not replayed after', async () => {
  reset();
  globalThis.__iapOwned = [pack('tok-2')];
  await restorePremium({ silent: true });

  await confirmConsumableGranted('tok-2');
  assert.equal(globalThis.__iapFinished.length, 1);
  assert.equal(globalThis.__iapFinished[0].isConsumable, true);

  const seen = [];
  const off = onPurchaseEvent((ev) => seen.push(ev));
  assert.equal(seen.filter((e) => e.type === 'consumable_granted').length, 0);
  off();
});

test('a pack without a purchase token is never granted', async () => {
  reset();
  globalThis.__iapOwned = [{ productId: 'treats_large', purchaseState: 'purchased' }];
  await restorePremium({ silent: true });
  const seen = [];
  const off = onPurchaseEvent((ev) => seen.push(ev));
  assert.equal(seen.length, 0);
  off();
});
