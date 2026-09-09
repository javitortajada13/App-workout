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

**UNRESOLVED DECISION** (all of these — do not resolve without asking the user):

1. **Navigation hierarchy** — see Section 2. Artifact proposes a Block
   screen and a Profile-gated entry; `CLAUDE.md` proposes a simpler
   4-tab-plus-drilldown; the code matches neither exactly (no Block screen
   at all).
2. **Program ownership** — the `padel-coach-data-model.md` artifact's ER
   diagram lists `coach_id`/`athlete_id` directly on `PROGRAM`. The actual
   schema has neither field — only `coachNote` — and `CLAUDE.md` frames the
   absence of any owner model as a deliberate, not-yet-designed decision.
   The artifact predates that explicit deferral.
3. **Difficulty as "three axes"** — the artifact argues for three separate
   axes (intrinsic movement complexity, athlete level, prescribed load).
   Only `movementComplexity` is modeled anywhere; "athlete level" has no
   representation in schema or shared types.
4. **Coach chat citations** — the mockup shows tappable in-chat citations;
   the API supports it (`citedExerciseIds`); the real Coach screen doesn't
   use it.
5. **Visual identity** — the mockup artifact specifies a dark-canvas/teal
   design system; the actual Expo app is still on unbranded template
   defaults.

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
