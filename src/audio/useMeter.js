import { useEffect, useState } from 'react';

// Live meter values ({ levels, ms, heard }) for one component only, so the
// rest of the app doesn't redraw many times a second while listening.
export default function useMeter(recorder) {
  const [meter, setMeter] = useState({ levels: [], ms: 0, heard: false });
  useEffect(() => recorder.subscribeMeter(setMeter), [recorder.subscribeMeter]);
  return meter;
}
