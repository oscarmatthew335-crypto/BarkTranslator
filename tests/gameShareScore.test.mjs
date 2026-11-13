import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SCORE_SHARE_URL,
  CHASE_SHARE_MIN_SECONDS,
  canShareRunScore,
  formatShareHeadline,
  buildScoreShareMessage
} from '../src/game/shareScore.js';

test('canShareRunScore triggers on new personal best or Chase run >= 30s', () => {
  assert.equal(CHASE_SHARE_MIN_SECONDS, 30);
  assert.equal(canShareRunScore(null), false);
  assert.equal(canShareRunScore({ endless: true, score: 200 }, { newBest: false }), false);
  assert.equal(canShareRunScore({ endless: true, score: 200 }, { newBest: true }), true);
  assert.equal(canShareRunScore({ chase: true, seconds: 29.9 }, { newBest: false }), false);
  assert.equal(canShareRunScore({ chase: true, seconds: 30 }, { newBest: false }), true);
  assert.equal(canShareRunScore({ chase: true, seconds: 45 }, { newBest: false }), true);
  assert.equal(canShareRunScore({ stageId: 'dog-park', score: 100 }, { newBest: true }), true);
});

test('SCORE_SHARE_URL and share message formatting include utm_source=share', () => {
  assert.equal(
    SCORE_SHARE_URL,
    'https://play.google.com/store/apps/details?id=com.pawlingo.app&referrer=utm_source%3Dshare'
  );
  assert.equal(
    formatShareHeadline({ petName: 'Rex', isChase: true, chaserLabel: 'bath time' }),
    'Rex escaped bath time!'
  );
  assert.equal(
    formatShareHeadline({ petName: 'Rex', isChase: false }),
    'Rex set a new personal best!'
  );

  const msg = buildScoreShareMessage({
    petName: 'Rex',
    score: 842,
    isChase: true,
    chaserLabel: 'bath time'
  });
  assert.ok(msg.includes('Rex escaped bath time!'));
  assert.ok(msg.includes('842'));
  assert.ok(msg.includes(SCORE_SHARE_URL));
});
