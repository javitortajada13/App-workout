import type { FastifyInstance } from "fastify";
import {
  loadExerciseDetail,
  loadProgramDetail,
  loadProgramSummaries,
  loadSessionDetail,
} from "../mappers.js";

export function registerProgramRoutes(app: FastifyInstance) {
  app.get("/programs", async () => loadProgramSummaries());

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
