// Maps Prisma query results onto the shared API contract types. Both the
// REST routes and the AI tools import from here, so the AI sees exactly the
// same exercise shape a client would -- one source of truth for "what an
// exercise looks like once it leaves the database."
import type { ExerciseDetail, ProgramDetail, SessionDetail } from "@app-workout/shared";
import type { Lang } from "./auth.js";
import { prisma } from "./db.js";

// Every translatable field is a same-shape pair: the Spanish original
// (never null) and an optional English translation. In "en" mode we use
// the translation only if one actually exists -- an exercise that hasn't
// been translated yet still reads correctly in Spanish rather than
// showing a blank field. See PROJECT_STATE.md, language-support entry.
export function pick(lang: Lang, es: string, en: string | null): string;
export function pick(lang: Lang, es: string | null, en: string | null): string | null;
export function pick(lang: Lang, es: string | null, en: string | null): string | null {
  return lang === "en" && en ? en : es;
}

export async function loadExerciseDetail(
  id: string,
  lang: Lang = "es",
): Promise<ExerciseDetail | null> {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      physicalQualities: { include: { quality: true } },
      muscles: { include: { muscle: true } },
      equipment: { include: { equipment: true } },
      linksFrom: { include: { toExercise: true } },
      sportTransfers: { include: { sport: true } },
    },
  });
  if (!exercise) return null;

  return {
    id: exercise.id,
    name: pick(lang, exercise.name, exercise.nameEn),
    videoUrl: exercise.videoUrl,
    thumbnailUrl: exercise.thumbnailUrl,
    aliases: exercise.aliases,
    objective: pick(lang, exercise.objective, exercise.objectiveEn),
    description: pick(lang, exercise.description, exercise.descriptionEn),
    movementComplexity: pick(lang, exercise.movementComplexity, exercise.movementComplexityEn),
    contraindications: pick(lang, exercise.contraindications, exercise.contraindicationsEn),
    coachingCues: pick(lang, exercise.coachingCues, exercise.coachingCuesEn),
    evidenceRating: exercise.evidenceRating,
    physicalQualities: exercise.physicalQualities.map((pq) => ({
      id: pq.quality.id,
      name: pick(lang, pq.quality.name, pq.quality.nameEn),
      emphasis: pq.emphasis,
    })),
    muscles: exercise.muscles.map((m) => ({
      id: m.muscle.id,
      name: pick(lang, m.muscle.name, m.muscle.nameEn),
      muscleGroup: pick(lang, m.muscle.muscleGroup, m.muscle.muscleGroupEn),
      emphasis: m.emphasis,
    })),
    equipment: exercise.equipment.map((eq) => ({
      id: eq.equipment.id,
      name: pick(lang, eq.equipment.name, eq.equipment.nameEn),
      required: eq.required,
    })),
    links: exercise.linksFrom.map((l) => ({
      id: l.id,
      relationshipType: l.relationshipType,
      rationale: pick(lang, l.rationale, l.rationaleEn),
      exercise: {
        id: l.toExercise.id,
        name: pick(lang, l.toExercise.name, l.toExercise.nameEn),
        videoUrl: l.toExercise.videoUrl,
        thumbnailUrl: l.toExercise.thumbnailUrl,
      },
    })),
    sportTransfers: exercise.sportTransfers.map((st) => ({
      id: st.id,
      sportName: pick(lang, st.sport.name, st.sport.nameEn),
      description: pick(lang, st.description, st.descriptionEn),
      evidenceRating: st.evidenceRating,
    })),
  };
}

export async function loadProgramDetail(
  id: string,
  lang: Lang = "es",
): Promise<ProgramDetail | null> {
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      sport: true,
      sessions: {
        orderBy: { order: "asc" },
        include: { blocks: { include: { exercises: true } } },
      },
    },
  });
  if (!program) return null;

  return {
    id: program.id,
    name: program.name,
    sportName: pick(lang, program.sport.name, program.sport.nameEn),
    startDate: program.startDate.toISOString(),
    endDate: program.endDate.toISOString(),
    dayCount: program.sessions.length,
    sessions: program.sessions.map((s) => ({
      id: s.id,
      label: pick(lang, s.label, s.labelEn),
      order: s.order,
      role: s.role,
      blockCount: s.blocks.length,
      exerciseCount: s.blocks.reduce((sum, b) => sum + b.exercises.length, 0),
    })),
  };
}

export async function loadSessionDetail(
  id: string,
  lang: Lang = "es",
): Promise<SessionDetail | null> {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { exercise: true },
          },
        },
      },
    },
  });
  if (!session) return null;

  return {
    id: session.id,
    label: pick(lang, session.label, session.labelEn),
    order: session.order,
    role: session.role,
    blockCount: session.blocks.length,
    exerciseCount: session.blocks.reduce((sum, b) => sum + b.exercises.length, 0),
    blocks: session.blocks.map((b) => ({
      id: b.id,
      order: b.order,
      blockType: b.blockType,
      rounds: b.rounds,
      purpose: pick(lang, b.purpose, b.purposeEn),
      exercises: b.exercises.map((be) => ({
        id: be.id,
        order: be.order,
        prescriptionType: be.prescriptionType,
        sets: be.sets,
        repsOrDuration: be.repsOrDuration,
        load: be.load,
        tempo: be.tempo,
        rest: be.rest,
        instanceNote: pick(lang, be.instanceNote, be.instanceNoteEn),
        exercise: {
          id: be.exercise.id,
          name: pick(lang, be.exercise.name, be.exercise.nameEn),
          videoUrl: be.exercise.videoUrl,
          thumbnailUrl: be.exercise.thumbnailUrl,
        },
      })),
    })),
  };
}
