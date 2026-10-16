import { useRef, useState, useCallback } from 'react';
import {
  useAudioStream,
  setAudioModeAsync,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { analyzeBark } from './barkAnalysis';
import { computeFeatures, encodeWav, resample, windowLevels, SAMPLE_RATE } from './features';

const MIN_HOLD_MS = 300;
const MAX_CLIP_SECONDS = 15; // listening stops by itself after this

// Listens to the raw microphone signal while the button is held. From it we
// get the live meter, the bark measurements, the sound fingerprint used for
// learning, and (only if the owner opted in to sharing) a WAV clip.
// Nothing is written to disk unless keepClip is set.
export default function useBarkRecorder() {
  const [phase, setPhaseState] = useState('idle'); // idle | starting | recording | analysing
  const phaseRef = useRef('idle');
  const setPhase = (p) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [levels, setLevels] = useState([]);
  const [liveMs, setLiveMs] = useState(0);
  const chunksRef = useRef([]);
  const totalRef = useRef(0);
  const rateRef = useRef(SAMPLE_RATE);
  const samplesRef = useRef([]); // { t, db } every 60 ms, for the bark analysis
  const startedAtRef = useRef(0);
  const releasedRef = useRef(false);
  const cappedRef = useRef(false);
  const streamRef = useRef(null);

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
    setLevels((prev) => [...prev, ...lv.map((l) => l.db)].slice(-14));
    setLiveMs((totalRef.current / rateRef.current) * 1000);
    if (totalRef.current >= MAX_CLIP_SECONDS * rateRef.current) {
      cappedRef.current = true;
      try {
        streamRef.current?.stop();
      } catch (_) {}
    }
  }, []);

  const { stream } = useAudioStream({ sampleRate: SAMPLE_RATE, channels: 1, encoding: 'float32', onBuffer });
  streamRef.current = stream;

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
      chunksRef.current = [];
      samplesRef.current = [];
      totalRef.current = 0;
      cappedRef.current = false;
      setLevels([]);
      setLiveMs(0);
      startedAtRef.current = Date.now();
      setPhase('recording');
      await stream.start();
      return { ok: true, releasedEarly: releasedRef.current };
    } catch (e) {
      setPhase('idle');
      return { ok: false, reason: 'error', error: e };
    }
  }, [stream, ensurePermission]);

  const stop = useCallback(
    async ({ keepClip = false } = {}) => {
      releasedRef.current = true;
      if (phaseRef.current !== 'recording') return null;
      setPhase('analysing');
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

      const analysis = heldMs < MIN_HOLD_MS ? null : analyzeBark(samplesRef.current, heldMs);
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
      setPhase('idle');
      setLiveMs(0);
      return { heldMs, analysis, features, clipUri };
    },
    [stream]
  );

  return {
    phase,
    isRecording: phase === 'recording',
    liveMs,
    levels,
    start,
    stop
  };
}
