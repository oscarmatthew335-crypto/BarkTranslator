# Pawlingo 3.0.0 release (skateboard update)

- **Version:** `3.0.0`, **versionCode** `14` (was 2.9.1 / 13)
- **Build:** Android App Bundle via EAS, profile `production` (EAS holds the upload key; Play App Signing on)
- **Listing:** new title, short description, full description and "What's new" in `store/listing.md`
- **Graphics:** `store/graphics/` (feature graphic, 6 screenshots, icon); preview video goes to YouTube

## Steps
1. Merge PR #43 into `main`.
2. On the PC, in the project folder: `git checkout main && git pull`, then
   `npx.cmd eas-cli@latest build -p android --profile production`
   and download the `.aab` from the link it prints when it finishes.
3. Play Console → Production (or Internal testing first) → Create new release → upload the `.aab`, paste "What's new" from `store/listing.md`.
4. Play Console → Store presence → Main store listing: paste title, short and full description, upload the feature graphic and screenshots, add the YouTube link.
5. Send for review.

---

# Pawlingo Release 1 Status

Release build prepared for Google Play internal testing.

## Build & Release Details

- **App Name:** Pawlingo (`com.pawlingo.app`)
- **App Version:** `2.4.0`
- **Version Code:** `4` (bumped from 3)
- **Platform:** Android (Release build: Android App Bundle `.aab`)
- **EAS Project:** `@zdnsdev/pawlingo` (`ab595123-dc45-41ff-9d51-ab8666de6142`)
- **EAS Build Link:** https://expo.dev/accounts/zdnsdev/projects/pawlingo/builds/9ea705dc-485f-4d4f-8348-07199ac7c22d
- **Signing:** Play App Signing managed by Google Play; EAS manages the upload key keystore remotely.

## Server & Endpoints (Live)

- **GCP Project:** `pawlingo-a14f2d`
- **Region:** `africa-south1` (Johannesburg)
- **Ingest Server URL:** `https://pawlingo-ingest-dr3rs2afdq-bq.a.run.app`
- **Privacy Policy URL:** `https://pawlingo-ingest-dr3rs2afdq-bq.a.run.app/privacy`
- **Environment Variables (EAS Production):**
  - `EXPO_PUBLIC_PAWLINGO_API`: `https://pawlingo-ingest-dr3rs2afdq-bq.a.run.app`
  - `EXPO_PUBLIC_PAWLINGO_KEY`: `[configured in EAS sensitive secrets; not committed]`

## Verification Checklist

- [x] App health check: `npm ci` clean, 89/89 unit tests pass.
- [x] `npx expo-doctor`: 21/21 checks pass.
- [x] Server live check: `/privacy` returns HTTP 200, `/model` returns HTTP 204.
- [x] EAS production environment variables configured.
- [x] Android release AAB built via EAS (`Pawlingo-2.4.0-4.aab` downloaded to Desktop).

## Next Steps for the Owner (Google Play Console)

Refer to `store/PLAY-CONSOLE-CHECKLIST.md` for full step-by-step instructions:

1. **Upload to Internal Testing**:
   - Go to Google Play Console → Release → Testing → **Internal testing**.
   - Create a new release and upload `Pawlingo-2.4.0-4.aab` from your Desktop.
2. **Install & Test**:
   - Add your Google account as an internal tester.
   - Install Pawlingo from the internal test link on a real phone.
   - Run through the checklist: listening, picked clip translation, share video, language switch (English, Afrikaans, isiZulu), Settings → Privacy Policy link, and Contact Us email.
3. **Screenshots**:
   - Take 4–6 clean screenshots on your phone (portrait, without status bar clutter). Real pet, real translation.
4. **Store Listing & Content**:
   - Fill in main store listing from `store/listing.md`.
   - Complete Data Safety using answers from `store/data-safety.md`.
   - Complete Target Audience (13+) and Content Rating questionnaires.
   - Set Privacy Policy URL to `https://pawlingo-ingest-dr3rs2afdq-bq.a.run.app/privacy`.
5. **Submit for Production**:
   - Once internal testing is verified, promote or submit the release for production review.
