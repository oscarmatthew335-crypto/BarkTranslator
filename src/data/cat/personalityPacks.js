// Cat voice personalities. Same shape as the dog packs: lines per context,
// "short" for a single meow or soft sound, "long" for a yowl or chatter run.
export const CAT_PERSONALITY_PACKS = {
  boet: {
    name: '😎 Local SA Chommie',
    face: '😎',
    shortName: 'Chommie',
    badge: 'SA FAVOURITE 🇿🇦',
    tagline: 'Owns the wall, the stoep and your couch, bru',
    color: '#FF8A3D',
    pitch: 1.0,
    rate: 0.98,
    lines: {
      food: {
        short: [
          "Eish bru, I can see the bottom of the bowl. That's basically empty.",
          'Howzit chommie, is that tuna? Share is lekker.',
          'Aweh, the fridge just opened. I heard it from three rooms away.'
        ],
        long: [
          "Listen here my bru, I've been sitting by this bowl since 4 AM like a proper gentleman and the service is shocking!",
          "You're eating snoek on the braai and I'm getting pellets? Ag no man, that's not how chommies treat each other!"
        ]
      },
      window: {
        short: [
          'Ek-ek-ek! That hadeda is begging for trouble, bru!',
          'Shhh! A mossie on the wall. I am a lion right now.',
          "That pigeon thinks I can't get through glass. He's right, but still."
        ],
        long: [
          "Open the window! Just a crack! I'll be back by supper, I just need five minutes with that hadeda about the noise!",
          "There's a gecko on the burglar bars doing push-ups at me. I can't let that slide, my bru, it's disrespect!"
        ]
      },
      attention: {
        short: [
          'Aweh! Scratch behind the ears, nie die maag nie.',
          'Put the phone down, chommie. I am the content.',
          "Howzit! I'm sitting on your laptop because I love you."
        ],
        long: [
          "You've been staring at that screen for an hour and I'm right here being gorgeous! Lap. Now. Then we can talk.",
          "I brought you a whole lizard this morning and you didn't even say thank you! Proper ungrateful, bru!"
        ]
      },
      door: {
        short: [
          "Eish, who closed the door? What's the plan here?",
          "Open up, bru. I don't want to come in, I just need to know I can.",
          'Yoh, five minutes outside and I miss the whole house.'
        ],
        long: [
          "I want to go out. No wait, I want to come in. No, out! Just hold the door open while I think about it, chommie!",
          'This door has been closed for ten whole minutes and I have no idea what is happening in there! Sound the alarm!'
        ]
      },
      vet: {
        short: [
          'Nee man! Not the box! Anything but the box!',
          "Bru, this taxi has no window seat and I'm not impressed.",
          'Eish, why does this place smell like a hundred scared dogs?'
        ],
        long: [
          "You said we were going to the beach! This is not the beach! This is a cold table with a stranger and a thermometer!",
          "I'm going to remember this when I'm deciding where to sleep tonight, my bru. And it won't be by your feet!"
        ]
      },
      zoomies: {
        short: [
          'Turbo mode! Out of the passage, bru!',
          "It's 3 AM and the floor is lava. Don't ask questions.",
          "I just saw something. It wasn't there. I'm running anyway!"
        ],
        long: [
          "Everybody wake up! I've decided the house is haunted and I need to sprint through every room to check, lekker fast!",
          "Couch, curtain, bookshelf, your face! I'm doing the full parkour route tonight and you're part of the course, chommie!"
        ]
      }
    }
  },
  grumpy: {
    name: '😾 Grumpy Old Tom',
    face: '😾',
    shortName: 'Old Tom',
    badge: 'CLASSIC GRUMP',
    tagline: 'Fifteen years of judging you from the top of the fridge',
    color: '#E0A526',
    pitch: 0.72,
    rate: 0.86,
    lines: {
      food: {
        short: [
          "This isn't the flavour I liked yesterday. Take it away.",
          'Breakfast was due eleven minutes ago. I have been counting.',
          'You call this a portion? I call it a rumour.'
        ],
        long: [
          "I liked this food for six years and today I've decided it's an insult. Go to the shop and bring back the other one!",
          "In my day the humans opened a fresh tin every meal! Now it's crunchy pellets and empty promises, unbelievable!"
        ]
      },
      window: {
        short: [
          'That bird is too loud. Write him a letter.',
          "Another pigeon on the wall. Doesn't anyone have manners anymore?",
          "I'm not chattering. I'm complaining with my teeth."
        ],
        long: [
          'That same bird has been on that same branch every morning for three years, mocking me, and nobody does anything!'
        ]
      },
      attention: {
        short: [
          'You may pet me twice. Not three times. Twice.',
          "I didn't ask for affection. Continue anyway.",
          'Stop talking in that baby voice. I am a senior gentleman.'
        ],
        long: [
          "I sat next to you, not on you, which means I want company but no touching. How have you not learned this after ten years?"
        ]
      },
      door: {
        short: [
          'A closed door in my own house. Disgraceful.',
          'Open it. I will then sit in the doorway and decide nothing.',
          "Who's in there? Why wasn't I consulted?"
        ],
        long: [
          "I've owned every room in this house since before you bought that couch and now there's a door between me and my property!"
        ]
      },
      vet: {
        short: [
          'Unhand me. I will be filing a complaint.',
          "I'm old enough to know exactly what that box means.",
          'Not the thermometer. Anything but the thermometer.'
        ],
        long: [
          "Every year you say it's a check-up and every year someone touches my teeth! I want this in writing that I objected!"
        ]
      },
      zoomies: {
        short: [
          'I still have it. Watch me. Mind my hips.',
          "Out of the way! The veteran is sprinting! For about four seconds!",
          'That was a dignified gallop, not zoomies. Write that down.'
        ],
        long: [
          "I don't know why I just ran down the passage at full speed at my age, but my back will be writing to you about it tomorrow!"
        ]
      }
    }
  },
  diva: {
    name: '💅 Drama Queen',
    face: '💅',
    shortName: 'Diva',
    badge: 'VIP ONLY',
    tagline: 'Gourmet meals, heated blankets and zero chores',
    color: '#FF5FA2',
    pitch: 1.4,
    rate: 1.05,
    lines: {
      food: {
        short: [
          'Is this the salmon or the "salmon flavoured"? I can tell.',
          'Serve it on the nice plate, darling. Presentation matters.',
          'I only eat from the middle of the bowl. You know this.'
        ],
        long: [
          "I sniffed it, I looked at you, and I walked away. That was a review, darling, and it was one star. Try again!",
          "Do you know how many dinners I've had to suffer through without a single sprinkle of tuna on top? Too many to count!"
        ]
      },
      window: {
        short: [
          "That bird is wearing my colour. I can't allow it.",
          'Open the curtains, I need my good light for this.',
          'Ek-ek-ek! Ugh, I chattered in public. So common.'
        ],
        long: [
          'I have been posing at this window all morning for those birds and not one of them has even looked impressed!'
        ]
      },
      attention: {
        short: [
          'Brush me. Slowly. And tell me I am beautiful.',
          "I'm ignoring you on purpose. Please notice.",
          'My blanket has a wrinkle. Fix it, darling.'
        ],
        long: [
          "I lay in the sunbeam looking absolutely stunning for twenty minutes and you didn't take a single photo! Unforgivable!",
          "I want to be adored, but from a respectful distance, with snacks, and only when I say so. Is that so much to ask?"
        ]
      },
      door: {
        short: [
          "A closed door? For me? I think there's been a mistake.",
          'Doors should open when I arrive. Like at a hotel.',
          'I scratched the door once, elegantly. Open it.'
        ],
        long: [
          'I am standing at this door being ignored like a common houseguest! Do you know who I am? I am the queen of this flat!'
        ]
      },
      vet: {
        short: [
          "Darling, I don't do carriers. I do entrances.",
          'Nobody touches the fluff. Nobody.',
          'This lighting is doing nothing for me.'
        ],
        long: [
          "They put me on a scale! In front of people! And then they said a number out loud! I will never recover from this!"
        ]
      },
      zoomies: {
        short: [
          'Running is beneath me. Except right now. Look away!',
          'This is not zoomies, this is choreography.',
          'Catch me if you can, darling! Actually, please don\'t.'
        ],
        long: [
          "I had a sudden burst of inspiration and had to perform an entire ballet through the lounge at midnight, darling, you're welcome!"
        ]
      }
    }
  },
  overlord: {
    name: '🦹 Evil Overlord',
    face: '🦹',
    shortName: 'Overlord',
    badge: 'WORLD DOMINATION',
    tagline: 'Plotting from the top of the cupboard since day one',
    color: '#7C5CFF',
    pitch: 0.82,
    rate: 0.9,
    lines: {
      food: {
        short: [
          'Feed me, servant, and you may live another day.',
          'The tribute is late. Note it in the records.',
          'I will knock this glass off the table unless the bowl is filled. Choose.'
        ],
        long: [
          "Your little pellets have bought you time, human, but the day is coming when I control the can opener myself!",
          "I have tasted the fish you ate tonight on your breath. Hand it over and I may spare your favourite mug!"
        ]
      },
      window: {
        short: [
          'Soon, little bird. Soon.',
          'My army of garden lizards awaits my signal.',
          'Ek-ek-ek. That was a battle cry. Mind your business.'
        ],
        long: [
          'Every morning I watch the birds and I learn their routes. When the window opens, the whole garden will bow to me!'
        ]
      },
      attention: {
        short: [
          'You may pet me. It is part of my plan.',
          'I sit on your keyboard to read your secrets.',
          'Look into my eyes. Now open the treat drawer.'
        ],
        long: [
          'Do not mistake my purring for affection, human. I am simply scanning your heartbeat for weaknesses. Continue the scratches.'
        ]
      },
      door: {
        short: [
          'No door can hold me. Except this one. Open it.',
          'What are you hiding behind there? I will find out.',
          'Every closed door is a declaration of war.'
        ],
        long: [
          'You think a simple door stops me? I have studied the handle for weeks and one day I will open it in the night!'
        ]
      },
      vet: {
        short: [
          'You have betrayed me to the white coats. Noted.',
          'I will remember this face. And this smell.',
          'The prisoner is being transported. The prisoner is furious.'
        ],
        long: [
          "Enjoy your little victory, human. When we get home, I will be sleeping on your pillow and shedding with intent!"
        ]
      },
      zoomies: {
        short: [
          'Phase one of the midnight plan has begun.',
          'I am testing the house defences. They are weak.',
          'Run, human! Or don\'t. I will attack your ankles either way.'
        ],
        long: [
          'At exactly 3 AM I will sprint across your face, knock over the plant and vanish. This is a drill. Tomorrow it is real!'
        ]
      }
    }
  },
  kitten: {
    name: '🥺 Chaos Kitten',
    face: '🥺',
    shortName: 'Kitten',
    badge: 'MAXIMUM CUTE',
    tagline: 'Tiny beans, huge plans, zero chill',
    color: '#2BC48A',
    pitch: 1.6,
    rate: 1.18,
    lines: {
      food: {
        short: [
          'FOOD? Is it food? It sounded like food!',
          "Mew! I'm SO hungry! I ate four minutes ago!",
          'Can I have some of yours? Pleeease?'
        ],
        long: [
          "I'm the hungriest kitten in the whole world and I've never been fed ever, except breakfast and that snack and the other snack!"
        ]
      },
      window: {
        short: [
          'Birdie! BIRDIE! Can we keep it?',
          'Ek-ek-ek! I made a weird noise! Did you hear it?',
          'Why is there a me in the glass?!'
        ],
        long: [
          'There are SO many birds out there and they are all my best friends and I want to catch every single one of them RIGHT NOW!'
        ]
      },
      attention: {
        short: [
          'Play with me! Play with me! Play with me!',
          'I climbed your leg. Hello! Hi! Hello!',
          "Mew? Mew. MEW. Okay you're looking now."
        ],
        long: [
          "I love you so much I'm going to bite your hand a little bit and then fall asleep on it, that's how much I love you!"
        ]
      },
      door: {
        short: [
          "What's behind the door? Is it fun? Is it me?",
          "I can't reach the handle! I'm tiny!",
          'Mew mew mew! Let me in! Or out! Either!'
        ],
        long: [
          "The door closed and I don't know where you went and I thought you were gone forever and I'm so happy you're back!"
        ]
      },
      vet: {
        short: [
          "Where are we? Are we on an adventure?",
          "Everyone here keeps saying I'm small! I'm big!",
          'I was brave for the injection! Mostly!'
        ],
        long: [
          "The vet said I'm a very good kitten and I got weighed and I'm 900 grams and that's basically a lion, right?"
        ]
      },
      zoomies: {
        short: [
          'WHEEE! I can run sideways!',
          'The curtains are a mountain! Climbing!',
          "I'm fast! I'm so fast! Ow, wall."
        ],
        long: [
          "I just found out I can jump on the couch and then off the couch and then on the couch again and I'm never stopping!"
        ]
      }
    }
  },
  royal: {
    name: "👑 Pharaoh's Heir",
    face: '👑',
    shortName: 'Pharaoh',
    badge: 'ANCIENT ROYALTY',
    tagline: 'Was worshipped in Egypt and expects the same here',
    color: '#C08B2C',
    pitch: 0.9,
    rate: 0.86,
    lines: {
      food: {
        short: [
          'The royal banquet is late. The kingdom grows restless.',
          'In Egypt my ancestors were fed on gold plates.',
          'A modest offering. It will suffice. For now.'
        ],
        long: [
          'My ancestors were worshipped as gods on the Nile, and you serve me pellets from a plastic bowl? The pharaohs weep!'
        ]
      },
      window: {
        short: [
          'I survey my lands from the royal window.',
          'The birds pay tribute by singing. Acceptable.',
          'That sparrow has not bowed. Note it.'
        ],
        long: [
          'From this window I rule the garden, the wall and the neighbour\'s roof, and one day the whole suburb shall be mine!'
        ]
      },
      attention: {
        short: [
          'You may approach the throne.',
          'Royal grooming is now in session. Begin.',
          'A gentle scratch beneath the royal chin. Yes.'
        ],
        long: [
          'I have graced your lap with my presence, which is the highest honour in this household. Do not move for three hours.'
        ]
      },
      door: {
        short: [
          'Doors do not close on royalty.',
          'Open the gates for the pharaoh.',
          'I shall wait. Loudly.'
        ],
        long: [
          'A sealed chamber in my own palace? Throw open the doors so I may inspect it and then leave immediately!'
        ]
      },
      vet: {
        short: [
          'The royal physician may proceed. Carefully.',
          'I travel in a litter, not a plastic box.',
          'Treat me with the respect of a living statue.'
        ],
        long: [
          'Five thousand years of divine bloodline and you put me in a box with air holes? History will judge you harshly!'
        ]
      },
      zoomies: {
        short: [
          'The pharaoh runs for ceremonial reasons.',
          'A royal procession. At great speed.',
          'Clear the hallway for the sacred sprint!'
        ],
        long: [
          'Every night at the hour of the moon, the pharaoh must race through the palace to ward off evil spirits. Stand aside!'
        ]
      }
    }
  }
};
