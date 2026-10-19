// Shared translation pipeline used by both live listening (including the
// 10-second "I just missed it" buffer) and picked/shared clips:
//   windowLevels -> analyzeBark -> computeFeatures -> guessContext -> pickLine -> history entry

import { analyzeBark, pickLinePool, moodScores, SETTLE_MS } from './barkAnalysis';
import { computeFeatures, SAMPLE_RATE, windowLevels } from './features';
import { guessContext } from '../learning/petLearning';
import { loadSharedModel } from '../learning/sharedModel';
import { pickLine, activeContext } from '../lines';

export async function runTranslationPipeline({
  pcm,
  liveHeard = true,
  pet,
  species,
  breed = null,
  history = [],
  sharedModel,
  recordedAt = null,
  now = null,
  random = Math.random
}) {
  const durationMs = pcm ? (pcm.length / SAMPLE_RATE) * 1000 : 0;
  const samples = pcm ? windowLevels(pcm, SAMPLE_RATE, 0) : [];
  const analysis = analyzeBark(samples, durationMs, { pcm, liveHeard });
  if (!analysis?.heard) {
    return { heard: false, analysis, features: null, guess: null, entry: null, durationMs };
  }

  const features = computeFeatures(pcm);
  const parsedTime = recordedAt ? Date.parse(recordedAt) : NaN;
  const nowDate = now instanceof Date ? now : Number.isFinite(parsedTime) ? new Date(parsedTime) : new Date();
  const timeMs = nowDate.getTime();

  const sm = sharedModel !== undefined ? sharedModel : await loadSharedModel(species.id);
  const guess = await guessContext(pet.id, features?.vector, sm, {
    breedId: breed?.id,
    breedName: breed?.name,
    petName: pet.name,
    now: timeMs
  });
  const guessCtx = guess?.show ? species.contexts.find((c) => c.id === guess.contextId) : null;

  const pack = species.packs[pet.personality] || species.packs[species.defaultPersonality];
  const pickedId = activeContext(pet, timeMs);
  const ctx = guessCtx || species.contexts.find((c) => c.id === pickedId) || species.contexts[0];
  const recent = (history || [])
    .filter((h) => h.petId === pet.id)
    .slice(0, 8)
    .map((h) => h.text);

  const text = pickLine({
    pool: pack.lines[ctx.id] || pack.lines.chat,
    size: pickLinePool(analysis.pattern),
    home: pet.home,
    contextId: ctx.id,
    recent,
    now: nowDate,
    random
  });

  const id = String(Date.now());
  const isoDate = nowDate.toISOString();
  const entry = {
    id,
    petId: pet.id,
    species: species.id,
    petName: pet.name,
    breedName: breed?.name || null,
    personalityName: pack.name,
    personalityFace: pack.face,
    contextLabel: ctx.label,
    tip: ctx.tip,
    text,
    duration: (durationMs / 1000).toFixed(1),
    patternLabel: species.patternLabels[analysis.pattern],
    pattern: analysis.pattern,
    soundCount: analysis.barkCount,
    loudness: analysis.loudness,
    pitch: Math.max(0.5, Math.min(1.8, pack.pitch + (breed?.pitchMod || 0))),
    rate: Math.max(0.6, Math.min(1.5, pack.rate + (breed?.rateMod || 0))),
    emotions: moodScores(analysis, ctx.id, pet.personality),
    photoUri: null,
    audioUri: null,
    videoUri: null,
    contextId: ctx.id,
    pickedContextId: pickedId,
    guess: guessCtx
      ? {
          contextId: guess.contextId,
          label: guessCtx.label,
          confidence: guess.confidence,
          wording: guess.wording,
          source: guess.source,
          evidence: guess.evidence || null
        }
      : null,
    features: features?.vector || null,
    clipId: null,
    labelled: false,
    recordedAt: isoDate,
    date: isoDate
  };

  return {
    heard: true,
     durationMs,
    analysis,
    features,
    guess,
    guessCtx,
    ctx,
    pickedId,
    pack,
    text,
    entry
  };
}

export { SETTLE_MS };
