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

## Chinese strings awaiting review

Every Simplified Chinese string is machine-drafted until a native speaker reviews it. The list, with safety and health wording first, is printed by:

```bash
npm run i18n:review-list
```

The full list goes into this README in Phase 8.
