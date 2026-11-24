# Google Play Store Listing — Pawlingo (`com.pawlingo.app`)

## App Title (max 30 chars)
Pawlingo: Pet Skateboard Run

(28 chars. Was "Pawlingo: Dog & Cat Translator". The game now leads; "translator" stays in the description and tags.)

## Short Description (max 80 chars)
Skate as your own dog or cat! Jump, dodge, grab treats and unlock fur and boards

(80 chars, the limit)

## Monetization Disclosure
Contains ads · In-app purchases

## What's new in 3.0.0 (max 500 chars)
Your pet now rides a skateboard! 🛹
• Brand-new riding art for cats and dogs, with ollies, kickflips and a look-back when you pull off a trick
• Pick your board: 9 boards to collect, including a gold one for a 7-day streak
• Fur sets: Gold, Cyber and Zebra, painted for every pose
• New places: Home, plus fresh props at the braai and the vet
• Smoother lanes, a fairer warm-up and easier jumps
Treats you spent on hats and glasses have been refunded.

(about 470 chars)

## Full Description (max 4,000 chars)
Your dog or cat, on a skateboard, skating through the park, the beach, the braai and the vet. How far can they go?

**Pawlingo** is a quick, cheerful skate-runner starring your own pet. Swipe to change lanes, jump over puddles and bins, duck under sprinklers, and grab bones, balls and fish along the way. Pull off a double-jump kickflip and your pet spins round to grin at you.

### 🛹 SKATE AS YOUR OWN PET
- Dog or cat, in your pet's own fur colour
- Ollies, kickflips, ducks and a look-back when you nail a trick
- Swipe controls, with optional on-screen buttons

### 🌍 SIX PLACES TO SKATE
Garden, park, beach, braai, vet and home, each with its own obstacles, props and finish arch. Robot vacuums, pigeons, puddles, sprinklers and a runaway bathtub are all out to stop you.

### 🎯 MODES FOR EVERY DAY
- **Stages**: beat each place to unlock the next
- **Endless**: one long run for a high score
- **Chase**: stay ahead of the runaway bath
- **Daily run and challenges**: a new course and goal every day, with streak rewards

### 🎨 COLLECT BOARDS AND FUR SETS
Earn treats as you play and spend them on new boards. Unlock the Gold, Cyber and Zebra fur sets. Everything is just for looks; nothing you buy makes the game easier.

### 🐾 PLUS A PET TRANSLATOR, FOR FUN
Tap to listen and Pawlingo measures your pet's real bark or meow (how many, how loud, what pattern) and turns it into a funny translation in one of 12 personalities. Make a shareable video of your pet "talking", play real dog and cat sounds back, and read quick guides to body language.

### 🌍 ENGLISH, AFRIKAANS & ISIZULU
Use the app in English, Afrikaans or isiZulu.

### 🔒 PRIVATE BY DEFAULT
No account or sign-up. Your pets and progress stay on your phone. You can choose to share short sound clips to help improve the translator, and switch that off or delete what you shared at any time.

*Pawlingo is for fun and bonding with your pet. Translations are entertainment, not veterinary advice.*

## Keywords / Tags
pet game, dog game, cat game, skateboard game, runner game, endless runner, dog translator, cat translator, pet translator, South Africa

## Graphics (in `store/graphics/`)
- Feature graphic: `feature-graphic-1024x500.png`
- Phone screenshots (1080×1920, in this order): `screenshot-1.png` … `screenshot-6.png`
- Icon: `icon-512.png`
- Preview video: upload `pawlingo-preview-30s.mp4` to YouTube (public or unlisted, ads off) and paste the link under Store listing → Preview video.

## Support Email
pawlingo@zdns.co.za

## Privacy Policy URL
The Pawlingo server's /privacy page (the same page the app's Settings links to). Get the exact address in Cloud Shell:
`gcloud functions describe pawlingo-ingest --gen2 --region=africa-south1 --project=pawlingo-a14f2d --format='value(serviceConfig.uri)'`
then add `/privacy` to the end, open it in a browser to check it loads, and paste that into Play Console.
