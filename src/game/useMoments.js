import { useCallback, useEffect, useState } from 'react';
import { loadMoments, saveMoments } from './photoChallenge';
import { deleteLocalFile } from '../storage/photos';
import { queuePhotoDelete } from '../contribute/contributions';

// Every pet's photo-challenge moments (kept in one list, filtered per pet).
export default function useMoments() {
  const [all, setAll] = useState(null);
  useEffect(() => {
    loadMoments().then(setAll);
  }, []);

  const add = useCallback((moment) => {
    setAll((list) => {
      const next = [moment, ...(list || [])];
      saveMoments(next);
      return next;
    });
  }, []);

  // Deletes the photo from the phone and, if it was shared, from the server.
  const remove = useCallback((moment) => {
    deleteLocalFile(moment.uri);
    if (moment.shared) queuePhotoDelete(moment.id);
    setAll((list) => {
      const next = (list || []).filter((m) => m.id !== moment.id);
      saveMoments(next);
      return next;
    });
  }, []);

  return { ready: all !== null, all: all || [], add, remove };
}

// A pet was removed: delete its moments too.
export async function forgetPetMoments(petId) {
  const list = await loadMoments();
  const gone = list.filter((m) => m.petId === petId);
  for (const m of gone) {
    deleteLocalFile(m.uri);
    if (m.shared) await queuePhotoDelete(m.id);
  }
  await saveMoments(list.filter((m) => m.petId !== petId));
}
