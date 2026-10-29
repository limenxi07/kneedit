# Kneedit

Companion app for the Kneedit smart knee sleeve. It helps seniors with knee osteoarthritis keep doing the home exercises their physiotherapist prescribed, and keeps their family and physiotherapist in the loop. Kneedit is not a medical device.

One Expo app serves all three users: seniors and caregivers on iOS and Android, and physiotherapists on the web build.

> Prototype, under construction. See [PLAN.md](PLAN.md) for the build plan and [AGENTS.md](AGENTS.md) for conventions.

## Run it

Requires Node 22 or later.

```bash
npm install
cp .env.example .env   # fill in once Supabase is set up
npm start              # then press w for web, or scan the QR code with Expo Go
```

Checks, as run in CI:

```bash
npm run check          # lint, typecheck and tests
npm run build:web      # web export to dist/
```

## Local database

Needs Docker. The Supabase CLI is a devDependency, so nothing else to install.

```bash
npm run db:start       # Postgres, auth and storage; applies migrations and supabase/seed.sql
npm run db:test        # pgTAP tests in supabase/tests/database
npm run seed:demo      # wipe and recreate the demo accounts with FAKE data
npm run db:types       # regenerate lib/supabase/database.types.ts after a migration
npm run functions:check  # call the Edge Functions as a throwaway user (CI runs it too)
npm run db:reset       # rebuild the local database from the migrations
npm run db:stop
```

`npm run db:start` prints the local API URL and anon key for `.env`. Demo accounts (all `@kneedit.test`, so locally their magic links land in Mailpit at http://localhost:54324):

| Account | Email | Who |
| --- | --- | --- |
| Senior | demo-senior@kneedit.test | Tan Mei Ling, six weeks of sample history, physio programme |
| Caregiver | demo-caregiver@kneedit.test | Tan Wei Jie, linked to Mei Ling |
| Physio | demo-physio@kneedit.test | Priya Nair, Mei Ling's physio |
| Friends | demo-friend-1@kneedit.test, demo-friend-2@kneedit.test | Lim Ah Kow and Siti Rahmah, on Mei Ling's leaderboard |

To seed the hosted project instead, put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.seed.local` (gitignored). The script only ever deletes accounts marked as demo.

## Signing in

Sign-in is by email: Kneedit emails a 6-digit code that also comes with a magic link. New accounts are created on first sign-in, then onboarding asks how the person will use Kneedit.

Locally, the email lands in Mailpit at http://localhost:54324. Put the local API URL and anon key from `npm run db:start` in `.env`, run `npm run web`, and sign in with any `@kneedit.test` address, or a demo account after `npm run seed:demo`.

For the hosted project, in the Supabase dashboard:

- **Authentication, URL Configuration:** set the site URL to `https://kneedit.vercel.app` and allow the redirect URLs listed in `supabase/config.toml` (`kneedit://**`, `exp://**`, `https://kneedit.vercel.app/**`, `https://*.vercel.app/**`).
- **Authentication, Emails:** use `supabase/templates/sign-in.html` for both the Magic Link and Confirm signup templates, so the email carries the code.
- **Google** (optional): enable the Google provider with an OAuth client. Locally it is off; `supabase/config.toml` explains how to turn it on.

Vercel needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in its environment variables, or the app throws at start-up (the browser console says which variable is missing).

## Edge Functions and media

`supabase/functions/recompute-stats` recomputes a senior's streak, week and month with `lib/progress`. The app calls it after every session and when Today opens on a new day. Locally, `npm run db:start` serves it. For the hosted project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run functions:deploy
```

Exercise videos and posters go in `assets/exercise-media/` (see the README there), then `npm run media:upload` copies them to the public `exercise-media` bucket, locally or, with `.env.seed.local`, to the hosted project. Without them the exercise screen says the video isn't available and shows the steps.

## Reminders

Seniors get a daily reminder as a local notification on their phone, at the time they chose (Profile, Daily reminder). Nothing is sent from a server. The web build has no reminders. It works in Expo Go; push notifications from the server arrive with the development build in Phase 7.

## Chinese strings awaiting review

Every Simplified Chinese string is machine-drafted until a native speaker reviews it. The list, with safety and health wording first, is printed by:

```bash
npm run i18n:review-list
```

The full list goes into this README in Phase 8.
