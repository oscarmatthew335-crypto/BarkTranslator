# App Store Connect: App Privacy answers (`com.pawlingo.app`)

Enter these under App Store Connect → the app → **App Privacy**. They match `store/data-safety.md` (Google Play), the
privacy policy (`server/privacy.html`) and the code (`src/contribute/contributions.js`, `src/crash.js`,
`src/share/extractClip.js`, `src/share/videoShare.js`, `src/audio/rollingBuffer.js`, `src/game/photoChallenge.js`,
`server/main.py`).

## How Apple's rules differ from Google's

Apple only counts data as **collected** when it leaves the phone *and is kept longer than needed to handle the request in
real time*. That changes these answers compared with Play:

- **Picked clips** (`POST /extract`) and **share videos** (`POST /video`): the server reads or renders them and deletes
  everything at once. That is real-time processing, so Apple does **not** count it as collected. Neither feature is a
  reason to declare Photos or Videos or Audio Data (shared pet photos and training clips, below, are).
- **Opt-in training clips** (`POST /clips`) are kept, so they **are** collected (Audio Data, below).

- **Shared pet photos** (`POST /photo`) are kept, so they **are** collected (Photos or Videos, below), but only with two
  opt-ins: *Share clips and answers* and the separate, default-off *Share pet photos* choice.

Never collected, so leave unticked: contact info, health, financial info, location, sensitive info, contacts, browsing
and search history, purchases, usage data (no analytics SDK; the Play tab's usage counters never leave the phone),
gameplay content (game progress stays on the phone), advertising data, customer support data (support email is outside
the app).

The 10-second "Catch sounds I just missed" buffer stays in the phone's memory and is never sent, so it is not collected.

## Step 1: "Do you or your third-party partners collect data from this app?"
**Yes, we collect data from this app.**

## Step 2: Data types to tick

| Apple data type | Why it's collected | What it is (code) |
| :--- | :--- | :--- |
| **User Content → Audio Data** | Only if the owner taps "Yes, I'll help" or turns on *Share clips and answers* | Short WAV clips (≤15 s) of the pet, kept for training (`queueClip` → `POST /clips`) |
| **User Content → Other User Content** | Same opt-in | The owner's answers: situation, moods, rating and an optional comment of up to 280 characters (`queueLabel` → `POST /labels`) |
| **User Content → Photos or Videos** | Only if the owner shares clips **and** ticks *Share pet photos* (default off) | Photo-challenge JPEGs (≤1.5 MB) the owner chose, re-encoded without EXIF/location, with labels: situation, optional "is this my pet" / size / breed confirmation (`queuePhoto` → `POST /photo`). Deletable one by one (`DELETE /photo`) or all at once (`DELETE /me`) |
| **Diagnostics → Crash Data** | Automatically, on unhandled JS errors (max 8 per session, 20 per day) | Error message (personal details stripped), stack, where it happened, app version, platform, OS version (`src/crash.js` → `POST /errors`) |
| **Identifiers → Device ID** | Sent with every server request | A random 32-hex install ID made by the app (`pawlingo:installId`), **not** the IDFA, IDFV or any hardware ID. Used for daily rate limits and for "Delete everything I've shared" (`DELETE /me`) |

## Step 3: Answers for each data type

For **every** type above:

- **Used for tracking?** **No.** No ads, no ad SDKs, no data broker, nothing combined with other companies' data. The app
  never asks for App Tracking Transparency and must not.
- **Linked to the user's identity?** **No.** Pawlingo has no accounts and never collects a name, email, phone number,
  contacts or location. Data is stored only under the random install ID and a random pet ID, which can't be traced back
  to a person. (If someone emails us their install ID to delete data, that is a support email, not data the app collects.)

Purposes:

| Data type | Purposes to tick |
| :--- | :--- |
| Audio Data | **App Functionality** (improving the pet-sound translator the app is built on) and **Other Purposes** (training the shared pet-sound model) |
| Other User Content | **App Functionality** and **Other Purposes** (the same training) |
| Photos or Videos | **App Functionality** and **Other Purposes** (learning breeds and moods; never used to infer temperament) |
| Crash Data | **App Functionality** (finding and fixing crashes) |
| Device ID | **App Functionality** (rate limiting abuse, deleting a user's shared data on request) |

Don't tick Analytics, Product Personalization, Developer's Advertising or Third-Party Advertising: the crash reports go to
Pawlingo's own server only to fix crashes, and the on-phone learning of your own pet never leaves the phone.

## Resulting label (check the preview matches)

- **Data Not Linked to You**: User Content, Diagnostics, Identifiers
- **Data Used to Track You**: none
- **Data Linked to You**: none

## Privacy manifest

The app's `PrivacyInfo.xcprivacy` is generated from `ios.privacyManifests` in `app.json` (tracking: false; required-reason
APIs: UserDefaults CA92.1, file timestamps C617.1, system boot time 35F9.1, disk space E174.1, which React Native and
Expo use). The share extension gets its own manifest from `expo-share-intent`. If App Store Connect emails an
"ITMS-91053: Missing API declaration" warning after upload, add the API and reason it names to `app.json`, bump
`ios.buildNumber` and rebuild.

## If the code changes

Re-check these answers whenever something new is sent to the server: an analytics SDK, push notifications, sign-in or
ads would each change the label. Keep this file, `store/data-safety.md` and `server/privacy.html` in step.
