// Generated list of the Speak tab sounds (see tools/make_sounds.py).
// Swap any WAV for a licensed recording with the same name; no code changes needed.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export const SOUND_FILES = {
  dog_good_boy: require('../../assets/sounds/dog_good_boy.wav'),
  dog_walkies: require('../../assets/sounds/dog_walkies.wav'),
  dog_stop_barking: require('../../assets/sounds/dog_stop_barking.wav'),
  dog_braai_wait: require('../../assets/sounds/dog_braai_wait.wav'),
  dog_come_here: require('../../assets/sounds/dog_come_here.wav'),
  dog_sorry_vet: require('../../assets/sounds/dog_sorry_vet.wav'),
  dog_be_right_back: require('../../assets/sounds/dog_be_right_back.wav'),
  dog_play_bow: require('../../assets/sounds/dog_play_bow.wav'),
  cat_love_you: require('../../assets/sounds/cat_love_you.wav'),
  cat_dinner: require('../../assets/sounds/cat_dinner.wav'),
  cat_come_here: require('../../assets/sounds/cat_come_here.wav'),
  cat_good_cat: require('../../assets/sounds/cat_good_cat.wav'),
  cat_stop_that: require('../../assets/sounds/cat_stop_that.wav'),
  cat_goodnight: require('../../assets/sounds/cat_goodnight.wav'),
  cat_sorry: require('../../assets/sounds/cat_sorry.wav'),
  cat_play: require('../../assets/sounds/cat_play.wav'),
  tool_click: require('../../assets/sounds/tool_click.wav'),
  tool_whistle: require('../../assets/sounds/tool_whistle.wav'),
  tool_squeak: require('../../assets/sounds/tool_squeak.wav'),
  tool_treats: require('../../assets/sounds/tool_treats.wav'),
  tool_psst: require('../../assets/sounds/tool_psst.wav'),
  tool_feather: require('../../assets/sounds/tool_feather.wav'),
  dog_unit_bark: require('../../assets/sounds/dog_unit_bark.wav'),
  dog_unit_low: require('../../assets/sounds/dog_unit_low.wav'),
  dog_unit_yip: require('../../assets/sounds/dog_unit_yip.wav'),
  cat_unit_meow: require('../../assets/sounds/cat_unit_meow.wav'),
  cat_unit_question: require('../../assets/sounds/cat_unit_question.wav'),
  cat_unit_mrrp: require('../../assets/sounds/cat_unit_mrrp.wav'),
};

export const SOUND_DURATIONS = {"dog_good_boy": 1.25, "dog_walkies": 0.9, "dog_stop_barking": 0.66, "dog_braai_wait": 0.78, "dog_come_here": 0.8, "dog_sorry_vet": 0.95, "dog_be_right_back": 1.0, "dog_play_bow": 0.79, "cat_love_you": 1.68, "cat_dinner": 1.75, "cat_come_here": 1.03, "cat_good_cat": 1.4, "cat_stop_that": 0.55, "cat_goodnight": 1.55, "cat_sorry": 0.82, "cat_play": 1.13, "tool_click": 0.074, "tool_whistle": 0.68, "tool_squeak": 0.52, "tool_treats": 0.601, "tool_psst": 0.3, "tool_feather": 0.39, "dog_unit_bark": 0.2, "dog_unit_low": 0.22, "dog_unit_yip": 0.09, "cat_unit_meow": 0.5, "cat_unit_question": 0.55, "cat_unit_mrrp": 0.3};

let current = null;
let timers = [];

export function stopSounds() {
  timers.forEach(clearTimeout);
  timers = [];
  if (current) {
    try {
      current.pause();
      current.remove();
    } catch (_) {}
    current = null;
  }
}

function playOne(name) {
  const src = SOUND_FILES[name];
  if (!src) return;
  try {
    if (current) {
      try {
        current.remove();
      } catch (_) {}
    }
    current = createAudioPlayer(src);
    current.play();
  } catch (_) {}
}

// Plays one sound, or several one after the other with a short gap.
export async function playSounds(names, gapMs = 90) {
  stopSounds();
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  } catch (_) {}
  const list = Array.isArray(names) ? names : [names];
  let at = 0;
  list.forEach((name) => {
    timers.push(setTimeout(() => playOne(name), at));
    at += (SOUND_DURATIONS[name] || 0.3) * 1000 + gapMs;
  });
  timers.push(setTimeout(stopSounds, at + 300));
  return at;
}
