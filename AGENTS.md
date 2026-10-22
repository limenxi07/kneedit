# Kneedit: conventions

This file is the single source of truth for how we work in this repo, for people and coding agents alike. `CLAUDE.md` just points here. `PLAN.md` holds the build plan, data model and open questions.

## What Kneedit is

A companion app for a smart knee sleeve. It helps seniors with knee osteoarthritis keep doing the home exercises their physiotherapist prescribed. It works alongside physiotherapy and never replaces it.

| Role | Device | Owner |
| --- | --- | --- |
| Senior | Phone | Jiaxin |
| Caregiver | Phone | Gaheyon |
| Physiotherapist | Desktop web | Fucheng |
| UI/UX | All | Lehan |
| Backend, reviews | All | En Xi |

**Kneedit is not a medical device.** See the copy rules below.

## Stack

- One **Expo** app (SDK 58) with **Expo Router**, **TypeScript strict** and **NativeWind 4** (Tailwind 3). iOS and Android for seniors and caregivers; the web build of the same app is the physio dashboard, deployed to Vercel.
- **Supabase** for Postgres, auth and storage. Migrations go through the Supabase CLI (`npx supabase`, a devDependency). Edge Functions handle scheduled jobs and push.
- **Expo Notifications** for local reminders and server push.
- **i18next** with `react-i18next` and `expo-localization` for English and Simplified Chinese.
- **Jest** (`jest-expo`) for TypeScript tests, and **pgTAP** (`supabase test db`) for database and RLS tests.

## Commands

```bash
npm install
npm start               # Expo dev server (press w for web, or scan the QR with Expo Go)
npm run web             # web only
npm run lint            # ESLint, then a Prettier check
npm run format          # Prettier write
npm run typecheck       # tsc --noEmit
npm test                # Jest
npm run check           # lint, typecheck and test: run before every PR
npm run build:web       # static web export to dist/ (what Vercel runs)
```

- Add packages with `npx expo install <pkg>`, never a bare `npm install <pkg>`, so versions match the SDK.
- Expo changes every SDK. Before using an Expo or React Native API, read the docs for SDK 58 (`https://docs.expo.dev/versions/v58.0.0/`) or the index at `https://docs.expo.dev/llms.txt`, rather than relying on memory.
- `ios/` and `android/` are generated (Continuous Native Generation) and gitignored. Configure native behaviour in `app.json` and config plugins only.
- Expo Go only has its bundled native modules. Anything else needs a development build (EAS).

## Folder layout

Code is organised by role, so each owner mostly works in their own folders.

```
app/                     routes only (every file here is a screen)
  _layout.tsx            root providers
  (auth)/                sign-in and onboarding
  (senior)/              senior screens
  (caregiver)/           caregiver screens
  (physio)/              physio dashboard (desktop layout)
components/ui/           shared building blocks: Text, Button, Card, Screen ...
components/<role>/       components used by one role
lib/                     non-UI code: i18n, theme, supabase, progress rules, sleeve sources
locales/<lang>/*.json    UI strings, one file per namespace
locales/review-status.json   review status of every Chinese string
fake-data/               clearly labelled fake data, demo accounts only
scripts/                 node scripts (seeding, reports)
supabase/                config, migrations, Edge Functions, pgTAP tests
tests/                   Jest tests
types/                   global type declarations
```

- Never put non-route code inside `app/`.
- Import with the `@/` alias (`@/components/ui/Text`, `@/lib/i18n`).

## Naming

- Components: `PascalCase.tsx`, one component per file, named exports.
- Hooks: `useThing.ts`. Other modules: `camelCase.ts`.
- Platform variants: `thing.web.ts` next to `thing.ts`.
- Route files follow Expo Router (`index.tsx`, `[id].tsx`, `(group)/`).
- Database: `snake_case` tables and columns, plural table names, enums named for what they hold (`link_status`).
- i18n keys: `camelCase` paths grouped by screen (`today.startButton`), in the namespace of the role that owns the screen (`common`, `senior`, `caregiver`, `physio`, `notifications`).

## Branches and pull requests

- `main` is protected. Never commit to it directly.
- One branch per piece of work, named `phase-N-<topic>` during the MVP build, then `<owner>/<topic>` (for example `jiaxin/session-timer`).
- One pull request per phase or feature. Every PR describes what it does, what it assumes and how to try it.
- `npm run check` must pass, and CI must be green, before review. En Xi reviews and merges.
- Keep PRs focused. Unrelated fixes get their own PR.

## Copy rules (all languages)

- **Never** use the em dash or the middle dot, in any string, label, separator or alt text. In Chinese that also means no `——` and no `·`, even in transliterated names. Use commas, full stops or separate lines.
- **No medical claims.** Never say Kneedit prevents, treats, cures or diagnoses osteoarthritis. Never say "clinical-grade" or "real-time". Alerts are "possible fall detected", with no promise of emergency response or response time.
- Every senior-facing exercise screen says to stop and contact a clinician if pain worsens (`common:safety.stopIfPain`).
- Refer to the senior by name, never by a gendered pronoun.
- Plain words, short sentences, one main action per screen.
- `tests/copy-rules.test.ts` enforces the character and word rules in both languages. If it fails, reword the string; don't loosen the test.

## Internationalisation

- **Every** user-facing string goes through i18n. No hard-coded text in JSX: ESLint's `react/jsx-no-literals` fails the build. Accessibility labels and hints are translated too.
- Add every key to **both** `locales/en/<ns>.json` and `locales/zh-Hans/<ns>.json`, and add the Chinese key to `locales/review-status.json` as `machine-drafted` with a priority (`safety`, `health` or `general`). `tests/i18n.test.ts` fails if any of these is missing.
- New namespace: add the two JSON files and register them in `lib/i18n/resources.ts`.
- Exercise names, steps and tag labels are data, stored in the database as `{ "en": ..., "zh-Hans": ... }`.
- Format dates, times and numbers with `lib/i18n/format.ts` (Asia/Singapore time, locale-aware). Never build dates or numbers by string concatenation.
- The app follows the device language until the user picks one (Profile, or the physio dashboard header).

## Design rules

- Brand tokens live in `lib/theme/tokens.ts` and Tailwind (`bg-ink`, `bg-primary`, `bg-pink`, `bg-surface`, `border-secondary` ...).
- **All text is ink** (`#394955`). The only exception is a label on an ink- or danger-filled button, which is white. Never use the muted blue or mauve for text, or behind body text; they are for bars, rings, borders and decoration. Never lower text opacity.
- Use `components/ui/Text`, never React Native's `Text` directly: it picks the right font for the language (Figtree headings, Noto Sans body, Noto Sans SC for Chinese) and keeps sizes legal.
- **Senior screens:** body text 18pt, nothing below 16pt (the Tailwind scale has nothing smaller), system font size always respected (never set `allowFontScaling={false}`). Touch targets at least 56pt (`min-h-tap`), primary buttons full width, one main action per screen, no gesture-only controls.
- Every control has an `accessibilityRole` and an `accessibilityLabel` (and `accessibilityState` where relevant).
- Senior and caregiver screens are phone-first (`<Screen>`); physio screens use the desktop layout (`<Screen width="wide">` and the physio shell).

## Data rules

- Default timezone Asia/Singapore, metric units.
- Every stored record has `source: 'fake' | 'manual' | 'sleeve'`. Any screen that shows fake data shows the "Sample data" tag. Reports never silently mix fake and real data.
- Fake data lives only in `fake-data/` and is only loaded into demo accounts by the seed script. Real accounts start empty.
- Sleeve access always goes through the `SleeveSource` interface in `lib/sleeve/` (from Phase 2).
- Sharing is enforced in Postgres RLS, never only by hiding things in the UI. Every policy has a pgTAP test.
- Plus features are gated through the `has_plus()` SQL helper (from Phase 2). While payments are not live, the paywall flag is off, so every Plus feature is unlocked and labelled with a Plus badge.

## Secrets

- `.env` holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Copy `.env.example`. Anything prefixed `EXPO_PUBLIC_` ends up in the app bundle, so only public values go there.
- The service-role key is only used by local seed scripts (from the gitignored `.env.seed.local`), never in the app.
- Never commit a key, password or token. `.env*` files are gitignored except `.env.example`.
