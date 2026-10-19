import { useCallback, useEffect, useState } from 'react';
import { loadState, saveState, makePet, DEFAULT_SETTINGS } from '../storage/savedState';
import { prunePhotos, withCurrentUris } from '../storage/photos';
import { migrateSpeciesExamples, resetExamples } from '../learning/petLearning';
import { getSpecies } from '../species';
import { setAllowMobileData } from '../contribute/contributions';
import { setAppLanguage } from '../i18n';

// Pets, journal and settings: loading, migrating, saving, and the actions
// that change them.
export default function useAppData() {
  const [loaded, setLoaded] = useState(false);
  const [pets, setPets] = useState([]);
  const [activePetId, setActivePetId] = useState(null);
  const [history, setHistory] = useState([]);
  const [shareClips, setShareClips] = useState(null); // null = not asked yet
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadState().then(async (saved) => {
      if (saved) {
        if (saved.migratedFrom === 'v1') await migrateSpeciesExamples(saved.migratedSpecies, saved.pets[0].id);
        // Pets saved before "home" existed get their species' usual answer.
        setPets(saved.pets.map((p) => (p.home ? p : { ...p, home: getSpecies(p.species).defaultHome })));
        setActivePetId(saved.pets.some((p) => p.id === saved.activePetId) ? saved.activePetId : saved.pets[0].id);
        const history = (Array.isArray(saved.history) ? saved.history : []).map(withCurrentUris);
        setHistory(history);
        setShareClips(typeof saved.shareClips === 'boolean' ? saved.shareClips : null);
        setSettings(saved.settings);
        prunePhotos(history);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || !pets.length) return;
    saveState({ pets, activePetId, history, shareClips, settings });
  }, [loaded, pets, activePetId, history, shareClips, settings]);

  useEffect(() => {
    setAllowMobileData(settings.mobileData);
  }, [settings.mobileData]);

  useEffect(() => {
    setAppLanguage(settings.language || 'system');
  }, [settings.language]);

  const pet = pets.find((p) => p.id === activePetId) || pets[0] || null;
  const species = getSpecies(pet?.species || 'dog');
  const breed = species.breeds ? species.breeds.find((b) => b.id === pet?.breedId) || species.breeds[0] : null;

  const updatePet = useCallback((id, changes) => {
    setPets((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...changes };
        if (changes.species && changes.species !== p.species) {
          const sp = getSpecies(changes.species);
          next.personality = sp.defaultPersonality;
          next.contextId = sp.defaultContext;
          next.home = changes.home || sp.defaultHome;
          next.breedId = sp.breeds ? next.breedId : null;
        }
        return next;
      })
    );
  }, []);

  const addPet = useCallback((fields) => {
    const p = makePet(fields);
    setPets((list) => [...list, p]);
    setActivePetId(p.id);
    return p;
  }, []);

  const removePet = useCallback(
    async (id) => {
      await resetExamples(id);
      const rest = pets.filter((p) => p.id !== id);
      if (!rest.length) return; // always keep at least one pet
      setPets(rest);
      if (activePetId === id) setActivePetId(rest[0].id);
      setHistory((h) => {
        const kept = h.filter((e) => e.petId !== id);
        prunePhotos(kept);
        return kept;
      });
    },
    [pets, activePetId]
  );

  const updateSettings = useCallback((changes) => setSettings((s) => ({ ...s, ...changes })), []);
  const markSeen = useCallback((what) => setSettings((s) => ({ ...s, seen: { ...s.seen, [what]: true } })), []);

  const addEntry = useCallback(
    (entry) =>
      setHistory((h) => {
        const next = [entry, ...h];
        if (next.length % 10 === 0) prunePhotos(next);
        return next;
      }),
    []
  );
  const updateEntry = useCallback((id, changes) => setHistory((h) => h.map((e) => (e.id === id ? { ...e, ...changes } : e))), []);
  const clearHistory = useCallback(() => {
    setHistory([]);
    prunePhotos([]);
  }, []);

  return {
    loaded,
    pets,
    pet,
    species,
    breed,
    activePetId,
    setActivePetId,
    addPet,
    updatePet,
    removePet,
    history,
    addEntry,
    updateEntry,
    clearHistory,
    setHistory,
    shareClips,
    setShareClips,
    settings,
    updateSettings,
    markSeen
  };
}
