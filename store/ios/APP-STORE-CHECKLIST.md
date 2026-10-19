# App Store: what to do, in order

Companion to `../PLAY-CONSOLE-CHECKLIST.md`. Listing text: `listing.md`. Privacy answers: `app-privacy.md`. Age
rating: `age-rating.md`.

## 1. Apple Developer Program, as an organisation
- Enrol at https://developer.apple.com/programs/enroll/ as an **Organization** (not Individual), so the store shows
  **ZDNS (Pty) Ltd** as the seller. Cost: USD 99 a year.
- Legal entity name: **ZDNS (Pty) Ltd** · D-U-N-S **588248093**. The name and address must match the D&B record
  exactly. Apple looks the number up itself, and a freshly issued D-U-N-S (19 Oct 2026) can take up to about 2 weeks to
  reach Apple's systems. If enrolment says it can't find it, wait and retry, or use Apple's D-U-N-S lookup tool on the
  enrol page.
- The person enrolling needs an Apple Account with two-factor authentication, must be allowed to sign legal agreements
  for ZDNS (Apple may phone to check this), and needs a work email on the company domain (e.g. `@zdns.co.za`, not Gmail).
  Apple may also ask for a company website (https://zdns.co.za) that shows the company name.
- Once you're accepted: App Store Connect → **Business**: accept the Free Apps agreement (paid agreements, banking and tax
  aren't needed for a free app with no in-app purchases).
- Add any teammates under Users and Access (role **App Manager** is enough for uploading and submitting).

## 2. Identifiers (Certificates, Identifiers & Profiles)
EAS creates these on the first build if you let it sign in to your Apple account. To make them by hand instead:
- App ID `com.pawlingo.app`, with capability **App Groups** → `group.com.pawlingo.app`.
- App ID `com.pawlingo.app.share-extension` (the "Pawlingo Share" share extension), with **App Groups** →
  `group.com.pawlingo.app`.
- Both are already declared in `app.json` (`extra.eas.build.experimental.ios.appExtensions`), so EAS makes provisioning
  profiles for both targets.

## 3. Create the app in App Store Connect
- My Apps → **+** → New App: platform **iOS**, name `Pawlingo: Dog & Cat Translator`, primary language **English (U.K.)**
  (or English (Australia); App Store Connect has no English (South Africa)), bundle ID `com.pawlingo.app`, SKU `pawlingo-ios`,
  User Access: Full Access.
- Copy the new app's Apple ID (App Information → General → Apple ID, a number) and set it in `app.json`:
  `"extra": { "appStoreUrl": "https://apps.apple.com/app/id<that number>" }`. The iPhone app's share text links there.
  Until it's set, iPhone share text has no store link (the picture card and video say "Free on App Store").
- Pricing and Availability: **Free**. Countries: all, or start with South Africa.

## 4. Build and upload
- In the EAS project (expo.dev), set the environment variables `EXPO_PUBLIC_PAWLINGO_API` and `EXPO_PUBLIC_PAWLINGO_KEY`
  for the production environment (the key as a secret). Never put them in the repo. Without them, clip import, share
  videos, crash reports and sharing don't reach the server.
- Build: `npx eas-cli@latest build --platform ios --profile ios`. The first time, let EAS sign in to Apple and create the
  distribution certificate and both provisioning profiles.
- Upload: `npx eas-cli@latest submit --platform ios --profile ios --latest` (or add `--auto-submit` to the build). EAS asks
  for the App Store Connect app (or set `ascAppId` in `eas.json` → `submit.ios.ios`; it's an ID, not a secret).
- **Version and build**: the version comes from `app.json` `version` (2.4.0). Bump `ios.buildNumber` ("1", "2", ...) for
  every upload; App Store Connect refuses a build number it has already seen. Android's `versionCode` is separate.
- The app is **iPhone only** (`supportsTablet: false`). It still runs on iPads in iPhone mode, so no iPad screenshots are
  needed.

## 5. TestFlight
- After upload, the build shows under TestFlight after processing (10-30 min). Answer the export-compliance question if
  asked: the app uses only standard HTTPS, and `ITSAppUsesNonExemptEncryption` is already `false` in `app.json`.
- **Internal testing**: add yourself and teammates (up to 100 App Store Connect users), install with the TestFlight app.
- **External testing** (friends with real pets, up to 10,000 by email or public link) needs a short Beta App Review of the
  first build: paste the review notes below as "What to Test".
- Test on a real iPhone (the simulator has no proper microphone or camera):
  1. Fresh install: age check, pet setup, consent screen, then the microphone explainer comes before the iOS prompt.
  2. Tap the paw near a barking dog or a video of one: it stops by itself and translates.
  3. With *Catch sounds I just missed* on: tap Replay on a result, let it finish, then make a sound and tap the paw within
     10 s. It should still catch the sound (this checks the mic hand-over to playback on iOS).
  4. Silent switch on: Replay and the Speak tab sounds still play, through the loudspeaker.
  5. Camera button: iOS camera prompt, preview, a translation with the camera on, then Share → video.
  6. From a clip → video from the photo library, and an audio file from Files.
  7. From Photos/Files/WhatsApp: Share → **Pawlingo Share** with a video and with an audio file: Pawlingo opens and
     translates it. (Voice notes shared from some apps may not show Pawlingo; note which ones.)
  8. Deny the microphone, then tap the paw: the notice offers **Open Settings**, which opens Pawlingo's iOS settings.
  9. Settings → Privacy policy opens, Contact us opens Mail, Delete everything I've shared works.
  10. Install a newer TestFlight build over the old one: journal photos, Replay and share videos still work (iOS moves
      the app's folder on update; `src/storage/photos.js` re-points saved paths).

## 6. The store page (App Store tab of version 2.4.0)
- Text: `listing.md`. Privacy: `app-privacy.md`. Age rating: `age-rating.md`. Privacy Policy URL: the server's `/privacy`
  page (same as Play).
- **Screenshots**: required size is **6.9" iPhone** (1320 × 2868 or 1290 × 2796 portrait). Apple scales these down for
  smaller iPhones. 3 to 10 shots from the TestFlight build on a real phone: the listening screen with a translation, a
  Journal entry, the Speak tab, the Decoder, a share-video frame. No Android status bars or Play badges, no features
  the app doesn't have.
- App icon: comes from the build (`assets/icon.png`, 1024 × 1024, no transparency).
- **App Review Information**: sign-in **not required**. Contact name, phone and pawlingo@zdns.co.za. Notes: below.

## 7. Review notes (paste into App Review Information → Notes)

> Pawlingo is an entertainment app for dog and cat owners. No account or sign-in is needed.
>
> Microphone: the app listens when the user taps the large paw button on the Translate screen. It measures the pet's
> bark or meow (number of sounds, loudness, pitch, rhythm) and shows a playful "translation". Listening stops by itself
> once the pet goes quiet, and after 15 seconds at most. The app explains the microphone on its own screen before the
> iOS permission prompt appears.
>
> The setting "Catch sounds I just missed" (on by default, Settings → Sound) keeps the last 10 seconds of microphone
> audio in memory while the Translate screen is open in the foreground, so a sound made just before the tap can still be
> translated. That's why the microphone indicator shows while that screen is open. The audio is never written to disk or
> sent anywhere, and stops as soon as the user leaves the screen or the app. The app never records in the background.
>
> Results are for entertainment only. The translations are funny lines chosen from the measured sound, not a real
> translation of animal language and not veterinary advice. The app says so in Settings → About and in the description.
>
> Camera (optional, off until the user taps the camera button): shows the pet on screen and films a short silent clip
> while listening, for the user's share video.
>
> Server use: if the user picks a video or audio clip, or taps Share → Video, the file is sent to our server only to read
> the sound or render the video and is deleted immediately. Sharing short sound clips to train the translator is opt-in
> (consent screen at setup, Settings → "Share clips and answers"). Settings → "Delete everything I've shared" deletes the
> user's shared data from our server.
>
> To test without a pet: play a dog-bark or cat-meow video from another device near the iPhone and tap the paw, or use
> "From a clip" with any video that has a dog barking in it. The 13+ age check appears once at setup.

## 8. Submit
- Add the build to version 2.4.0 → **Add for Review** → Submit. Release option: **Manually release** for the first
  version, so you can release it right after approval.
- Review usually takes 1-3 days. If it's rejected, reply in App Store Connect → Resolution Center. Reply there instead of
  resubmitting blind.

## 9. Things to check if the first upload or review complains
- *ITMS-91053 (missing API declaration)*: add the API and reason it names to `ios.privacyManifests` in `app.json`.
- *Extension or App Group errors in the EAS build*: make sure both App IDs in step 2 have the
  `group.com.pawlingo.app` App Group, then rebuild with `--clear-cache`.
- The share extension is built for iPhone and iPad while the app is iPhone-only (set by `expo-share-intent`). If App
  Store Connect rejects the upload for that, tell us. It needs a small config plugin.
- *Guideline 2.3.10 (other platforms)*: the iPhone build shows "App Store" on share cards and videos. Check that no
  screenshot or text mentions Android or Google Play.
- *Guideline 5.1.1 (permission text)*: the iOS permission texts are in `app.json` (`ios.infoPlist`); keep them saying
  exactly what the app does.
