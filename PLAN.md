# Kneedit app prototype (MVP): PLAN

## Context

`limenxi07/kneedit` is empty. The brief asks for the first working prototype of Kneedit: one Expo app (iOS, Android, web) with three users. Seniors do their prescribed knee exercises, caregivers see that the exercises got done, and physios use a desktop web dashboard. Supabase is the backend, sharing is enforced in Postgres RLS, and English and Simplified Chinese ship from day one. There is no sleeve hardware yet, so workouts are logged manually and demo accounts get clearly labelled fake data.

Approved on 22 Oct 2026, with two revisions: Plus features are unlocked and labelled with a badge while payments aren't live, and every role can delete their account. The open questions were answered the same day; the outcomes are under Decisions, and the sections below already reflect them.

### What I read

- `../KneedIt2/components/app/`: `progress.ts`, `AppContext.tsx`, every screen in `screens/`, `AddFriendSheet.tsx`, `ui.tsx`.
- The Appendix of `Kneed It — Website Update Proposal.md`: #1 to #21 and Q1 to Q5.
- `public/videos/`: `knee`, `ankle` and `quad` mp4 files with posters, 4.7 MB in all. There are no videos for heel raises or mini squats.

### Where the app departs from the demo, and why

| Demo | App | Reason |
| --- | --- | --- |
| The sleeve counts reps and scores form live; a "Checking your session" step; "Every rep confirmed by your sleeve" | The senior taps **Done**. The score slot reads "Form score needs the sleeve". There is no verifying step. | Brief section 4 (ManualSource) |
| Sleeve tab: "in real time" copy and an EMG chart | Knee angle and steps, with heart rate optional, tagged "Sample data". No EMG, no "real time". | Brief 7 and 8, #3 |
| "No sleeve, no session" in the leaderboard rules | Removed | Manual logging |
| Secondary text at `text-ink/50` and `/55`; scores in muted blue | Every text is solid ink. Muted blue and mauve are only used for bars, rings and borders. | Brief 8 contrast rule (ink on muted blue is about 4.1:1, which fails AA) |
| Mocked counts (`PAST_DAYS`, `EARLIER_HURT`, and so on) | Computed from stored records | |
| `SESSIONS_PER_WEEK = 7`, fixed | Prescribed slots computed from each senior's programme (Q3) | Brief 7 frequencies |
| PROJECT.md says "prevents" and "clinical-grade" | Not used anywhere | #1, brief 1 |

## Architecture

**Stack.** Expo SDK 57 (57.0.31, React Native 0.86), Expo Router, TypeScript `strict` plus `noUncheckedIndexedAccess`, and NativeWind 4.2 (Tailwind 3.4). The rest:

- Data: `@supabase/supabase-js` and TanStack Query.
- i18n: `i18next`, `react-i18next` and `expo-localization`.
- Dates: `date-fns` and `@date-fns/tz`.
- Device features: `expo-video`, `expo-notifications`, `expo-camera` for QR scanning, and `react-native-qrcode-svg`.
- Tests: Jest (`jest-expo`) for TypeScript, and pgTAP through `supabase test db` for the database.
- Tooling: the Supabase CLI 2.121 is a devDependency (`npx supabase`), so nothing is installed globally.

**Folder layout** (by role, per brief 9):

```
app/
  _layout.tsx              providers: fonts, i18n, auth, query client
  index.tsx                routes to the right context after sign-in
  (auth)/                  welcome (sign-in), verify (code), auth/callback, onboarding
  (senior)/(tabs)/         today, friends, sleeve, profile
  (senior)/session/        session flow stack
  (senior)/...             linked-people (requests, link code and QR), visits
  (caregiver)/...          overview, link-pending, report, alerts, notes, checkout, visits
  account.tsx              account for caregivers and physios (seniors use Profile)
  link-senior.tsx          link a family member by code or QR, open to any account
  delete-account/          the three deletion steps, plus reauth
  plus.tsx                 what Plus includes (the Plus badge opens it)
  (physio)/_layout.tsx     desktop shell (sidebar and header), web-first
  (physio)/...             patients, patients/[id]/{overview,visits,programme,details}, agenda, library
components/ui/             Text, Heading, Button, Card, Toggle, SampleDataTag, Screen ...
components/{senior,caregiver,physio}/
components/shared/         guards, role switcher, redeem code form, QR scanner, account actions
lib/supabase/              client and generated database.types.ts
lib/progress/              pure rules: schedule, counting, streak, rate, leaderboard, weekly report, visit summary
lib/sleeve/                SleeveSource, ManualSource, FakeSource, BleSource (stub)
lib/i18n/                  setup, locale-aware formatting, font selection
lib/queries/               TanStack Query hooks per table/RPC
lib/notifications/
locales/{en,zh-Hans}/*.json, locales/review-status.json
fake-data/FAKE_DATA_seed.ts
scripts/                   seed-demo.ts, upload-media.ts, i18n-review-list.ts
supabase/                  config.toml, migrations/, functions/, tests/, seed.sql
assets/fonts/, assets/exercise-media/
```

**Where the logic lives.**

- `lib/progress` is the only implementation of the counting rules. It is plain TypeScript and unit-tested. The app uses it, and so do the Edge Functions and the seed script.
- Postgres stores the facts, plus derived tables (`senior_stats`, `weekly_reports`, visit summaries). Only server code writes the derived tables.
- RLS decides who can read what.
- Where a viewer may see an aggregate but not the rows behind it (friends, and caregivers on Free), they read it from `senior_stats` or through a `security definer` RPC that returns only the allowed fields.

**Plus is labelled but unlocked.** Payments aren't launching yet, so every paid feature works for everyone and carries a small **Plus** badge.

- The gating still exists, so we can turn it on later without rewriting anything.
- Every RLS policy and RPC that depends on the plan calls one SQL helper, `has_plus(senior_id)`.
- `has_plus` returns true when `app_settings.paywall_enabled` is false (the default) or when the senior's plan is `plus`.
- Only a migration or the service role can flip the flag.
- pgTAP runs the plan-dependent tests in both modes.
- The mock checkout stays, opened from a Plus badge. With the paywall off it explains Kneedit Plus (SGD 15 a month; the sleeve is SGD 29 one-off) and says "Prototype, no payment taken. Every Plus feature is unlocked for now."

**Roles.** A role comes from a link, not from the user.

- An account has a senior context if it has a `seniors` row, a caregiver context for each active caregiver link, and a physio context for each active physio link.
- `profiles.default_context` only decides which screen opens first, so a new physio with no patients yet still lands on the dashboard. It is never used for authorisation.
- An account with several contexts gets a switcher in Profile or Account.

**Web.** `web.output: "single"`. Vercel runs `npx expo export -p web` and serves `dist/`, with an SPA rewrite. Physio routes use a desktop layout from 1024px up. Senior and caregiver routes stay phone-width, centred on the page.

## Progress rules (`lib/progress`)

- **Day:** an Asia/Singapore calendar date. **Week:** Monday to Sunday.
- **Prescribed sessions in a day:** set by the physio's plan in force that day (Q3). A day has 0 (rest day), 1, or 2 if a twice-daily exercise is due. Alternate days count from the prescription's start date. The second session of a day queues only the twice-daily exercises.
- **Counted sessions:** a day's complete sessions are ordered by end time, and they count up to the number the plan prescribes for that day (Q3 amends #11: the cap comes from the plan, not a fixed one a day). Sessions beyond that are saved and shown but never counted. Incomplete sessions never count.
- **Completion rate:** counted sessions divided by the prescribed slots for the whole Monday-to-Sunday week, as a whole percentage. On a Wednesday the most you can have is 3 of 7, which is 43%, matching the demo.
- **Missed day:** a past day with fewer counted sessions than prescribed slots. Today never counts as missed.
- **Streak:** consecutive prescribed days with at least one counted session, counting back from yesterday, plus today once today has one. Rest days are skipped.
- **Sessions this month:** counted sessions in the current calendar month.
- **Leaderboard:** you, plus accepted friends who allow it. Sorted by rate, then streak, then name, then id. It resets automatically because the week is part of the calculation.
- **Visit summary:** covers the time since the last completed visit, or since the programme started if there was none. It includes:
  - counted sessions of prescribed slots;
  - "Did it hurt? Yes" and "Was it easy? Yes" as yes-counts out of the answers given, in total and per exercise;
  - the average form score over scored exercises only, or "needs the sleeve" if there are none;
  - caregiver notes from that period.
- **Integrity:** the client can only insert a session dated today, with `source = 'manual'`. Server defaults set the timestamps. A finished session can't be edited.

## Data model (Supabase Postgres)

**Enums.**

- `record_source`: fake, manual, sleeve
- `link_role`: caregiver, physio
- `link_status`: pending, active, revoked
- `plan_tier`: free, plus
- `session_status`: in_progress, complete, incomplete
- `frequency`: daily, twice_daily, alternate_days
- `friendship_status`: pending, accepted, dismissed
- `visit_status`: scheduled, completed, cancelled
- `alert_kind`: missed_days, possible_fall

| Table | Key columns | Notes |
| --- | --- | --- |
| `app_settings` | paywall_enabled (default false) | A single row. Anyone signed in can read it; only a migration or the service role can write it. |
| `profiles` | id = auth user id, display_name, locale (`en` or `zh-Hans`), timezone (default Asia/Singapore), is_demo, default_context | One row per account. Only the service role can set `is_demo`. |
| `seniors` | profile_id, birth_year, gender, plan, reminder_time (default 09:00), share_weekly_report, share_fall_alerts, show_on_leaderboard, friend_code | Present when the account does the exercises. The three sharing settings default to on (Q4). Clients can't update `plan` directly. |
| `senior_link_codes` | senior_id, code (6 characters, no 0/O/1/I), created_at | Only the senior can read it. Members redeem it through an RPC. |
| `senior_clinical` | senior_id, affected_knee, notes, updated_by | Filled in by the physio (Q7) |
| `care_links` | senior_id, member_id, role, status, requested_at, responded_at, revoked_at, revoked_by | Unique while not revoked. No self-links. At most one active physio (Q8). |
| `friendships` | requester_id, addressee_id, status | Between seniors only. One row per pair. |
| `tags` | key, kind (focus or position), label {en, zh-Hans} | Data-driven |
| `exercises` | id (slug), name {en, zh-Hans}, steps {en: [], zh-Hans: []}, default_reps, focus_tag, position_tag, video_path, poster_path, review_status (`draft_pending_signoff`), sort_order, active | Any signed-in user can read it. Only the service role or a migration can write it. A check makes both locales required. |
| `default_routine_items` | position, exercise_id, reps, frequency | Seeded with the first three exercises (#17) |
| `prescriptions` | senior_id, physio_id, start_date, variation (`same_every_day` or `by_weekday`), created_at, replaced_at | A new version for every change. In-progress sessions keep their queue, so changes apply from the next session. |
| `prescription_items` | prescription_id, exercise_id, position, reps, frequency, weekday (null, or 1 to 7) | |
| `sessions` | senior_id, local_date, started_at, ended_at, status, prescription_id (null means the default routine), source | |
| `session_exercises` | session_id, exercise_id, position, reps_target, reps_done, hurt, easy, form_score (0 to 10, null when manual), sensor_summary jsonb, completed_at, source | A check makes manual rows have no score. |
| `daily_activity` | senior_id, local_date, steps, walking_minutes, active_minutes, sedentary_minutes, sit_to_stand_count, source | All-day sleeve data |
| `fall_events` | senior_id, detected_at, details, source | |
| `sleeve_devices` | senior_id, knee, firmware, battery_pct, worn, last_sync_at, calibration_status, source | |
| `senior_stats` | senior_id, as_of_date, week_start, week_done, week_prescribed, week_rate, streak, month_sessions, missed_days_this_week, consecutive_missed_days, includes_sample_data | Derived. Only server code writes it. |
| `leaderboard_weeks` | senior_id, week_start, week_rate, streak | Last week's standings, archived on Monday |
| `caregiver_notes` | senior_id, author_id, body, created_at | Plus |
| `weekly_reports` | senior_id, week_start, report jsonb, includes_sample_data, generated_at | Generated on Monday (Phase 7) |
| `visits` | senior_id, physio_id, scheduled_at, duration_min, location, status, completed_at, period_start | One table covers booked appointments and completed visits. |
| `visit_summaries` | visit_id, part (`adherence` or `details`), body jsonb, includes_sample_data | Two rows per completed visit, so RLS can give a physio on Free the adherence part only. Server code writes them. |
| `alerts` | senior_id, kind, details, source, created_at | |
| `nudges` | senior_id, sender_id, created_at, seen_at | Rate-limited |
| `push_tokens` | profile_id, token, platform | |

**RPCs** (`security definer`, each with pgTAP tests). Helpers such as `is_linked` and `has_plus` live in a `private` schema that the API doesn't expose, so only these can be called:

- Linking: `redeem_link_code(code, role)` returns only a link id, so the requester learns nothing until the senior approves. Also `respond_to_link`, `revoke_link` (the senior or the member) and `regenerate_link_code`.
- Friends: `send_friend_request(friend_code)`, `respond_to_friend_request`, `remove_friend`.
- `get_friend_leaderboard()` returns name, streak, week_rate and includes_sample_data only.
- `list_friendships()` returns the caller's friends and requests. A sent request shows as pending with no name until accepted, even if it was dismissed; the `friendships` table itself isn't readable.
- `save_prescription(senior_id, start_date, variation, items)` saves a new programme version atomically. Only the active physio; it can't start in the past, so history never changes.
- `mock_set_plan(senior_id, plan)` works for an active caregiver or the senior.
- `delete_my_account(confirmation)` deletes the caller's `auth.users` row only if `confirmation` matches, then cascades as described under Account deletion. It refuses demo accounts.

**Keeping fake and real data apart.**

- Triggers reject `source = 'fake'` rows for non-demo seniors.
- They also reject any care link or friendship between a demo account and a real one, so a real user can never see fake data.
- Every derived record carries `includes_sample_data`, which turns on the "Sample data" tag.

**Who can see what** (enforced in RLS and RPCs; "(Qn)" points to the decision behind a cell). While the paywall is off, which is the default, the Free columns behave like the Plus columns. The split shows what gets the Plus badge, and what the gating does once the paywall is switched on.

| Data | Senior | Caregiver, Free | Caregiver, Plus | Physio, Free | Physio, Plus | Friend |
| --- | --- | --- | --- | --- | --- | --- |
| Name | yes | yes | yes | yes | yes | yes |
| Age, gender, sharing settings, plan | read and write | read | read | read | read | no |
| Streak, sessions this month | yes | yes | yes | yes | yes | streak and week % only |
| Session dates and status | yes | no | if report on | yes | yes | no |
| Hurt and easy answers, form scores | yes | no | if report on | no | yes | no |
| Steps | yes | no | if report on | no | yes (Q6) | no |
| Possible falls | yes | no | if fall alerts on | no | yes (Q6) | no |
| Weekly reports | yes | no | if report on | no | yes | no |
| Caregiver notes | read (Q5) | no | write and read | no | read | no |
| Programme | read | read | read | read and write | read and write | no |
| Visit bookings | read | no (Q9) | read | read and write | read and write | no |
| Visit summaries | read (Q5) | no | no | adherence part | full | no |
| Clinical details | read | no | no | read and write | read and write | no |
| Alerts | yes | no | yes | no | no | no |
| Nudges | read | no (Q9) | send | no | no | no |

Pending and revoked links see nothing, and revoking takes effect at once.

**Account deletion.** Every role has **Delete account** in Profile or Account. It is a permanent hard delete, done by `delete_my_account` through foreign keys with `on delete cascade` or `set null`.

- **Deleting a senior** removes everything about them:
  - sessions, answers, activity, falls and devices;
  - stats, reports, alerts and nudges;
  - notes about them, visits and prescriptions;
  - links, friendships and codes.
  Their caregivers and physio lose access at once.
- **Deleting a caregiver or physio** removes their profile, links and push tokens. What they wrote about a senior stays on the senior's record (Q10): caregiver notes are credited to "Former caregiver", and prescriptions, visits and visit summaries to "Former physiotherapist". The author columns are `on delete set null`.
- It runs inside one transaction, and pgTAP tests check that it removes exactly the right rows and leaves other users' data alone.

## SleeveSource (`lib/sleeve`)

```ts
type SourceKind = 'fake' | 'manual' | 'sleeve';

interface SleeveSource {
  kind: SourceKind;
  capabilities: { repCounting; formScore; liveSignals; dailyActivity; fallDetection; heartRate: boolean };
  connection: Observable<'none' | 'connecting' | 'connected'>;
  device(): DeviceInfo | null;                       // id, firmware, knee, battery, worn, lastSync, calibration
  startExercise(ex: { exerciseId: string; repTarget: number }): ExerciseTracker;
  subscribeLiveSignals(cb: (s: LiveSignal) => void): Unsubscribe;   // knee angle, heart rate
  getDailyActivity(date: string): Promise<DailyActivity | null>;
  subscribeFallEvents(cb: (e: FallEvent) => void): Unsubscribe;
}

interface ExerciseTracker {
  events: Observable<RepEvent | FormScoreEvent>;
  pause(): void;
  resume(): void;
  finish(): ExerciseMeasurement;                     // repsDone?, formScore?, sensorSummary?
}
```

- **`ManualSource`** has no capabilities. Every session uses it for now, demo accounts included. `finish()` returns no score.
- **`FakeSource`** produces plausible signals for the Sleeve tab, and generates history for the seed script. It is used only on demo accounts.
- **`BleSource`** is a stub that throws "not implemented". It has TODOs mapped to brief section 10: reps and ROM, tempo, hold and rest, EMG, PPG, all-day motion, the fall pattern, and device info.
- Screens read `capabilities` to decide what to show, so the real sleeve can plug in later without screen rewrites.

## Screens

**Shared:**

- sign-in (email or Google), auth callback
- onboarding: language, then "I do the exercises", "I help a family member" or "I'm a physiotherapist"
- senior setup: name, birth year, gender, reminder time with 9:00 AM suggested
- context switcher
- a small **Plus** badge on every paid feature, in all three roles. Tapping it opens the Plus info / mock checkout sheet.
- **Delete account**, in three steps, each with plain words and full-width buttons:
  1. **What will be deleted.** The screen is tailored to the account. A senior is told their exercise history, reports and links will go, and it names who will lose access. A caregiver or physio is told what happens to the notes, programmes and visits they wrote.
  2. **Confirm.** The user types the word shown on screen (`DELETE` in English, `删除` in Chinese) before the red **Delete my account** button turns on. **Cancel** is just as large and comes first.
  3. **Done.** The account is deleted, the user is signed out, and they land back on the welcome screen.
  - If the sign-in is more than 24 hours old, the user is asked to sign in again before step 2.
  - Demo accounts get a message explaining that the seed script resets them instead.

**Senior** (tabs: Today, Friends, Sleeve, Profile):

- **Today:** greeting, today's plan, week %, streak, leaderboard position, last form score, any nudge from family, the next visit, and a large **Start** button.
- **Session flow:**
  1. Queue overview.
  2. Exercise: video, steps, rep target, a "stop and contact your clinician if pain worsens" line, **Take a break** or Resume, **Done**, and **End session early**. There is no skip button.
  3. Two questions, each Yes/No, then **Next**.
  4. Done screen: answers for each exercise, form score or "needs the sleeve", and the updated week and leaderboard.
- **Friends:** leaderboard with the ranking rule explained and "Resets Monday", requests (accept or dismiss), add by code, share my code, remove a friend.
- **Sleeve:** sample signals with a "Sample data" tag, or "No sleeve connected".
- **Profile:**
  - sharing toggles
  - linked people: approve, decline or cancel, plus my link code and QR
  - friends
  - programme (read-only)
  - reminder time, language
  - visits (read-only)
  - the "not a medical device" note, sign out, Delete account
- An empty state on every screen.

**Caregiver:**

- link a senior by code or QR scan, then a pending screen
- senior picker
- Overview:
  - Free: streak and sessions this month
  - Plus: weekly report, which is the Monday-to-Sunday grid, sessions done of prescribed, %, average daily steps, and flagged events. If the senior has turned the report off, the screen says so.
  - Plus: notes for the physio
  - Plus: **Send a gentle nudge**
- Alerts list (Plus), with a dev-only **Simulate possible fall** button on demo accounts
- Visits calendar with a .ics download (Plus)
- Plus info / mock checkout labelled "Prototype, no payment taken". It only changes the plan when the paywall flag is on.
- Account, including Delete account

**Physio** (desktop web; sidebar with Patients, Agenda and Exercise library; header with language switch and an account menu that includes Delete account):

- **Patients:** search, week %, flags (on track, pain reported on Plus, N missed days), add a patient by code.
- **Patient page**, with four tabs:
  - **Overview:** live summary since the last visit, weekly reports, caregiver notes.
  - **Visits:** past visits, plus **Add visit**, which generates and stores that visit's summary.
  - **Programme:** see Prescribe below.
  - **Details:** the clinical details.
- **Prescribe:** pick from the library and filter by tag; tick to add; drag to reorder, with Move up and Move down buttons for keyboard users; set reps and frequency; set a start date; choose the same set every day or vary it by weekday (#20).
- **Schedule the next visit:** shows up in the calendar shared with the senior and caregiver, with a .ics download.
- **Agenda:** today and this week, each item linking to that patient's summary.
- **Library:** read-only, labelled "Draft, pending clinician sign-off".

## i18n, copy, fonts and design tokens

- **Locale files.** Namespaces are `common`, `senior`, `caregiver`, `physio` and `notifications`, in `locales/en` and `locales/zh-Hans`. Exercise names, steps and tag labels live in the database as `{en, zh-Hans}`. Push copy is read from `notifications.json` by the Edge Functions.
- **Choosing the language.** The app follows the device language by default. Profile and the physio header have a switch, and the choice is saved and copied to `profiles.locale` so push messages arrive in the right language.
- **Formatting.** Dates, times and numbers use `Intl` with the active locale and the Asia/Singapore timezone.
- **`locales/review-status.json`** marks every zh key (and every exercise field) as `machine-drafted` with a priority of `safety`, `health` or `general`. `npm run i18n:review-list` writes the README list from it.
- **Tests:**
  - every key exists in both languages, in the locale files and in the exercise seed;
  - every zh key has a review status;
  - copy rules: no em dash, middle dot, `——` or `·` anywhere, and none of the banned words in English (prevents, clinical-grade, diagnose, real-time) or Chinese (预防, 临床级, 诊断, 实时);
  - no gendered pronouns for the senior; the copy uses their name.
- **Fonts.**
  - Figtree 600 and 700 for headings, Noto Sans 400, 500 and 700 for body, and Noto Sans SC 400 and 700.
  - On web, CSS stacks (`Figtree, "Noto Sans SC", sans-serif`) provide the fallback.
  - On native, React Native has no per-glyph fallback, so with `zh-Hans` active, headings and body both switch to Noto Sans SC. Noto Sans SC includes Latin, so mixed strings render correctly.
- **Tokens:** ink `#394955`, primary `#D1E2F1`, secondary `#8AB0CD`, pink `#F5D8E7`, mauve `#BDA1B0`, surface `#F7FAFD`.
- **Text rules.** All text is solid ink. The only exception is labels on ink-filled buttons, which are white (9.3:1).
- **Type scale.** The smallest size is 16, body text is 18, and font scaling is never turned off.
- **Buttons and controls.** Touch targets are at least 56pt, and primary buttons are full width. Every control gets an `accessibilityRole` and an `accessibilityLabel`.

## Build phases (one PR each; branch `phase-N-<name>`)

1. **Setup:** Expo SDK 57 and Router, TS strict, NativeWind and tokens, ESLint (flat `eslint-config-expo`) and Prettier, the i18n layer in both languages, fonts including Noto Sans SC, the base UI kit, and a placeholder screen with a language switch.
   - Also: `AGENTS.md`, `CLAUDE.md` (pointing to `@AGENTS.md`), `.env.example`, `.gitignore`, `PLAN.md`.
   - CI: `.github/workflows/ci.yml` runs lint, typecheck and test.
   - Vercel: `vercel.json`.
   - Tests: i18n parity and copy rules.
2. **Database:**
   - `supabase init`; migrations for the enums, tables, indexes, helper functions (`is_linked`, `has_plus`, ...), `app_settings` with the paywall off, RLS, RPCs, demo-isolation triggers, delete cascades and the `exercise-media` storage bucket.
   - Seeds: the exercise library and default routine (`seed.sql`), with draft steps in both languages.
   - Code: `lib/progress` with unit tests, `lib/sleeve`, `fake-data/FAKE_DATA_seed.ts`, and `scripts/seed-demo.ts`. The seed script uses the service role from a gitignored `.env.seed.local` and wipes and recreates demo data only.
   - Also: generated types, and pgTAP tests for the whole matrix above, with the paywall both off and on. CI gains a `supabase start` plus `supabase test db` job.
3. **Auth and linking:**
   - Supabase client on AsyncStorage.
   - Sign-in by magic link (the email also carries a 6-digit code) or Google.
   - Deep links: scheme `kneedit://auth/callback`, plus the web URL.
   - Onboarding, routing by context, link code and QR, redeem by typing or scanning, approve and cancel, sharing toggles, friends.
   - Account deletion: the `delete_my_account` RPC, its pgTAP tests, and the three confirmation screens in both languages.
   - The `PlusBadge` component.
4. **Senior app:** Today, the session flow, done screen, leaderboard, Sleeve tab, a local daily reminder through expo-notifications, Profile and visits.
   - Also: a `recompute-stats` Edge Function, called after each session.
5. **Caregiver app:** free stats, the live weekly report, flagged events, notes, the alerts list, simulate fall, nudges (stored and shown on the senior's Today screen), the Plus info / mock checkout sheet, calendar with .ics. Every Plus feature is unlocked and badged.
6. **Physio web:** desktop shell, patient list, patient page, visit summaries (`generate-visit-summary` Edge Function), visits, prescribing, scheduling with .ics, agenda, clinical details, library.
7. **Notifications and jobs:**
   - Push token registration, plus a shared `send-push` sender using the Expo push service and the recipient's locale.
   - Push on nudges.
   - An immediate fall push through a database webhook on `fall_events`, Plus only and only if the senior allows it, worded as "possible fall detected" with no promises.
   - Daily job (00:15 SGT, pg_cron): recompute every `senior_stats` row, mark abandoned sessions incomplete, and send the 3-missed-days alert once for each run of missed days.
   - Monday job: archive `leaderboard_weeks`, then generate `weekly_reports` and send "weekly report ready" to Plus caregivers who have the report on.
8. **Polish:**
   - Accessibility pass: labels and roles, a large-text check at 200%, a screen-reader walkthrough.
   - Copy check in both languages, an empty state everywhere.
   - README: how to run and seed, the demo accounts, and the list of zh strings awaiting review, with safety and health first.

After each phase: lint, typecheck and tests (plus db tests from Phase 2) must pass. Then I write a summary of what I built, what I assumed and how to try it, and stop.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (Jest: progress rules, i18n parity, copy rules, .ics), and `npm run db:test` (pgTAP RLS and RPC tests on local Supabase). All of them run in CI on every PR.
- I check each phase's web screens myself in the built-in browser with `npx expo start --web`: phone width for senior and caregiver, 1280px for physio, both languages, and the browser zoomed to 200% for large text.
- Native, on your phone: `npx expo start`, then Expo Go. The PR notes say what to tap through.
- Demo: `npm run db:start && npm run seed:demo`, then sign in as the demo senior, caregiver or physio. Locally the magic links arrive in Mailpit at `localhost:54324`.

## Decisions (answered 22 Oct 2026)

Where a question wasn't answered, the recommendation stands.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Base branch | I pushed one empty "Initial commit" to `main`. You turn on branch protection. |
| 2 | Waiting between phases | I stop after each PR and wait for you to say continue. The next phase branches off the previous one if it isn't merged yet. |
| 3 | Twice daily and alternate days against #11 | Sessions count up to the number the physio's plan prescribes for the day, not strictly one a day. A day has 0, 1 or 2 prescribed sessions, the second holding only the twice-daily exercises. The streak needs one counted session on each prescribed day; rest days don't break it. The week % counts every prescribed session. |
| 4 | Default sharing | All three settings (weekly report, fall notifications, leaderboard) start **on** for every account. The senior can turn any of them off in Profile. |
| 5 | Senior reads caregiver notes and visit summaries | Yes, read-only. Caregivers of the same senior also see each other's notes. |
| 6 | Physio Plus record includes steps and possible falls | Yes. The fall toggle covers caregiver alerts only. |
| 7 | Clinical details | Affected knee (left, right or both) and free-text notes. Senior and physio only. |
| 8 | Physios per senior | One active physio link at a time. |
| 9 | Caregiver visit bookings and nudges | **Plus.** Both get the Plus badge; while the paywall is off, they work for everyone. |
| 10 | What a deleted caregiver or physio wrote | **Kept** on the senior's record, credited to "Former caregiver" or "Former physiotherapist". The senior is told the link ended. Deletion is immediate. |
| 11 | "Clinician-reviewed" default routine | Called the "Kneedit starter routine" until sign-off, with the draft label in the physio library and the senior's Profile programme. |
| 12 | Disclaimer wording | "Kneedit is not a medical device. It does not give medical advice or replace professional care." |
| 13 | Hosted Supabase | You create it before Phase 3 and put its URL and anon key in `.env`. |
| 14 | Demo login emails | Read from `.env.seed.local`; locally `*@kneedit.test`, caught by Mailpit. |
| 15 | Native builds | Expo Go and magic link through Phase 6; EAS dev build in Phase 7. |
| 16 | Edge Functions and the service role | Fine: Supabase injects the key server-side; it is never in the repo or the app. |
| 17 | Demo videos in the public repo | Yes, commit the three videos and posters. |
| 18 | Vercel | I link the Vercel project and connect the GitHub repo, so each PR gets a preview deploy. Done: production is https://kneedit.vercel.app, deployed from `main`. |
| 19 | Expo SDK version | Pinned to **SDK 57** instead of the latest stable 58, so the App Store's Expo Go works on everyone's iPhone. Upgrade to 58 once Expo Go in the App Store supports it (see Risks). |

## Assumptions (unless you object)

- **Senior details:** I store the birth year rather than age, and show the age. Gender options are Female, Male and Prefer not to say.
- **Feedback questions:** both need an answer, then the senior presses **Next**. The demo auto-advances, but an explicit button lets seniors fix a mis-tap and works better with screen readers.
- **Ending a session early:** the exercise just tapped Done is kept, with whatever answers were given.
- **Physio Free:** prescribing, scheduling and adherence-only visit summaries are included. Plus adds pain and ease answers, form scores, caregiver notes and full summaries.
- **Physio identity:** not verified in the MVP. The senior's approval is the only gate, which needs revisiting before a pilot.
- **Small privacy additions:** "Remove friend". A friend request that was dismissed still shows as "sent" to the requester.
- **Out of scope:** an admin UI for the library, data export, and end-to-end tests.

## Risks I'll watch

- **Expo SDK version.** We're on SDK 57, not the latest stable SDK 58, because the App Store's Expo Go only runs projects up to SDK 57 (decision 19). Upgrade to SDK 58 once Expo Go in the App Store supports it: `npx expo install expo@~58.0.0`, then `npx expo install --fix`, then `npx expo-doctor`. NativeWind 4 is confirmed working on both 57 and 58.
- **App size.** Two weights of Noto Sans SC add roughly 15 to 20 MB to the native app. On web, the font loads from Google Fonts in subsets.
- **Edge Function imports.** Edge Functions need to import `lib/progress` and `locales` from outside `supabase/functions`. If the Supabase bundler refuses, a sync script copies them into `_shared/`, with a test that fails if the copies drift.
