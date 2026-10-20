import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGame, saveGame, petGame, emptyGameState } from './gameStore';

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
        return { ...base, pets: { ...base.pets, [pet.id]: fn(petGame(base, pet)) } };
      }),
    [pet]
  );
  const setOptions = useCallback((changes) => setState((s) => ({ ...(s || emptyGameState()), options: { ...(s || emptyGameState()).options, ...changes } })), []);

  return { ready: Boolean(state), game, options: state?.options || emptyGameState().options, updateGame, setOptions };
}
