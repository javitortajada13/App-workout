import type { MyProgramSummary } from "@app-workout/shared";
import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth.js";
import { prisma } from "../db.js";
import {
  loadExerciseDetail,
  loadProgramDetail,
  loadProgramSummaries,
  loadSessionDetail,
} from "../mappers.js";

export function registerProgramRoutes(app: FastifyInstance) {
  // Deliberately left public and unscoped for now -- flipping this to
  // require auth and filter by athleteId would immediately hide the one
  // seeded program from every athlete, since it has no athleteId yet (see
  // PROJECT_STATE.md section 13, M2 log: the seeded program still needs to
  // be assigned to a real athlete, which only the coach can decide). Once
  // that assignment exists, clients should switch to GET /me/programs
  // below and this route can be locked down.
  app.get("/programs", async () => loadProgramSummaries());

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
      name: p.name,
      sportName: p.sport.name,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      dayCount: p.sessions.length,
      status: p.status,
    }));
  });

  app.get<{ Params: { id: string } }>("/programs/:id", async (req, reply) => {
    const program = await loadProgramDetail(req.params.id);
    if (!program) return reply.code(404).send({ error: "Program not found" });
    return program;
  });

  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const session = await loadSessionDetail(req.params.id);
    if (!session) return reply.code(404).send({ error: "Session not found" });
    return session;
  });

  app.get<{ Params: { id: string } }>("/exercises/:id", async (req, reply) => {
    const exercise = await loadExerciseDetail(req.params.id);
    if (!exercise) return reply.code(404).send({ error: "Exercise not found" });
    return exercise;
  });
}
