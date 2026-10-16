export const HUMAN_TO_CAT_PHRASES = [
  {
    id: 'love_you',
    emoji: '😽',
    human: 'I love you, little one',
    petPhonetic: 'Mrrrp… prrrr (slow blink)',
    cadence: 'Mrrrp. Prrrrr. Love you.',
    pitch: 1.35,
    rate: 0.85,
    posture: "Look at your cat with soft eyes and slowly close them for a second. Cats use a slow blink to say they feel safe with you."
  },
  {
    id: 'dinner',
    emoji: '🍽️',
    human: "Dinner's ready!",
    petPhonetic: 'Mrow? Mrow-mrow!',
    cadence: 'Mrow? Mrow mrow! Dinner time!',
    pitch: 1.45,
    rate: 1.1,
    posture: 'Use the same short phrase and the same bowl sound every meal. Cats learn routine cues fast and will come running.'
  },
  {
    id: 'come_here',
    emoji: '👋',
    human: 'Come here, kitty',
    petPhonetic: 'Psst-psst-psst. Mrrp?',
    cadence: 'Psst psst psst! Mrrp?',
    pitch: 1.5,
    rate: 1.15,
    posture: 'Crouch down so you look smaller and hold out one finger at nose height. Let your cat come to you and sniff first.'
  },
  {
    id: 'good_cat',
    emoji: '🏅',
    human: "You're such a good cat",
    petPhonetic: 'Prrrrrr… mew.',
    cadence: 'Prrrrrr. Good kitty. Mew.',
    pitch: 1.25,
    rate: 0.9,
    posture: 'Scratch gently under the chin or at the base of the ears. Most cats prefer that to long strokes down the back.'
  },
  {
    id: 'stop_that',
    emoji: '🙅',
    human: 'Please stop scratching the couch',
    petPhonetic: 'Hrrm. Mrrow… (look away)',
    cadence: 'Hrrm. No no. Mrrow.',
    pitch: 0.85,
    rate: 0.85,
    posture: "Don't shout. Calmly lift your cat to a scratching post right next to the couch, and reward them when they use it."
  },
  {
    id: 'goodnight',
    emoji: '🌙',
    human: 'Goodnight, see you in the morning',
    petPhonetic: 'Mrrrm… prr (sleepy blink)',
    cadence: 'Mrrrm. Prrrr. Night night.',
    pitch: 1.1,
    rate: 0.78,
    posture: 'A play session and a small meal just before bed copies a hunt-eat-sleep cycle and makes 3 AM wake-ups less likely.'
  },
  {
    id: 'sorry',
    emoji: '🥺',
    human: "Sorry I stepped on your tail!",
    petPhonetic: 'Mew… mrrp? (soft)',
    cadence: 'Mew. Mrrp? Sorry sorry.',
    pitch: 1.4,
    rate: 0.95,
    posture: 'Give them space for a minute, then offer a treat on the floor nearby rather than picking them up straight away.'
  },
  {
    id: 'play',
    emoji: '🪶',
    human: "Let's play!",
    petPhonetic: 'Ek-ek-ek! Mrrrow!',
    cadence: 'Ek ek ek! Mrrrow! Get it!',
    pitch: 1.55,
    rate: 1.2,
    posture: 'Drag a wand toy away from your cat, not towards them. Prey runs away, and that triggers the chase.'
  }
];

export const CAT_DECODER_GUIDE = [
  {
    id: 'meow_humans',
    category: 'Sounds',
    title: 'Meowing is mostly for you',
    badge: 'Talking to humans',
    color: '#FF8A3D',
    summary: "Kittens meow at their mothers, but adult cats hardly meow at other cats. Grown-up meows are mostly aimed at people.",
    science: 'Cats seem to learn which meows get results from their humans, so many cats develop their own personal "dialect" for food, doors and attention.'
  },
  {
    id: 'purr',
    category: 'Sounds',
    title: "Purring isn't always happiness",
    badge: 'Content or coping',
    color: '#2BC48A',
    summary: 'Most purring means a relaxed, happy cat. But cats also purr when they are stressed, hurt or unwell, as a way to soothe themselves.',
    science: 'Look at the whole cat. Purring with soft eyes and kneading is contentment. Purring while hiding, hunched or not eating is worth a vet check.'
  },
  {
    id: 'chatter',
    category: 'Sounds',
    title: 'The bird chatter',
    badge: 'Hunting mode',
    color: '#6EC8FF',
    summary: "That fast 'ek-ek-ek' at birds through the window is a mix of excitement and frustration at prey they can't reach.",
    science: 'Follow it with a wand-toy chase so your cat can finish the "hunt" and burn off the built-up energy.'
  },
  {
    id: 'hiss',
    category: 'Sounds',
    title: 'Hiss and growl',
    badge: 'Back off',
    color: '#EF4444',
    summary: 'A hiss is a clear warning, not an attack. Your cat is asking for space.',
    science: 'Never punish a hiss. It is how a cat avoids a fight. Give space and remove whatever is bothering them.'
  },
  {
    id: 'slow_blink',
    category: 'Body language',
    title: 'The slow blink',
    badge: 'Cat kiss',
    color: '#FF5FA2',
    summary: 'A long, slow close of the eyes means your cat feels safe with you. You can slow-blink back.',
    science: 'Studies have found cats are more likely to approach people who slow-blink at them, so it works in both directions.'
  },
  {
    id: 'tail',
    category: 'Body language',
    title: 'Tail up vs. tail puffed',
    badge: 'Read the tail',
    color: '#7C5CFF',
    summary: 'A tail held straight up, often with a little hook at the tip, is a friendly hello. A puffed-up bottlebrush tail means fear.',
    science: 'A tail lashing or thumping from side to side means irritation building up. That is your cue to stop petting.'
  },
  {
    id: 'belly',
    category: 'Body language',
    title: 'The belly trap',
    badge: 'Trust, not an invite',
    color: '#E0A526',
    summary: 'A cat rolling over to show its belly is showing trust. It usually is not asking for a belly rub.',
    science: 'The belly is a vulnerable spot, so many cats grab and kick when it is touched. Scratch the chin or cheeks instead.'
  },
  {
    id: 'kneading',
    category: 'Body language',
    title: 'Kneading ("making biscuits")',
    badge: 'Comfort',
    color: '#2BC48A',
    summary: 'Pushing their paws in and out on a blanket or your lap is a kitten habit that carries on into adulthood when cats feel content.',
    science: 'Kittens knead to get milk flowing while nursing, so it is linked to comfort and safety.'
  },
  {
    id: 'sa_safety',
    category: 'SA pet safety',
    title: 'Lilies, pain pills and snakes',
    badge: 'SA owner guide 🇿🇦',
    color: '#FF8A3D',
    summary: 'Lilies are extremely toxic to cats. Even pollen or vase water can cause kidney failure. Never give a cat human painkillers such as paracetamol.',
    science: 'In summer, keep an eye out for snakes in the garden, and get to a vet immediately if your cat is bitten or has eaten anything from a lily.'
  }
];
