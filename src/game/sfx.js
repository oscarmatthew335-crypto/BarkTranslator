// Play tab sound effects and haptics.
//
// Game sounds are set to respect the phone's silent mode: on iPhone the
// audio session is put in "don't play in silent mode", so the ring/silent
// switch mutes them. Android plays them on the media volume (the volume keys
// turn them down), and the game has its own sound switch. The game's switch
// turns the sounds off on both.

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const FILES = {
  jump: require('../../assets/sounds/game_jump.wav'),
  collect: require('../../assets/sounds/game_collect.wav'),
  hit: require('../../assets/sounds/game_hit.wav'),
  power: require('../../assets/sounds/game_power.wav'),
  goal: require('../../assets/sounds/game_goal.wav')
};

let players = null;
let enabled = true;

export async function startGameAudio(soundOn) {
  enabled = Boolean(soundOn);
  try {
    await setAudioModeAsync({ playsInSilentMode: false, allowsRecording: false, interruptionMode: 'mixWithOthers' });
  } catch (_) {}
  if (!players) {
    players = {};
    for (const [k, src] of Object.entries(FILES)) {
      try {
        players[k] = createAudioPlayer(src);
      } catch (_) {}
    }
  }
}

export function setGameSound(on) {
  enabled = Boolean(on);
}

export function stopGameAudio() {
  if (!players) return;
  Object.values(players).forEach((p) => {
    try {
      p.remove();
    } catch (_) {}
  });
  players = null;
}

function play(name) {
  if (!enabled || !players?.[name]) return;
  try {
    const p = players[name];
    p.seekTo(0);
    p.play();
  } catch (_) {}
}

// One call per engine event (see game/engine.js step()).
export function gameEvent(event) {
  switch (event) {
    case 'jump':
      play('jump');
      break;
    case 'collect':
      play('collect');
      Haptics.selectionAsync().catch(() => {});
      break;
    case 'power':
    case 'shield':
    case 'smash':
      play('power');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      break;
    case 'hit':
      play('hit');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      break;
    case 'finish':
      play('goal');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      break;
    default:
  }
}
