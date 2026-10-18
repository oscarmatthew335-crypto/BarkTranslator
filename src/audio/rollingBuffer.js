// In-memory rolling buffer of the last 10 seconds of audio for "I just missed it".
// Never written to disk, never uploaded, and cleared as soon as the scanner
// closes or the app goes to the background.

import { analyzeBark, SETTLE_MS } from './barkAnalysis';
import { resample, SAMPLE_RATE, windowLevels } from './features';

export const MAX_ROLLING_SECONDS = 10;
const MAX_SAMPLES = MAX_ROLLING_SECONDS * SAMPLE_RATE;

export class RollingAudioBuffer {
  constructor(maxSeconds = MAX_ROLLING_SECONDS) {
    this.maxSamples = Math.round(maxSeconds * SAMPLE_RATE);
    this.clear();
  }

  clear() {
    this.chunks = [];
    this.totalSamples = 0;
  }

  push(chunk, sampleRate = SAMPLE_RATE) {
    if (!chunk || !chunk.length) return;
    const pcm = sampleRate === SAMPLE_RATE ? new Float32Array(chunk) : resample(chunk, sampleRate, SAMPLE_RATE);
    if (!pcm.length) return;
    this.chunks.push(pcm);
    this.totalSamples += pcm.length;

    while (this.totalSamples > this.maxSamples && this.chunks.length > 0) {
      const overflow = this.totalSamples - this.maxSamples;
      const first = this.chunks[0];
      if (first.length <= overflow) {
        this.chunks.shift();
        this.totalSamples -= first.length;
      } else {
        this.chunks[0] = first.subarray(overflow);
        this.totalSamples -= overflow;
      }
    }
  }

  toPcm() {
    const out = new Float32Array(this.totalSamples);
    let off = 0;
    for (const c of this.chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  durationMs() {
    return (this.totalSamples / SAMPLE_RATE) * 1000;
  }

  // Checks whether the rolling buffer holds a real vocalisation using the
  // exact same rules as live recording (settle noise floor, live detector
  // threshold, MIN_BURST_MS, and voiced pitch).
  inspect() {
    const pcm = this.toPcm();
    const durationMs = (pcm.length / SAMPLE_RATE) * 1000;
    if (durationMs < SETTLE_MS + 120) {
      return { heard: false, pcm, durationMs, liveHeard: false, analysis: analyzeBark([], durationMs) };
    }
    const levels = windowLevels(pcm, SAMPLE_RATE, 0);
    const settle = levels.filter((l) => l.t < SETTLE_MS).map((l) => l.db).sort((a, b) => a - b);
    const floor = settle.length ? settle[Math.floor(settle.length / 2)] : -55;
    const liveHeard = levels.some((l) => l.t >= SETTLE_MS && l.db >= Math.max(floor + 12, -42));
    const analysis = analyzeBark(levels, durationMs, { pcm, liveHeard });
    return {
      heard: Boolean(analysis?.heard && liveHeard),
      pcm,
      durationMs,
      liveHeard,
      analysis
    };
  }
}
