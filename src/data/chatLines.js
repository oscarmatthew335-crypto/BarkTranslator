// "Just chatting": the default situation. These lines don't assume a place
// (garden, braai, street) or a time of day, so they fit an indoor cat at
// 3 PM as well as a dog in the yard at night.

import { EXTRA_DOG_LINES } from './extraDogLines';
import { EXTRA_CAT_LINES } from './cat/extraCatLines';

const RAW_DOG_CHAT_LINES = {
  boet: {
    short: [
      "Howzit bru. Just checking you're still my human.",
      'Aweh! You looked at me, so I said something. That\'s how chatting works.',
      "Eish, I forgot what I wanted. Scratch my ears while I think.",
      'Lekker. You, me, the couch. Sorted.'
    ],
    long: [
      "Listen, bru, I'm not saying I'm bored, I'm saying if something exciting happened right now I wouldn't complain, hey!",
      "I've got a lot of news, chommie. Most of it is about smells. You wouldn't understand, but I'll tell you anyway!"
    ]
  },
  grumpy: {
    short: [
      'Hmph. I was resting my eyes.',
      "Yes, yes, I'm here. Don't make a fuss.",
      'In my day humans knew how to scratch a proper ear.',
      "I'm not barking. I'm commenting."
    ],
    long: [
      "Back in my day we didn't need to say anything, we just sighed loudly until somebody fetched the good blanket!",
      "I've told you before and I'll tell you again: the cushion is mine, the sunny spot is mine, and the attitude is earned!"
    ]
  },
  diva: {
    short: [
      'Darling, I simply had to be heard.',
      'Look at me. No, properly.',
      'This silence was beneath me.',
      "I'm not needy, I'm iconic."
    ],
    long: [
      "Darling, I've been posing for the last ten minutes and not one compliment. Do you know how exhausting it is being this fabulous?",
      "I need a brush, a treat, and a round of applause, in that order, and honestly the applause can come first!"
    ]
  },
  detective: {
    short: [
      'Status report: all quiet. Suspiciously quiet.',
      'Officer K-9 checking in. Over.',
      "I heard something. I'm logging it.",
      'Nothing to see here. I checked twice.'
    ],
    long: [
      "Officer K-9 reporting: crumbs located near the couch, suspect is you, and I'll be needing a treat as evidence!",
      'I have reviewed the situation from every angle and my conclusion is that you should pet me immediately. Case closed.'
    ]
  },
  puppy: {
    short: [
      'Hi! Hi! Hi! I love you!',
      "Are we doing something? Can I do it too?",
      'Look! It\'s me! Your favourite!',
      'I had a thought but then my tail moved.'
    ],
    long: [
      "Hi! I just wanted to say hi! And also hi again! You're my best friend in the whole world and I missed you even though you were right there!",
      "Can we play? Or cuddle? Or play then cuddle? Or cuddle while playing? I'm good with all of it, honestly!"
    ]
  },
  royal: {
    short: [
      'A word, if I may.',
      'One wishes to be acknowledged.',
      'I trust you are well. I certainly am.',
      'Do carry on. I was merely observing.'
    ],
    long: [
      'I shall overlook the lack of ceremony on this occasion, provided a gentle chin scratch is administered without delay.',
      "One has been remarkably patient today, and one feels a small reward would reflect well on the household."
    ]
  }
};

const RAW_CAT_CHAT_LINES = {
  boet: {
    short: [
      'Howzit chommie. Just saying hi, nothing serious.',
      "Aweh, you're in my spot. I'll allow it. For now.",
      'Eish, I forgot why I came in here.',
      'Lekker. Carry on, I\'m supervising.'
    ],
    long: [
      "I'm not asking for anything, bru. I'm just going to sit here and stare at you until you guess what I'm not asking for!",
      "Proper chilled day, chommie. I napped, I stretched, I knocked one thing off the table. Productive, hey!"
    ]
  },
  grumpy: {
    short: [
      'Hmph. You again.',
      "I meowed. Don't read into it.",
      'This cushion is lumpier than it used to be.',
      "I'm not old, I'm vintage."
    ],
    long: [
      "Fifteen years I've lived here and still nobody knows the correct way to stroke a cat. Head first, then back. It's not complicated!",
      "I was perfectly happy ignoring you, and then you made eye contact. Now we both have to deal with this."
    ]
  },
  diva: {
    short: [
      'Darling, notice me.',
      'I am the main character.',
      'My fur looks incredible today, admit it.',
      'Ugh, the lighting in here.'
    ],
    long: [
      "Darling, I've rearranged myself into three different gorgeous poses and you haven't taken a single photo. Unbelievable!",
      "I don't need anything. I just think the room was too quiet without my voice in it, and frankly so did you."
    ]
  },
  overlord: {
    short: [
      'Report, human.',
      'Everything is going according to plan.',
      'You may continue existing. For now.',
      'I see all.'
    ],
    long: [
      'My plans are proceeding nicely. Step one, sit in the warm spot. Step two, look adorable. Step three is classified.',
      "You think I meowed for no reason. Nothing I do is for no reason. Remember that when the time comes."
    ]
  },
  kitten: {
    short: [
      'Mew! Hi! What are you doing?',
      'I attacked my own tail. It fought back.',
      "Is that a string? Is EVERYTHING a string?",
      'Pick me up! No, down! No, up!'
    ],
    long: [
      "I just did the biggest jump of my life and nobody saw it! Can I do it again? Watch! Are you watching? You weren't watching!",
      "Everything is so exciting! Your sock moved! A shadow moved! I moved! I need a nap, but first, more chaos!"
    ]
  },
  royal: {
    short: [
      'You may approach.',
      'One requires a brief audience.',
      'Your devotion has been noted.',
      'Proceed with the chin scratches.'
    ],
    long: [
      'My ancestors were worshipped as gods, and today I ask only for a little attention and the softest blanket. I am being very reasonable.',
      'Kneel, human, or at least sit down so that I may occupy your lap in the manner to which I am accustomed.'
    ]
  }
};

function mergeChat(base, extra) {
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    const ex = extra[k]?.chat || {};
    out[k] = {
      short: [...v.short, ...(ex.short || [])],
      long: [...v.long, ...(ex.long || [])]
    };
  }
  return out;
}

export const DOG_CHAT_LINES = mergeChat(RAW_DOG_CHAT_LINES, EXTRA_DOG_LINES);
export const CAT_CHAT_LINES = mergeChat(RAW_CAT_CHAT_LINES, EXTRA_CAT_LINES);

