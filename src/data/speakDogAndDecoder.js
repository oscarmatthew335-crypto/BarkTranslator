export const HUMAN_TO_DOG_PHRASES = [
  {
    id: 'good_boy',
    emoji: '🥰',
    human: "You're the best dog in the world!",
    dogPhonetic: "Arf-woo! Yip-yip-awooo! 💕",
    cadence: "Woof! Yip yip! Awooooo! Good puppy!",
    pitch: 1.45,
    rate: 1.1,
    posture: "Soften your eyes, relax your shoulders, and give slow chest scratches (dogs prefer chest rubs over head pats!)."
  },
  {
    id: 'walkies',
    emoji: '🦮',
    human: "Time for walkies! Let's go outside!",
    dogPhonetic: "Bork! Ruff-ruff! Awoo-yip!",
    cadence: "Ruff! Ruff! Bork! Awoooo! Walkies time!",
    pitch: 1.35,
    rate: 1.2,
    posture: "Do a mini 'play bow' (bend knees slightly) and tap your thighs excitedly to trigger happy tail wags."
  },
  {
    id: 'stop_barking',
    emoji: '🤫',
    human: "Thank you for alerting me, I've got it now—relax.",
    dogPhonetic: "Huff... Mmm-boof. (Calm exhale)",
    cadence: "Boof. Hmmmm. Good guard, all clear now.",
    pitch: 0.72,
    rate: 0.78,
    posture: "Look toward the gate for 2 seconds so your dog sees you checked the threat, then sigh deeply and walk away calmly."
  },
  {
    id: 'braai_wait',
    emoji: '🥩',
    human: "Sit nicely and you'll get a treat soon!",
    dogPhonetic: "Woof-hmph! Arf! (Patient sit)",
    cadence: "Arf! Woof! Wait nicely...",
    pitch: 0.95,
    rate: 0.9,
    posture: "Hold an open palm steady at chest height. Reward only when all four paws are on the ground."
  },
  {
    id: 'come_here',
    emoji: '🏃',
    human: "Come here right now! Emergency recall!",
    dogPhonetic: "Yip-yip-yip-WOOF! ⚡",
    cadence: "Yip yip yip! Come here! Good dog! Woof!",
    pitch: 1.5,
    rate: 1.25,
    posture: "Crouch down, open your arms wide, or take 2 playful steps backward—dogs naturally love chasing moving targets!"
  },
  {
    id: 'sorry_vet',
    emoji: '🥺',
    human: "I'm sorry I stepped on your paw / It's okay!",
    dogPhonetic: "Sneeze-whine-yip! (Play apology)",
    cadence: "Yip... achu! Woo-woo, I am so sorry buddy!",
    pitch: 1.4,
    rate: 1.0,
    posture: "Dogs apologize during play by doing a fake 'play sneeze' and offering the side of their neck. Give a gentle ear rub immediately!"
  },
  {
    id: 'be_right_back',
    emoji: '🚗',
    human: "I'm going to the shops, I'll be right back!",
    dogPhonetic: "Boof... huff-woof. (Calm stay)",
    cadence: "Boof... Stay calm... Back soon...",
    pitch: 0.8,
    rate: 0.82,
    posture: "Avoid dramatic high-pitched goodbyes (which build separation anxiety). Leave a chew toy and speak in a slow, low, relaxed tone."
  },
  {
    id: 'play_bow',
    emoji: '🎾',
    human: "Let's play chase right now!",
    dogPhonetic: "SNEEZE! Ruff-arf-woof!",
    cadence: "Ruff! Arf! Catch me! Woof woof!",
    pitch: 1.38,
    rate: 1.22,
    posture: "Drop your elbows toward your knees (the universal canine 'Play Bow') and do a playful fake-sneeze so your dog knows it's game time!"
  }
];

export const DECODER_GUIDE = [
  {
    id: 'pitch_high',
    category: 'Vocalizations',
    title: 'High-Pitched Staccato Barks',
    badge: 'FRIENDLY / EXCITED',
    color: '#10B981',
    summary: 'Short, upbeat, higher-frequency barks usually mean "Come here!", "Let\'s play!", or happy greeting excitement.',
    science: 'Across mammal species (Morton\'s Motivational-Structural Rules), higher-pitched sounds signal non-aggression, friendliness, or desire for closeness.'
  },
  {
    id: 'pitch_low',
    category: 'Vocalizations',
    title: 'Low-Pitched Chest Bark / Growl-Bark',
    badge: 'TERRITORIAL / WARNING',
    color: '#EF4444',
    summary: 'Deep, resonant barks from the chest mean "Stay back from my territory" or "I am taking this threat seriously."',
    science: 'Lower frequencies travel further and mimic a larger body size, evolutionarily designed to deter intruders without needing to fight.'
  },
  {
    id: 'play_sneeze',
    category: 'Body Language',
    title: 'The "Play Sneeze" (Sharp Nasal Exhale)',
    badge: 'HAPPY / JUST PLAYING',
    color: '#3B82F6',
    summary: 'When dogs wrestle or bark during rough play and suddenly sneeze, it\'s their way of saying: "Don\'t worry, I\'m just playing, no real aggression!"',
    science: 'Calming signal used by canines to de-escalate rough-housing and keep play fun.'
  },
  {
    id: 'tail_wag_side',
    category: 'Body Language',
    title: 'Left vs. Right Tail Wagging',
    badge: 'NEUROSCIENCE FACT',
    color: '#8B5CF6',
    summary: 'Dogs wag more to the RIGHT when happy (seeing their owner) and more to the LEFT when nervous or facing an unfamiliar threat.',
    science: 'Controlled by left vs. right brain hemisphere activation (Quaranta et al., Current Biology). A stiff, high tail wag is a warning—not friendliness!'
  },
  {
    id: 'whale_eye',
    category: 'Body Language',
    title: '"Whale Eye" & Lip Licking',
    badge: 'STRESS / GIVE SPACE',
    color: '#F59E0B',
    summary: 'If you can see the whites of your dog\'s eyes (half-moon shape), or they yawn and flick their tongue when not hungry, they feel uncomfortable.',
    science: 'Early pre-bite stress indicators. Never punish a growl or stress signal—give the dog space immediately.'
  },
  {
    id: 'sa_safety',
    category: 'SA Pet Safety',
    title: 'Braai Bones, Hot Tar & Hadedas',
    badge: 'SA OWNER GUIDE 🇿🇦',
    color: '#FF6B00',
    summary: 'Never feed cooked chop or chicken bones from the braai (they splinter!). Always do the 5-second back-of-hand test on tar roads before summer walkies.',
    science: 'In South African summer sun, asphalt at 30°C air temperature can exceed 57°C—hot enough to burn paw pads in under 60 seconds.'
  }
];
