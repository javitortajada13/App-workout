// Coach-only endpoints for the basic athlete/program relationship: seeing
// which athletes exist and assigning a program to one of them. There is no
// program-authoring API yet (M4) -- this only wires up ownership of
// programs that already exist (seeded, or created directly in Prisma
// Studio), which is enough to make "each athlete sees only their own
// program" possible.
import type { AthleteSummary } from "@app-workout/shared";
import type { FastifyInstance } from "fastify";
import { authenticate, requireCoach } from "../auth.js";
import { prisma } from "../db.js";

export function registerAthleteRoutes(app: FastifyInstance) {
  app.get(
    "/athletes",
    { onRequest: [authenticate, requireCoach] },
    async (): Promise<AthleteSummary[]> => {
      const athletes = await prisma.profile.findMany({
        where: { role: "athlete" },
        orderBy: { createdAt: "asc" },
        include: {
          programsAsAthlete: {
            where: { status: "active" },
            select: { id: true, name: true },
          },
        },
      });

      return athletes.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        athleteLevel: a.athleteLevel,
        activeProgram: a.programsAsAthlete[0] ?? null,
      }));
    },
  );

  // Assigns an existing program to an athlete. If that athlete already has
  // a different active program, it's archived rather than deleted or
  // overwritten -- per the standing decision that program history is never
  // lost (see PROJECT_STATE.md section 13).
  app.post<{ Params: { id: string }; Body: { programId?: string } }>(
    "/athletes/:id/assign-program",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const athleteId = req.params.id;
      const { programId } = req.body ?? {};
      if (!programId) {
        return reply.code(400).send({ error: "programId is required" });
      }

      const athlete = await prisma.profile.findUnique({ where: { id: athleteId } });
      if (!athlete || athlete.role !== "athlete") {
        return reply.code(404).send({ error: "Athlete not found" });
      }

      const program = await prisma.program.findUnique({ where: { id: programId } });
      if (!program) {
        return reply.code(404).send({ error: "Program not found" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.program.updateMany({
          where: { athleteId, status: "active", NOT: { id: programId } },
          data: { status: "archived" },
        });

        return tx.program.update({
          where: { id: programId },
          data: { athleteId, coachId: req.user!.id, status: "active" },
        });
      });

      return updated;
    },
  );
}
