# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Two primary audiences with different jobs:

- **Padel players**, from complete beginners to competitive players, many of whom are new to strength training. They open the app on their phone at the club, court, or gym to follow the session they've been assigned. They also ask the Coach why an exercise is there, or what to do instead when they're missing equipment, something hurts, or it's too hard.
- **Strength & conditioning coaches**, who build programs and assign them to their players. **Today they do this in a separate, external coaching app, not in this one.** That app is the source of the programs. This app should integrate with it (import or sync) rather than replace it. The seeded program was transcribed from that app's screenshots.

## Product Purpose

An AI-powered strength & conditioning platform, starting with padel. Every exercise answers "why am I doing this": the physical qualities it trains, its contraindications, how good the evidence is, and how it transfers to the sport. Success means a player understands and trusts the work their coach assigned, and the coach's programming arrives already explained, without the coach writing that explanation by hand.

## Positioning

The exercise database is the product's actual knowledge, and the AI is only the interface to it. The Coach is a retrieval-grounded reasoner. It selects and explains using structured data it queries (a knowledge graph of qualities, muscles, equipment, progressions, regressions, and alternatives). It never invents or recalls exercise facts from its own memory, and it says plainly when evidence is thin. It is not an exercise library with a chatbot bolted on.

## Operating Context

- Players use it on their phone at the club, court, or gym, often between efforts or on the court itself.
- Navigation hierarchy: Programs → Sessions → Blocks → Exercises → Exercise detail. The Coach tab is the other primary surface, not a navigation leaf.
- Programs are structured as days (e.g. "Dia 1") of numbered blocks ("Bloque 1"), plus prep sessions ("Mov Prep"), with rep schemes and rounds.

## Capabilities and Constraints

- Today: browse programs down to exercise detail (objective, cues, contraindications, evidence rating, sport transfer, and linked progressions, regressions and alternatives), plus a Coach chat grounded in the `search_exercises` and `get_exercise_detail` tools.
- Program building and assignment happen in the coach's **external app**, which stays the source of truth. The intended direction is to integrate with it (import or sync). The mechanism is **undecided**, and nothing is built yet. Programs currently come in by hand, through the seed.
- Who authors and enriches exercises (the coach in this app, an admin tool, or the product team) is **undecided**.
- There are no accounts, athlete profiles, or ownership yet. That is a deliberate scope cut until the athlete/coach model is designed properly.
- Expo (React Native + Expo Router) for iOS, Android, and web from one codebase. The data model is sport-agnostic, but the v1 product surface is padel-specific on purpose. Don't generalize the UI for other sports before padel is validated.
- The Coach degrades gracefully without an API key and shows a clear "not configured" message.
- Exercise video/thumbnail fields exist but aren't populated yet.
- Terminology (Spanish UI): Programa, Sesión, Bloque, Ejercicio, Coach, Inicio, Perfil.

## Brand Commitments

- Must ship in **Spanish and English**. The current copy is Spanish only, with no i18n yet.
- Voice: direct, informal coach-to-player ("tú"). Concise, like a real coach talking to a player, not a report. Say honestly when evidence is limited.
- Product name: **undecided** (the app config still uses the placeholder "mobile"). No logo or brand assets exist yet.

## Evidence on Hand

- One real program, "julio y el resto" (20/07/2026–31/07/2026), transcribed from real screenshots of the coach's external app in `apps/api/prisma/seed.ts`. Several blocks are knowingly missing. Fill them only from real source screenshots, never from plausible guesses.
- Five exercises are fully authored end to end. The rest have a real objective and at least one tag.
- No testimonials, users, metrics, or published claims exist. Don't invent any.

## Product Principles

1. **Every exercise explains itself.** "Why am I doing this" is a first-class answer on every surface, never buried.
2. **Grounded, never guessed.** Anything the product claims about an exercise comes from structured data. Uncertainty is shown, not smoothed over.
3. **Safety lives in the data.** Contraindications and regressions are real relationships the product surfaces, not advice it hopes to give.
4. **Meet every level.** The same content has to serve a first-time lifter and a competitive player, so explanation depth adapts to the person.
5. **Built for the court.** The player's moment is quick, on-site, and phone-in-hand. It has to be usable between efforts.

## Accessibility & Inclusion

- Bilingual (ES/EN) from the start of the design work. Layouts must tolerate longer English or Spanish strings.
- Used outdoors and on court, so it must hold up in bright light and be operable at a glance with quick, low-precision taps. No formal standard has been set yet.
