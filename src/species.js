// Everything that differs between dogs and cats lives here, so the screens
// can stay species-agnostic.
import { CONTEXTS as DOG_CONTEXTS, DOG_BREEDS } from './data/contextsAndBreeds';
import { PERSONALITY_PACKS as DOG_PACKS } from './data/personalityPacks';
import { HUMAN_TO_DOG_PHRASES, DECODER_GUIDE as DOG_DECODER } from './data/speakDogAndDecoder';
import { CAT_CONTEXTS } from './data/cat/contexts';
import { CAT_PERSONALITY_PACKS } from './data/cat/personalityPacks';
import { HUMAN_TO_CAT_PHRASES, CAT_DECODER_GUIDE } from './data/cat/speakAndDecoder';

export const APP_NAME = 'Pawlingo';
export const STORE_URL = 'https://play.google.com/store/apps/details?id=com.pawlingo.app';
export const SUPPORT_EMAIL = 'support@zdns.co.za';
export const MIN_AGE = 13;

export const SPECIES = {
  dog: {
    id: 'dog',
    label: 'Dog',
    emoji: '🐶',
    defaultName: 'Bruno',
    sound: 'bark',
    sounds: 'barks',
    speakTab: 'Speak Dog',
    contexts: DOG_CONTEXTS,
    packs: DOG_PACKS,
    breeds: DOG_BREEDS,
    phrases: HUMAN_TO_DOG_PHRASES,
    decoder: DOG_DECODER,
    defaultPersonality: 'boet',
    defaultContext: 'door',
    patternLabels: {
      sharp: '⚡ Sharp alert bark',
      rapid: '🔁 Rapid-fire barking',
      howl: '🐺 Full howl',
      soft: '🥺 Soft whine'
    },
    moods: [
      { id: 'excited', label: '🎉 Excited / playful' },
      { id: 'wants', label: '🙏 Wants something' },
      { id: 'alert', label: '🚨 Alert / warning' },
      { id: 'scared', label: '😟 Scared / anxious' },
      { id: 'lonely', label: '🥺 Lonely / bored' },
      { id: 'angry', label: '😠 Angry' },
      { id: 'unsure', label: '🤷 Not sure' }
    ],
    syllables: ['Woof', 'Arf', 'Bork', 'Ruff', 'Yip', 'Awoo', 'Boof'],
    tools: [
      { id: 'click', emoji: '🔘', label: 'Clicker', say: 'Click! Good dog!', pitch: 1.6, rate: 1.35 },
      { id: 'whistle', emoji: '😗', label: 'Recall whistle', say: 'Tweet-wheeeet! {name}, come here!', pitch: 1.8, rate: 1.15 },
      { id: 'squeak', emoji: '🦆', label: 'Squeaky toy', say: 'Squeak! Squeak-squeak!', pitch: 1.9, rate: 1.4 }
    ]
  },
  cat: {
    id: 'cat',
    label: 'Cat',
    emoji: '🐱',
    defaultName: 'Mittens',
    sound: 'meow',
    sounds: 'meows',
    speakTab: 'Speak Cat',
    contexts: CAT_CONTEXTS,
    packs: CAT_PERSONALITY_PACKS,
    breeds: null,
    phrases: HUMAN_TO_CAT_PHRASES,
    decoder: CAT_DECODER_GUIDE,
    defaultPersonality: 'boet',
    defaultContext: 'food',
    patternLabels: {
      sharp: '😼 Sharp meow',
      rapid: '🐦 Chatter run',
      howl: '🙀 Full yowl',
      soft: '😽 Soft mew'
    },
    moods: [
      { id: 'hungry', label: '🍽️ Hungry' },
      { id: 'attention', label: '🫶 Wants attention' },
      { id: 'hunting', label: '🐦 Hunting excitement' },
      { id: 'annoyed', label: '😾 Annoyed' },
      { id: 'scared', label: '🙀 Scared' },
      { id: 'content', label: '😽 Content' },
      { id: 'unsure', label: '🤷 Not sure' }
    ],
    syllables: ['Meow', 'Mrrp', 'Mew', 'Prrr', 'Mrow', 'Nya', 'Mrrm'],
    tools: [
      { id: 'treats', emoji: '🥫', label: 'Treat shake', say: 'Shake shake shake! Treats!', pitch: 1.5, rate: 1.3 },
      { id: 'psst', emoji: '💋', label: 'Kiss-kiss call', say: 'Psst psst psst! {name}! Kiss kiss kiss!', pitch: 1.7, rate: 1.25 },
      { id: 'feather', emoji: '🪶', label: 'Bird tweet', say: 'Tweet tweet! Chirp chirp!', pitch: 1.9, rate: 1.4 }
    ]
  }
};

export const getSpecies = (id) => SPECIES[id] || SPECIES.dog;
