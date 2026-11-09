import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGame, saveGame, petGame, emptyGameState, emptyBestScores } from './gameStore';

const listeners = new Set();
let sharedState = null;

function broadcast(next) {
  sharedState = next;
  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch (_) {}
  });
}

// The Play tab's saved data for the active pet, with an updater that saves.
export default function useGame(pet) {
  const [state, setState] = useState(sharedState);
  const loaded = useRef(Boolean(sharedState));

  useEffect(() => {
    let alive = true;
    const sub = (next) => {
      if (alive) setState(next);
    };
    listeners.add(sub);
    loadGame().then((s) => {
      if (!alive) return;
      loaded.current = true;
      const now = Date.now();
      const firstSeenAt = s?.lives?.firstSeenAt ?? now;
      const next = {
        ...s,
        lives: { ...(s?.lives || emptyGameState().lives), firstSeenAt }
      };
      broadcast(next);
    });
    return () => {
      alive = false;
      listeners.delete(sub);
    };
  }, []);

  useEffect(() => {
    if (state && loaded.current) saveGame(state);
  }, [state]);

  const applyUpdate = useCallback((updater) => {
    const base = sharedState || emptyGameState();
    const next = updater(base);
    broadcast(next);
  }, []);

  const game = state && pet ? petGame(state, pet) : null;

  const updateGame = useCallback(
    (fn) =>
      applyUpdate((base) => {
        const nextPet = fn(petGame(base, pet));
        const sp = pet.species === 'cat' ? 'cat' : 'dog';
        const spBests = {
          endless: Math.max(base.bestScores?.[sp]?.endless || 0, nextPet.bestScores?.endless || 0),
          chase: Math.max(base.bestScores?.[sp]?.chase || 0, nextPet.bestScores?.chase || 0)
        };
        return {
          ...base,
          bestScores: { ...(base.bestScores || emptyBestScores()), [sp]: spBests },
          pets: { ...base.pets, [pet.id]: { ...nextPet, bestScores: spBests } }
        };
      }),
    [pet, applyUpdate]
  );

  const updateLives = useCallback(
    (fn) =>
      applyUpdate((base) => {
        const nextLives = fn(base.lives || emptyGameState().lives);
        return { ...base, lives: nextLives };
      }),
    [applyUpdate]
  );

  const updateInterstitial = useCallback(
    (fn) =>
      applyUpdate((base) => {
        const nextInter = fn(base.interstitial || emptyGameState().interstitial);
        return { ...base, interstitial: nextInter };
      }),
    [applyUpdate]
  );

  const setPremium = useCallback(
    (val) =>
      applyUpdate((base) => ({
        ...base,
        premium: Boolean(val)
      })),
    [applyUpdate]
  );

  const setOptions = useCallback(
    (changes) =>
      applyUpdate((base) => ({
        ...base,
        options: { ...base.options, ...changes }
      })),
    [applyUpdate]
  );

  return {
    ready: Boolean(state),
    game,
    lives: state?.lives || emptyGameState().lives,
    interstitial: state?.interstitial || emptyGameState().interstitial,
    premium: Boolean(state?.premium),
    options: state?.options || emptyGameState().options,
    updateGame,
    updateLives,
    updateInterstitial,
    setPremium,
    setOptions
  };
}
