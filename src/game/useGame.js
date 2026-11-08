import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGame, saveGame, petGame, emptyGameState, emptyBestScores } from './gameStore';

// The Play tab's saved data for the active pet, with an updater that saves.
export default function useGame(pet) {
  const [state, setState] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    loadGame().then((s) => {
      if (!alive) return;
      loaded.current = true;
      setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (state && loaded.current) saveGame(state);
  }, [state]);

  const game = state && pet ? petGame(state, pet) : null;

  const updateGame = useCallback(
    (fn) =>
      setState((s) => {
        const base = s || emptyGameState();
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
    [pet]
  );
  const setOptions = useCallback((changes) => setState((s) => ({ ...(s || emptyGameState()), options: { ...(s || emptyGameState()).options, ...changes } })), []);

  return { ready: Boolean(state), game, options: state?.options || emptyGameState().options, updateGame, setOptions };
}
