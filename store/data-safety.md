# Google Play Console — Data Safety Form Answers (`com.pawlingo.app`)

Use the answers below when completing the **App Content → Data safety** form in Google Play Console. Every answer is verified against the actual codebase (`src/contribute/contributions.js`, `src/crash.js`, `src/share/videoShare.js`, and `server/main.py`).

---

## Step 1: Data Collection and Security

| Question | Answer | Why / Code Reference |
| :--- | :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **Yes** | Collects anonymous crash logs (`src/crash.js`) and optional opt-in pet audio clips (`src/contribute/contributions.js`). |
| **Is all of the user data collected by your app encrypted in transit?** | **Yes** | All requests to `EXPO_PUBLIC_PAWLINGO_API` use HTTPS/TLS. |
| **Do you provide a way for users to request that their data is deleted?** | **Yes** | In-app button: **Settings → Delete everything I've shared** (`DELETE /me` in `src/contribute/contributions.js` & `server/main.py`), plus email support (`support@zdns.co.za` with Install ID). |

*(Note: Pawlingo has no user accounts, so select "My app does not allow users to create an account" and provide the Privacy Policy URL where deletion via Settings or email is explained.)*

---

## Step 2: Data Types Collected

Check **ONLY** the following 4 data types. Leave Location, Personal Info (Name, Email, Phone), Financial Info, Contacts, Web Browsing, and Photos/Videos unchecked (note on Photos/Videos below).

### 1. Audio → Voice or sound recordings
- **Collected:** Yes
- **Shared with third parties:** No
- **Processed ephemerally:**
  - *For Share Video (`POST /video`):* Yes, processed ephemerally (deleted immediately after rendering the MP4).
  - *For Opt-in Training (`POST /clips`):* Stored only when the user opts in. Since Play Console asks about the most retention-heavy use, mark **No (not ephemeral)** and **Optional**.
- **Is this data required for your app, or can users choose whether it's collected?**
  - **Users can choose whether this data is collected (Optional)** — controlled by the explicit opt-in `ConsentScreen` and the *Share clips and answers* toggle in `SettingsSheet`.
- **Why is this user data collected?**
  - ✅ **App functionality** (rendering share videos & training the pet sound translator)
  - ✅ **Product personalization / Analytics** (improving shared acoustic models)

### 2. App info and performance → Crash logs
- **Collected:** Yes (`POST /errors` in `src/crash.js` sends `message`, `stack`, `fatal`, `where`, `appVersion`, `platform`, `osVersion`)
- **Shared with third parties:** No (sent directly to Pawlingo's own first-party Cloud Function, no third-party crash SDK)
- **Is this data required or optional?**
  - **Required** (collected automatically on unhandled JS errors, rate-limited to 8 per session)
- **Why is this user data collected?**
  - ✅ **App functionality** / **Analytics** (diagnosing and fixing app crashes)

### 3. App activity → Other user-generated content (or Other actions)
- **Collected:** Yes (only when opted in: owner's taught situation label `context`, `moods`, ` rating`, and optional short comment in `LabelSheet.js` up to 280 chars)
- **Shared with third parties:** No
- **Is this data required or optional?**
  - **Optional** (only sent when *Share clips and answers* is enabled)
- **Why is this user data collected?**
  - ✅ **App functionality** (training the shared pet-sound model)

### 4. Device or other IDs
- **Collected:** Yes (a randomly generated 32-hex install ID stored in `AsyncStorage` under `pawlingo:installId`, sent in the `X-Install-Id` header—not hardware IMEI or Advertising ID)
- **Shared with third parties:** No
- **Is this data required or optional?**
  - **Required** (used for daily rate limiting and allowing the user to delete their shared clips via `DELETE /me`)
- **Why is this user data collected?**
  - ✅ **App functionality**
  - ✅ **Fraud prevention, security, and compliance** (rate-limiting `/clips`, `/video`, `/errors` and fulfilling `DELETE /me` erasure requests)

### Note on Photos and Videos (`POST /video`)
- Camera photos (`photoUri`) and silent camera clips (`videoUri`) stay on the user's device unless the user explicitly taps **Share video**. When **Share video** is tapped, the photo/video is sent to `POST /video`, converted into an MP4 in a temporary directory (`tempfile.TemporaryDirectory()`), returned to the phone, and deleted immediately without ever being saved to disk or cloud storage. Under Google Play Data Safety rules, data processed strictly in memory/temp storage to fulfill a real-time user request and deleted immediately is **ephemeral** and does not require disclosure as retained collection, or if disclosed under *Photos and videos*, mark **Processed ephemerally: Yes** and **Optional**.
