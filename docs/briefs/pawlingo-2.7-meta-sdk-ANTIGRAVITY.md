# Pawlingo 2.7: Meta SDK for app-install ads (brief for Antigravity)

Repo: `oscarmatthew335-crypto/BarkTranslator` · Start from `main` · Branch: `pawlingo-2.7-meta-sdk` · Open a PR to `main` when done. Don't merge.

## Why
We're going to run Facebook/Instagram **app-install ads** for Pawlingo. For Meta to optimise for installs (not just taps), the app must report installs and opens to Meta through the Meta SDK. That is the only goal of this release: **install and app-open attribution on Android**. No Facebook Login, no sharing, no other Meta features.

## Rules (read `AGENTS.md` first)
- Expo SDK **57**, React Native 0.86. Check the **current docs** for the library and for Expo config plugins before using any API. Don't trust memory.
- Never create or edit `ios/` or `android/` by hand. Native setup goes through `app.config.js` / `app.json` config plugins (CI runs `expo prebuild --clean`).
- One new native dependency is allowed: **`react-native-fbsdk-next`** (with its Expo config plugin), at a version whose docs confirm support for RN 0.86 / Expo 57. If it doesn't support them, stop and say so in the PR instead of forcing it.
- Android only. On iOS every call is a no-op (iOS needs App Tracking Transparency; separate brief later).
- `npm test` must pass, with tests for every new rule. Keep `tests/rulesOfHooks.test.mjs` passing: no hooks after early returns.

## What to build

### 1. Config
- The Meta **App ID** and **Client token** come from environment variables: `EXPO_PUBLIC_META_APP_ID` and `EXPO_PUBLIC_META_CLIENT_TOKEN`. I'll give you the two values; put them **only in the `production` profile's `env` in `eas.json`**, next to the AdMob IDs.
- `app.config.js` adds the `react-native-fbsdk-next` config plugin **only when both values are set**. With no values (the GitHub APK workflow, local dev), the plugin is not added and every Meta call is a no-op, so test builds never send events to Meta.
- Plugin settings: display name "Pawlingo", `autoLogAppEventsEnabled: false`, `advertiserIDCollectionEnabled: false`, `autoInitEnabled: false` at build time. The app turns them on at runtime only after consent (next section).

### 2. One small module: `src/game/meta.js`
Same shape as `src/game/ads.js` (lazy `require`, safe when the native module is missing):
- `initMeta({ canTrack })`: does nothing unless on Android, the IDs are present, and `canTrack` is true. Then: initialise the SDK, enable auto-logging of app events (this gives Meta "install" and "activate app"), and enable advertiser ID collection.
- `canTrack` comes from the **same Google UMP consent result that `ads.js` already gathers**: Meta is switched on only when the player is allowed personalised ads (`canRequestAds` true and, where UMP provides purpose consent, consent for ad personalisation). No consent, or the consent check failed: Meta stays off. Don't add a second consent pop-up.
- Call it from the same place `initAds()` is called, after the welcome screen is done. Never before.
- Log **two custom events** with the SDK's `AppEventsLogger`, nothing else: `run_finished` (params: mode = stage/endless/chase/daily) and `premium_purchased` (use the SDK's purchase logging with the real price and currency from the store product). These let us later optimise ads for players who actually play. No user IDs, pet names, scores tied to a person, or any text the player typed.
- Respect `ADS_NON_PERSONALISED` from `ads.js`: if that constant is true, Meta stays off.

### 3. Policy files in the repo
- `server/privacy.html` and `store/privacy.html`: add a short "Meta (Facebook) SDK" paragraph: used on Android to measure which ads lead to installs; shares the advertising ID and app-open/install events with Meta when the player has agreed to personalised ads; link to Meta's privacy policy; how to opt out (phone ad settings, or decline in the consent message).
- `store/data-safety.md`: Device or other IDs and App interactions are now also **shared with Meta** for advertising/marketing and analytics.
- Add a note to the PR for me: after release, the Play Console Data safety form needs "shared" to include this.

### 4. Version
`app.json` version **2.7.0**, `versionCode` **8**; `package.json` 2.7.0.

## Not in this release
Facebook Login, share dialogs, deep links from ads, Meta Audience Network ads, iOS, the Conversions API.

## Done means
- [ ] `npm test` passes, with tests for: no Meta calls when IDs are missing; no Meta calls without consent or when `ADS_NON_PERSONALISED` is true; `initMeta` is safe when the native module is absent; the config plugin is only added when both env values are set; the two custom events carry only the allowed parameters.
- [ ] The GitHub APK builds and runs with no Meta IDs (plugin absent) and nothing crashes.
- [ ] Real IDs appear only in the `production` profile in `eas.json`.
- [ ] Privacy pages and `data-safety.md` updated.
- [ ] The PR description lists what changed, anything you couldn't do, and exactly what I should see in Meta Events Manager to confirm it works (which events, and how to test with Meta's "Test events" tool on an internal-testing build).
