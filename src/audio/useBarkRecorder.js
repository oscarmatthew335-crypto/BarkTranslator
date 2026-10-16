import { useEffect, useRef, useState, useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync
} from 'expo-audio';
import { File } from 'expo-file-system';
import { analyzeBark } from './barkAnalysis';

// Small mono recording: we only need loudness readings, not studio audio.
const BARK_RECORDING = {
  ...RecordingPresets.LOW_QUALITY,
  numberOfChannels: 1,
  isMeteringEnabled: true
};

const POLL_MS = 60;
const MIN_HOLD_MS = 300;

// Records while the button is held and returns real measurements of the
// sound. The audio file is deleted straight after it's measured.
export default function useBarkRecorder() {
  const recorder = useAudioRecorder(BARK_RECORDING);
  const state = useAudioRecorderState(recorder, POLL_MS);

  const [phase, setPhaseState] = useState('idle'); // idle | starting | recording | analysing
  const phaseRef = useRef('idle');
  const setPhase = (p) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [levels, setLevels] = useState([]);
  const samplesRef = useRef([]);
  const startedAtRef = useRef(0);
  const releasedRef = useRef(false);

  // Collect a level reading on every status poll while recording.
  useEffect(() => {
    if (phase !== 'recording' || !state.isRecording) return;
    if (typeof state.metering !== 'number') return;
    const t = Date.now() - startedAtRef.current;
    samplesRef.current.push({ t, db: state.metering });
    setLevels((prev) => [...prev.slice(-11), state.metering]);
  }, [state.metering, state.durationMillis, state.isRecording, phase]);

  const ensurePermission = useCallback(async () => {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain && current.status === 'denied') return 'blocked';
    const asked = await requestRecordingPermissionsAsync();
    // The permission dialog interrupted the press, so ask for a fresh hold.
    return asked.granted ? 'just-granted' : 'denied';
  }, []);

  const start = useCallback(async () => {
    if (phaseRef.current !== 'idle') return { ok: false, reason: 'busy' };
    releasedRef.current = false;
    setPhase('starting');
    try {
      const perm = await ensurePermission();
      if (perm !== 'granted') {
        setPhase('idle');
        return { ok: false, reason: perm };
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      samplesRef.current = [];
      setLevels([]);
      startedAtRef.current = Date.now();
      recorder.record();
      setPhase('recording');
      return { ok: true, releasedEarly: releasedRef.current };
    } catch (e) {
      setPhase('idle');
      return { ok: false, reason: 'error', error: e };
    }
  }, [recorder, ensurePermission]);

  const stop = useCallback(async () => {
    releasedRef.current = true;
    if (phaseRef.current !== 'recording') return null;
    setPhase('analysing');
    const heldMs = Date.now() - startedAtRef.current;
    let uri = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
    } catch (_) {}
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch (_) {}
    if (uri) {
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch (_) {}
    }
    const result = heldMs < MIN_HOLD_MS ? null : analyzeBark(samplesRef.current, heldMs);
    samplesRef.current = [];
    setPhase('idle');
    return { heldMs, analysis: result };
  }, [recorder]);

  return {
    phase,
    isRecording: phase === 'recording',
    liveMs: phase === 'recording' ? state.durationMillis : 0,
    levels,
    start,
    stop
  };
}
