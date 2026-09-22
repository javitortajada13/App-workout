# App-Workout

An AI-powered strength & conditioning platform, starting with padel. Read
this before making architectural changes — it captures decisions that
aren't obvious from the code alone.

Before making changes, also read `PROJECT_STATE.md` at the repo root — a
point-in-time reconstruction of what's implemented vs. only documented,
open contradictions between artifacts and this file, and known gaps. It's a
snapshot, not a living doc — treat any conflict with the actual code as the
code winning, and re-verify rather than trusting it blindly as the codebase
evolves.

## The philosophy this project is built on

This is not an exercise library with a chatbot bolted on. The exercise
database is the product's actual knowledge; the AI is the interface to it.
Every exercise must answer "why am I doing this" — physical qualities
trained, contraindications, evidence quality, sport transfer — and the AI's
job is to **select and explain using that structured data, never to invent
or recall exercise facts from its own memory.**

Two rules follow directly from that and must not be relaxed as the codebase
grows:

1. **The AI is a retrieval-grounded reasoner, not a context-stuffed
   chatbot.** It gets tools (`search_exercises`, `get_exercise_detail` —
   see `apps/api/src/ai/`) that query the real database. This is what makes
   "never guess" actually true rather than aspirational, and it's what
   makes contraindication safety a property of the data layer, not
   something hoped for in a prompt.
2. **Exercises are a knowledge graph, not a flat table.** Physical
   qualities, muscles, equipment, and progressions/regressions/alternatives
   are first-class entities and relationships (see
   `apps/api/prisma/schema.prisma`), not string fields on an Exercise row.
   This is what lets the AI answer "can I replace this" or "make it easier"
   by querying real relationships instead of guessing a substitute.

The full data-model rationale (three layers of "why" — the exercise, the
block, the program; why difficulty/level/load are three separate axes; why
sport-transfer is its own evidenced claim) lives in the design doc produced
alongside this build. `apps/api/prisma/schema.prisma` is the current source
of truth for the schema itself — read it before changing the model.

## Scalability stance

The data model (Sport, PhysicalQuality, muscle/equipment taxonomies,
SportTransfer) is sport-agnostic on purpose — padel is one row in `Sport`,
not a hardcoded assumption. The **product surface** (mobile app, navigation,
copy) is deliberately padel-specific for v1. Don't generalize the UI for
other sports before padel is validated; do keep new schema fields
sport-agnostic when the cost of doing so is low.

## Repo layout

```
apps/api/       Fastify + TypeScript backend
  prisma/       schema.prisma (source of truth for the data model), seed.ts
  src/
    ai/         chat.ts (tool-use loop + system prompt), tools.ts (the two
                retrieval tools the model is allowed to call)
    routes/     REST endpoints, thin -- logic lives in mappers.ts
    mappers.ts  Prisma -> API contract type mapping. Both the REST routes
                and the AI tools import from here, so the AI sees exactly
                the same exercise shape a client would.
apps/mobile/    Expo (React Native + Expo Router) app
  src/app/      file-based routes: (tabs)/ for the tab bar, program/[id],
                session/[id], exercise/[id] for the drill-down hierarchy
packages/shared/  API contract types (ProgramSummary, ExerciseDetail, etc.)
                  shared between apps/api and apps/mobile. No Prisma import
                  here -- this is the client-visible boundary, not the DB
                  model.
```

Navigation hierarchy (mirrors a real reference app's proven IA, gutted of
everything not relevant to this product): **Programs -> Sessions -> Blocks
-> Exercises -> Exercise detail**, plus a Coach tab that is not a
navigation leaf but the product's other primary surface.

## Stack and why

- **Postgres + Prisma.** Relational model matches the entity/relationship
  design directly; Prisma Studio (`npm run db:studio -w apps/api`) doubles
  as a free content-browsing tool while there's no real admin UI yet.
  Prisma 7 requires a driver adapter -- see `apps/api/prisma.config.ts` and
  `apps/api/src/db.ts` (`@prisma/adapter-pg`), and the generated client
  lives at `apps/api/src/generated/prisma` (gitignored, regenerate with
  `npm run db:generate -w apps/api`).
- **Fastify.** Thin REST layer; all real logic is in `mappers.ts` so the AI
  tools and the REST routes can't drift into returning different shapes.
- **Claude (`claude-opus-5`) via the Anthropic TypeScript SDK, manual
  tool-use loop.** See `apps/api/src/ai/chat.ts`. Deliberately not the beta
  tool-runner, to keep the loop's behavior fully explicit and dependency-free
  while the core pattern is still being validated.
- **Expo + Expo Router.** Chosen (over web-first) because the user's own
  players will check workouts at the club/court on their phone. SDK 57 uses
  `expo-router/tabs` for the classic cross-platform tab navigator --
  `Tabs` is **not** exported from the `expo-router` root anymore (the
  template's `unstable-native-tabs` is a different, newer, explicitly
  unstable API; this project intentionally uses the stable one).
- **npm workspaces**, no extra monorepo tool. `apps/mobile/metro.config.js`
  adds the repo root to `watchFolders` so Metro can resolve
  `@app-workout/shared` through the workspace symlink.

## Running it locally

```bash
# Postgres (this container already has postgresql-16 installed)
pg_ctlcluster 16 main start   # if not already running

# API
cd apps/api
cp .env.example .env          # fill in DATABASE_URL; ANTHROPIC_API_KEY optional
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:3000

# Mobile (separate terminal)
cd apps/mobile
cp .env.example .env          # EXPO_PUBLIC_API_URL -- see the file for
                               # simulator/device-specific values
npm run web                   # or `npm start` for the Expo Go / simulator flow
```

The Coach chat endpoint degrades gracefully with no `ANTHROPIC_API_KEY` set
(returns a clear "not configured" assistant message instead of erroring) --
the rest of the app doesn't depend on it.

## Current state, honestly

- The seeded program ("julio y el resto") is transcribed from real
  screenshots, not invented. **Some blocks are genuinely missing** (Dia 1
  Bloque 1, Dia 2 Bloque 1, Dia 4 Bloque 1, one exercise each in Dia 1/2's
  Bloque 2, and all of Mov Prep) because the source screenshots for them
  were never reviewed. This is recorded at the top of
  `apps/api/prisma/seed.ts` -- fill in from real screenshots, never from a
  plausible-sounding guess. (A previous pass in this project's history did
  guess, presented it as confirmed, and had to be corrected -- don't repeat
  that.)
- The AI chat endpoint's tool-use loop is implemented per the documented
  Anthropic API patterns and its graceful-degradation path is verified, but
  the live model loop itself is **not yet verified end-to-end** -- no
  `ANTHROPIC_API_KEY` was available in the environment this was built in.
  Verify with a real key before trusting it in front of a user.
- No auth/users/athlete profiles yet. `Program` has no owner. This is a
  deliberate scope cut, not an oversight -- don't bolt on a quick `userId`
  field without thinking through the athlete/coach model properly first.
- Exercise videos are unmodeled (`videoUrl`/`thumbnailUrl` exist on the
  schema but nothing populates them yet).
