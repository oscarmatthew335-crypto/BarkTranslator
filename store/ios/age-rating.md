# App Store Connect: Age Rating answers (`com.pawlingo.app`)

App Store Connect → the app → **App Information** → **Age Rating** → Edit. Answer for what is actually in the app: dog
and cat sounds, joke translations, a soundboard and behaviour tips. No other people's content is shown to anyone.

## Features

| Question | Answer | Why |
| :--- | :--- | :--- |
| Parental Controls | **No** | |
| Age Assurance | **Yes** | One-time 13+ age check at setup (`src/components/Onboarding.js`, `src/components/AgeCheck.js`). It's a self-declared checkbox, not ID verification. |
| Unrestricted Web Access | **No** | The only links open the privacy policy in Safari and a `mailto:` for support. No in-app browser. |
| User-Generated Content | **No** | Owners' comments and clips (if they opt in) go only to our server for training. No other user ever sees them, and there are no profiles, feeds or comments. |
| Messaging and Chat | **No** | |
| Advertising | **No** | No ads. |

## Mature themes

| Question | Answer |
| :--- | :--- |
| Profanity or Crude Humor | **None** (the "Local SA Boet" and "Grumpy Old Man" voices are cheeky, but contain no swearing) |
| Horror/Fear Themes | **None** |
| Alcohol, Tobacco, or Drug Use or References | **None** |
| Mature or Suggestive Themes | **None** |

## Medical or wellness

| Question | Answer |
| :--- | :--- |
| Medical or Treatment Information | **None** (the behaviour decoder has general pet-care tips, and the app says it is not veterinary advice) |
| Health or Wellness Topics | **No** |

## Sexuality or nudity

All **None**: Sexual Content or Nudity, Graphic Sexual Content and Nudity.

## Violence

All **None**: Cartoon or Fantasy Violence, Realistic Violence, Prolonged Graphic or Sadistic Realistic Violence, Guns or
Other Weapons.

## Chance-based activities

All **None** / **No**: Simulated Gambling, Contests, Gambling, Loot Boxes.

## Result and override

These answers give the lowest rating (4+). Pawlingo's own policy is **13 and over** (the in-app age check and the
privacy policy), so on the last screen choose **Age Rating Override → 13+**. That keeps the store rating, the age check
and the privacy policy saying the same thing.

- **Made for Kids**: **No**. Don't put the app in the Kids category (it collects crash reports and, with consent,
  sound clips, and has an age check).

The joke lines in `src/data/` were checked for this release (no swearing, alcohol, drugs or violence beyond a cat
"attacking your ankles"). If new lines add any of those, change the matching answer to **Infrequent/Mild**.
