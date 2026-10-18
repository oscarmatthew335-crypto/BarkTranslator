import { useRef, useState, useCallback, useEffect } from 'react';
import {
  useAudioStream,
  setAudioModeAsync,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { analyzeBark, SETTLE_MS } from './barkAnalysis';
import { computeFeatures, encodeWav, resample, windowLevels, SAMPLE_RATE } from './features';

const MAX_CLIP_SECONDS = 15; // listening always stops by itself after this
const QUIET_AFTER_SOUND_MS = 1300; // stop this long after the last bark
const GIVE_UP_MS = 8000; // stop if nothing has been heard for this long

// Tap to listen: the microphone runs until the pet has barked and gone quiet
// again (or nothing is heard, or 15 seconds pass), then onAutoStop fires.
// From the raw signal we get the live meter, the bark measurements, the sound
// fingerprint used for learning, and, only if the owner opted in to sharing,
// a WAV clip. Nothing is written to disk unless keepClip is set.
//
// The live meter is delivered through subscribeMeter() instead of React
// state, so only the meter redraws while listening (smooth on budget phones).
export default function useBarkRecorder({ onAutoStop } = {}) {
  const [phase, setPhaseState] = useState('idle'); // idle | starting | recording | analysing
  const phaseRef = useRef('idle');
  const setPhase = (p) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const chunksRef = useRef([]);
  const totalRef = useRef(0);
  const rateRef = useRef(SAMPLE_RATE);
  const samplesRef = useRef([]); // { t, db } every 60 ms, for the bark analysis
  const startedAtRef = useRef(0);
  const cappedRef = useRef(false);
  const streamRef = useRef(null);
  const autoRef = useRef({ floor: null, settle: [], heard: false, lastLoud: 0, fired: false });
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;
  const meterListeners = useRef(new Set());
  const meterRef = useRef({ levels: [], ms: 0, heard: false });

  const emitMeter = () => meterListeners.current.forEach((fn) => fn(meterRef.current));

  const fireAutoStop = () => {
    if (autoRef.current.fired) return;
    autoRef.current.fired = true;
    onAutoStopRef.current?.();
  };

  const onBuffer = useCallback((buf) => {
    if (phaseRef.current !== 'recording' || cappedRef.current) return;
    if (!buf?.data) return;
    let chunk = new Float32Array(buf.data.slice(0));
    if (buf.channels > 1) {
      const mono = new Float32Array(Math.floor(chunk.length / buf.channels));
      for (let i = 0; i < mono.length; i++) mono[i] = chunk[i * buf.channels];
      chunk = mono;
    }
    rateRef.current = buf.sampleRate || SAMPLE_RATE;
    const lv = windowLevels(chunk, rateRef.current, totalRef.current);
    samplesRef.current.push(...lv);
    chunksRef.current.push(chunk);
    totalRef.current += chunk.length;
    const ms = (totalRef.current / rateRef.current) * 1000;

    // Detect barks against the room's background level, then wait for quiet.
    const a = autoRef.current;
    for (const { t, db } of lv) {
      if (a.floor === null) {
        a.settle.push(db);
        if (t >= SETTLE_MS) {
          const sorted = [...a.settle].sort((x, y) => x - y);
          a.floor = sorted[Math.floor(sorted.length / 2)];
        }
        continue;
      }
      if (db >= Math.max(a.floor + 12, -42)) {
        a.heard = true;
        a.lastLoud = t;
      }
    }
    meterRef.current = { levels: [...meterRef.current.levels, ...lv.map((l) => l.db)].slice(-14), ms, heard: a.heard };
    emitMeter();

    if (ms >= MAX_CLIP_SECONDS * 1000) {
      cappedRef.current = true;
      fireAutoStop();
    } else if (a.heard && ms - a.lastLoud > QUIET_AFTER_SOUND_MS) {
      fireAutoStop();
    } else if (!a.heard && ms > GIVE_UP_MS) {
      fireAutoStop();
    }
  }, []);

  const { stream } = useAudioStream({ sampleRate: SAMPLE_RATE, channels: 1, encoding: 'float32', onBuffer });
  streamRef.current = stream;

  useEffect(
    () => () => {
      try {
        streamRef.current?.stop();
      } catch (_) {}
    },
    []
  );

  // 'granted' | 'undetermined' | 'denied' | 'blocked'
  const permissionStatus = useCallback(async () => {
    const p = await getRecordingPermissionsAsync();
    if (p.granted) return 'granted';
    if (p.status === 'undetermined') return 'undetermined';
    return p.canAskAgain ? 'denied' : 'blocked';
  }, []);

  const requestPermission = useCallback(async () => {
    const p = await requestRecordingPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'denied' : 'blocked';
  }, []);

  // Starts listening. Never shows the system permission prompt itself: the
  // app explains why first, then calls requestPermission().
  const start = useCallback(async () => {
    if (phaseRef.current !== 'idle') return { ok: false, reason: 'busy' };
    setPhase('starting');
    try {
      const perm = await permissionStatus();
      if (perm !== 'granted') {
        setPhase('idle');
        return { ok: false, reason: perm };
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      chunksRef.current = [];
      samplesRef.current = [];
      totalRef.current = 0;
      cappedRef.current = false;
      autoRef.current = { floor: null, settle: [], heard: false, lastLoud: 0, fired: false };
      meterRef.current = { levels: [], ms: 0, heard: false };
      emitMeter();
      startedAtRef.current = Date.now();
      setPhase('recording');
      await stream.start();
      return { ok: true };
    } catch (e) {
      setPhase('idle');
      return { ok: false, reason: 'error', error: e };
    }
  }, [stream, permissionStatus]);

  const stop = useCallback(
    async ({ keepClip = false } = {}) => {
      if (phaseRef.current !== 'recording') return null;
      setPhase('analysing');
      autoRef.current.fired = true;
      const heldMs = Date.now() - startedAtRef.current;
      try {
        stream.stop();
      } catch (_) {}
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch (_) {}

      // Join the captured chunks and bring them to 16 kHz.
      const raw = new Float32Array(totalRef.current);
      let off = 0;
      for (const c of chunksRef.current) {
        raw.set(c, off);
        off += c.length;
      }
      chunksRef.current = [];
      const pcm = resample(raw, rateRef.current, SAMPLE_RATE);

      const analysis = analyzeBark(samplesRef.current, heldMs, {
        pcm,
        liveHeard: autoRef.current.heard
      });
      samplesRef.current = [];
      const features = analysis?.heard ? computeFeatures(pcm) : null;

      let clipUri = null;
      if (keepClip && analysis?.heard) {
        try {
          const f = new File(Paths.cache, `bark-${Date.now()}.wav`);
          f.write(encodeWav(pcm, SAMPLE_RATE));
          clipUri = f.uri;
        } catch (_) {}
      }
      meterRef.current = { levels: [], ms: 0, heard: false };
      emitMeter();
      setPhase('idle');
      return { heldMs, analysis, features, clipUri };
    },
    [stream]
  );

  const subscribeMeter = useCallback((fn) => {
    meterListeners.current.add(fn);
    fn(meterRef.current);
    return () => meterListeners.current.delete(fn);
  }, []);

  return {
    phase,
    isRecording: phase === 'recording',
    start,
    stop,
    permissionStatus,
    requestPermission,
    subscribeMeter
  };
}
