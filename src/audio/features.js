// Turns a recording into a compact "sound fingerprint": a list of numbers
// describing the bark's tone (mel bands), pitch, noisiness and rhythm.
//
// It runs in plain JavaScript on the phone, so it needs no native ML runtime.
// The same fingerprint is used for:
//   - your pet's personal learning (comparing new barks with ones you taught)
//   - the shared model (trained on the server, downloaded as a small file)
//   - training data (sent with opted-in clips)
//
// Bump FEATURE_VERSION whenever the numbers change meaning, so old and new
// fingerprints are never mixed.

export const FEATURE_VERSION = 'f1';
export const SAMPLE_RATE = 16000;

const FRAME = 400; // 25 ms
const HOP = 160; // 10 ms
const NFFT = 512;
const N_MELS = 24;
const F_MIN = 60;
const F_MAX = 7600;

// Names of each number, in order. Kept for the server and for debugging.
export const FEATURE_NAMES = [
  ...Array.from({ length: N_MELS }, (_, i) => `mel_mean_${i}`),
  ...Array.from({ length: N_MELS }, (_, i) => `mel_std_${i}`),
  'centroid_mean_khz',
  'centroid_std_khz',
  'zcr_mean',
  'zcr_std',
  'f0_median_khz',
  'f0_iqr_khz',
  'voiced_ratio',
  'active_ratio',
  'burst_count',
  'longest_burst_s',
  'mean_burst_s',
  'bursts_per_s',
  'peak_db',
  'dynamic_range_db'
];

let cache = null;
function tables() {
  if (cache) return cache;
  const hann = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));

  // Mel filterbank (triangular filters on the FFT bins)
  const hzToMel = (f) => 2595 * Math.log10(1 + f / 700);
  const melToHz = (m) => 700 * (10 ** (m / 2595) - 1);
  const mMin = hzToMel(F_MIN);
  const mMax = hzToMel(F_MAX);
  const points = Array.from({ length: N_MELS + 2 }, (_, i) => melToHz(mMin + ((mMax - mMin) * i) / (N_MELS + 1)));
  const bins = points.map((f) => Math.floor(((NFFT + 1) * f) / SAMPLE_RATE));
  const filters = [];
  for (let m = 1; m <= N_MELS; m++) {
    const lo = bins[m - 1];
    const mid = bins[m];
    const hi = bins[m + 1];
    const weights = [];
    for (let k = lo; k < hi; k++) {
      const w = k < mid ? (k - lo) / Math.max(1, mid - lo) : (hi - k) / Math.max(1, hi - mid);
      if (w > 0) weights.push([k, w]);
    }
    filters.push(weights);
  }

  // Bit-reversal for the FFT
  const bits = Math.log2(NFFT);
  const rev = new Uint16Array(NFFT);
  for (let i = 0; i < NFFT; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const cos = new Float32Array(NFFT / 2);
  const sin = new Float32Array(NFFT / 2);
  for (let i = 0; i < NFFT / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / NFFT);
    sin[i] = -Math.sin((2 * Math.PI * i) / NFFT);
  }
  cache = { hann, filters, rev, cos, sin };
  return cache;
}

// In-place radix-2 FFT; returns the power spectrum (NFFT/2 + 1 bins).
function powerSpectrum(frame, t) {
  const re = new Float32Array(NFFT);
  const im = new Float32Array(NFFT);
  for (let i = 0; i < FRAME; i++) re[t.rev[i]] = frame[i] * t.hann[i];
  for (let size = 2; size <= NFFT; size <<= 1) {
    const half = size >> 1;
    const step = NFFT / size;
    for (let start = 0; start < NFFT; start += size) {
      for (let j = 0; j < half; j++) {
        const k = j * step;
        const a = start + j;
        const b = a + half;
        const tr = re[b] * t.cos[k] - im[b] * t.sin[k];
        const ti = re[b] * t.sin[k] + im[b] * t.cos[k];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  const p = new Float32Array(NFFT / 2 + 1);
  for (let i = 0; i <= NFFT / 2; i++) p[i] = (re[i] * re[i] + im[i] * im[i]) / NFFT;
  return p;
}

// Pitch by autocorrelation, 80-1500 Hz. Returns [f0Hz, strength 0..1].
export function pitch(frame) {
  const minLag = Math.floor(SAMPLE_RATE / 1500);
  const maxLag = Math.min(FRAME - 1, Math.floor(SAMPLE_RATE / 80));
  let energy = 0;
  for (let i = 0; i < FRAME; i++) energy += frame[i] * frame[i];
  if (energy <= 1e-9) return [0, 0];
  let bestLag = 0;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < FRAME; i++) s += frame[i] * frame[i + lag];
    const norm = s / energy;
    if (norm > best) {
      best = norm;
      bestLag = lag;
    }
  }
  return bestLag ? [SAMPLE_RATE / bestLag, best] : [0, 0];
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length);
};
const quantile = (sorted, q) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)))] : 0;

// pcm: Float32Array of samples in -1..1 at 16 kHz.
// Returns { version, vector: number[] } or null if there's no clear sound.
export function computeFeatures(pcm) {
  if (!pcm || pcm.length < FRAME * 4) return null;
  const t = tables();
  const nFrames = Math.floor((pcm.length - FRAME) / HOP) + 1;
  const frameDb = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    let peak = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = Math.abs(pcm[off + i]);
      if (v > peak) peak = v;
    }
    frameDb[f] = peak > 0 ? Math.max(-70, 20 * Math.log10(peak)) : -70;
  }

  const sortedDb = Array.from(frameDb).sort((a, b) => a - b);
  const floor = quantile(sortedDb, 0.2);
  const peakDb = sortedDb[sortedDb.length - 1];
  const threshold = Math.max(floor + 10, -45);
  const active = [];
  for (let f = 0; f < nFrames; f++) if (frameDb[f] >= threshold) active.push(f);
  if (active.length < 3) return null;

  const melFrames = Array.from({ length: N_MELS }, () => []);
  const centroids = [];
  const zcrs = [];
  const f0s = [];
  let voiced = 0;
  let pitched = 0;
  const frame = new Float32Array(FRAME);
  active.forEach((f, idx) => {
    const off = f * HOP;
    for (let i = 0; i < FRAME; i++) frame[i] = pcm[off + i];
    const p = powerSpectrum(frame, t);
    t.filters.forEach((weights, m) => {
      let e = 0;
      for (const [k, w] of weights) e += p[k] * w;
      melFrames[m].push(Math.log(e + 1e-8));
    });
    let num = 0;
    let den = 0;
    for (let k = 0; k < p.length; k++) {
      num += k * p[k];
      den += p[k];
    }
    centroids.push(den > 0 ? ((num / den) * SAMPLE_RATE) / NFFT / 1000 : 0);
    let z = 0;
    for (let i = 1; i < FRAME; i++) if (frame[i - 1] >= 0 !== frame[i] >= 0) z++;
    zcrs.push(z / FRAME);
    if (idx % 2 === 0) {
      pitched++;
      const [f0, strength] = pitch(frame);
      if (strength > 0.3 && f0 > 0) {
        voiced++;
        f0s.push(f0 / 1000);
      }
    }
  });

  // Rhythm: stretches of active frames (gaps under 80 ms joined)
  const bursts = [];
  let start = active[0];
  let prev = active[0];
  for (let i = 1; i < active.length; i++) {
    if (active[i] - prev > 8) {
      bursts.push([start, prev]);
      start = active[i];
    }
    prev = active[i];
  }
  bursts.push([start, prev]);
  const burstSecs = bursts.map(([a, b]) => ((b - a + 1) * HOP) / SAMPLE_RATE).filter((s) => s >= 0.05);
  const spanS = ((active[active.length - 1] - active[0] + 1) * HOP) / SAMPLE_RATE;
  const f0Sorted = f0s.sort((a, b) => a - b);

  const vector = [
    ...melFrames.map(mean),
    ...melFrames.map(std),
    mean(centroids),
    std(centroids),
    mean(zcrs),
    std(zcrs),
    quantile(f0Sorted, 0.5),
    quantile(f0Sorted, 0.75) - quantile(f0Sorted, 0.25),
    pitched ? voiced / pitched : 0,
    active.length / nFrames,
    burstSecs.length,
    burstSecs.length ? Math.max(...burstSecs) : 0,
    mean(burstSecs),
    burstSecs.length / Math.max(0.5, spanS),
    peakDb,
    peakDb - floor
  ].map((v) => (Number.isFinite(v) ? Number(v.toFixed(4)) : 0));

  return { version: FEATURE_VERSION, vector };
}

// Levels for the live meter and the bark analysis: the loudest sample in
// each 60 ms window, in dBFS (0 = max, -160 = silence).
export function windowLevels(chunk, sampleRate, startSample) {
  const win = Math.max(1, Math.round(sampleRate * 0.06));
  const out = [];
  for (let off = 0; off < chunk.length; off += win) {
    let peak = 0;
    const end = Math.min(chunk.length, off + win);
    for (let i = off; i < end; i++) {
      const v = Math.abs(chunk[i]);
      if (v > peak) peak = v;
    }
    out.push({ t: ((startSample + off) / sampleRate) * 1000, db: peak > 0 ? 20 * Math.log10(peak) : -160 });
  }
  return out;
}

// Linear resampling, used only if the phone can't record at 16 kHz.
export function resample(pcm, fromRate, toRate = SAMPLE_RATE) {
  if (fromRate === toRate) return pcm;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(pcm.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(pcm.length - 1, i0 + 1);
    const frac = x - i0;
    out[i] = pcm[i0] * (1 - frac) + pcm[i1] * frac;
  }
  return out;
}

// 16-bit mono WAV bytes from float samples.
export function encodeWav(pcm, sampleRate = SAMPLE_RATE) {
  const n = pcm.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}
