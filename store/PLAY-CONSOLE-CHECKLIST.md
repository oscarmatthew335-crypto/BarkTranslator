# Google Play: what to fill in, in order

Account: organisation account for **ZDNS (Pty) Ltd**, D-U-N-S **588248093** (issued 19 Oct 2026; wait a few days after
issue before signing up so Google can find it). Name and address must match the D&B record exactly.

## 1. Create the app
- App name: `Pawlingo: Dog & Cat Translator` · Default language: English (South Africa or United Kingdom)
- App or game: **App** · Free or paid: **Free**
- Package: `com.pawlingo.app` (fixed forever once the first build is uploaded)

## 2. Store listing (Grow → Store presence → Main store listing)
- Title, short description, full description: copy from `listing.md`.
- App icon: `graphics/icon-512.png` (512×512).
- Feature graphic: `graphics/feature-graphic-1024x500.png`.
- Phone screenshots: **at least 2, ideally 4-6**, taken on a real phone from the release build (portrait, no status-bar
  clutter): the listening screen with a translation, a Journal entry, the Speak tab, Settings showing the language picker,
  a share video frame. Real pet, real translation; no mock-ups that show features the app doesn't have.
- Category: **Entertainment** · Tags: pets, entertainment.
- Contact email: **pawlingo@zdns.co.za** · Website: https://zdns.co.za (optional).
- Privacy policy URL: see `listing.md` (the server's `/privacy` page).

## 3. App content (Policy → App content)
- **Privacy policy**: same URL as above.
- **App access**: all functionality available without special access (no login).
- **Ads**: No ads.
- **Content rating**: questionnaire, category "Entertainment"; no violence, sexual content, gambling, user-to-user
  chat or location sharing. It records audio/video of the user's pet with the user's action only.
- **Target audience**: **13 and over** (the app's age check is 13+; choose 13-15, 16-17 and 18+). Not designed for
  children, so it does not need to join the Families programme; say it doesn't appeal mainly to children.
- **Data safety**: answer exactly as in `data-safety.md`.
- **News app**: No. **Government app**: No. **Financial features**: None. **Health**: None.
- **Permissions**: microphone (listening), camera (optional live video), notifications not used. Photos/videos are only
  read when the user picks a clip (system picker), so no broad media permission is requested.

## 4. Release
- Build the Android App Bundle: `npx eas-cli@latest build --platform android --profile production` (see `eas.json`;
  versionCode is in `app.json`, bump it for every upload). Set the EAS environment variables `EXPO_PUBLIC_PAWLINGO_API`
  and `EXPO_PUBLIC_PAWLINGO_KEY` first, or the app can't reach the server (clips wait on the phone).
- Testing → **Internal testing** first: upload the .aab, add your own Google account as a tester, install from the Play
  link, check: listening, a picked clip, share video, language switch, Settings → privacy link opens, Contact us email.
- Then **Production** (or Closed testing first). Organisation accounts don't need the 12-testers/14-days rule.
- Google's review usually takes a few days for a new app.

## 5. After launch
- Reply to reviews from Play Console (Grow → Ratings and reviews).
- Watch crash reports (Pawlingo's own `/errors` endpoint, plus Play Console → Android vitals).
