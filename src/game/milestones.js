// Score milestones for Endless and Chase modes.
//
// Each mode has three tiers (Bronze, Silver, Gold), stored as data so they
// are easy to retune in one place. Reaching a tier for the first time awards
// a one-off treat bonus for the wardrobe.

export const MILESTONES = {
  endless: [
    { id: 'bronze', tier: 1, emoji: '🥉', score: 300, reward: 20, nameKey: 'game.milestone.bronze' },
    { id: 'silver', tier: 2, emoji: '🥈', score: 800, reward: 50, nameKey: 'game.milestone.silver' },
    { id: 'gold', tier: 3, emoji: '🥇', score: 1500, reward: 100, nameKey: 'game.milestone.gold' }
  ],
  chase: [
    { id: 'bronze', tier: 1, emoji: '🥉', score: 250, reward: 20, nameKey: 'game.milestone.bronze' },
    { id: 'silver', tier: 2, emoji: '🥈', score: 600, reward: 50, nameKey: 'game.milestone.silver' },
    { id: 'gold', tier: 3, emoji: '🥇', score: 1200, reward: 100, nameKey: 'game.milestone.gold' }
  ]
};

export const milestonesFor = (mode) => MILESTONES[mode] || [];

// Milestones crossed for the first time in this run (previousBest < m.score <= score).
export function milestonesReached(mode, previousBest = 0, score = 0) {
  const list = milestonesFor(mode);
  const prev = Math.max(0, previousBest || 0);
  const cur = Math.max(0, score || 0);
  if (cur <= prev) return [];
  return list.filter((m) => m.score > prev && m.score <= cur);
}

// All milestones already earned at or below `bestScore`.
export function earnedMilestones(mode, bestScore = 0) {
  const cur = Math.max(0, bestScore || 0);
  return milestonesFor(mode).filter((m) => cur >= m.score);
}

// Total one-off treat reward from newly reached milestones.
export function milestoneReward(reached = []) {
  return reached.reduce((sum, m) => sum + (m.reward || 0), 0);
}
