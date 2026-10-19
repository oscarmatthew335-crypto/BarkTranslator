# Google Play Store Listing — Pawlingo (`com.pawlingo.app`)

## App Title (max 30 chars)
Pawlingo: Dog & Cat Translator

## Short Description (max 80 chars)
Translate dog barks & cat meows, teach your pet's real sounds & share videos!

## Full Description (max 4,000 chars)
Ever wished you knew what your dog's dramatic sigh at the braai or your cat's 3 AM hallway yowl really meant?

**Pawlingo** listens to your dog or cat, measures the real sound (how many barks or meows, how loud, pitch, tone and rhythm), and turns it into hilarious, spot-on translations in 12 distinct personalities—while learning your individual pet's vocal habits over time.

### 🎙️ LISTENS FOR REAL (NO FAKE TIMERS)
Unlike novelty apps that invent a quote even in a silent room, Pawlingo measures the actual audio from your microphone:
- **Tap to Listen**: Tap the paw button and let your pet speak—Pawlingo automatically stops when your pet goes quiet.
- **Acoustic Pattern Detection**: Distinguishes between sharp alert barks, rapid-fire yips, extended howls/rants, soft whines, purrs, trills, chirps and hisses.
- **Personal Sound Learning**: Every time you tell Pawlingo what your pet really meant (Food, At the Gate, Walkies, Attention, Zoomies), it saves a private acoustic fingerprint on your phone. After a few examples, Pawlingo starts guessing what your pet wants before you even pick a situation!

### 🐶 DOG MODE & 🐱 CAT MODE (12 VOICES UNLOCKED)
Switch between Dog and Cat profiles—or add all your pets in one household:
- **Dog Voices**: Local SA Boet, Grumpy Old Man, Sassy Diva, Officer K-9, Velcro Puppy & Sir Barkington.
- **Cat Voices**: Sir Whiskers, 3 AM Gremlin, Judgy Aunty, Drama Moggie, Laser Operative & Purr Machine.
- **Fits Your Home & Time of Day**: Mark each pet as *Indoors* or *Has a garden* so indoor cats never talk about backyard fences, and midnight snack lines only appear at night.

### 🎬 SHAREABLE VIDEO & PICTURE CARDS
- **Live Camera Clips**: With the camera on, Pawlingo films your pet while it listens and generates a ready-to-share MP4 video with your pet's real recorded sound and an animated comic speech bubble!
- **One-Tap Replay**: Replay your pet's real recorded bark or meow anytime from your Journal.

### 📼 TRANSLATE CLIPS YOU ALREADY HAVE
Pets never perform on cue. Pick a video or voice note of your pet from your gallery, or share one straight to Pawlingo from WhatsApp or your camera app, and it translates the sound in it.
- **Catch sounds I just missed**: switch it on and Pawlingo keeps the last 10 seconds of sound in your phone's memory while the listening screen is open, so if your cat meows just before you tap, it still catches it. Those 10 seconds are never saved or sent anywhere.

### 🌍 ENGLISH, AFRIKAANS & ISIZULU
Use the app in English, Afrikaans or isiZulu (Settings → Language). A quick three-step welcome sets up your first pet.

### 🐕 SPEAK BACK & DECODE BODY LANGUAGE
- **Speak Dog & Cat Soundboard**: Play real, natural dog and cat vocalizations (CC0 recordings) plus posture coaching so your pet understands your body language, alongside built-in training clickers, whistles and attention cues.
- **Behaviour Decoder**: Bite-sized science guides on tail wagging, play sneezes, slow blinks, ear postures and South African pet safety tips.

### 🔒 PRIVATE BY DEFAULT
Your pets, journal and personal sound fingerprints stay on your phone—no account or sign-up required. You can optionally opt in to share short sound clips to help train the community translator, and you can switch sharing off or delete everything you've shared with one tap in Settings.

*Note: Pawlingo is made for entertainment and bonding with your pet, not veterinary or medical diagnosis.*

## Keywords / Tags
dog translator, cat translator, bark translator, meow translator, pet translator, dog sounds, cat sounds, pet behaviour, dog clicker, puppy training, South Africa


## Support Email
pawlingo@zdns.co.za

## Privacy Policy URL
The Pawlingo server's /privacy page (the same page the app's Settings links to). Get the exact address in Cloud Shell:
`gcloud functions describe pawlingo-ingest --gen2 --region=africa-south1 --project=pawlingo-a14f2d --format='value(serviceConfig.uri)'`
then add `/privacy` to the end, open it in a browser to check it loads, and paste that into Play Console.
