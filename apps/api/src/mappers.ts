// Maps Prisma query results onto the shared API contract types. Both the
// REST routes and the AI tools import from here, so the AI sees exactly the
// same exercise shape a client would -- one source of truth for "what an
// exercise looks like once it leaves the database."
import type {
  ExerciseDetail,
  ProgramDetail,
  ProgramSummary,
  SessionDetail,
} from "@app-workout/shared";
import { prisma } from "./db.js";

export async function loadExerciseDetail(id: string): Promise<ExerciseDetail | null> {
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
    name: exercise.name,
    videoUrl: exercise.videoUrl,
    thumbnailUrl: exercise.thumbnailUrl,
    objective: exercise.objective,
    movementComplexity: exercise.movementComplexity,
    contraindications: exercise.contraindications,
    coachingCues: exercise.coachingCues,
    evidenceRating: exercise.evidenceRating,
    physicalQualities: exercise.physicalQualities.map((pq) => ({
      id: pq.quality.id,
      name: pq.quality.name,
      emphasis: pq.emphasis,
    })),
    muscles: exercise.muscles.map((m) => ({
      id: m.muscle.id,
      name: m.muscle.name,
      muscleGroup: m.muscle.muscleGroup,
      emphasis: m.emphasis,
    })),
    equipment: exercise.equipment.map((eq) => ({
      id: eq.equipment.id,
      name: eq.equipment.name,
      required: eq.required,
    })),
    links: exercise.linksFrom.map((l) => ({
      relationshipType: l.relationshipType,
      rationale: l.rationale,
      exercise: {
        id: l.toExercise.id,
        name: l.toExercise.name,
        videoUrl: l.toExercise.videoUrl,
        thumbnailUrl: l.toExercise.thumbnailUrl,
      },
    })),
    sportTransfers: exercise.sportTransfers.map((st) => ({
      sportName: st.sport.name,
      description: st.description,
      evidenceRating: st.evidenceRating,
    })),
  };
}

export async function loadProgramSummaries(): Promise<ProgramSummary[]> {
  const programs = await prisma.program.findMany({
    include: { sport: true, sessions: { select: { id: true } } },
    orderBy: { startDate: "desc" },
  });
  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    sportName: p.sport.name,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    dayCount: p.sessions.length,
  }));
}

export async function loadProgramDetail(id: string): Promise<ProgramDetail | null> {
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
    sportName: program.sport.name,
    startDate: program.startDate.toISOString(),
    endDate: program.endDate.toISOString(),
    dayCount: program.sessions.length,
    sessions: program.sessions.map((s) => ({
      id: s.id,
      label: s.label,
      order: s.order,
      role: s.role,
      blockCount: s.blocks.length,
      exerciseCount: s.blocks.reduce((sum, b) => sum + b.exercises.length, 0),
    })),
  };
}

export async function loadSessionDetail(id: string): Promise<SessionDetail | null> {
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
    label: session.label,
    order: session.order,
    role: session.role,
    blockCount: session.blocks.length,
    exerciseCount: session.blocks.reduce((sum, b) => sum + b.exercises.length, 0),
    blocks: session.blocks.map((b) => ({
      id: b.id,
      order: b.order,
      blockType: b.blockType,
      rounds: b.rounds,
      purpose: b.purpose,
      exercises: b.exercises.map((be) => ({
        id: be.id,
        order: be.order,
        prescriptionType: be.prescriptionType,
        sets: be.sets,
        repsOrDuration: be.repsOrDuration,
        load: be.load,
        tempo: be.tempo,
        rest: be.rest,
        instanceNote: be.instanceNote,
        exercise: {
          id: be.exercise.id,
          name: be.exercise.name,
          videoUrl: be.exercise.videoUrl,
          thumbnailUrl: be.exercise.thumbnailUrl,
        },
      })),
    })),
  };
}
