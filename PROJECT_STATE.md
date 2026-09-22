# Project State Reconstruction

**Purpose of this document:** this is a point-in-time reconstruction of the
project's state, produced by inspecting the entire repository (source code,
schema, seed data, migrations) plus two Claude-hosted design artifacts
referenced by `CLAUDE.md`. It exists so a future session — with no memory of
prior conversations — can resume work safely without re-deriving context or
accidentally undoing a deliberate scope cut.

**Status labels used throughout:**
- **CONFIRMED** — verified directly in the repository's code, schema, or migrations.
- **DOCUMENTED BUT NOT IMPLEMENTED** — exists in `CLAUDE.md` or one of the two
  design artifacts, but has no corresponding code.
- **UNRESOLVED DECISION** — sources disagree, or a decision is referenced but
  never actually made. Do not resolve these silently — surface them to the user.
- **INFERRED NEXT STEP** — not stated anywhere as a plan; a reasonable reading
  of the gaps, not a commitment.

**Reconstructed from:** `CLAUDE.md`, full repo tree under `apps/` and
`packages/`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`,
`apps/api/prisma/migrations/20260725094323_init/migration.sql`, all files
under `apps/api/src/`, all files under `apps/mobile/src/`, and two Claude
artifacts dated 2026-07-25: `padel-coach-data-model.md` (data-model design
doc) and "App Workout — Vista previa de diseño" (an HTML mobile-app mockup).
Both artifacts are unmodified and still live at their original URLs — see
the References section at the end.

This document does not change, resolve, or reinterpret anything below. Where
sources conflict, both sides are given.

**Read this before anything else — this is a real business, not just a
family project.** The user runs "Padel Performance," a paid physical-
preparation coaching service for padel players (amateur/intermediate/
competitive, often with recurring injuries): €120/month, currently
delivered through a third-party app (**TIMP**, not this platform),
updated every 2 weeks, with direct support, paid via Wise. Client
acquisition funnel: an Instagram-bio link to a custom-built assessment
form (`padelperformance.tiiny.site` -- 6 steps: basic info, padel
profile, injuries/limitations with conditional logic, sports/training
history, lifestyle/recovery, training environment; submits to Google
Forms -> Google Sheets), then semi-personalized WhatsApp templates
(English/Spanish) for first contact and post-payment (the post-payment
one requests 6 movement-assessment videos + gym photos). The user's own
father is the first real test athlete on *this* app specifically, not
the business's only client -- see the M2-onward log in section 13 for
the full build. Full detail on how this connects to the app (or
deliberately doesn't yet) is in the dated log entry near the end of
section 13.

---

## 1. Original product vision and philosophy

**CONFIRMED** (`CLAUDE.md`, top section): This is not an exercise library
with a chatbot bolted on. The exercise database is the product's actual
knowledge; the AI is the interface to it. Every exercise must answer "why am
I doing this" (physical qualities trained, contraindications, evidence
quality, sport transfer). Two rules follow and must not be relaxed:

1. The AI is a retrieval-grounded reasoner, not a context-stuffed chatbot —
   it must call tools (`search_exercises`, `get_exercise_detail`) that query
   the real database, never invent or recall exercise facts from memory.
2. Exercises are a knowledge graph, not a flat table — physical qualities,
   muscles, equipment, and progressions/regressions/alternatives are
   first-class entities/relationships, not string fields on an Exercise row.

**CONFIRMED in code**: both rules are implemented as described. See
`apps/api/src/ai/tools.ts` (the two tools, querying Prisma directly),
`apps/api/src/ai/chat.ts` (system prompt explicitly forbidding invented
facts), and `apps/api/prisma/schema.prisma` (the graph structure).

## 2. Intended UX and navigation flow

**UNRESOLVED DECISION** — the two documented sources disagree with each
other, and the implementation matches neither exactly:

- The `padel-coach-data-model.md` artifact proposes mirroring a reference
  gym-management app's hierarchy: `Profile → Entrenamientos → Program →
  Session → Block → Exercise → Exercise detail`, with **Block as its own
  navigable screen**.
- `CLAUDE.md` states a simpler hierarchy: `Programs → Sessions → Blocks →
  Exercises → Exercise detail`, plus a Coach tab that is a peer, not a leaf.
- **CONFIRMED in code**: 4 bottom tabs (Inicio, Coach, Programas, Perfil —
  `apps/mobile/src/app/(tabs)/_layout.tsx`), matching CLAUDE.md's "Coach as
  a peer tab." But there is **no separate Block screen** — blocks render
  inline inside `apps/mobile/src/app/session/[id].tsx` as grouped cards, not
  as a tappable navigation node. So the built nav is flatter than either
  document describes.

This has not been resolved by anyone — a future session should ask the user
which hierarchy is now intended, rather than assuming the code is "the
decision."

## 3. Current architecture and technology stack

**CONFIRMED**, matches `CLAUDE.md`:

- npm workspaces monorepo: `apps/api`, `apps/mobile`, `packages/shared`
  (`package.json` at repo root).
- **API**: Fastify 5 + TypeScript. Prisma 7 with `@prisma/adapter-pg` driver
  adapter (`apps/api/src/db.ts`); generated client at
  `apps/api/src/generated/prisma` (gitignored). `apps/api/src/index.ts`
  registers open CORS (`origin: true`), `GET /health`, program routes, chat
  routes.
- **AI**: `@anthropic-ai/sdk` `^0.115.0`. Manual tool-use loop (not the beta
  tool-runner) in `apps/api/src/ai/chat.ts`. Model hardcoded to
  `claude-opus-5`. Max 5 tool-loop iterations. `max_tokens: 1024`.
- **Mobile**: Expo SDK 57 (`~57.0.8`), Expo Router with the stable
  `expo-router/tabs` navigator, React 19.2.3 / React Native 0.86.0,
  `react-native-reanimated` 4.5.
- **Shared types**: `@app-workout/shared` (`packages/shared/src/types.ts`) —
  pure type exports, no runtime code, no Prisma import.
- **CONFIRMED anomaly**: `zod` is declared in `apps/api/package.json` but is
  not imported or used anywhere in the codebase inspected. No runtime
  request validation exists; route bodies/params are typed via TypeScript
  generics only (see `apps/api/src/routes/programs.ts`,
  `apps/api/src/routes/chat.ts`).

## 4. Complete data model and relationships

**CONFIRMED** — matches `apps/api/prisma/schema.prisma` and the applied
migration `apps/api/prisma/migrations/20260725094323_init/migration.sql`
exactly:

```
Sport ──< Program ──< Session ──< Block ──< BlockExercise >── Exercise
                                                                  │
                    ┌───────────────┬───────────────┬────────────┴──────────┬───────────────┐
              PhysicalQuality    Muscle          Equipment            ExerciseLink       SportTransfer
              (join w/emphasis) (join w/emphasis) (join w/required)  (self-referential   (per-sport
                                                                       graph: progression/  evidenced
                                                                       regression/          claim)
                                                                       variation/
                                                                       alternative)
```

- `Sport` — first-class entity; one row today ("Padel"), designed to
  generalize.
- `Program` — `name`, `startDate`/`endDate`, `coachNote` (free-text
  placeholder), belongs to a `Sport`. **No owner/athlete/coach relation
  field.**
- `Session` — a training day; `role` enum (`warmup` | `main` | `recovery`)
  captures the shared "Mov Prep" pattern without duplicating it per day;
  unique on `(programId, order)`.
- `Block` — group of exercises; `blockType` enum (`straight` | `superset` |
  `circuit` | `contrast_pair`); `rounds`; `purpose` (coach's stated intent
  for this specific grouping).
- `BlockExercise` — the prescription join: `prescriptionType` enum (`reps` |
  `reps_per_side` | `distance` | `time`), `sets`, `repsOrDuration` (string),
  `load`/`tempo`/`rest` (all nullable — **none populated by seed data**),
  `instanceNote`.
- `Exercise` — the canonical knowledge object: `name` (unique), `aliases[]`,
  `objective`, `description` (nullable — **field exists in schema but is
  never populated by `seed.ts` and never read by `mappers.ts` or the shared
  `ExerciseDetail` type** — effectively dead in the current build),
  `movementComplexity`, `contraindications`, `coachingCues`,
  `evidenceRating` enum, `videoUrl`/`thumbnailUrl` (both unmodeled/unpopulated,
  per `CLAUDE.md`).
- `PhysicalQuality`, `Muscle` (with `muscleGroup`), `Equipment` — reference
  taxonomies, joined via `emphasis` (primary|secondary) or `required` (bool,
  equipment only).
- `ExerciseLink` — directed edge, unique on `(from, to, relationshipType)`,
  carries a `rationale`.
- `SportTransfer` — `description` + its own `evidenceRating`, unique per
  `(exercise, sport)`.

## 5. AI coach architecture and grounding rules

**CONFIRMED**: `POST /chat` (`apps/api/src/routes/chat.ts`) checks for
`ANTHROPIC_API_KEY`; if absent, returns a fixed "not configured" assistant
message — graceful degradation, logically verified but never exercised
against a live model. If present, delegates to `runChat`
(`apps/api/src/ai/chat.ts`):

- System prompt (Spanish) instructs the model to: never invent exercise
  facts, ground every exercise claim via the tools, use `get_exercise_detail`'s
  pre-linked progressions/regressions/alternatives rather than inventing
  substitutes, state explicitly when evidence is limited/conflicting, adapt
  depth to user level, stay concise.
- Tool-use loop: up to 5 iterations. `search_exercises` filters by physical
  quality / muscle / equipment-available (equipment filter excludes any
  exercise requiring equipment *not* in the caller's available list).
  `get_exercise_detail` returns the full knowledge object including links
  and sport transfers.
- `citedExerciseIds` is accumulated server-side and returned in
  `ChatResponse` (`packages/shared/src/types.ts`), but **CONFIRMED: no
  mobile UI consumes it** — `apps/mobile/src/app/(tabs)/coach.tsx` renders
  only `message.content`.
- **CONFIRMED, per `CLAUDE.md`**: the live model loop has never been
  verified end-to-end — no `ANTHROPIC_API_KEY` was available when this was
  built.

**DOCUMENTED BUT NOT IMPLEMENTED**: the "Vista previa de diseño" mockup
artifact shows a Coach chat bubble with a tappable citation ("Ver ficha
completa del ejercicio →") linking to the cited exercise's detail screen.
The mockup explicitly labels this conversation as illustrative, not a
captured live response.

## 6. Every currently implemented screen/feature

**CONFIRMED**, all under `apps/mobile/src/app/`:

| Screen | File | What it does |
|---|---|---|
| Home | `(tabs)/index.tsx` | Fetches programs, shows current (first) program as a card, CTA to Coach tab, loading/error/empty states |
| Coach | `(tabs)/coach.tsx` | Chat UI: message list, text input, sends full history each turn, generic error bubble on failure, empty-state suggested prompts |
| Programs | `(tabs)/programs.tsx` | Flat list of all programs with sport/day-count/date range |
| Profile | `(tabs)/profile.tsx` | Static stub text only — no functionality |
| Program detail | `program/[id].tsx` | Lists sessions in order, role label shown only if not "main", block/exercise counts |
| Session detail | `session/[id].tsx` | Blocks rendered inline (order, rounds, purpose italicized), exercise rows with formatted prescription + instance notes, tap → exercise detail |
| Exercise detail | `exercise/[id].tsx` | Objective, physical-quality/muscle/equipment chips, coaching cues, contraindications (warning box), evidence rating, sport transfers, linked variations (recursive tap-through) |

Supporting: `constants/theme.ts` + `hooks/use-theme.ts` (light/dark
palettes), `components/themed-text.tsx` / `themed-view.tsx`, `lib/format.ts`
(prescription/evidence label formatting), `lib/api.ts` (sole fetch client,
no caching or retry).

**API surface, CONFIRMED**: `GET /health`, `GET /programs`, `GET
/programs/:id`, `GET /sessions/:id`, `GET /exercises/:id`, `POST /chat`. No
write endpoints exist for any entity — all content is seed-only.

## 7. Implemented vs. only documented/planned

| Implemented in code | Documented only |
|---|---|
| Full schema, one migration, seed for "julio y el resto" | `Profile → Entrenamientos → Program → Session → Block → Exercise` nav (artifact) |
| Two AI tools + tool-use loop + graceful no-key fallback | Live-verified AI responses |
| 4-tab app + 3-level drill-down stack | A separate Block-level screen |
| REST read endpoints for programs/sessions/exercises | Any write/authoring endpoint or admin UI (Prisma Studio is the only tool) |
| `citedExerciseIds` returned by chat API | Mobile UI surfacing those citations |
| `Program.coachNote` (free-text placeholder) | `Program.coach_id` / `athlete_id` as real relations (artifact's ER diagram) |
| `Exercise.movementComplexity` field | The full "three separate axes" (intrinsic difficulty / athlete level / load) — only one of three is modeled |
| Generic Expo template icon/branding (`app.json`) | The dark-canvas/teal visual identity in the mockup artifact |

## 8. Key architectural/product decisions already made

**CONFIRMED, all explicit in `CLAUDE.md` and/or schema comments**:

- Sport-agnostic data model, padel-specific product surface for v1.
- Prescription lives on `BlockExercise`, never on `Exercise` — one canonical
  exercise record, referenced (not copied) by every program that uses it.
- `SportTransfer` is its own evidenced claim per `(exercise, sport)`, not a
  field on `Exercise`.
- `prescriptionType` is an explicit enum, not a loose string — driven by
  real screenshot data showing at least three incompatible shapes ("8", "12
  y 12", "25 pasos por lado").
- `aliases[]` on `Exercise` exists specifically to absorb coach shorthand /
  typos ("desdbug", "lndmine") without forking duplicate records.
- No auth/athlete/coach identity modeling yet — explicit deferral, not an
  oversight; `coachNote` is a stated stopgap, not a design. `CLAUDE.md`
  explicitly warns against bolting on a quick `userId` field without
  designing the athlete/coach model properly.
- Manual (non-beta-runner) tool-use loop chosen deliberately to keep AI loop
  behavior fully explicit while the core pattern is validated.
- Seed data is transcribed only from reviewed screenshots; guessing is
  explicitly forbidden — `CLAUDE.md` notes a prior guessing incident in this
  project's history that had to be corrected.

## 9. Unfinished, placeholder, mocked, or unverified functionality

**CONFIRMED**:

- Seed data gaps — see Section 10 below.
- `Exercise.description`, `BlockExercise.load`/`tempo`/`rest`,
  `videoUrl`/`thumbnailUrl` — schema fields with no seed data (and, for
  `description`, no read path either).
- Coach chat has no persistence — `useState` only, resets on
  navigation/unmount.
- `citedExerciseIds` computed server-side, unused client-side.
- `zod` installed, never used for validation.
- Mobile branding is the raw Expo template default (`app.json` name
  "mobile", default icon/splash colors, leftover `react-logo`/
  `tutorial-web.png` template assets) — does not match the design-preview
  artifact's visual identity.
- Profile tab is a static placeholder with no functionality.
- AI tool-use loop has never been run against a live Anthropic API key.
- No automated tests exist anywhere in the repo (no test runner configured
  in either `package.json`).

## 10. Known seed-data gaps

**CONFIRMED**, stated at the top of `apps/api/prisma/seed.ts` and echoed in
`CLAUDE.md`:

- Dia 1, Bloque 1 — not seeded (no screenshot seen).
- Dia 1, Bloque 2 — only its 2nd exercise seeded (1st exercise's name was
  cut off in the source screenshot; only "12 y 12" was visible).
- Dia 2, Bloque 1 — not seeded (no screenshot seen).
- Dia 2, Bloque 2 — only its 2nd exercise seeded (1st exercise's name cut
  off; only "5" was visible).
- Dia 4, Bloque 1 — not seeded (no screenshot seen).
- Mov Prep — session exists with zero blocks; its 3 exercises were never
  shown in a screenshot, only the count.
- Dia 3 is the only day fully confirmed, across two overlapping screenshots.

`seed.ts` states these should be filled in only from real screenshots, never
from a plausible-sounding guess.

## 11. Contradictions between artifacts, CLAUDE.md, and the implementation

**RESOLVED 2026-09-20 by explicit user decision** — see Section 13 for the
actual decisions made. Kept below, unedited, as the historical record of
what was ambiguous and why; do not re-litigate these, but do not delete this
record either.

1. **Navigation hierarchy** — see Section 2. Artifact proposes a Block
   screen and a Profile-gated entry; `CLAUDE.md` proposes a simpler
   4-tab-plus-drilldown; the code matches neither exactly (no Block screen
   at all). → **Resolved**: target UX is the screenshot flow (`Profile →
   Training → Program → Day/Session → inline Blocks → Exercise detail`), no
   separate Block screen, ever. Interim scaffolding (current tabs) is
   acceptable while building, but is not the final target.
2. **Program ownership** — the `padel-coach-data-model.md` artifact's ER
   diagram lists `coach_id`/`athlete_id` directly on `PROGRAM`. The actual
   schema has neither field — only `coachNote` — and `CLAUDE.md` frames the
   absence of any owner model as a deliberate, not-yet-designed decision.
   The artifact predates that explicit deferral. → **Resolved**: single
   coach, multiple athletes, each with a real account; a `Profile` table
   plus `Program.athleteId`/`coachId`/`status` are now in scope (see
   Section 13).
3. **Difficulty as "three axes"** — the artifact argues for three separate
   axes (intrinsic movement complexity, athlete level, prescribed load).
   Only `movementComplexity` is modeled anywhere; "athlete level" has no
   representation in schema or shared types. → **Resolved**: `athleteLevel`
   will exist as a simple, unstructured profile field only; no adaptive
   logic in V1.
4. **Coach chat citations** — the mockup shows tappable in-chat citations;
   the API supports it (`citedExerciseIds`); the real Coach screen doesn't
   use it. → **Resolved**: explicitly deferred past this V1 milestone.
5. **Visual identity** — the mockup artifact specifies a dark-canvas/teal
   design system; the actual Expo app is still on unbranded template
   defaults. → **Resolved**: explicitly deferred past this V1 milestone.

Nothing else in the codebase contradicts `CLAUDE.md` — the seed-data gaps,
the AI-loop verification status, and the scope cuts it describes all check
out exactly against what's in the repository.

## 12. Likely next steps

**INFERRED NEXT STEP** — not a stated plan anywhere, offered as a reasonable
reading of the gaps above; a future session should confirm with the user
before acting on any of these:

1. Fill the seed gaps (Section 10) from the remaining unreviewed
   screenshots — only from real screenshots, per `CLAUDE.md` and `seed.ts`.
2. Verify the live AI tool-use loop end-to-end with a real
   `ANTHROPIC_API_KEY`.
3. Wire `citedExerciseIds` into the Coach UI (the mockup already shows the
   intended interaction).
4. Design the athlete/coach identity model properly before scoping Programs
   to a specific athlete — explicitly flagged in `CLAUDE.md` as needing real
   design work, not a quick field.
5. Populate `load`/`tempo`/`rest` and video assets once that data exists.
6. Resolve the navigation-hierarchy contradiction (item 1 above) with an
   explicit decision rather than further silent drift.

## 13. V1 scope decisions and Milestone 1 (in progress)

**CONFIRMED (user decisions, dated 2026-09-20)** — this section is a living
record of what was decided and how far implementation has actually gotten.
Update it as each milestone below progresses; do not let it drift out of
sync with the code the way Section 11's contradictions were allowed to.

### V1 product decisions

- **Coach/admin surface**: a **separate web-based admin app** (new package,
  not yet created), used only by the coach. The Expo mobile app stays
  athlete-only and focused on consuming/following programs. Prisma Studio
  is not the product UI — it may still be used as a raw inspection tool
  during development.
- **Authentication**: **Supabase Auth**, not custom JWT/bcrypt. Supabase
  owns identity (`auth.users`, password hashing, reset, sessions/refresh
  tokens). The two are
  linked by a new `Profile` table in the app's own database, keyed by the
  Supabase user's UUID, holding app-specific fields (`role`, `name`,
  `athleteLevel`). The Fastify API verifies Supabase-issued JWTs (via the
  project's JWKS endpoint — no shared secret needed for verification on
  currently-created Supabase projects). No self-registration: athlete
  accounts are created by the coach, with a temporary password shared
  out-of-band. The Supabase `service_role` key (needed later for
  server-side account creation) must never be pasted into chat, committed,
  or placed anywhere except a server-side environment variable.
- **Athlete/program relationship**: an athlete can have multiple programs
  over time (history preserved, never deleted/overwritten), but normally
  exactly one **active** program at a time. This means `Program` needs a
  `status` field (e.g. `draft` | `active` | `archived`), not just an
  `athleteId` — assigning a new active program archives the athlete's
  previous active one rather than replacing it. The athlete-facing app
  prioritizes/shows the active program.
- **Navigation target**: the screenshot flow (`Profile → Training → Program
  → Day/Session → inline Blocks → Exercise detail`) is the actual V1 target
  UX, not the current scaffold's tab layout. Keeping the current tabs
  temporarily during development is acceptable if it measurably reduces
  throwaway work, but should not be mistaken for the final decision.
- **AI coach**: untouched and deprioritized for this entire milestone,
  exactly as before.

### Cloud-first hosting pivot (superseded a section-13 decision above, 2026-09-20)

**CONFIRMED, user decision.** The real hardware situation is iPhone + iPad
only (a 2013 MacBook exists but is explicitly excluded as unreliable). This
rules out the originally-assumed workflow of running the API/Postgres on a
local machine on the same Wi-Fi as the phone for device testing. It was also
discovered that the coding sandbox used to develop this project cannot be
reached by a physical device under any circumstances (no inbound
reachability, and tunneling tools are protocol-blocked by its egress proxy
regardless of any host-allowlist change) — see the M1 implementation log
below for how this was confirmed. Consequence, revising the plain-auth
decision above:

- **Supabase's Postgres now hosts the application's own tables too**, not
  just `auth.*`. This is a hosting-location choice, not an architecture
  change: Prisma remains the ORM, `schema.prisma` is unchanged, and Prisma
  only ever manages the `public` schema — it never touches Supabase's own
  `auth` schema. `DATABASE_URL` simply points at Supabase's Postgres
  connection string instead of a self-hosted instance.
- **The Fastify API is deployed to a real hosting provider** (Render, via
  `render.yaml` at the repo root — a "Blueprint" so the service config lives
  in the repo, not hand-clicked in a dashboard) rather than run locally or
  inside the dev sandbox. Secrets (`DATABASE_URL`, `SUPABASE_URL`,
  `ANTHROPIC_API_KEY`) are entered directly into Render's own dashboard
  (`sync: false` in the blueprint) — never committed, never pasted into
  chat.
- **The mobile app is distributed via Expo/EAS Update, opened through the
  existing Expo Go app** — no locally-run Metro dev server. This requires
  every dependency to stay within what Expo Go's fixed client bundles
  natively; a session-storage approach that needed extra native modules
  (`expo-secure-store` + a manual AES layer) was replaced with plain
  `@react-native-async-storage/async-storage`, which Expo Go supports
  natively, specifically to avoid that risk (see the implementation log).
- This whole pivot exists **only** because of the confirmed hardware/sandbox
  constraint — it is not a general recommendation against local dev, and
  should not be assumed to extend to any future contributor who does have a
  normal dev machine.

### Milestone boundaries (do not blur these)

- **M1 — DONE, confirmed 2026-09-21.** Supabase project + JWT verification
  in Fastify + `Profile` table + Expo login screen + auth-gated root
  layout. Success criterion (log in as a real test athlete and reach the
  app) confirmed on **both** targets: the native app via Expo Go on the
  user's iPhone, and the free web deployment
  (`https://app-workout-web.onrender.com`) in Safari — both show the real
  seeded "julio y el resto" program after logging in with the test
  athlete's credentials. Existing read endpoints (`/programs`, etc.) are
  still **not** locked down or athlete-scoped — that is explicitly M2's
  job, along with `Program.athleteId`/`status`. Do not start M2 without
  the user's explicit go-ahead (per their instruction this milestone).
- **M2 — DONE, confirmed 2026-09-21.** Schema, coach-facing API, and the
  actual cutover (mobile app now calls athlete-scoped `GET /me/programs`;
  the old public `GET /programs` is deleted) are all live. See the M2
  implementation log near the end of this file for the full story,
  including a real bug it surfaced: M1's auth path was never actually
  exercised by real app usage, only by manual testing (fixed as part of
  this milestone).
- **M3 — DONE, confirmed 2026-09-21.** Exercise-library write API (see the
  M3 implementation log near the end of this file). No UI consumes it yet
  -- that's M5 (the admin web app).
- **M4 — DONE, confirmed 2026-09-21.** Program-builder write API (see the
  M4 implementation log near the end of this file). No UI consumes it yet
  -- that's M5.
- **M5 — DONE, confirmed live 2026-09-21.** The coach admin web app
  (`apps/admin`) covers the core workflows: manage athletes/assignment,
  build programs, manage the exercise library. Deployed at
  `https://app-workout-admin.onrender.com` and confirmed working with a
  real coach login (`atleta1@test.com`) -- not just a headless-browser
  check. See the M5 implementation log near the end of this file for what
  was built, a real aliases-data-loss bug this pass found and fixed, and
  the one deploy-ordering issue hit along the way (blank screen on first
  load, fixed by rebuilding after env vars were in place -- not a code
  bug).
- **M6 — started, not complete.** First small piece done: the mobile
  exercise detail screen now shows a "Ver video" button when
  `exercise.videoUrl` is set (see the M6 log below). This was premature
  before M5 existed (nothing could set a video URL), but the admin app's
  exercise editor now has a "URL de video" field, so the two connect.
  Full nav polish (the screenshot-flow navigation target from the V1
  decisions) is still not done.
- M7 as previously scoped (polish) — unchanged by this decision round,
  see the implementation-plan discussion in this conversation for
  details; not yet transcribed here in full.

### M1 implementation log

**2026-09-20** — Supabase project created (`app-workout`, Asia-Pacific /
Tokyo region, "Confirm email" disabled for the dev/test phase). Implemented:

- `Profile` model added to `schema.prisma` (`id` = Supabase user UUID,
  `email`, `name`, `role` enum, `athleteLevel`), migration
  `20260920102139_add_profile` generated and applied against the local
  Postgres instance.
- `apps/api/src/auth.ts`: verifies a bearer token against Supabase's public
  JWKS (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`) via `jose`, then
  auto-provisions a `Profile` row (default role `athlete`) on first sight of
  a given Supabase user id. No secret key involved — verification only needs
  `SUPABASE_URL`.
- `GET /me` (`apps/api/src/routes/me.ts`): the first protected route, exists
  to prove the verification path end-to-end. Nothing else is locked down
  yet — `/programs` etc. remain open, as scoped for M1.
- Mobile: `src/lib/supabase.ts` (Supabase client; storage adapter history:
  first built with a `LargeSecureStore`/AES pattern, then replaced — see the
  2026-09-20 (cont.) entry below — with plain `AsyncStorage` once the
  Expo-Go-only distribution constraint became clear). `src/app/login.tsx`
  (email/password form calling `supabase.auth.signInWithPassword`).
  `src/app/_layout.tsx` now checks for a session on launch and conditionally
  renders either the login screen or the existing tab navigator — no new
  navigation library or API, just conditional `Stack.Screen` children.
  `lib/api.ts` now attaches the current Supabase access token as a bearer
  header to every API call (harmless no-op today since no route requires it
  yet). A "Cerrar sesion" button was added to the Profile tab so the login
  gate can actually be exercised without reinstalling the app.
- **Verified so far**: both workspaces typecheck clean. Locally: `/health`
  returns 200, `/me` correctly returns 401 with no token and with a garbage
  token (does not crash), `/programs` still works unauthenticated exactly as
  before.
- **Not yet verified — blocked, not skipped**: this coding sandbox's
  outbound network policy denies (403, confirmed via repeated attempts, not
  transient) connections to `supabase.co`, `docs.expo.dev`, `api.expo.dev`,
  and `reactnative.directory`. This means the `/me` happy path (a real
  Supabase-issued token verifying successfully) has not been exercised from
  inside this sandbox, and the test athlete account had to be created
  through the Supabase dashboard UI (by the user, in their own browser)
  rather than scripted from here. It also means this sandbox cannot expose
  its API to the internet via a tunnel for phone testing (ngrok/cloudflared
  are explicitly unsupported by this proxy, independent of any host
  allowlist) — reaching the API from a physical iPhone will need the API
  running on a machine on the same network as the phone, not this sandbox.
  This is a property of this specific coding environment's configured
  network policy, not of Supabase, the code, or wherever the app is
  eventually run for real.

**2026-09-20 (cont.)** — user confirmed the test athlete account was created
via the Supabase dashboard. Real hardware situation clarified (iPhone + iPad
only; a 2013 MacBook is explicitly excluded as unreliable), which combined
with the sandbox networking findings above to rule out any local-machine or
in-sandbox path to physical-device testing entirely. Further confirmed: this
sandbox also cannot reach `expo.dev`, `api.expo.dev`, `loca.lt`, or
`trycloudflare.com` (same firm 403 policy denial) — ruling out every tunnel
option, not just ngrok. User chose the cloud-first pivot recorded above.
Implemented as a result:

- `render.yaml` added at the repo root (Render "Blueprint" for the API —
  see the pivot section above for why secrets are `sync: false`).
- `apps/api/package.json`: added `db:migrate:deploy` (`prisma migrate
  deploy` — the non-interactive, production-safe command, as opposed to
  `db:migrate`'s `migrate dev`) and a `postinstall` hook running `prisma
  generate` (the generated client is gitignored and must exist before
  `tsc` can build, in any environment).
- Mobile storage adapter simplified from `LargeSecureStore` (SecureStore +
  manual AES via `aes-js` + `react-native-get-random-values`) to plain
  `AsyncStorage`, and the now-unused packages removed. Reason: distribution
  is now via Expo Go (no custom dev client — see the pivot section), whose
  native module set is fixed and curated; `react-native-get-random-values`
  is not a standard Expo SDK package and its presence in Expo Go could not
  be confirmed from this sandbox (network-blocked from checking), so it was
  removed as an avoidable risk rather than shipped unverified. Plain
  AsyncStorage session storage is a widely-used, well-documented baseline
  for Supabase + Expo Go and is the right tradeoff until the app moves to a
  custom EAS dev client, at which point SecureStore-backed storage is worth
  revisiting.
- Verified locally end-to-end, simulating exactly what Render will run:
  `npm install && npm run build --workspace=apps/api` succeeds, the compiled
  output actually lands at `apps/api/dist/src/index.js` (not
  `apps/api/dist/index.js` — `tsconfig.json` has no explicit `rootDir`, so
  `render.yaml`'s start command was corrected to match), `npm run
  db:migrate:deploy --workspace=apps/api` applies cleanly against a real
  Postgres, and the compiled server, given real env vars the way Render
  would inject them, correctly serves `/health` and `/programs` and
  correctly 401s `/me`.
- **Still pending**: the user has not yet created a Render account / deployed
  the blueprint, so the API has no real public URL yet. The Expo/EAS Update
  side (how the mobile bundle actually reaches the phone via Expo Go without
  a local Metro server) is designed but not yet implemented — next concrete
  step in this milestone.

**2026-09-20 (cont. 2) — API deployed and confirmed live.** User created the
Render account, connected GitHub, and deployed the `render.yaml` blueprint.
Two real-world snags on the way, both resolved and worth remembering:

- First deploy attempt used the wrong branch by default (Render pre-filled
  `claude/padel-coaching-ai-vision-eqhodv`, which has no `render.yaml` — only
  `claude/padel-coaching-review-nqm583` does). Corrected in Render's UI.
- First two `prisma migrate deploy` attempts failed with `P1000:
  Authentication failed`. Root cause both times was literal `[` `]`
  characters left around the password when substituting it into the
  connection string copied from Supabase's "Connect → ORM → Prisma" panel
  (the brackets are a placeholder marker in Supabase's own snippet, not
  syntax to keep) — not a real credentials problem, not a special-character
  encoding problem. Fixed by re-entering the value without the brackets.
- The connection string in use is Supabase's **session-mode pooler**
  (`aws-0-ap-northeast-1.pooler.supabase.com:5432`, username
  `postgres.edljvcpkkygdnsfrpnmm`) as the single `DATABASE_URL`, deliberately
  *not* the transaction-mode pooler (port 6543, `?pgbouncer=true`) — the
  transaction-mode pooler doesn't reliably support the session-level
  features (advisory locks, prepared statements) `prisma migrate deploy`
  needs. Using one URL for both migration and runtime queries was a
  deliberate simplification over Prisma's usual `DATABASE_URL`/`DIRECT_URL`
  split, to avoid depending on unverified Prisma 7 config-file behavior
  around `directUrl` (couldn't check current docs from this sandbox).
- `render.yaml`'s `startCommand` now also runs `db:seed` on every boot
  (`prisma migrate deploy && prisma db seed && node ...`) — safe because
  `seed.ts` only ever upserts, so the deployed database always has the demo
  program without a separate manual step.
- **Confirmed live**: `https://app-workout-api.onrender.com/health` returns
  `{"status":"ok"}` and `/programs` returns the real seeded "julio y el
  resto" program, served from the real Supabase Postgres instance, reachable
  from the open internet (tested from Safari on the user's iPad, not from
  the dev sandbox, which still cannot reach it or Supabase directly).
- **Not yet done**: the mobile app has not been pointed at this URL yet
  (`EXPO_PUBLIC_API_URL` still needs updating from `localhost`), and nothing
  has been published via EAS Update yet — the phone has not run the app at
  all so far in this milestone. That's the next concrete step.

**2026-09-20 (cont. 3) — EAS Update wired up.** User created a free Expo
account (personal, GitHub sign-in) and a project via the Expo dashboard
(`app-workout`, project id `596c5d72-c23b-4e9c-8763-3dcb759183c3` — not
secret, safe to reference). Implemented:

- `apps/mobile/app.json`: renamed from the generic template identity
  (`name`/`slug`: "mobile") to `"App Workout"` / `"app-workout"`; added
  `extra.eas.projectId`, `updates.url` (`https://u.expo.dev/<projectId>`),
  and `runtimeVersion: { policy: "sdkVersion" }` — the last one specifically
  matters because it's what makes a published update loadable by plain Expo
  Go (ties the update's runtime to the Expo SDK version, exactly what Expo
  Go itself reports) rather than requiring a custom EAS dev client.
- Added the `expo-updates` package (`~57.0.23`, matching SDK 57) — required
  at runtime for the app to know how to fetch/apply published updates at
  all.
- `.github/workflows/eas-update.yml`: runs `eas update` on every push
  touching `apps/mobile/**` or `packages/shared/**`, using a GitHub Actions
  secret `EXPO_TOKEN` for auth. This runs on GitHub's own runners
  specifically because the dev sandbox cannot reach `expo.dev`/`api.expo.dev`
  at all (confirmed earlier this milestone) — GitHub Actions has normal
  internet access, sidestepping that restriction entirely. The workflow also
  sets `EXPO_PUBLIC_API_URL` to the real Render URL and the Supabase
  URL/publishable key as plain (non-secret) env vars, since Expo bakes
  `EXPO_PUBLIC_*` values into the JS bundle at publish time — the phone
  never reads a `.env` file, so these must be set where the bundle is built.
- **Not yet done**: the `EXPO_TOKEN` GitHub secret hasn't been created yet,
  so the workflow hasn't actually run. Once it's added, a push (or the
  `workflow_dispatch` manual trigger) publishes to the `main` EAS Update
  branch, and the Expo dashboard's "Updates" page for the project should
  offer a QR code that Expo Go can scan directly.

**2026-09-20 (cont. 4) — real-device testing, two more real bugs found and
fixed.** `EXPO_TOKEN` created (an Expo "robot user" with the Developer
role, not a personal access token -- Expo's current recommended pattern for
CI) and added as a GitHub secret. First publish succeeded, but scanning the
QR failed with `403: ... requires authentication` -- the Expo project is
private to the `javitortajada13s-team` account, so Expo Go itself needs the
user logged into the same Expo account before it can open it (unrelated to
Supabase auth; this is Expo's own access control on the private project).
Resolved via a password reset on the Expo account (it was created via
GitHub OAuth, which Expo Go's mobile login screen doesn't offer a direct
button for -- only email/password or SSO).

Once past that, two real app bugs surfaced from actual device testing,
neither visible from typechecking or this sandbox's local checks:

1. **Silent infinite hang**: `apps/mobile/src/app/_layout.tsx` called
   `supabase.auth.getSession().then(...)` with no `.catch()`. Any rejection
   left `session` at `undefined` forever, showing the loading spinner with
   no error, indistinguishable from a slow network. Fixed by falling
   through to the login screen on failure.
2. **AsyncStorage's native module is not present in Expo Go**: real error
   `"Native module is null, cannot access legacy storage"`. The original
   guess was a version mismatch (Expo Go 57 vs. the installed `^3.1.1`,
   a very recent major likely aimed at SDK 58) -- downgrading to `2.2.0`
   made no difference, proving the real cause: Expo Go's fixed native
   module set simply does not include
   `@react-native-async-storage/async-storage` at all, regardless of JS
   version, because it is a third-party community package, not part of the
   Expo SDK. **This directly contradicts the earlier assumption (recorded
   above) that AsyncStorage was the "safe" choice and SecureStore was the
   risk** -- it was backwards: `expo-secure-store` is first-party Expo and
   always bundled in Expo Go; AsyncStorage is not. Switched the Supabase
   storage adapter to `expo-secure-store` directly (no AsyncStorage, no AES
   wrapper). SecureStore's ~2KB per-item limit remains a known open risk for
   large sessions -- accepted for now since it would fail loudly (a thrown
   error) rather than silently; revisit with a proper encrypted-large-value
   pattern once/if the app moves to a custom EAS dev client where community
   native modules are actually available.

Separately, the GitHub Actions workflow itself broke twice on unrelated
mechanics, both fixed in `.github/workflows/eas-update.yml`:
- `workflow_dispatch`'s "Run workflow" button doesn't appear for a workflow
  that only exists on a feature branch (GitHub only reads dispatch triggers
  from the default branch) -- worked around by triggering via a real push
  instead each time.
- `--message "${{ github.event.head_commit.message }}"` broke when a commit
  message (one of these fixes' own message) contained a literal `"` --
  the embedded quote closed the shell argument early, and the rest of the
  message was parsed as stray unquoted arguments. Fixed by routing the
  message through an intermediate `env:` variable instead of interpolating
  directly into the `run:` script -- also the pattern GitHub's own security
  docs recommend generally, not just for this breakage.

**Lesson worth generalizing**: this sandbox's inability to reach
`api.expo.dev`/`reactnative.directory` (see earlier in this section) meant
every native-module compatibility question in this milestone had to be
answered empirically on the real device rather than checked against Expo's
compatibility data up front. Two of three storage-related guesses made
under that constraint were wrong. Future dependency choices for Expo-Go
distribution should be treated as unverified until confirmed on-device,
not assumed safe by category ("first-party-sounding" is not the same as
first-party).

**2026-09-20 (cont. 5) — a third real-device bug, then the login screen
rendered correctly.** After the SecureStore fix, `/programs` loaded real
seeded data from the live API successfully -- but the app landed straight
on the (tabs) home screen without ever showing login, and tapping "Cerrar
sesion" visibly did nothing. Root cause: conditionally rendering *which*
`Stack.Screen` children exist based on `session` (the pattern used since
M1's first commit) updates React state correctly, but expo-router's
underlying native-stack navigator does not reliably reconcile a full
swap of the screen set (four screens down to one) -- it can leave
whatever was already on screen displayed regardless of the state change.
Replaced with `Stack.Protected` (expo-router's current, purpose-built API
for exactly this auth-gating transition) in `_layout.tsx`. Confirmed on a
real device: the login screen now renders correctly on first launch.
Login itself (real test-athlete credentials through to seeing the app)
has not yet been exercised -- that's the very last step before declaring
M1's success criterion met.

Also surfaced along the way, unrelated to the auth-gating bug: Expo's
per-project "Preview" QR code can be **generated once and then serve
stale content** across later publishes if the same browser tab isn't
refreshed and "Preview" re-clicked -- several rounds of "same error after
a fix that should have changed it" traced back to this, not to the fixes
themselves. Regenerate the QR (reload the branch page, click Preview
again) after every new publish rather than reusing an old one.

**Distribution decision now pending, raised by the user, not yet
resolved**: the intended real-world test user is the user's father
specifically (not a generic "first client"), and he has an iPhone. Told
the user plainly: there is no free way to get a standalone, Expo-Go-free
app onto an iPhone that isn't a registered Apple developer's own device --
Apple requires a paid Apple Developer Program membership ($99/year) for
any distribution to another person's iPhone (TestFlight or otherwise). The
only two real options are (a) pay for that program and use EAS Build +
TestFlight for a real app-icon experience, or (b) keep using Expo Go (free)
for the father too, same setup as this session's testing. Free + no Expo
Go is only possible on Android, which does not apply here.

**Resolved, 2026-09-20/21**: a third option was found and is now the
plan -- a genuinely free web deployment, no App Store/Apple Developer
Program/Expo Go dependency at all, no domain purchase needed (Render's
free `*.onrender.com` subdomain is enough). Both the "Personal Team +
Xcode" and AltStore/Sideloadly free-sideloading routes were considered
and rejected: both are real but both inherit Apple's 7-day free
provisioning expiry, requiring periodic re-signing from a Mac -- not
practical given no reliable computer exists for this user (see the
cloud-first pivot above). The web path avoids the whole category of
problem.

Implementation: `apps/mobile/src/lib/supabase.ts`'s storage adapter is
now `Platform.OS === "web" ? localStorage-based : expo-secure-store`.
Testing `npx expo export -p web` first failed with the same class of bug
as the native SecureStore saga (`expo-secure-store` has no web
implementation at all -- confirmed via the actual error,
`getValueWithKeyAsync is not a function` -- not a guess), fixed by the
platform split. A second Render Blueprint service, `app-workout-web`
(`runtime: static`, no spin-down unlike the API's free web-service plan),
was added to `render.yaml` and deployed via the same Blueprint's
"Manual sync" -- **confirmed live and working**: the login screen renders
correctly at `https://app-workout-web.onrender.com`.

Decision going forward: build both targets in parallel rather than
picking one -- they are the same Expo Router codebase (web is just
another platform target, not a fork), so this costs little beyond
occasionally handling a platform-specific quirk like the one just fixed.
Web is the near-term path to get the father (and any early real users)
onto the app with zero cost and zero install friction; the native app
remains the long-term target once there's a reason to invest the
$99/year Apple Developer Program (e.g. real paying clients).

### M2 implementation log

**2026-09-20 (overnight, autonomous)** — user said "Quedate tu trabajando
si quieres, yo me voy a dormir" after M1's success criterion was confirmed
on both targets; this authorized continuing into M2 for the night, with
the standing rule still in force that anything needing the user's own
account/decision must stop and be flagged rather than guessed at.

Built and verified locally (typecheck + build both pass; migration applied
and confirmed against the local dev Postgres, not Supabase):

- `Program` gained `status` (`ProgramStatus`: `draft`/`active`/`archived`,
  default `active`), `athleteId` and `coachId` (both nullable `Profile`
  FKs, `@db.Uuid` to match `Profile.id`'s type — the first migration
  attempt failed with a Postgres type-mismatch error because a plain
  `String` FK defaults to `text`; fixed by adding `@db.Uuid` explicitly).
  Migration `20260920190502_add_program_athlete_coach_status`.
  - Migration note: the first `prisma migrate dev` run partially applied
    (enum + columns) before failing on the FK step, which left the local
    dev DB in a drift state that `prisma migrate dev`/`--create-only` both
    refused to touch without a full `prisma migrate reset`. Prisma itself
    detected this reset was being invoked by an AI agent and **blocked it
    outright**, requiring explicit human consent — correctly so, and this
    was respected: instead of resetting (which would have discarded local
    seed data for no real reason), the drift was fixed by hand — matching
    ALTER TABLE / ADD CONSTRAINT statements run directly, a migration.sql
    written to match, and `prisma migrate resolve --applied` used to bring
    Prisma's own migration history back in sync. Confirmed after via
    `prisma migrate status`: "Database schema is up to date!". This was
    all against the local dev Postgres only — Supabase (production) was
    never touched, and `migrate deploy` (what Render actually runs) applies
    the same final `migration.sql` cleanly on a database that never saw the
    failed attempt.
- `apps/api/src/auth.ts`: added `requireCoach`, a second `onRequest` hook
  (403 if `req.user.role !== "coach"`) for coach-only routes.
- `apps/api/src/routes/athletes.ts` (new, coach-only, both routes gated by
  `[authenticate, requireCoach]`):
  - `GET /athletes` — lists athlete profiles with their current active
    program (if any).
  - `POST /athletes/:id/assign-program` — assigns an existing program to
    an athlete. Runs in a transaction: archives that athlete's other
    active program(s) first, then sets the target program's
    `athleteId`/`coachId`/`status: active`. This is the
    "programs are never deleted, just archived when replaced" decision
    from earlier in this file, now actually implemented. Verified correct
    with a throwaway Prisma-level script (not committed): assign program A
    to a test athlete, then program B to the same athlete, confirmed A
    ended up `archived` and B `active`. Could not be verified over real
    HTTP with a real Supabase JWT — this sandbox cannot reach Supabase and
    no token-forging shortcut was used.
  - No `POST /athletes` to *create* an athlete: a `Profile`'s `id` must be
    a real Supabase auth user's uuid (mirrored on first login), so an
    athlete row cannot be manufactured ahead of that person actually
    signing in — creating one with a made-up id would violate that
    invariant for no benefit at this stage.
- `apps/api/src/routes/programs.ts`: added `GET /me/programs`
  (authenticated) — a coach sees every non-archived program, an athlete
  sees only their own `active` program. **`GET /programs` (no path
  prefix) was deliberately left exactly as it was** — public, unscoped,
  still returns every program including the unassigned seeded
  "julio y el resto" one.
- `packages/shared/src/types.ts`: added `ProgramStatus`, `MyProgramSummary`
  (what `/me/programs` returns), `AthleteSummary` (what `/athletes`
  returns).

**Why `/programs` wasn't cut over tonight, and what this means for the
morning**: the seeded "julio y el resto" program — the one the father is
already looking at — has `athleteId = null`. If `/programs` were flipped
to require login and filter by `athleteId`, every athlete (including the
father, mid-way through his first real use of the app) would see an empty
program list until someone explicitly assigns that program to a specific
`Profile`. Doing that assignment blind, from this sandbox, would mean
guessing which of possibly several Supabase-provisioned Profiles is
"the father's account" — a guess this file's own standing rules say not to
make. So the mobile/web apps still call the old public `/programs`
tonight, nothing about what the father already sees has changed, and the
new athlete-scoped machinery (`/me/programs`, `/athletes`,
`assign-program`) is built and tested but not yet wired into any UI.

**Verification note**: this migration was fully validated against the
local dev Postgres (typecheck, build, `prisma migrate status` clean, and
the archive-on-reassign transaction logic tested directly against real
data) and pushed so Render's own `migrate deploy` step picks it up on
deploy, exactly as M1's schema change did. Unlike earlier in this session,
this sandbox's network policy now also blocks `onrender.com` (confirmed
via the proxy's own status endpoint), so — for the first time — the live
API's post-deploy behavior could **not** be directly curled and confirmed
from here the way M1's was. The GitHub Actions side (EAS Update
republish, triggered because this push touched `packages/shared/**`) did
complete successfully. Worth a quick manual check when back online: open
`https://app-workout-api.onrender.com/health` and `/programs` and confirm
both still respond normally (they should — the change is purely additive
and `db:seed` upserts the existing program without touching the new
fields).

**One thing needed from the user, whenever they're back**: decide who the
coach is (log into the app once with the Supabase account meant to be the
coach — it auto-provisions as `role: athlete` on first login same as
anyone else, so its `Profile.role` needs to be flipped to `coach` by hand
in Prisma Studio, since there's still no admin UI to do it from), and
which existing `Profile` is the father's athlete account, so the seeded
program can be assigned to it via the new `assign-program` endpoint. Once
both exist, the mobile/web app's program-list screen can be switched from
`GET /programs` to `GET /me/programs` and `/programs` itself can finally
be locked down — that's the very next, small step, deliberately not taken
tonight.

**2026-09-21 — cutover completed, M2 DONE.** The user was back online and
walked through it live (via Supabase's SQL Editor in the browser, not
Prisma Studio — no local machine needed):

- Promoted `atleta1@test.com` (the only account that existed) to
  `role: coach`.
- **Found and fixed a real bug in the process**: the `Profile` table was
  completely empty in Supabase, even though this same account had already
  "successfully" logged in and seen real program data back in M1. Root
  cause: `GET /programs` never required auth, so the app never made a
  single authenticated request — `authenticate`'s auto-provisioning logic
  (in `auth.ts`) was only ever exercised by manual curl testing against
  `GET /me`, never by real app usage. **M1's own claim that the auth path
  was end-to-end verified on a real device was wrong** — the login screen
  and Supabase session worked, but nothing downstream of that ever
  actually depended on the token being valid. Fixed by adding
  `fetchMe()` (`apps/mobile/src/lib/api.ts`) and calling it once whenever
  a session exists (`apps/mobile/src/app/_layout.tsx`), purely for its
  provisioning side effect. Worth remembering: an M1/M2 "done" claim
  based on what the UI visibly showed, without checking what the backend
  actually recorded, missed this for a full day.
- Created a real Supabase Auth user for the father
  (`javiertortajada10@gmail.com`), confirmed automatically (Supabase's
  dashboard-created users don't need the old "auto confirm" checkbox
  version some docs mention).
- Manually inserted both `Profile` rows via SQL (rather than waiting on
  the app fix above to reach a real device) and assigned the seeded
  program to the father: `athleteId` = his profile, `coachId` =
  `atleta1@test.com`'s profile, `status = 'active'`. Verified with a join
  query: `javiertortajada10@gmail.com | athlete | julio y el resto | active`.
- With a real assignment in place, completed the cutover: `apps/mobile`'s
  home and programs tabs now call `GET /me/programs`
  (`fetchMyPrograms()`) instead of the old public `GET /programs`, which
  has been **deleted** from `apps/api/src/routes/programs.ts` (along with
  the now-dead `loadProgramSummaries` in `mappers.ts`) since nothing
  calls it anymore. Typecheck, build, and a local smoke test all pass:
  `/programs` → 404, `/me/programs` with no token → 401,
  `/programs/:id` still public (see the note below).
- **Not locked down**: `GET /programs/:id`, `GET /sessions/:id`, and
  `GET /exercises/:id` are still public/unscoped — an athlete who knew
  another program's id could still view it. Left alone deliberately:
  scoping these needs walking the Session/Block chain back up to a
  Program's `athleteId`, which is more surface than this pass covers.
  Flagged here, not silently skipped.

**M2 is now DONE**: schema, coach API, and the actual cutover are all
live. Confirmed by the user on real devices with both real accounts,
this time actually through the app itself (not just a curl/SQL check):
logged in as `atleta1@test.com` (coach) and separately as
`javiertortajada10@gmail.com` (the father, athlete role) — both see
"julio y el resto" via the new `GET /me/programs` path. This is the
first M1/M2 verification that closes the gap the auto-provisioning bug
exposed: confirmed through the actual authenticated flow, not just
visible UI.

### M3 implementation log

**2026-09-21** — user said "Quiero que te quedes tú trabajando en esto
todo lo que puedas mientras yo hago otras cosas" (keep working on this as
much as you can while I do other things), authorizing continued
autonomous work past M2. Built the exercise-library write API: coach-only
endpoints so the exercise knowledge graph can grow without a seed-script
edit + migration every time.

- `apps/api/src/routes/taxonomy.ts` (new): `GET`/`POST` for `/muscles`,
  `/equipment`, `/physical-qualities`, `/sports`. Reads are public (just
  reference lookups, needed to populate pickers in a future exercise
  builder); writes are coach-only.
- `apps/api/src/routes/exercise-admin.ts` (new), all coach-only:
  - `POST /exercises`, `PATCH /exercises/:id` — create/update the base
    exercise fields.
  - `DELETE /exercises/:id` — **refuses to delete an exercise that's
    prescribed in any `BlockExercise`** (409 with a count), rather than
    silently cascading it out of a coach's existing programs. They have
    to remove it from those blocks first.
  - `PUT`/`DELETE /exercises/:id/physical-qualities/:qualityId`,
    `.../muscles/:muscleId`, `.../equipment/:equipmentId` — attach/detach
    the exercise's relationships, `PUT` is an upsert (idempotent).
  - `POST /exercises/:id/links`, `DELETE /exercise-links/:id` — the
    progression/regression/variation/alternative graph. Rejects a link
    from an exercise to itself and duplicate
    (from, to, relationshipType) links.
  - `POST /exercises/:id/sport-transfers`, `PATCH`/`DELETE
    /sport-transfers/:id` — sport-transfer claims stay their own
    evidenced record, not a field on Exercise, matching the schema's
    existing design intent.
- `apps/api/src/db.ts`: added `isUniqueConstraintError`/
  `isRecordNotFoundError` helpers (Prisma error codes P2002/P2025) so
  routes return clean 409/404s instead of raw 500s on a duplicate name or
  a missing id.

**Verification**: typecheck and build both pass. Structurally verified
over real HTTP against the local dev server — public taxonomy `GET`s
return real seeded data, every coach-only write route returns 401 with no
token (same limitation as M2: this sandbox can't reach Supabase's JWKS to
mint a real token, so the 200-with-valid-auth path couldn't be curled).
The actual database logic — duplicate-name rejection, duplicate-link
rejection, duplicate-sport-transfer rejection, the delete-in-use guard,
and the not-found error shape — was verified directly against real
Prisma/Postgres with a throwaway script (not committed): create two
exercises, attach quality/muscle/equipment, link them, add a sport
transfer, attempt each documented rejection case and confirm it's
rejected the right way, attach one to a real `BlockExercise` and confirm
the usage-count guard would refuse its deletion, then clean everything up.
All checks passed.

**Not built**: any UI for this. M5 (the admin web app) is what will
actually call these routes; until then this is backend-only, same
situation `GET /me/programs` was in before M2's cutover. `GET
/exercises/:id` and friends (the read side) were already public/unscoped
from before this pass and still are — see the M2 log's note on that.

### M4 implementation log

**2026-09-21** — continuing the same autonomous session as M3. Built the
program-builder write API: coach-only endpoints for the
Program → Session → Block → BlockExercise hierarchy, so a coach can
build a program through the API instead of only via `prisma/seed.ts`.

- `apps/api/src/routes/program-admin.ts` (new), all coach-only:
  - `POST /programs`, `PATCH /programs/:id` — a new program always starts
    `status: draft` and unowned; **no `DELETE /programs/:id`** exists on
    purpose, matching this project's own standing rule that program
    history is never deleted, only archived (see the M2 log's
    archive-on-reassign logic, which is still the only way a program's
    `athleteId`/`status` changes).
  - `POST /programs/:id/sessions`, `PATCH`/`DELETE /sessions/:id`.
  - `POST /sessions/:id/blocks`, `PATCH`/`DELETE /blocks/:id`.
  - `POST /blocks/:id/exercises`, `PATCH`/`DELETE /block-exercises/:id`
    (the actual prescription row).
  - Each level's `order` is enforced unique within its parent (matching
    the schema's own `@@unique([parentId, order])` constraints) and
    returns a clean 409 on a clash rather than a raw 500.
- **A real bug found and fixed before this shipped**: every "does the
  referenced parent/exercise/sport exist" check across both this file and
  M3's `exercise-admin.ts` was originally written using
  `isRecordNotFoundError` (Prisma code P2025). Before wiring this up,
  empirically verified against real Postgres (not assumed) that a bad
  foreign key on `create`/`upsert` actually throws **P2003**, never
  P2025 — P2025 is specific to an `update`/`delete` whose `where` matches
  no row. Every "parent not found" check in both files was wrong and
  would have thrown an unhandled 500 instead of a clean 404. Added
  `isForeignKeyConstraintError` (`apps/api/src/db.ts`) and fixed every
  call site in both files (e.g. creating a session under a nonexistent
  program, or attaching a nonexistent muscle to an exercise). Re-verified
  each fixed path with a throwaway script after the fix, plus the one
  that had already been correct (`isRecordNotFoundError` for genuine
  update/delete-not-found cases) — confirmed still correct alongside it.
  Worth remembering for any future write endpoint in this codebase: don't
  assume which Prisma error code a given operation throws, check it.

**Verification**: typecheck and build pass. HTTP-level: every new
coach-only route returns 401 with no token (same sandbox limitation as
M2/M3 — can't mint a real Supabase JWT here to test the 200 path), and
the pre-existing public `GET /programs/:id` still works unchanged. The
actual logic — the full four-level create chain, all three order-
uniqueness constraints, both P2003 bad-FK cases (bad `programId` on a
session, bad `exerciseId` on a block-exercise), Postgres's cascade delete
(deleting a session correctly removes its blocks and block-exercises),
and P2025 on updating an already-deleted row — was verified directly
against real Prisma/Postgres with a throwaway script (not committed),
then cleaned up.

**Not built**: any UI (M5, same as M3). `DELETE /programs/:id` doesn't
exist by design, not by omission.

### M5 implementation log

**2026-09-21** — continuing the same autonomous session as M3/M4. Built
`apps/admin`, the separate coach-only web app decided on earlier in this
file's V1 product decisions ("a separate web-based admin app (new
package)... The Expo mobile app stays athlete-only"). New npm workspace,
Vite + React + TypeScript + react-router — a plain SPA, not Expo, since
this has no mobile/native target and doesn't need Expo Router's
file-based routing or its web-export quirks. Reuses `@app-workout/shared`
for the couple of types that already existed (`AthleteSummary`,
`MyProgramSummary`); everything else (exercise/program admin shapes) is
typed locally in `apps/admin/src/lib/api.ts` since nothing else consumes
those shapes yet -- adding them to the shared package now would be
speculative.

- **Auth**: same Supabase project, `supabase.auth.signInWithPassword`
  (`src/pages/Login.tsx`), same pattern as the mobile app's login. After
  login, calls `GET /me` and refuses entry (with a "cerrar sesion" way
  out) if the account's role isn't `coach` -- an athlete account can't
  accidentally end up on the admin surface.
- **Athletes** (`src/pages/Athletes.tsx`): lists athletes and each one's
  active program (`GET /athletes`), assigns a program to an athlete via
  the M2 `POST /athletes/:id/assign-program` endpoint (archive-on-
  reassign logic already lived server-side; this is just its first UI).
- **Programs** (`src/pages/Programs.tsx`, `ProgramEditor.tsx`): lists the
  coach's programs (`GET /me/programs`), creates a new draft program, and
  a nested builder UI for Session -> Block -> BlockExercise using every
  M4 endpoint (add/delete at each level; no edit-in-place for existing
  rows' fields yet, only add/remove -- see gaps below).
- **Exercises** (`src/pages/Exercises.tsx`, `ExerciseEditor.tsx`): list
  with client-side name search, create/edit/delete an exercise's base
  fields, and manage its physical qualities/muscles/equipment (add with
  emphasis, remove) and sport transfers (add only). Progression/
  regression/variation/alternative links can be added but not removed
  from this UI (see gaps below).
- **A real read-side gap found and fixed while wiring this up**:
  `GET /exercises/:id` (`loadExerciseDetail` in `mappers.ts`) never
  returned `aliases` or `description` at all -- not a regression from
  M3/M4, this was already missing from the original read path, just
  never noticed because nothing before now needed to read a full exercise
  back for editing. Fixed: both fields added to `ExerciseDetail` in
  `packages/shared/src/types.ts` and to the mapper. Confirmed via
  typecheck across every workspace (`npm run typecheck` at the repo
  root) that this additive change didn't break the mobile app's existing
  consumption of the same type.
- **A missing read endpoint found and added**: there was no way to list
  exercises at all (only single-item `GET /exercises/:id`), which the
  admin app's exercise list/search and the program builder's "pick an
  exercise" dropdowns both need. Added `GET /exercises` (public, like the
  detail route) returning a lightweight `{id, name, objective,
  evidenceRating}` list -- `apps/api/src/routes/programs.ts`.
- **Deployment**: added a third `render.yaml` service,
  `app-workout-admin` (free static site, same pattern as
  `app-workout-web`), including a SPA rewrite rule (`/* -> /index.html`)
  since this is client-side-routed and a direct reload on e.g.
  `/programs/abc` would otherwise 404 on Render's static hosting. **Not
  live yet** -- like `app-workout-web` before it, a new Render Blueprint
  service needs a "Manual Sync" click in Render's dashboard before it
  actually gets created; that's a one-time action only the user can take
  (documented as the next action needed, below).

**Verification**: typecheck (every workspace) and `vite build` both
pass. Real login could not be tested -- this sandbox can't reach
Supabase. Instead: built the app, served the production build locally
(`vite preview`), and drove it with a real headless Chromium (via a
throwaway `playwright-core` install, not added as a project dependency)
to confirm the login page actually renders (email/password inputs
present, page title correct) with zero console/page errors, and that
navigating directly to a protected path like `/athletes` while logged
out correctly falls back to the login screen rather than crashing or
leaking the layout. This confirms the auth-gating logic works
structurally; it does not confirm a real coach can actually log in and
use it end-to-end -- that still needs the user, once this is deployed.

**Known gaps, left deliberately rather than silently**:
- No edit-in-place for an existing session/block/block-exercise's fields
  from the builder UI -- only add and delete. Editing today means delete
  + re-add.
- No program header edit (name/dates/coachNote) from the UI, even though
  `PATCH /programs/:id` exists server-side.
- Can't remove an exercise link or a sport-transfer claim from the UI
  (`DELETE /exercise-links/:id` and `DELETE /sport-transfers/:id` exist
  server-side) -- the read side (`loadExerciseDetail`) doesn't return
  their row ids, only the exercise-link's target and the transfer's
  content, so there's nothing to delete *by* from a fetched list yet.
  Fixing this means extending that mapper's shape again, deliberately not
  done in this same pass to keep this diff reviewable.
- No visual polish (per this project's own V1 decision to defer that).

**One thing needed from the user, whenever they're back**: in Render's
dashboard, open this Blueprint and click "Manual Sync" (the same step
that was needed for `app-workout-web`) so the new `app-workout-admin`
static site actually gets created and deployed. After that, log in with
the coach account (`atleta1@test.com`) at whatever URL Render assigns it
to confirm the whole thing actually works for a real person, not just in
a headless browser.

**2026-09-21 (cont.)** — user said "Sigue mientras y ahora lo revisare"
(keep going, I'll review it now) right after the M5 first-pass report.
Closed two of the three gaps that report flagged, since they were
concrete and didn't need any product decision:

- **Fixed the exercise-link/sport-transfer deletion gap**: added `id` to
  `ExerciseLinkRef` and `SportTransferRef` in
  `packages/shared/src/types.ts`, and to `loadExerciseDetail`'s mapped
  output (`apps/api/src/mappers.ts`). `apps/admin`'s exercise editor now
  has working "Eliminar" buttons for both, calling the
  `DELETE /exercise-links/:id` / `DELETE /sport-transfers/:id` endpoints
  that M3 already built but the UI couldn't reach before.
- **Added edit-in-place to the program builder** (`ProgramEditor.tsx`):
  a program's header (name/dates/coach note), each session
  (label/order/role), each block (order/type/purpose), and each
  block-exercise (order/prescription/reps-or-duration/sets/load/rest) can
  now be edited, not just added or deleted. Each uses the same toggle-a-
  small-inline-form-then-`PATCH` pattern.

**Not done, still a real gap**: block-exercise editing only exposes
`order`/`prescriptionType`/`repsOrDuration`/`sets`/`load`/`rest` inline
(not `tempo`/`instanceNote`) -- a reasonable subset for now, full parity
would need a bigger form than fits inline in a table row.

Verified: typecheck across every workspace, `vite build`, and a live
check against the local dev API confirming `GET /exercises` and
`GET /exercises/:id` return the new `aliases`/`description` fields (and
that link/sport-transfer ids are now present) exactly as the fixed
mapper intends. Not yet re-verified in the actual deployed admin UI --
still blocked on the same Render Manual Sync action above, and on
Supabase being reachable to log in for real.

**2026-09-21 (cont.)** — self-review pass over `apps/admin` before moving
on, specifically looking for the "form doesn't fully mirror the fetched
entity" bug class the aliases field is prone to. Found exactly that:
`ExerciseEditor.tsx`'s edit form initialized `aliases: []` unconditionally
instead of `ex.aliases` when loading an existing exercise for editing --
and there was no input field for aliases at all. Since `handleSave`'s
`PATCH` body always included `aliases` (spread from `form`), **saving any
edit to an existing exercise that had aliases would have silently wiped
them** -- a real data-loss bug, never previously exercised since no
exercise in the seed data has aliases set yet. Fixed: added an "Alias
(separados por coma)" input, backed by its own `aliasesText` string state
kept in sync with the fetched exercise, converted to `string[]` only at
save time. Checked every other field for the same pattern (all others
already used `ex.field ?? ""` correctly) and every other edit form in the
app (`ProgramEditor.tsx`'s session/block/block-exercise editors) --
none of them have this problem, since each only sends the specific
fields it exposes an input for, and the API only patches fields present
in the request body.

**2026-09-21 (cont.) — M5 confirmed live.** User did the Render Manual
Sync, which created `app-workout-admin` and deployed it successfully
(all green). First load showed a **blank white screen** -- not a build
failure (the deploy itself succeeded), but a runtime one: Vite bakes
`import.meta.env.VITE_*` values in at *build* time, and this service's
env vars were still being added when that first build ran, so
`apps/admin/src/lib/supabase.ts`'s guard (`if (!supabaseUrl ||
!supabaseAnonKey) throw new Error(...)`) threw immediately on page load,
before React ever rendered anything -- hence blank, not an error message
on screen. Confirmed the env vars were present in Render's Settings
*after* that first build, which fit the theory. Fixed with a
"Clear build cache & deploy" (a fresh build now picking up the vars that
were already there) rather than any code change -- this wasn't a bug in
the app, just a one-time ordering issue between Blueprint sync and first
build.

After that: **confirmed working end-to-end at
`https://app-workout-admin.onrender.com`** -- logged in as the coach
(`atleta1@test.com`), Atletas page correctly shows
`javiertortajada10@gmail.com` with "julio y el resto" as the active
program and a working reassignment control. M5 is no longer just
locally-verified; it's live and used by a real person.

### M6 log (started)

**2026-09-21** — with M5 confirmed live and the user still exploring it,
noticed the mobile exercise detail screen (`apps/mobile/src/app/exercise/
[id].tsx`) never showed `exercise.videoUrl` at all, even though the field
has existed on `Exercise` since the original schema and the admin editor
now has a "URL de video" input to actually set it. Added a simple "Ver
video" button (`Linking.openURL`, opens externally) shown only when a
video URL is set -- deliberately not an embedded player, since that would
need to handle whatever video hosting ends up being used (YouTube link
vs. a direct file vs. something else), which isn't decided yet. Verified:
typecheck passes, and `npx expo export -p web` still builds
`/exercise/[id]` cleanly with the new `Linking` import. Not yet tested on
a real device or with a real video URL, since none has been added yet.

This is a small, safe first M6 step, not the milestone -- full nav polish
(the screenshot-flow target from the V1 decisions:
`Profile -> Training -> Program -> Day/Session -> inline Blocks ->
Exercise detail`) is unstarted.

**2026-09-21 (cont.) — real user feedback on the exercise detail
screen.** Two distinct pieces of feedback, treated differently:

1. **Content order was wrong** (a real bug, not a taste call): the
   screen showed "Por que" (the sports-science rationale) before "Como
   hacerlo" (the coaching cues -- how to actually perform it) and before
   equipment. An athlete mid-workout needs the video and the how-to
   first; the why is secondary in that moment. Fixed immediately:
   reordered to video -> "Como hacerlo" (renamed from "Claves de
   coaching") -> equipment -> "Por que" -> physical qualities -> muscles
   -> contraindications -> evidence -> sport transfer -> variations.
2. **"No me gusta el diseño visual, no se ve bien"** -- this is the
   exact thing Section 11 (contradiction #5) and the V1 decisions
   explicitly deferred past this milestone: the app is still on
   unbranded Expo defaults, not the dark/teal visual identity from the
   design-preview artifact (see References). This is a legitimate,
   real reaction, but revisiting the deferral is the user's call, not
   something to act on unilaterally -- asked them directly whether to
   prioritize it now (and offered the existing mockup as a starting
   point) or keep deferring. Awaiting their answer before doing any
   visual/styling work.

**2026-09-21 (cont.) — visual design deferral lifted, first real pass
applied.** User: "Puedes modificar el diseño visual ligeramente aunque
sea para que se vea bien... hazlo ahora todo lo mejor que puedas" (do a
best-effort pass now, perfect it later) -- explicit reversal of the
earlier deferral for a first real pass, not final polish.

Read the design-preview artifact (`bd82a155-...`, see References) and
pulled its actual design tokens rather than inventing new ones -- it
already had a considered palette (warm off-white / near-black canvas,
`#0C7C8C` teal accent in light mode, `#35D6C7` in dark) and type scale
that nobody had ever wired into the real app.

- `apps/mobile/src/constants/theme.ts`: replaced the generic
  black/white/gray `Colors` with the artifact's real palette, plus new
  `accent`/`accentContrast`/`border`/`warningBg`/`warningBorder` keys.
- `apps/mobile/src/components/themed-text.tsx`: `title` (was 48px/600,
  now 26px/800 -- the artifact's actual header size, not an arbitrary
  splash-screen-sized default), `subtitle` (19px/700), and a new `label`
  type (11px/700/uppercase/letter-spaced) for section headers like "POR
  QUE" -- replaces several screens' manual `.toUpperCase()` string calls.
- Every primary action (login button, "Preguntale al coach", chat send,
  "Ver video") now uses `theme.accent`/`accentContrast` instead of a
  flat `theme.text`/`theme.background` swap.
- Exercise detail: contraindications box now uses `warningBg`/
  `warningBorder` (a warm amber warning, not just a plain outlined box);
  the "Variaciones" relationship label (progression/regression/...) is
  now accent-colored, matching the artifact's `.kind` style.
- `apps/mobile/src/app/_layout.tsx`: the pushed-screen header (Programa/
  Sesion/Ejercicio) had **no theming at all** before this -- it was
  running on React Navigation's untouched default, which doesn't track
  light/dark mode. Added `screenOptions` so the header background/text
  color actually follows the app's theme.
- **Root-caused the exact screenshot the user sent** (solid black
  "Bloque 2/3/4" bars in `session/[id].tsx`): `block`/`blockHeader` were
  wrapped in `ThemedView` with no `type` prop, which defaults to
  `theme.background` -- on a dark-mode device that's pure black, painted
  as a solid bar behind plain text, with no relation to the actual
  content hierarchy. The design-preview artifact never boxed these at
  all -- a block header is just bold+muted text floating on the page,
  only the individual exercise rows are real (elevated) cards. Fixed by
  switching those wrappers to plain (unstyled, transparent) `View`.
  This was a real layout bug, not a missing coat of paint -- worth
  remembering that "no me gusta el diseño" from a user can be pointing
  at an actual defect, not just an aesthetic preference.
- Removed the per-screen `styles.title` overrides that existed on nearly
  every screen (`program/[id].tsx`, `session/[id].tsx`, `login.tsx`,
  `(tabs)/index.tsx`, `(tabs)/programs.tsx`, `exercise/[id].tsx`) --
  each one was silently fighting the shared `ThemedText type="title"`
  style with its own `fontSize: 28`. Now every screen gets one
  consistent title treatment from one place.

**Verified**: typecheck passes, `npx expo export -p web` still builds
all 14 routes. Actually looked at the result, not just checked for
errors -- served the exported build locally and screenshotted `/login`
in both light and dark mode with a throwaway `playwright-core` install
(same approach as M5's admin-app check): warm off-white background with
a solid teal CTA in light mode, near-black background with a bright
teal CTA in dark mode -- both readable, both matching the artifact's
intent. Deeper screens (session/exercise, where the actual bug was)
could **not** be screenshotted this way since they're behind
`Stack.Protected` auth and this sandbox can't log in against Supabase --
confirming those needs the user on a real device or the web deployment,
same limitation as every other UI change this session.

**Not done**: actual icon/splash-screen artwork (`app.json` still points
at the generic Expo template images) -- that needs real graphic assets,
not a code change, and wasn't attempted. The admin app (`apps/admin`)
was left untouched in this pass; the user's complaint was specifically
about the athlete-facing mobile/web screens.

### AI-program-generation decision + coachNotes field (2026-09-21)

User asked about building a per-client "GPT" for AI-generated routines,
and separately revealed serious medical context for the father (survived
sudden cardiac death at 53, triple bypass, ICD/DAI, right hip
replacement) while describing what his real trainer had prescribed.

**Decision on the AI-generation architecture**: no separate paid-API
feature, no per-client "GPT". Instead: the user gives the athlete's
context (parameters, trainer notes, medical history) directly in a
Claude Code conversation like this one, and programs get built through
the existing write API/SQL, same as this session's whole M2-M6 build.
This is free (no separate Anthropic API billing) and was the user's own
proposed alternative once the per-generation cost of a real in-app AI
feature was explained. Revisit only if this becomes a product other
coaches use self-serve, without a Claude Code session available to them.

**Safety note, stated plainly to the user and worth repeating here**:
exercise selection can avoid obvious contraindications (no maximal
effort, no heavy Valsalva, hip-precaution awareness), but intensity/
progression decisions for someone with this cardiac history are not
something an AI assistant should be driving -- that stays with the
athlete's cardiologist and the real trainer who has assessed him in
person. Any program built for this athlete should stay conservative and
defer to that guidance, not push based on what "looks fine" in a chat.

**Added `Profile.coachNotes`** (`apps/api/prisma/schema.prisma`,
migration `20260921081053_add_coach_notes`): a coach-only free-text
field -- medical history, sport(s), functional test notes, load-
progression philosophy -- meant to be filled in once per athlete and
read before building or adjusting their program (by a human/Claude Code
session today; possibly by an automated tool later). Never shown to the
athlete. Exposed via `PATCH /athletes/:id` (coach-only; also accepts
`name`/`athleteLevel`) and a textarea on each athlete's card in
`apps/admin/src/pages/Athletes.tsx`. `AthleteSummary` (shared types)
now carries `coachNotes`. Verified: typecheck across every workspace,
API build, admin `vite build`, and the migration applied cleanly
against local dev Postgres with no drift.

**Also added this session, pending the user running it in Supabase**:
a SQL script (given directly to the user, not committed to the repo)
adding 10 general gym exercises to the Exercise library -- 8 identified
from the user's own videos of his parents training (band hip abduction,
band glute kickback, lateral band walk, supported split squat, box
hamstring/hip mobility, standing toe-touch stretch, seated dumbbell
side bend, loaded rotational carry with a medicine ball) plus 2
recommended machine exercises to cover the upper-body push/pull the
videos didn't show (chest press machine, lat pulldown). Each exercise's
content (objective/coachingCues/contraindications) and a demonstration
video URL were verified: the SQL was run successfully against local dev
Postgres first (all 10 rows inserted, all muscle/equipment/quality
relationships resolved correctly, confirmed via a follow-up query) then
rolled back before handing the (identical) script to the user for
Supabase. One exercise's video URL is flagged in its own coaching cues
as an imperfect match (couldn't find a video of the exact walk+rotate
combination seen in the videos). Two-session program structure (which
exercises pair into which blocks) is the next step, still pending the
user's confirmation on a couple of ambiguous block pairings from the
videos, and now also pending them filling in the father's `coachNotes`.

### Real business context revealed (2026-09-21)

While asking how to connect his client-intake form to `coachNotes`, the
user described the actual business this app is meant to eventually
serve -- summarized at the very top of this document (read that first).
Key points not to lose:

- **"Padel Performance"** is a real, currently-operating paid coaching
  service (€120/month), not a hypothetical. It is delivered today
  through **TIMP**, a third-party app -- this project (`App Workout`) is
  not yet what clients actually use; the father is the first real
  athlete on *this* platform specifically.
- Client acquisition already has a full funnel outside this codebase:
  Instagram bio -> a custom HTML assessment form the user built himself
  (`padelperformance.tiiny.site`, described as "diseno premium: fondo
  verde oscuro, tipografia Bebas Neue, acento lima, lineas de pista de
  padel, estilo editorial" -- a real, considered brand identity that
  exists nowhere in this app yet) -> Google Forms -> Google Sheets ->
  WhatsApp templates (EN/ES) for first contact and post-payment
  (requesting 6 movement-assessment videos + gym photos) -> payment via
  Wise.
- **Decision on connecting the form**: no Google Sheets API integration
  for now (real added complexity -- OAuth/service account credentials --
  for a client volume that doesn't yet justify it). Instead: the user
  shares each new client's form response with the coach (in a Claude
  Code conversation, same as this session's whole workflow) when it's
  time to build their program, and it gets summarized into that
  athlete's `coachNotes`. Revisit if client volume grows enough that
  manual handoff becomes the bottleneck.
- **Not yet reconciled, worth surfacing next time it comes up**: this
  app's visual identity (the teal/warm-off-white palette applied earlier
  this session, pulled from an old design-preview artifact) has no
  relationship to the real "Padel Performance" brand identity (dark
  green canvas, Bebas Neue, lime accent, court-line motifs) the user
  already built for the assessment form and Instagram presence. If this
  app is ever meant to be client-facing under that brand, the visual
  identity question from earlier today gets a different answer than "use
  the old mockup's palette" -- flagging this now rather than silently
  picking one.

### Father's full-body program built (2026-09-21)

Finished the exercise-identification/program-design thread from the
previous log entry. Key corrections and decisions, in case this needs
re-deriving later:

- **Two exercises I had proposed (`gym-machine-chest-press`,
  `gym-lat-pulldown-machine`) were never actually shown in any of the
  user's video screenshots** -- I added them without a real source and
  the user caught it. Per this project's core rule (never invent
  exercise facts), they stay in the `Exercise` table as legitimate
  generic entries usable for *other* future programs, but they are
  explicitly **not** part of the father's routine. Lesson: cross-check
  "what did the user actually show me" against "what did I propose"
  before treating my own earlier proposal as confirmed fact.
- The 8 exercises actually confirmed from video, and their real
  pairing/order (parents rotating turns within the same shared block,
  not one exercise fixed per parent):
  - Block: abduccion de cadera con banda + patada de gluteo con banda
  - Block: marcha lateral con banda (monster walk) + sentadilla dividida
    con apoyo
  - Block: movilidad de cadera/isquiotibial con pie elevado + flexion
    lateral de tronco con mancuerna
  - Block: marcha rotacional con balon medicinal + estiramiento de pie
    tocando la punta de los pies
- Real trainer's brief (Kike Montero, via WhatsApp): two full-body
  sessions, ~40 min, one exercise per muscle region, don't overcomplicate
  it. The filmed routine above is 100% hip/leg/core -- **zero upper-body
  work** -- so it didn't actually satisfy "full body" on its own.
- Added two new exercises to close that gap: `gym-standing-band-chest-press`
  and `gym-standing-band-row` (standing resistance-band press/row, real
  YouTube reference videos found via WebSearch, not verified frame-by-frame
  the way the father's own videos were -- flagged to the user as such).
  Chosen over machine/barbell alternatives specifically to match the
  equipment/risk profile of the rest of his routine (band resistance: no
  Valsalva maneuver, no free weight to stabilize, stoppable mid-rep,
  progressive resistance) -- the user's own observation that his father's
  exercises were band/mobility-based rather than "gym gym" machine work,
  which was the right call.
- **Medical/liability context, explicit and important**: for this
  specific athlete the user confirmed neither the real trainer nor a
  cardiologist will sign off on this routine -- the trainer explicitly
  delegated program-design responsibility to the user, and the father's
  last cardiac evaluation was ~10 years ago (survived MI at 28, survived
  sudden cardiac death at 53 with resuscitation, triple bypass, ICD/DAI;
  has since returned to playing tennis regularly). The user asked me
  directly to weigh in as a trainer would. I gave a general
  exercise-science opinion (band-based standing press/row over
  barbell/machine, conservative progression starting light and advancing
  only once technique/tolerance is comfortable across two sessions) but
  was explicit that I'm not making a clinical call for this specific
  person -- this is recorded here so a future session doesn't either (a)
  re-litigate this from scratch, or (b) mistake my general reasoning for
  medical clearance.
- Built the full program as SQL:
  `/tmp/.../scratchpad/father-fullbody-program.sql` (not committed to the
  repo; sent to the user via SendUserFile). Contains: the original 10
  gym exercises (idempotent, safe to re-run even if already applied),
  the 2 new band exercises + their taxonomy, a new `Sport` row
  ("Acondicionamiento general" -- this program isn't padel, so it needed
  its own sport-agnostic category rather than being force-fit under
  "Padel"), and the full `Program`/`Session`/`Block`/`BlockExercise` tree
  (2 sessions x 3 blocks x full prescriptions). Created with
  `status = 'draft'` and no `athleteId`/`coachId` set on purpose --
  assignment happens through the existing admin-app flow (Atletas ->
  pick this program -> Asignar), which already handles archiving
  "julio y el resto" for him correctly; I deliberately didn't hardcode
  his Profile id into raw SQL.
  Verified locally against dev Postgres inside a transaction (12
  exercises confirmed present, full 2-session/6-block/10-exercise
  structure confirmed via join query), then rolled back before handing
  to the user -- same verify-then-handoff pattern as the earlier
  10-exercise script.
- **Still open**: whether the original 10-exercise script
  (`add-gym-exercises.sql`) has actually been run against production
  Supabase was never confirmed by the user ("Lo otro no lo he mirado").
  The new combined script is safe to run regardless (fully idempotent),
  so this doesn't block anything, but worth checking if exercise data
  looks inconsistent later. Also still open: whether the user has run
  this new script against production and assigned the program yet.

**Update**: the father's program was assigned successfully (confirmed by
the user, verified via screenshot of the mobile web app showing "Dia 1"
with all 3 blocks and correct sets/reps). `atleta1@test.com` is his real
account (name coincidence with the user's own -- not a mixup); the coach
account in use throughout this project has also always been
`atleta1@test.com` (a confusingly-named leftover from early auth testing,
promoted to `role: coach` by hand -- see the M2-era log entry above). Not
urgent, but worth renaming/replacing with a properly-named coach account
at some point.

### Video thumbnails + embedded playback (2026-09-21)

Two small UX asks after the user saw the real session/exercise screens:
video thumbnails next to each exercise in the session list, and the
video actually embedded on the exercise detail screen instead of an
external "Ver video" link.

- Added `apps/mobile/src/lib/video.ts`: derives a YouTube thumbnail URL
  (`img.youtube.com/vi/<id>/mqdefault.jpg`) and embed URL
  (`youtube.com/embed/<id>`) from `videoUrl` client-side. `thumbnailUrl`
  is a real schema field but nothing populates it yet (see "Current
  state, honestly" in `CLAUDE.md`); this sidesteps that gap without a
  schema/data change since every video in use today is a YouTube link.
  Prefers `exercise.thumbnailUrl` first if it's ever populated.
- `session/[id].tsx`: each exercise row now shows a 56x56 thumbnail.
- `exercise/[id].tsx`: on web (`Platform.OS === "web"`), embeds the
  video directly via a real `<iframe>` (created with `createElement`
  to sidestep the fact that RN's JSX typings don't know about `iframe`
  -- react-native-web ultimately renders to real DOM, so this works)
  instead of showing the "Ver video" button. **Native (iOS/Android)
  still shows the external-link button** -- true in-app embedded
  playback there would need `react-native-webview` (not installed) and
  a native rebuild, which is more than this ask needed; not silently
  dropped, just out of scope for now.
- Verified: `tsc --noEmit` clean, and the YouTube-ID regex checked
  against real video URLs in both `watch?v=` and `youtu.be/` forms via a
  throwaway node script. **Could not get an actual browser screenshot**
  of the rendered result -- doing so would require logging into the app,
  which needs real Supabase auth, and this sandbox's network policy
  blocks `supabase.co` (same constraint hit earlier for
  `padelperformance.tiiny.site`). A quick attempt to bypass the
  session-gated `Stack.Protected` guard locally to view the screen
  without logging in was auto-blocked by this environment's own
  safety classifier ("Security Weaken") -- correctly, since that guard
  is exactly what should never be casually disabled even temporarily;
  the edit was reverted immediately rather than worked around. So this
  one needs the user's own eyes in the real deployed app before being
  called fully done.

### Videos backfilled for the remaining padel exercises (2026-09-21)

The user asked to fill in `videoUrl` for the padel S&C exercises that
never had one (the original seed, per `CLAUDE.md`'s "Current state,
honestly" -- these predate the father's program work and were never
populated). Searched real YouTube videos for all 17 via `WebSearch`
(same approach as the gym exercises earlier), then built
`/tmp/.../scratchpad/add-videos-remaining-exercises.sql` -- `UPDATE
"Exercise" SET "videoUrl" = ...` per row, idempotent, touches no other
field. Verified locally (transaction + rollback): all 12 applied
cleanly.

**Found good-to-partial matches for 12 of 17** -- several of these are
the closest real video for the general movement, not confirmed to show
the exact variant named in the exercise (e.g. "Hang Staggered Muscle
Snatch" links to a standard-stance hang muscle snatch, not the staggered
variant; each partial match is commented in the SQL file itself with
what it doesn't confirm). **Left 5 without a video, on purpose**: their
names describe specific multi-movement combinations (e.g. "Deadbug +
Aduccion + Glute Bridge con Banda de Cadera", "Hip Turn + Drop Step")
that no real video search turned up a confident single match for --
per this project's core rule, a wrong-but-plausible link is worse than
no link. Still open: `Deadbug + Aduccion + Glute Bridge con Banda de
Cadera`, `Deadbug to Lateral Plank con KTB`, `Drop Horizontal Switch
Jump`, `Hip Turn + Drop Step`, `Landmine Halfmoon Press` (this last one
specifically because it's unclear whether "half moon" and "half
kneeling" landmine press are the same movement or not -- didn't want to
guess).

### Auto-select Spanish audio track on embedded video (2026-09-21)

The user's real device showed the web video embed working (per the
earlier session/exercise-detail work), but auto-dubbed YouTube videos
default to English audio -- viewer has to open the gear icon and switch
to "Pista de audio: Espanol" by hand each time. Asked whether that could
be automatic; answered honestly before touching code (couldn't reach
`developers.google.com` from this sandbox to confirm the IFrame API's
audio-track methods' exact behavior), then implemented it best-effort
once the user said to go ahead anyway.

`apps/mobile/src/components/youtube-embed-web.tsx` (new): loads the real
YouTube IFrame Player API (not a plain `<iframe src=...>` like before)
and on `onReady` calls `getAvailableAudioTracks()` / `setAudioTrack()`
to switch to a Spanish dub if the video has one. Wrapped in try/catch and
feature-detected (`typeof player.setAudioTrack === "function"`) so it
silently falls back to the default track if the API doesn't support this
for a given browser, or the video has no Spanish dub -- never a broken
player. `exercise/[id].tsx` now renders this component (web only, same
`Platform.OS === "web"` gate as before) instead of the plain iframe.
**Confirmed working by the user on a real device**: the hip-abduction
exercise's video now plays in Spanish automatically, no manual gear-icon
switch needed. The `getAvailableAudioTracks`/`setAudioTrack` approach
works in practice, at least on Safari/iPadOS against a real dubbed
video -- worth knowing next time this pattern is questioned.

### Mov Prep (shared warmup block) added to father's program (2026-09-21)

Closed the loop on the "Mov Prep" idea from earlier: the data model
already supported this (`SessionRole.warmup`, see schema.prisma comment),
and the seed's own `Mov Prep` session (zero blocks, never filled in from
screenshots) was the precedent. Built it for real this time.

Went through several rounds of miscommunication worth remembering for
next time this pattern comes up:
- I initially proposed 3 generic warmup exercises (marching, hip circles,
  shoulder rotations) from my own reasoning, without ever having seen the
  user's real Mov Prep screenshot -- the user asked me to search videos
  for those before I'd actually seen source material, which in hindsight
  I should have asked for up front rather than inventing a plausible
  warmup structure first.
- When the user finally sent the real screenshot, the actual block was
  completely different from what I'd guessed: **Aduccion de cadera con
  banda (tumbado boca arriba)**, **Aduccion desde extension de cadera**,
  and **Inverted Nordic Curl** -- none of which I had proposed.
- The user then simplified further in conversation: dropped the second
  exercise (redundant with the first, no confident video match anyway)
  and the Inverted Nordic Curl, and asked to bring back 2 of my original
  generic proposals (marcha en el sitio, rotaciones de hombro con banda)
  to fill the block back out to 3.
- **Final block, confirmed and applied**: Aduccion de cadera con banda
  tumbado boca arriba (`gym-supine-band-hip-adduction`) + Marcha en el
  sitio (`gym-marching-in-place`) + Rotaciones de hombro con banda ligera
  (`gym-standing-band-shoulder-circles`). SQL:
  `/tmp/.../scratchpad/add-mov-prep.sql`, pasted inline for the user
  (file attachments didn't work for them earlier in this session) rather
  than sent via SendUserFile. Verified locally (transaction + rollback):
  new `Session` (`role: warmup`, `order: 0`, before Dia 1/Dia 2's 1/2) +
  one `circuit` `Block` with `rounds: 2` + 3 `BlockExercise` rows, all
  correct.
- One open item the user is checking themselves: the first video
  (`Wm51OxLX3dI`, "H1 | Hip Adduction - Supine (Band)") gave the user an
  access error ("use a computer or phone") when opened as a raw link on
  their iPad -- kept it anyway per the user's own theory that it might
  work once actually embedded in-app (goes through the YouTube IFrame
  API player, not a raw navigation) rather than switching to a worse
  video match. Worth checking if it actually plays once this is live.

### Bug: video UPDATE scripts used local dev ids, silently no-op'd in prod (2026-09-21)

Both video-backfill scripts (the 12-exercise one and the 5-combo one)
used `WHERE id = '<cuid>'` with ids read from **this sandbox's local
dev Postgres**, not production. Local dev and production Supabase were
seeded independently, so `Exercise.id` values differ between them even
for the same-named row -- this exact gotcha is already documented
earlier in this file (see the M3/M4-era taxonomy-lookup note) and I
still made the mistake here for `Exercise` rows specifically. The
`UPDATE`s ran without error and silently affected 0 rows each time,
which is worse than an error -- nothing looked wrong until the user
actually checked the admin app and none of the videos showed up.

**Fix applied and confirmed working**: rewrote both scripts to
`WHERE name = '...'` instead (`Exercise.name` is `@unique`, identical
across both databases) -- combined into one script, re-run by the user,
confirmed via the same verification query (0 rows without a video).

**Lesson, to actually stick this time**: any SQL written for the user to
run against production must resolve every reference to an *existing* row
(not one being inserted in the same script) by a unique, human-readable
column (`name`), never a raw id pulled from local dev -- not just for
taxonomy tables, for every table. Only ids for rows *created in the same
script* are safe to hardcode, because they're deterministic strings
chosen there (like the `gym-*` exercise ids), not database-generated.

### Fix: "sign in to confirm you're not a bot" on embedded video (2026-09-21)

User hit this on their phone (Safari) tapping a video in the real app.
Root-caused via web search rather than guessed: Safari's cross-site
cookie blocking (ITP / iCloud Private Relay) stops the embedded player
on `youtube.com` from seeing the viewer's actual YouTube login cookie,
so YouTube treats the embed as anonymous/high-risk traffic and shows the
bot check -- signing in again inside that context doesn't help because
it's a separate, partitioned cookie jar from the user's normal browser
session. This is a known, widely-reported issue, not specific to this
app's code.

Fix: `youtube-embed-web.tsx` now passes `host:
"https://www.youtube-nocookie.com"` to `YT.Player` (privacy-enhanced
mode) -- the most effective documented fix, since it avoids setting the
tracking cookies that trigger the check in the first place. Verified
`tsc --noEmit` and `expo export -p web` both clean. **Not yet confirmed
by the user on the real device** -- next check-in should ask whether the
video plays now without the bot-check prompt.

### Bot-check on embed: device-dependent, not fixed by nocookie alone (2026-09-21, cont.)

The `youtube-nocookie.com` fix (previous entry) did not resolve it --
user still hit "sign in to confirm you're not a bot" on their phone.
Useful new data point: **works fine on their iPad, fails on their
phone**, same app, same Safari -- points to something network/device-
specific (mobile data IP reputation, Private Relay, or Safari's web
login state on that device) rather than a structural iframe problem,
though not yet confirmed which. Asked the user two quick diagnostic
questions (WiFi vs. mobile data; whether Safari on the phone is actually
logged into youtube.com directly) -- answer not yet in.

Regardless of root cause, added a permanent safety net:
`exercise/[id].tsx` now always shows a small "No carga el video? Abrelo
aqui" link under the embed, opening the real YouTube page directly. This
was the practical answer to "don't make my dad fiddle with settings" --
we cannot detect the bot-check from our code (the iframe's content is
cross-origin/invisible to the parent page, a real browser security
boundary, not a gap in this implementation), so an always-available,
zero-troubleshooting fallback is the right permanent fix regardless of
what's actually causing it on the user's phone.

**Root cause confirmed, closed**: the user had a VPN active on their
phone (not on the iPad) -- VPN/datacenter IPs are exactly what YouTube's
bot detection flags most often. Turned the VPN off, works fine. Not an
app bug at all, and not expected to affect the father (no VPN). The
`youtube-nocookie.com` switch and the always-visible fallback link both
stay -- genuinely useful regardless, cost nothing, and the fallback
covers any future case (public wifi, a captive portal, etc.) without
needing to re-diagnose from scratch.

### Reverted youtube-nocookie.com: it broke the Spanish dub (2026-09-21, cont.)

After the VPN root cause above, the user reported the Spanish
auto-selection had stopped working (it worked before the nocookie
change). Reverted `host: "https://www.youtube-nocookie.com"` back to
the default host in `youtube-embed-web.tsx` -- most likely explanation:
privacy-enhanced mode withholds the personalization data multi-language
audio tracks depend on. Not independently confirmed against YouTube's
own docs (still unreachable from this sandbox), but the timeline (worked
-> nocookie added -> broke -> nocookie removed) is strong enough
circumstantial evidence to act on. The always-visible fallback link
added earlier stays regardless -- it's what actually protects against a
real embed failure now, not the host domain.

### Fix: Spanish audio track timing bug (onReady too early) (2026-09-21, cont.)

After the nocookie revert, user still saw English by default -- but this
time confirmed via the gear icon that the video genuinely does have a
Spanish track available, ruling out "this video has no dub" as the
explanation. Root-caused via docs search: `getAvailableAudioTracks()`
was only being called from `onReady`, but the audio-track module isn't
guaranteed loaded by then -- `onApiChange` is YouTube's actual signal
that a module with its own exposed methods (audio tracks included) has
loaded. Added `onApiChange` as a second call site in
`youtube-embed-web.tsx` (kept the `onReady` attempt too, harmless).
**Not yet confirmed by the user on the real device.**

### Closed: auto Spanish audio track was never really possible (2026-09-21, cont.)

Real diagnostic output (added specifically to stop guessing, see the
entry above) showed `getAvailableAudioTracks` is `undefined` on the
`YT.Player` object every time, in both `onReady` and `onApiChange`. Web
search confirmed why: **this method isn't in YouTube's official IFrame
API reference at all** -- it's an undocumented method that exists on the
real youtube.com player object in some contexts (e.g. the browser
console on youtube.com itself), not on what the public embed constructor
exposes. It was never going to work here. The one time it looked like it
worked (very first test, hip-abduction video), the real explanation is
almost certainly YouTube's own server-side default-track selection based
on device/browser locale -- nothing this code did.

**Reverted to a plain `<iframe>` embed** (`exercise/[id].tsx`), deleted
`youtube-embed-web.tsx` entirely, removed the debug instrumentation. The
always-visible "No carga el video? Abrelo aqui" fallback link stays --
genuinely useful regardless (bot-check, network issues), independent of
this whole audio-track thread.

**Takeaway for next time a "the JS API has a method for that" claim comes
up without being able to check official docs**: verify by testing on a
real device/environment before building a whole feature around it, not
after three rounds of debugging a "bug" that was actually "this was
never a real method." Search-engine summaries of gists/blog posts are
not the same as confirmed API surface.

**Fully closed**: the user pushed back with a real counter-observation
(it looked like it worked on their iPad) before accepting this. Rather
than dismiss it, proposed the decisive test -- open the same video in a
fresh private/incognito tab on the iPad (no saved cookies) -- since
YouTube is known to remember a manually-picked audio track per browser.
Confirmed: private tab -> English, normal tab -> Spanish. The iPad
"working" was the browser remembering a manual gear-icon selection made
at some point during testing, on that specific browser profile --
nothing to do with this code, on either device. No remaining ambiguity.
Final state: plain iframe, viewer picks the language by hand the first
time per device/browser, exactly like using youtube.com directly.

### Second real client: padel player with shoulder rehab need (2026-09-22)

First program built for someone other than the father -- confirms this
conversation/session is meant to be reused across all of the coach's
real clients (their own question), not one session per client. No new
repo/branch/infra needed per client, just a new `Program` + `Profile`
in the same app, same as the father.

**Client**: ~37yo recreational padel player (intermediate/amateur by
local Thailand standards), sedentary outside padel. Active anterior
shoulder pain from a missed smash (deceleration injury, no ball
contact). Wants full-body conditioning like the father's program plus
shoulder rehab and padel-specific injury prevention (shoulder, knee,
ankle dorsiflexion, low back, glutes) and court-movement work.

Reused most of the existing padel/S&C exercise library (the one built
early in this project, largely unused until now) -- this is its first
real use. Added 2 new exercises that were missing: `gym-banded-shoulder-
external-rotation` (rotator cuff strengthening, standard low-risk rehab
for anterior shoulder pain) and `gym-ankle-dorsiflexion-knee-to-wall`
(ankle mobility, explicitly requested, nothing existed for it).

**Design calls made without asking first** (per the user's explicit
"work ahead without me" instruction), flagged to the user for review
rather than silently decided:
- Excluded all overhead-pressing exercises (DB Overhead Press, both
  Landmine presses) and the medicine-ball rotational throws for now --
  the injury mechanism was an overhead deceleration motion, loading that
  direction before he's pain-free would be premature. Recorded in the
  Program's `coachNote` so this isn't silently forgotten later.
- Excluded the three "Alta" (high) complexity exercises (Hang Muscle
  Snatch, both plyometric "Drop...Jump" ones) -- client is sedentary
  outside padel, better to build a base first. Also noted in `coachNote`
  as candidates for later.
- Assumed 2 sessions/week, same cadence as the father's program.
- Program name is a generic placeholder (client's real name not given
  yet) -- rename via admin once known.

SQL: `/tmp/.../scratchpad/add-padel-player-program.sql`. Verified locally
(transaction + rollback): 2 new exercises + their taxonomy, `Sport` reused
via name lookup (`Padel`, not hardcoded id -- applying the id-mismatch
lesson from earlier), `Program` (draft, unassigned -- no athlete account
exists yet for this client), 3 Sessions (Mov Prep + Dia 1 + Dia 2), 12
Blocks, 15 BlockExercises, all correct. Not yet run against production,
not yet reviewed by the user.

### Bug: admin ProgramEditor crashed blank on any program (2026-09-22)

User hit a blank screen opening the new padel-player draft program in
the admin app -- first real trigger of a pre-existing bug, not something
wrong with that program's data specifically. Root cause: `ProgramEditor.tsx`
reads `session.blocks` and `program.coachNote`, but `fetchProgram` called
the *public* `GET /programs/:id` (`programs.ts`), which only ever
returned the summary shape (`blockCount`/`exerciseCount`, no `blocks`,
no `coachNote` -- see `loadProgramDetail` in `mappers.ts`). Calling
`.slice()` on the resulting `undefined` threw, blanking the whole page
with no error boundary to catch it. This would have broken for *every*
program, including the father's -- it just hadn't been hit yet because
nobody had opened a program's detail page in the admin app deeply
enough before now.

Fixed by adding a new coach-authenticated route, `GET
/programs/:id/admin` (`program-admin.ts`), with the full nested shape
(sessions -> blocks -> block-exercises -> exercise ref) the editor
actually needs, and pointing admin's `fetchProgram` at it. Deliberately
did **not** change the existing public `/programs/:id` -- it's
unauthenticated/unscoped (see its own comment in `programs.ts`), and
`coachNote` must never be reachable from there; the mobile program
overview also doesn't need full block nesting, just the counts it
already gets. Verified the new route's query logic directly against
local dev data via a throwaway `tsx` script (real session/block/exercise
counts, `coachNote` present) -- couldn't hit it over HTTP since a real
coach JWT isn't available in this sandbox.

### Padel player program reworked: shoulder-first, not full-body (2026-09-22)

The user reviewed the first draft (full-body + shoulder rehab) in the
admin app and corrected the whole approach: this client wants shoulder
recovery *now*, not general conditioning -- and he has zero training
background, so anything resembling a normal full-body program would
feel overwhelming. Explicit brief: heavy shoulder/scapular focus
(named "trapecio medio" specifically, for scapular repositioning), a
little lumbar (kinetic-chain connection), almost no leg work (no leg
issues), and simple (5 exercises/session, not 6 with varied blocks).
Also explicitly said not to feel limited to existing DB exercises --
new ones are fine, and the user is separately adding their own to the
system too.

Added 3 new exercises (all real videos, found via search): `gym-
banded-shoulder-internal-rotation` (complements the external rotation
already added -- balanced rotator cuff work), `gym-band-face-pull`
(mid trap + rear delt, a standard "reposition the shoulder" exercise),
`gym-band-y-raise` (lower trap + serratus anterior, scapular upward
rotation -- also standard rehab). Added `Serrato anterior` to the
`Muscle` taxonomy for the last one.

Rebuilt Mov Prep / Dia 1 / Dia 2 to drop essentially all leg-specific
and footwork content (monster-walk-style patterns, split squats, step-
ups, kettlebell swing, farmer's walk, footwork drills) -- none of that
matched "almost no legs, keep it simple." New structure: Mov Prep (2
items) + each day 5 exercises, all but one of them shoulder/scapular,
one light core-lumbar touch, one light general stretch. `Program.
coachNote` updated in place to record why (so a future session doesn't
wonder why the second version looks so different from the first).

SQL: `/tmp/.../scratchpad/rework-padel-player-shoulder-focus.sql`.
Structured as an in-place rework, not a new program: adds the 3 new
exercises, `DELETE`s the old `Block` rows for this program's 3
sessions (cascades to their `BlockExercise` rows), inserts the new
simplified structure, updates `coachNote`. Verified locally by running
the *original* creation script followed by this rework script in one
transaction (rolled back) -- confirms it applies cleanly on top of
already-existing production state, not just a fresh DB. Caught and
fixed one real bug in the process: this script referenced `'Marcha en
el sitio'` by name assuming the father's Mov Prep script had already
created it in production, which was never actually confirmed -- added
that exercise's own idempotent `INSERT ... ON CONFLICT DO NOTHING`
directly into this script so it doesn't depend on that assumption.

---

## References

- `CLAUDE.md` (repo root) — project instructions and current-state notes.
- `apps/api/prisma/schema.prisma` — data model source of truth.
- `apps/api/prisma/seed.ts` — seed data and its own documented gaps.
- `apps/api/prisma/migrations/20260725094323_init/migration.sql` — applied migration.
- `apps/api/src/ai/chat.ts`, `apps/api/src/ai/tools.ts` — AI coach implementation.
- `apps/api/src/mappers.ts`, `packages/shared/src/types.ts` — API contract shapes.
- `apps/mobile/src/app/` — all mobile screens and navigation.
- Claude artifact `padel-coach-data-model.md` —
  `https://claude.ai/code/artifact/6b564191-d70c-4d94-872d-bed4807d2133`
  (updated 2026-07-25; unmodified by this reconstruction).
- Claude artifact "App Workout — Vista previa de diseño" —
  `https://claude.ai/code/artifact/bd82a155-1cd4-4ce2-9caa-c050da739da6`
  (updated 2026-07-25; unmodified by this reconstruction).

## 2026-09-22 -- TIMP library catalog (Koichi Plank, Staggered Rack Pull, Dumbbell/Inertial farmer's walk)

Added the coach's real "sept 2" TIMP screenshots to the shared `Exercise`
library only (no Program/Session/Block -- explicitly a general-library
add, not tied to any client). Two scripts:

- `add-timp-library-exercises.sql`: 16 exercises (kettlebell arm bar,
  single-leg box squat, cable lateral lunge with reach, single-leg hack
  squat, single-leg press, bear crawl hip extension, deadlift, rack pull,
  half-kneeling medball rotational throw, landmine lateral drop lunge,
  front raise pulses, quadruped cross tap, waiter squat overhead, deadbug
  overhead KB reach, side plank cable row, landmine split jerk staggered)
  + 3 new Equipment rows (Polea baja, Maquina de prensa de piernas,
  Maquina de hack squat). All with real YouTube videos found via
  WebSearch, verified locally in a rolled-back transaction.
- `add-timp-library-exercises-batch2.sql`: the 3 that needed the coach's
  own clarification before being added (never guessed):
  - Koichi Plank 1/2 -- coach-specific branded names not findable
    anywhere online. Coach sent 3 real photos from his own filming.
    Described from direct visual observation of those photos, not
    invented: Koichi 1 = half-kneeling thoracic rotation with reach
    (mobility, bodyweight); Koichi 2 = half-kneeling low-to-high cable
    chop. Matched to real YouTube reference videos of the same generic
    movement pattern.
  - Staggered Rack Pull -- confirmed by the coach (text) to be the same
    mechanics as the existing seeded "Monopodal Rack Pull" but in a
    staggered stance (back foot heel-up for partial support) rather than
    fully single-leg. Added as a distinct exercise since it's a
    meaningfully different stance/difficulty, not a duplicate. No public
    reference video combining both terms was found -- left `videoUrl`
    NULL rather than approximate, per standing practice.

Still NOT added: "Dumbbell rotational farmer's walk" and "Inertial
farmer's walk" -- no photos or description came through for these two,
still waiting on the coach to clarify before writing anything (same
"never guess" rule).

## 2026-09-22 -- TIMP library catalog: Dumbbell rotational farmer's walk added

Confirmed by 4 real photos from the coach's own filming. Pattern
confirmed visually: walking hip-hinge with dumbbells hanging low,
transitioning every few steps into a front-rack-at-chest position before
returning to the hinge -- "rotational" refers to the dumbbell path
rotating between hang and rack, not trunk rotation. No public reference
video was found showing that exact combined complex; linked a "DB
Walking RDL" video for the hinge-and-walk half only, and said so
explicitly in the exercise's coachingCues rather than presenting it as
an exact match.

Still NOT added: "Inertial farmer's walk" -- no photos/description yet,
still waiting on the coach.

## 2026-09-22 -- TIMP library catalog complete: Inertial farmer's walk added

Confirmed by 4 real photos. Pattern visible across the frames: standard
two-kettlebell farmer's walk, but one kettlebell is deliberately let
swing like a pendulum instead of held still against the body -- the
opposite of standard farmer's walk technique (which explicitly says to
avoid swinging). "Inertial" = the core/grip must resist the load's own
swinging inertia rather than just support a static weight. Left
`videoUrl` NULL -- no video found showing this exact deliberate-swing
variant, and a standard farmer's walk video would misrepresent it since
standard technique asks for the opposite.

This closes out the TIMP "sept 2" exercise-library catalog task (4
batches total, ~20 exercises added across all of them). Nothing from
those screenshots remains unconfirmed.

## 2026-09-22 -- Staggered Rack Pull: added a video

Coach sent 2 real photos confirming the "Rack pull en posicion staggered"
setup exactly matches what was described (barbell on rack pins, staggered
stance). Coach asked to add a video anyway even though no exact match
exists -- used a real "Staggered Stance Hex Bar Deadlift" video, which
shows the same staggered-leg positioning but from the floor with a hex
bar rather than from the rack pins. Applied via `UPDATE ... WHERE name =`
since the exercise row already exists from the batch-2 script.

## 2026-09-22 -- Language support (Spanish/English) for athletes

Built the full stack for per-athlete language preference, triggered by
Saran (Thai, English-speaking) needing the app in English while the
father needs it in Spanish. Two deliberately separate layers, per a
decision the user made explicitly when asked:

**Layer 1 -- UI chrome (buttons, labels, screens, AI coach chat).** Fully
built, no scope cut:
- `Profile.language` (`"es" | "en"`, default `"es"`) -- new column,
  migration `20260922110102_add_language_support`.
- `apps/api/src/auth.ts`: `authenticate` now also resolves
  `req.language` from the verified Profile. New `attachLanguage` --
  a best-effort, never-401 sibling hook for the routes that stay public
  (exercise/session/program detail, `/exercises` list, `/chat`) -- tries
  the bearer token, falls back to `?lang=`, falls back to `"es"`.
- `PATCH /me` (self-service, athlete's own token) lets the app set its
  own language -- separate from the coach-only `PATCH /athletes/:id`.
- `apps/api/src/mappers.ts`: new `pick(lang, es, en)` helper, exported;
  every translatable field in `loadExerciseDetail`/`loadProgramDetail`/
  `loadSessionDetail` now resolves through it, falling back to Spanish
  per-field if that field hasn't been translated yet -- never a blank
  string.
- AI coach (`apps/api/src/ai/chat.ts`, `tools.ts`): tool results come
  back in the resolved language, and the system prompt gets one appended
  line telling the model to always reply in that language regardless of
  what the athlete types. Tool descriptions/internal reasoning stay
  Spanish (never shown to the athlete) -- only the final reply's
  language is controlled.
- Mobile: `apps/mobile/src/lib/i18n.ts` (a typed `Strings` dictionary,
  `en` checked against `es`'s shape via `satisfies` so a missing key is
  a compile error) + `apps/mobile/src/hooks/use-language.tsx`
  (`LanguageProvider`/`useLanguage()`, caches the last-known language via
  the same SecureStore/localStorage split `lib/supabase.ts` already
  uses, refreshes from `GET /me` on every auth-state change). Every
  screen (`login`, `(tabs)/index`, `(tabs)/programs`, `(tabs)/coach`,
  `(tabs)/profile`, `program/[id]`, `session/[id]`, `exercise/[id]`, the
  root/tab layouts) now reads from `strings` instead of hardcoded
  Spanish. `profile.tsx` got a real language toggle (ES/EN) that calls
  `PATCH /me` optimistically. `lib/format.ts`'s `formatPrescription`/
  `formatEvidence` take a `lang` param.

**Layer 2 -- exercise/program content (names, objectives,
contraindications, coaching cues, taxonomy).** This is the actual
coaching knowledge, not UI copy, so the user was asked explicitly
whether to machine-translate it now (faster, more risk) or hold off and
translate carefully later; the user chose to translate now, on the
condition it goes through this session's own careful pass (not an
unreviewed auto-translate) and gets reviewed in the SQL editor before
running in production, same as every other script this session.
Approach:
- Every translatable model got a nullable `*En` column (`Exercise`:
  `nameEn`/`objectiveEn`/`descriptionEn`/`movementComplexityEn`/
  `contraindicationsEn`/`coachingCuesEn`; `Muscle.nameEn`/
  `muscleGroupEn`; `PhysicalQuality.nameEn`; `Equipment.nameEn`;
  `Sport.nameEn`; `SportTransfer.descriptionEn`; `ExerciseLink.rationaleEn`;
  `Session.labelEn`; `Block.purposeEn`; `BlockExercise.instanceNoteEn`).
- Translated directly (not run through an automated translator): the 17
  original seed.ts exercises (father's program), the 12 `gym-*`
  exercises already in the database, the father's Mov Prep exercise
  ("Marcha en el sitio"), the 3 shoulder exercises added for the padel
  player's rework, all ~21 TIMP-catalog exercises across the 4 batches,
  every taxonomy table (Sport/Muscle/PhysicalQuality/Equipment), the
  father's program's SportTransfer entries, and its one ExerciseLink
  rationale. Session labels translated generically (Mov Prep -> Warm-up,
  Dia N -> Day N) since that text is reused across programs.
- Deliberately NOT translated (gaps, not guesses): "Rotacion interna de
  hombro con banda" (`gym-banded-shoulder-external-rotation`) -- created
  in an earlier session, its exact stored Spanish text was never visible
  in this one, so it wasn't touched rather than risk a mismatched
  paraphrase. Block.purpose/BlockExercise.instanceNote on the father's
  and padel player's *already-assigned* programs -- both are Spanish-
  speaking athletes, so this was deliberately deprioritized versus the
  reusable exercise library, which is what matters for Saran's future
  program.
- Verified end-to-end locally: applied both migrations, ran the full
  translation script for real (not rolled back) against local dev,
  confirmed `GET /exercises/:id?lang=en` vs `?lang=es` return distinct,
  correct content, confirmed `PATCH /me` requires auth (401 without a
  token), confirmed `/chat`'s not-configured fallback message respects
  `?lang=`.

Two SQL scripts for production (Supabase SQL editor, same review
workflow as always): the two generated migrations (add the `language`
column + all the `*En` columns), then the content-translation script
(`UPDATE ... WHERE name = ...`, idempotent, safe to re-run). Both
pasted to the user in chat, not sent as files.

Not done, flagged as follow-ups: translating
`gym-banded-shoulder-external-rotation` (need its real Spanish text
first) and the two existing programs' per-instance Spanish notes if a
non-Spanish-speaking athlete is ever assigned one of them.

## 2026-09-22 -- Language support: fixes from real-device feedback

Coach tested the padel player's program in English and found 3 issues,
all fixed:

1. **"Dia 1"/"Dia 2" not translated for that program.** Root cause: the
   original translation script matched `WHERE label = 'Dia 1'` (exact
   string), and this program's session labels apparently differ from
   that exact string (accent, casing, or whitespace -- can't know which
   without querying production directly, which isn't done in this
   workflow). Fixed properly rather than patched: switched to a regex
   match (`label ~* '^d[ií]a\s*[0-9]+$'`) that handles "Dia 1", "Día 1",
   "DIA 1", extra spaces, etc. -- self-healing, doesn't depend on
   knowing the exact stored text. Verified locally against inserted rows
   with all three variants before handing to the user.
2. **"Mov Prep" renamed to "Calentamiento"** (coach's explicit
   preference, not just a translation -- the Spanish base text itself
   changed) with `labelEn` = "Warm-up" (already correct). Applies to
   every program using that label.
3. **Program.name needed an English variant that isn't a literal
   translation** -- coach wants "Full Body + Shoulder Rehab" in English,
   not a translation of the Spanish title (which keeps its "(jugador
   padel)" framing intentionally, for the coach's own Spanish-side
   reference). Added `Program.nameEn` (new migration), wired through
   `loadProgramDetail` and `GET /me/programs` via the existing `pick()`
   helper -- same pattern as every other translatable field.

This is a good illustration of why the exact-string-match approach was
risky for anything not authored within this session's own visibility:
the fix is now robust to text variants going forward, not just patched
for this one case.

## 2026-09-22 -- repsOrDuration double-suffix bug (pre-existing, surfaced by i18n)

Coach's screenshot showed "10 por lado (per side)" -- a real, pre-existing
data bug (present before this session's language work too, just less
visible in Spanish-only: "10 por lado (por lado)"). Root cause: several
`BlockExercise.repsOrDuration` values had the unit wording typed directly
into the free-text field ("10 por lado", "8 repeticiones"), and
`formatPrescription` *also* appends its own unit suffix based on
`prescriptionType` -- so it doubled up. Fixed at the data level (not a
`*En` field -- once the redundant unit text is stripped, the same numeric
value is correct in both languages): regex-based `UPDATE` that strips a
trailing "por lado" from `reps_per_side` rows and "repeticiones" from
`reps` rows, keeping any other descriptive words ("10 pasos por lado" ->
"10 pasos"). Left `distance`-type rows alone since the UI never appends a
suffix to those. Verified against the 9 affected rows in local dev (8
fixed, 1 correctly left untouched).

Also, on direct feedback: added `nameEn` for "Rotacion externa de hombro
con banda" (its exact Spanish name was finally seen, in the coach's
screenshot) and translated the padel player program's Mov Prep
`Block.purpose`/`BlockExercise.instanceNote` (previously deprioritized as
lower-value since that athlete is Spanish-speaking -- reversed once the
coach was actually looking at it in English).

## 2026-09-22 -- API deploy failing: Prisma migration tracking out of sync

Root cause found and fixed. The API's Render `startCommand` runs
`prisma migrate deploy` on every deploy/restart. The 3 language-support
migrations were applied to production by having the coach paste their
`ALTER TABLE` SQL directly into Supabase's SQL editor (this session's
usual workflow for schema changes) rather than through `prisma migrate
deploy` itself -- so Prisma's own bookkeeping table
(`_prisma_migrations`) never got a record of them. On the next deploy,
`prisma migrate deploy` tried to re-apply those same migrations, hit
`column already exists` (error P3018), and left a **failed** migration
record behind -- which blocks every subsequent deploy until resolved,
not just that one attempt.

Reproduced exactly in local dev (deleted the 3 migration rows from
`_prisma_migrations`, ran `prisma migrate deploy`, got the identical
P3018 "already exists" error with a stuck failed record) before writing
the fix, and verified the fix resolves it (`prisma migrate deploy`
reports "No pending migrations to apply" afterward). Fix: a SQL script
that deletes any partial/failed record for those 3 migration names and
inserts clean "applied" rows with the real SHA-256 checksums of each
migration.sql file (computed locally with `sha256sum`, matching what
`prisma migrate resolve --applied` would compute) -- this only touches
Prisma's internal tracking table, never the app's own data.

**Process lesson for future schema changes**: giving the coach raw
`ALTER TABLE` SQL to paste (fine for the many earlier *content* scripts,
`INSERT`/`UPDATE` by name) is NOT fine for *schema* migrations specifically,
since this app's deploy pipeline auto-runs `prisma migrate deploy`. Going
forward, schema migrations should either (a) be deployed by letting
Render's own `prisma migrate deploy` apply them (i.e. don't pre-apply the
ALTER TABLE by hand at all, just deploy the code and let the startCommand
run it), or (b) if pre-applied by hand for any reason, immediately be
paired with a `_prisma_migrations` bookkeeping fix like this one.

## 2026-09-22 -- Language-dependent responses were getting cached, showing stale Spanish

After the API deploy finally succeeded and the DB content was confirmed
correct (verified with a direct `?lang=en` request to the API, which
returned everything correctly in English), the mobile app was still
showing Spanish data for the same program even though the coach's own
Profile.language was confirmed "en" (Profile tab showed the toggle
correctly highlighted, GET /me round-tripped correctly). Diagnosis: the
mobile app's plain `GET /programs/:id` (no `?lang=` -- it relies on the
bearer token to resolve language server-side, see auth.ts attachLanguage)
is the exact same URL regardless of the caller's language, so nothing in
the URL itself changes when someone switches language. Without an
explicit no-cache directive, a browser (this was on Safari/iPadOS) can
serve back a stale response cached from before the language switch.
Fixed on both ends: `Cache-Control: no-store` added to every response
from `authenticate`/`attachLanguage`-gated routes (apps/api/src/auth.ts),
plus `cache: "no-store"` on the mobile client's own fetch calls
(apps/mobile/src/lib/api.ts) as defense-in-depth. Confirmed via the
direct-URL test (which bypassed the app's cached URL and used a
distinct, never-before-requested URL with `?lang=en`) that the data and
server logic were already correct -- this was purely a caching bug, not
a data or resolution bug.

## 2026-09-22 -- Language toggle silently failed to save server-side

Root cause of "nothing translates even though Profile shows English
selected, even in a private tab": the language toggle
(apps/mobile/src/hooks/use-language.tsx) updated the screen optimistically
the instant it was tapped, then fired the `PATCH /me` save in the
background with only a `console.error` on failure -- no visible error,
no rollback. Confirmed directly: `SELECT language FROM "Profile" WHERE
role = 'coach'` showed `'es'` in production despite the app showing
"English" highlighted. Every language-dependent server response
(program name, session labels, exercise content) was correctly reading
the *real* (still-Spanish) Profile.language all along -- there was
never a caching or resolution bug; the save itself just never landed,
and nothing surfaced that.

Fixed properly, not just patched for this one case: `setLanguage` is no
longer optimistic -- it awaits the `PATCH /me` response and only updates
the screen (and the local cache) once the server confirms it, with a new
`error` field on the language context that `profile.tsx` now displays
visibly (plus a spinner on the button while saving) if the save fails
for any reason (dropped connection, the API's free-tier cold start,
anything). This can't silently drift out of sync with the server again.

Also fixed the coach's own account directly via SQL
(`UPDATE "Profile" SET language = 'en' WHERE role = 'coach'`) so
testing isn't blocked on redeploying first.

## 2026-09-22 -- Root cause of the language save failure: CORS blocked PATCH entirely

Found and confirmed by reading `node_modules/@fastify/cors/index.js`
directly (not documented anywhere obvious): `@fastify/cors`'s own
default `methods` option is `'GET,HEAD,POST'` -- NOT the commonly
assumed REST default. `apps/api/src/index.ts` registered cors with only
`{ origin: true }`, never overriding `methods`, so PATCH (and PUT,
DELETE) were never in `Access-Control-Allow-Methods` for any
cross-origin request. Every deployed client is cross-origin from the API
(app-workout-web and app-workout-admin are separate Render static
sites from app-workout-api) -- so this silently blocked ALL PATCH/PUT/
DELETE calls in production from any client, not just the language
toggle: the whole admin app's write operations (editing exercises,
taxonomy, athletes, block exercises -- everything using PATCH/PUT/DELETE
in routes/*-admin.ts and taxonomy.ts) have likely been broken the same
way whenever used from the deployed app-workout-admin site, independent
of this session's language work. A browser blocking a request via CORS
reports it to `fetch()` as a generic network error, which is why this
surfaced as "check your internet connection" rather than any kind of
permissions or CORS-specific error.

Verified directly: sent the real preflight request format a browser
sends (`OPTIONS /me` with `Access-Control-Request-Method: PATCH`)
against the local dev server. Before the fix: `Access-Control-Allow-
Methods` came back without PATCH. After adding `methods: ["GET", "HEAD",
"POST", "PUT", "PATCH", "DELETE"]` to the cors registration: confirmed
present.

This explains the entire language-toggle debugging saga from earlier
today -- there was never a caching bug or a language-resolution bug
requiring investigation; the toggle's PATCH request was being silently
dropped by the browser before it ever reached the server, on every
single attempt, this whole time.
