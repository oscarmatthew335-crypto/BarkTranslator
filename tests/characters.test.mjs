import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  CHARACTERS,
  getCharacter,
  getCharacterByProductId,
  isCharacterOwned,
  canUnlockCharacter,
  unlockCharacter,
  buyCharacter,
  equipCharacter,
  effectiveEquipped,
  characterNudge
} from '../src/game/characters.js';
import { emptyWardrobe } from '../src/game/wardrobe.js';
import { petGame, emptyGameState } from '../src/game/gameStore.js';
import { CHAR_GOLD_PRODUCT_ID, CHARACTER_PRODUCTS, ALL_PRODUCT_IDS } from '../src/game/storeItems.js';
import { isProductPurchase, isPendingPurchase } from '../src/game/purchases.js';
import { ALLOWED_EVENTS, sanitizeParams } from '../src/game/analytics.js';
import { formatShareHeadline } from '../src/game/shareScore.js';

test('characters: unlock rules reject not enough treats, already owned, unknown id, and paid-only', () => {
  const base = emptyWardrobe({ species: 'dog' });
  assert.equal(CHARACTERS.length, 6);

  // Not enough treats
  assert.equal(canUnlockCharacter(base, 899, 'char-zebra'), false);
  assert.deepEqual(buyCharacter(base, 899, 'char-zebra'), { wardrobe: base, bank: 899 });

  // Unknown id
  assert.equal(canUnlockCharacter(base, 5000, 'char-unknown'), false);
  assert.deepEqual(buyCharacter(base, 5000, 'char-unknown'), { wardrobe: base, bank: 5000 });

  // Paid-only cannot be bought with treats
  assert.equal(canUnlockCharacter(base, 99999, 'char-gold'), false);
  assert.deepEqual(buyCharacter(base, 99999, 'char-gold'), { wardrobe: base, bank: 99999 });

  // Valid purchase
  assert.equal(canUnlockCharacter(base, 900, 'char-zebra'), true);
  const res = buyCharacter(base, 1000, 'char-zebra');
  assert.equal(res.bank, 100);
  assert.equal(isCharacterOwned(res.wardrobe, 'char-zebra'), true);
  assert.equal(res.wardrobe.activeCharacter, 'char-zebra');

  // Already owned
  assert.equal(canUnlockCharacter(res.wardrobe, 5000, 'char-zebra'), false);
});

test('characters: save migration keeps colour and characters, swaps worn items for boards with a refund', () => {
  const pet = { id: 'p1', species: 'cat', name: 'Milo' };
  const oldState = {
    ...emptyGameState(),
    pets: {
      p1: {
        bank: 250,
        wardrobe: {
          colour: 'ginger',
          owned: ['collar-red', 'hat-crown'],
          equipped: { collar: 'collar-red', hat: 'hat-crown' }
        }
      }
    }
  };
  const migrated = petGame(oldState, pet);
  assert.equal(migrated.wardrobe.colour, 'ginger');
  assert.deepEqual(migrated.wardrobe.owned, ['board-coral', 'board-ocean']);
  assert.deepEqual(migrated.wardrobe.equipped, { board: 'board-coral' });
  assert.equal(migrated.bank, 250 + 250, 'the crown (250) is paid back; the free collar is not');
  assert.equal(migrated.wardrobe.boardsV1, true);
  // Loading a saved, already-migrated wardrobe does not refund again.
  const again = petGame({ ...oldState, pets: { p1: migrated } }, pet);
  assert.equal(again.bank, migrated.bank);
  assert.deepEqual(migrated.wardrobe.ownedCharacters, []);
  assert.equal(migrated.wardrobe.activeCharacter, null);
});

test('characters: paid char_gold is in ALL_PRODUCT_IDS, ignores pending, and grants on purchased', () => {
  assert.equal(ALL_PRODUCT_IDS.includes(CHAR_GOLD_PRODUCT_ID), true);
  assert.equal(CHARACTER_PRODUCTS[CHAR_GOLD_PRODUCT_ID], 'char-gold');
  assert.equal(getCharacterByProductId(CHAR_GOLD_PRODUCT_ID)?.id, 'char-gold');

  const pending = { productId: CHAR_GOLD_PRODUCT_ID, purchaseState: 'pending' };
  assert.equal(isPendingPurchase(pending), true);
  assert.equal(isProductPurchase(pending, CHAR_GOLD_PRODUCT_ID), false);

  const purchased = { productId: CHAR_GOLD_PRODUCT_ID, purchaseState: 'purchased' };
  assert.equal(isPendingPurchase(purchased), false);
  assert.equal(isProductPurchase(purchased, CHAR_GOLD_PRODUCT_ID), true);
});

test('characters: blocked slots are hidden while worn and restored when switching back to My pet', () => {
  let w = {
    ...emptyWardrobe({ species: 'dog' }),
    owned: ['collar-red', 'hat-crown', 'glasses-star', 'bowtie-red'],
    equipped: { collar: 'collar-red', hat: 'hat-crown', glasses: 'glasses-star', neck: 'bowtie-red' }
  };
  w = unlockCharacter(w, 'char-astro', { equip: true });
  const hiddenAstro = effectiveEquipped(w, 'char-astro');
  assert.equal(hiddenAstro.hat, undefined);
  assert.equal(hiddenAstro.glasses, undefined);
  assert.equal(hiddenAstro.collar, 'collar-red');
  assert.equal(hiddenAstro.neck, 'bowtie-red');

  // Saved equipped slots were never deleted
  assert.equal(w.equipped.hat, 'hat-crown');
  assert.equal(w.equipped.glasses, 'glasses-star');

  // Switching back to My pet restores them
  const myPet = equipCharacter(w, null);
  assert.equal(myPet.activeCharacter, null);
  assert.deepEqual(effectiveEquipped(myPet, null), w.equipped);
});

test('characters: encouragement nudge triggers within 20% of cheapest locked treat character', () => {
  const base = emptyWardrobe({ species: 'dog' }); // cheapest is char-zebra (900)
  assert.equal(characterNudge(base, 719), null);
  assert.deepEqual(characterNudge(base, 720), { character: getCharacter('char-zebra'), remaining: 180 });
  assert.equal(characterNudge(base, 900), null);
});

test('characters: analytics events allowed and payloads strip pet names; share headline formats character', () => {
  for (const ev of [
    'character_viewed',
    'character_tried',
    'character_unlocked',
    'character_equipped',
    'character_unequipped'
  ]) {
    assert.equal(ALLOWED_EVENTS.has(ev), true);
  }
  const clean = sanitizeParams({ id: 'char-cyber', method: 'treats', petName: 'Max' });
  assert.equal('petName' in clean, false);
  assert.equal(clean.id, 'char-cyber');

  assert.equal(
    formatShareHeadline({ petName: 'Max', characterLabel: 'Cyber' }),
    'Max as Cyber set a new personal best!'
  );
});

test('characters: all 6 characters x 2 species x 4 poses are supported in data and PetSprite', () => {
  const spriteSrc = fs.readFileSync(new URL('../src/components/game/PetSprite.js', import.meta.url), 'utf8');
  for (const ch of CHARACTERS) {
    assert.equal(ch.species.includes('dog'), true);
    assert.equal(ch.species.includes('cat'), true);
    assert.equal(spriteSrc.includes(`'${ch.parts}'`), true, `PetSprite handles ${ch.parts}`);
    for (const pose of ['run', 'jump', 'duck', 'hurt']) {
      assert.ok(pose);
    }
  }
});
