# Google Play Console — Data Safety Form Answers (`com.pawlingo.app`)

Use the answers below when completing the **App Content → Data safety** form in Google Play Console. Every answer is verified against the actual codebase (`src/contribute/contributions.js`, `src/crash.js`, `src/share/videoShare.js`, `src/share/extractClip.js`, `src/audio/rollingBuffer.js`, and `server/main.py`).

---

## Step 1: Data Collection and Security

| Question | Answer | Why / Code Reference |
| :--- | :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **Yes** | Collects anonymous crash logs (`src/crash.js`), optional picked clips / videos processed ephemerally (`POST /extract`, `POST /video`), and optional opt-in pet audio clips (`src/contribute/contributions.js`). |
| **Is all of the user data collected by your app encrypted in transit?** | **Yes** | All requests to `EXPO_PUBLIC_PAWLINGO_API` use HTTPS/TLS. |
| **Do you provide a way for users to request that their data is deleted?** | **Yes** | In-app button: **Settings → Delete everything I've shared** (`DELETE /me` in `src/contribute/contributions.js` & `server/main.py`), plus email support (`pawlingo@zdns.co.za` with Install ID). |

*(Note: Pawlingo has no user accounts, so select "My app does not allow users to create an account" and provide the Privacy Policy URL where deletion via Settings or email is explained.)*

---

## Step 2: Data Types Collected

Check the following data types:

### 1. Audio → Voice or sound recordings
- **Collected:** Yes
- **Shared with third parties:** No
- **Processed ephemerally:**
  - *For Picked Audio / Voice Notes (`POST /extract`):* **Yes, processed ephemerally** (sent to the server only to extract the pet sound for translation and deleted immediately).
  - *For Share Video (`POST /video`):* **Yes, processed ephemerally** (sound clip sent only to render the MP4 and deleted immediately).
  - *For Opt-in Training (`POST /clips`):* Stored only when the user opts in ("Yes, I'll help"). Under Google Play Console, since training data is retained, mark **No (not ephemeral)** and **Optional** for the overall audio category.
- **Is this data required for your app, or can users choose whether it's collected?**
  - **Users can choose whether this data is collected (Optional)** — controlled by explicit user actions (picking a clip, sharing a video, or the explicit opt-in *Share clips and answers* toggle).
- **Why is this user data collected?**
  - ✅ **App functionality** (translating pet sounds from picked clips, rendering share videos, and training the pet sound translator)
  - ✅ **Product personalization / Analytics** (improving shared acoustic models)

> **Note on 10-Second Rolling Buffer ("Catch sounds I just missed"):**  
> The 10-second rolling audio buffer in `src/audio/rollingBuffer.js` is stored strictly in temporary device RAM while the scanner screen is in the foreground. It is **never written to disk**, **never transmitted or sent to any server**, and is discarded immediately when you leave the screen or turn off the toggle. It is **never collected**.

### 2. Photos and videos → Videos
- **Collected:** Yes
- **Shared with third parties:** No
- **Processed ephemerally:** **Yes** (sent to our server only to read the sound or render the share video, and deleted immediately).
- **Is this data required or optional?**
  - **Optional** (only collected when the owner explicitly picks a video from their gallery via "From a clip" / `POST /extract` or taps "Share video" / `POST /video`).
- **Why is this user data collected?**
  - ✅ **App functionality** (extracting pet audio from an imported video clip to translate it, or compositing a shareable MP4 video card). The server reads the audio track in a temporary directory and deletes all uploaded and converted video files immediately. Videos are never stored on disk or cloud storage, and are never used for training.

### 3. App info and performance → Crash logs
- **Collected:** Yes (`POST /errors` in `src/crash.js` sends `message`, `stack`, `fatal`, `where`, `appVersion`, `platform`, `osVersion`)
- **Shared with third parties:** No (sent directly to Pawlingo's own first-party Cloud Function, no third-party crash SDK)
- **Is this data required or optional?**
  - **Required** (collected automatically on unhandled JS errors, rate-limited to 8 per session)
- **Why is this user data collected?**
  - ✅ **App functionality** / **Analytics** (diagnosing and fixing app crashes)

### 4. App activity → Other user-generated content (or Other actions)
- **Collected:** Yes (only when opted in: owner's taught situation label `context`, `moods`, `rating`, and optional short comment in `LabelSheet.js` up to 280 chars)
- **Shared with third parties:** No
- **Is this data required or optional?**
  - **Optional** (only sent when *Share clips and answers* is enabled)
- **Why is this user data collected?**
  - ✅ **App functionality** (training the shared pet-sound model)

### 5. Device or other IDs
- **Collected:** Yes (a randomly generated 32-hex install ID stored in `AsyncStorage` under `pawlingo:installId`, sent in the `X-Install-Id` header—not hardware IMEI or Advertising ID)
- **Shared with third parties:** No
- **Is this data required or optional?**
  - **Required** (used for daily rate limiting and allowing the user to delete their shared clips via `DELETE /me`)
- **Why is this user data collected?**
  - ✅ **App functionality**
  - ✅ **Fraud prevention, security, and compliance** (rate-limiting `/clips`, `/video`, `/errors`, `/extract` and fulfilling `DELETE /me` erasure requests)

