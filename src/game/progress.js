// Stage progress for one pet: stars per stage and which stages are open.
// Stages open by playing: finishing a stage (any star count) opens the next.
// Nothing here is ever gated on answering questions or taking photos.

import { stagesFor } from './stages';

export function emptyProgress() {
  return { stars: {}, bestTreats: {}, plays: {} };
}

export function isUnlocked(progress, species, stageId) {
  const list = stagesFor(species);
  const i = list.findIndex((s) => s.id === stageId);
  if (i < 0) return false;
  if (i === 0) return true;
  return (progress.stars[list[i - 1].id] || 0) >= 1;
}

export function recordStage(progress, result) {
  const id = result.stageId;
  return {
    ...progress,
    stars: { ...progress.stars, [id]: Math.max(progress.stars[id] || 0, result.stars) },
    bestTreats: { ...progress.bestTreats, [id]: Math.max(progress.bestTreats[id] || 0, result.treats) },
    plays: { ...progress.plays, [id]: (progress.plays[id] || 0) + 1 }
  };
}

export const totalStars = (progress) => Object.values(progress.stars).reduce((a, b) => a + b, 0);

// The first open stage without 3 stars, else the last stage.
export function suggestedStage(progress, species) {
  const list = stagesFor(species);
  const open = list.filter((s) => isUnlocked(progress, species, s.id));
  return open.find((s) => !progress.stars[s.id]) || open.find((s) => (progress.stars[s.id] || 0) < 3) || open[open.length - 1];
}

export function nextStageAfter(species, stageId) {
  const list = stagesFor(species);
  const i = list.findIndex((s) => s.id === stageId);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
}
