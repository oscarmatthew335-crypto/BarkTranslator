# Pawlingo 2.7: earn more per player (brief for Antigravity)

Repo: `oscarmatthew335-crypto/BarkTranslator` · Start from `main` **after PR #34 (2.6.2 ad fix) is merged** · Branch: `pawlingo-2.7-growth` · Open a PR to `main` when done. Don't merge.

## Why
Pawlingo is live with paid install ads (Google ~R8 per install). Today a player earns us very little: one Premium purchase or a few cents of ads. This release adds measurement, reasons to come back, and more (fair) ways to pay. Version **2.7.0**, versionCode **9**.

## Rules (read `AGENTS.md` first)
- Expo SDK 57, RN 0.86. Check **current docs** for every library and config plugin. Never edit `android/` or `ios/` by hand.
- Android only for anything native; iOS calls are no-ops.
- **`EXPO_PUBLIC_*` values must be read literally** as `process.env.EXPO_PUBLIC_X` (see PR #34; reading through a variable is not inlined into release builds). Add a source test for every new one.
- 13+ audience, not Families. No loot boxes or random paid rewards. Every price is shown before buying.
- `npm test` passes, with tests for every new rule. Keep `tests/rulesOfHooks.test.mjs` passing.
- Do the parts **in order, one commit each**. If a part is blocked (e.g. a library doesn't support RN 0.86), stop that part, say so in the PR, and carry on with the next.

## Part A: measurement (Firebase Analytics)
- Add `@react-native-firebase/app` + `@react-native-firebase/analytics` (Expo config plugins). If the file is missing, the plugin isn't added and analytics calls are no-ops (GitHub APK workflow, local dev).
- **The repo is public: never commit `google-services.json`.** Add it to `.gitignore`. `app.config.js` sets `android.googleServicesFile` to `process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'` (only when that file exists). The owner has the file locally in the project folder; for EAS builds it is uploaded as a secret file variable. Put this one-time command in the PR description for the owner to run:
  `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production --visibility secret`
- Add a test that fails if `google-services.json` is tracked by git.
- `src/game/analytics.js`: a thin wrapper, `track(event, params)`, no-op when unavailable. Collection is on only when UMP consent allows (same result `ads.js` gathers).
- Events (no names, pet names, typed text or anything personal):
  - `tutorial_complete`
  - `run_start` / `run_end` (mode, score bucket, treats)
  - `daily_challenge_done`
  - `streak_day` (length)
  - `ad_rewarded_complete` (placement)
  - `ad_interstitial_shown`
  - `store_open`
  - `purchase` (product id, value, currency from the store)
  - `share_score`
- Link note in the PR: the owner links Firebase to AdMob and Google Ads in their consoles.

## Part B: Meta SDK
Do everything in `pawlingo-2.7-meta-sdk-ANTIGRAVITY.md` (in the repo's `docs/briefs/` or attached). Meta App ID is `1715784240586694`; the client token goes in the `production` env in `eas.json` (owner provides it).

## Part C: reasons to come back
`daily.js` already has the day key, streak, streak saver and daily challenge. Build on it:
- **Streak rewards:** day 1/2/3/5/7 give 10/15/20/30/50 treats; day 7 also unlocks a free **"Week Champ" bandana**. Show the streak and tomorrow's reward on the Play tab.
- **Local reminders** (`expo-notifications`, local only, no server):
  - one at about 18:00 local time if the player hasn't played today *and* has a streak of 2 or more: "{Pet} is waiting! Keep your {n}-day streak 🔥";
  - at most one per day;
  - off by default until the player turns it on from a one-time prompt after their first streak day, plus a toggle in settings.
- **Weekly best:** a "This week's best" score per mode, reset on Monday, shown on the end-of-run screen ("New weekly best!").

## Part D: score share (free installs)
- After a run with a new best (or any Chase run that beats bath time for 30+ seconds), offer **"Share"**.
- It makes a portrait image card:
  - the pet in their wardrobe, the score, "escaped bath time!";
  - the Pawlingo logo and "Free on Google Play";
  - a short link `https://play.google.com/store/apps/details?id=com.pawlingo.app&referrer=utm_source%3Dshare`.
- Shared with the system share sheet (reuse the existing share-card code if possible).
- Track `share_score`.

## Part E: more (fair) ways to earn
1. **Rewarded "double treats"** at the end of a run (only when the run earned 10+ treats; at most 3 times a day; offered to Premium players too, because it's optional and players like it). Uses a new ad unit env `EXPO_PUBLIC_ADMOB_REWARDED_DOUBLE`; until set, use the `life` unit.
2. **Treat packs** (consumable in-app products, via the existing `purchases.js`/expo-iap setup):
   - `treats_small`: 300 treats
   - `treats_medium`: 800 treats
   - `treats_large`: 2,000 treats

   Prices come from Play (owner sets about R15 / R29 / R59, all below Premium's R67,99 so Premium stays the best deal). Consume after granting; restore isn't needed for consumables. Server-side validation isn't available, so grant once per purchase token and store processed tokens.
3. **Starter pack** (`starter_pack`, one-time, owner sets about R25): 500 treats + the **crown** + 3 streak savers.
   - Offered once, after the player's 3rd run, and again from the store for 48 hours after that. Then it's gone.
   - Show the normal price as crossed out *only if true* (value of contents at pack prices). Otherwise no strike-through.
4. **Wardrobe:**
   - add 12 items (4 hats, 3 glasses, 3 neck, 2 collars), priced 100–600 treats, including a few rare "premium-look" ones at 400–600;
   - keep it cosmetic only.

   The store screen lists treat packs under the wardrobe.
5. **Premium sheet** (Premium is R67,99 one-time):
   - add "+ 500 bonus treats" to Premium (granted once on purchase/restore, tracked so restore doesn't grant twice);
   - the subtitle says "One-time unlock for Endless and Chase modes", but those modes aren't locked for free players. Change it to "One-time upgrade. Pay once, keep it forever.";
   - while the first-24-hours unlimited lives are active, the free player's lives badge shows ❤️ ∞, the same as Premium. Show it as "❤️ ∞ today" with a small countdown, so the Premium "Unlimited lives" perk still means something.

## Part E2: "one more go" (game feel)
Read the game screen and run-end code first; keep it light and don't slow low-end phones (test on a cheap Android).
1. **Near-miss message on the run-end screen.** If the score is within 15% of the player's best (or weekly best), show it in big text: "So close! Only {n} from your best." If it's a new best: "New best! 🎉". Otherwise show the gap to the next goal.
2. **A goal for every run.**
   - Before each Endless/Chase run, show one small goal picked from a list (e.g. "Collect 30 treats", "Reach 800", "Jump 20 times", "Survive 45 s").
   - Scale it from the player's recent runs, so it's reachable about half the time.
   - Show progress in a small corner chip during the run, and a quick ✓ pop when it's done.
   - Completing it gives a small treat bonus (10–25).
   - Not random-paid: goals are free and deterministic from a seed (day + run count) so tests can check them.
3. **Instant restart.** From death to running again in **under 2 seconds and one tap**:
   - put a big "Play again" button on the run-end screen;
   - skip any intro or countdown on a restart (or shorten it to 0.5 s);
   - the interstitial rule still applies (it can show before the restart, but never more often than now).
4. **Next unlock just out of reach.** On the run-end screen, show the cheapest wardrobe item the player can't afford yet, with a progress bar: "120 more treats for the sunglasses 🕶️". Tapping it opens the wardrobe.
5. **Feel.** Add these where they're missing:
   - a short haptic tap on jump and on hit (`expo-haptics`, respect a "Vibration" setting, default on);
   - a small screen shake on hit and on a near-miss with an obstacle (honour reduced motion);
   - a sound on every treat, with the pitch rising slightly for treats picked up in a row (resets after 1 s without one).

   All of these follow the existing sound/mute settings.

Track in Part A: `run_goal_shown`, `run_goal_done`, `play_again_tap` (time from death in ms, bucketed), `near_miss_shown`.

## Part F: tuning (constants only, in one place)
- Interstitials stay: every 3rd run, 3 min apart, not in the first 5 runs.
- Free lives: keep 5 / 20 min. Add a rewarded "+1 life" on the out-of-lives sheet if it isn't there already.

## Tests
- Streak reward table, the reminder rule (2+ streak, not played today, max one a day, off until opted in).
- Weekly best reset on Monday.
- Treat pack granting is idempotent per purchase token.
- Starter pack visibility windows.
- Premium bonus granted once.
- Double-treats caps.
- Near-miss wording (within 15%, new best, otherwise next goal).
- Run goals: deterministic from the seed, scaled to recent runs, bonus granted once.
- Restart path skips the intro; interstitial frequency unchanged.
- "Next unlock" picks the cheapest item the player can't afford.
- Analytics and Meta no-op without config.
- Literal `process.env.EXPO_PUBLIC_*` reads.

## Done means
- [ ] Parts A–F (including E2) done, or a blocked part clearly explained in the PR.
- [ ] The PR lists the Play Console products the owner must create (ids and suggested prices) and the Firebase/Meta values to add.
- [ ] `npm test` passes; version 2.7.0 (9).
