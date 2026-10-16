export const CONTEXTS = [
  {
    id: 'door',
    label: '🚪 Gate / Courier',
    shortLabel: 'At Gate',
    icon: '🚪',
    tip: 'Pro Tip: Look toward the gate for 2 seconds so your dog knows you checked the threat, then calmly call them to a mat.'
  },
  {
    id: 'food',
    label: '🍖 Food / Braai',
    shortLabel: 'Food',
    icon: '🍖',
    tip: 'Pro Tip: Demand barking near food is reinforced if you feed them mid-bark. Wait for 3 seconds of quiet before serving!'
  },
  {
    id: 'play',
    label: '🎾 Play / Walkies',
    shortLabel: 'Play',
    icon: '🎾',
    tip: 'Pro Tip: High-pitched staccato barks with a "play bow" (front legs down, bum up) mean pure excitement and an invitation to chase!'
  },
  {
    id: 'vet',
    label: '🛁 Bath / Vet',
    shortLabel: 'Bath/Vet',
    icon: '🛁',
    tip: 'Pro Tip: Whining or low-pitched protest barks during grooming indicate stress. Use a peanut-butter (xylitol-free!) lick-mat to soothe them.'
  },
  {
    id: 'zoomies',
    label: '⚡ 3AM / Zoomies',
    shortLabel: 'Zoomies',
    icon: '⚡',
    tip: 'Pro Tip: Frenetic random Play-Barks (FRAPs) release pent-up energy. A 10-minute sniff-walk burns more mental energy than a 30-minute run!'
  },
  {
    id: 'stranger',
    label: '👀 Suspicious Noise',
    shortLabel: 'Alert',
    icon: '👀',
    tip: 'Pro Tip: A sharp mid-range bark followed by head-tilting means your dog heard a frequency outside human range (up to 45,000 Hz).'
  }
];

export const DOG_BREEDS = [
  { id: 'boerboel', name: '🐕 Boerboel / Mastiff', pitchMod: -0.18, rateMod: -0.05, trait: 'Deep, authoritative guardian of the yard' },
  { id: 'gsd', name: '🐺 German Shepherd', pitchMod: -0.1, rateMod: 0.05, trait: 'High-alert tactical communicator' },
  { id: 'golden', name: '🦮 Golden / Lab', pitchMod: 0.0, rateMod: 0.0, trait: 'Food-obsessed optimist & sock thief' },
  { id: 'frenchie', name: '🐽 Frenchie / Pug', pitchMod: 0.12, rateMod: 0.08, trait: 'Sassy gremlin with dramatic snorts' },
  { id: 'staffie', name: '💪 Staffie / Bully', pitchMod: -0.05, rateMod: 0.02, trait: 'Velcro cuddle-tank with happy zoomies' },
  { id: 'dachshund', name: '🌭 Dachshund / Small', pitchMod: 0.22, rateMod: 0.12, trait: 'Tiny body, 100-decibel CEO energy' },
  { id: 'chihuahua', name: '🌶️ Chihuahua / Toy', pitchMod: 0.3, rateMod: 0.18, trait: 'Vibrating caffeinated ankle-sheriff' },
  { id: 'rescue', name: '❤️ Pavement Special / Mix', pitchMod: 0.0, rateMod: 0.02, trait: 'Street-smart legend with PhD in puppy eyes' }
];
