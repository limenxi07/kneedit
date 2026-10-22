# Kneedit

Companion app for the Kneedit smart knee sleeve. It helps seniors with knee osteoarthritis keep doing the home exercises their physiotherapist prescribed, and keeps their family and physiotherapist in the loop. Kneedit is not a medical device.

One Expo app serves all three users: seniors and caregivers on iOS and Android, and physiotherapists on the web build.

> Prototype, under construction. See [PLAN.md](PLAN.md) for the build plan and [AGENTS.md](AGENTS.md) for conventions.

## Run it

Requires Node 22 or later.

```bash
npm install
cp .env.example .env   # fill in once Supabase is set up (Phase 2)
npm start              # then press w for web, or scan the QR code with Expo Go
```

Checks, as run in CI:

```bash
npm run check          # lint, typecheck and tests
npm run build:web      # web export to dist/
```

## Chinese strings awaiting review

Every Simplified Chinese string is machine-drafted until a native speaker reviews it. The list, with safety and health wording first, is printed by:

```bash
npm run i18n:review-list
```

The full list goes into this README in Phase 8.
