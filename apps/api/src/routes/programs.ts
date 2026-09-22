import type { MyProgramSummary } from "@app-workout/shared";
import type { FastifyInstance } from "fastify";
import { attachLanguage, authenticate } from "../auth.js";
import { prisma } from "../db.js";
import { loadExerciseDetail, loadProgramDetail, loadSessionDetail, pick } from "../mappers.js";

export function registerProgramRoutes(app: FastifyInstance) {
  // GET /programs (public, unscoped -- returned every program to anyone)
  // is gone: the seeded program is now actually assigned to a real
  // athlete, so every client was switched to GET /me/programs below
  // instead. See PROJECT_STATE.md section 13, M2 log.
  //
  // Note: /programs/:id, /sessions/:id and /exercises/:id below are
  // still public/unscoped -- locking those down needs checking ownership
  // through the Session/Block chain up to Program, which is more than
  // this pass covers. Flagged as a follow-up, not silently left.

  // Athlete-scoped: only programs assigned to the calling profile. A coach
  // sees every non-archived program (they need visibility across
  // athletes); an athlete sees only their own active program(s).
  app.get("/me/programs", { onRequest: authenticate }, async (req): Promise<MyProgramSummary[]> => {
    const isCoach = req.user!.role === "coach";
    const programs = await prisma.program.findMany({
      where: isCoach
        ? { status: { not: "archived" } }
        : { athleteId: req.user!.id, status: "active" },
      include: { sport: true, sessions: { select: { id: true } } },
      orderBy: { startDate: "desc" },
    });
    return programs.map((p) => ({
      id: p.id,
      name: pick(req.language, p.name, p.nameEn),
      sportName: pick(req.language, p.sport.name, p.sport.nameEn),
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      dayCount: p.sessions.length,
      status: p.status,
    }));
  });

  app.get<{ Params: { id: string } }>(
    "/programs/:id",
    { onRequest: attachLanguage },
    async (req, reply) => {
      const program = await loadProgramDetail(req.params.id, req.language);
      if (!program) return reply.code(404).send({ error: "Program not found" });
      return program;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/sessions/:id",
    { onRequest: attachLanguage },
    async (req, reply) => {
      const session = await loadSessionDetail(req.params.id, req.language);
      if (!session) return reply.code(404).send({ error: "Session not found" });
      return session;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/exercises/:id",
    { onRequest: attachLanguage },
    async (req, reply) => {
      const exercise = await loadExerciseDetail(req.params.id, req.language);
      if (!exercise) return reply.code(404).send({ error: "Exercise not found" });
      return exercise;
    },
  );

  // Lightweight listing -- lets a coach find an exercise to edit without
  // fetching every relationship for every row (that's what /exercises/:id
  // is for). Public, same as the detail route above.
  app.get("/exercises", { onRequest: attachLanguage }, async (req) => {
    const exercises = await prisma.exercise.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        objective: true,
        objectiveEn: true,
        evidenceRating: true,
        videoUrl: true,
        thumbnailUrl: true,
      },
    });
    return exercises.map((e) => ({
      id: e.id,
      name: pick(req.language, e.name, e.nameEn),
      objective: pick(req.language, e.objective, e.objectiveEn),
      evidenceRating: e.evidenceRating,
      videoUrl: e.videoUrl,
      thumbnailUrl: e.thumbnailUrl,
    }));
  });
}
