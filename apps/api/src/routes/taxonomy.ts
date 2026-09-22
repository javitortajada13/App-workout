// The lookup tables an exercise is built from (muscles, equipment,
// physical qualities, sports). Reads are public -- there's nothing
// sensitive here and a future exercise-builder UI needs them to populate
// pickers. Writes are coach-only: these are shared vocabulary, not
// per-athlete data.
import type { FastifyInstance } from "fastify";
import { authenticate, requireCoach } from "../auth.js";
import { prisma } from "../db.js";

export function registerTaxonomyRoutes(app: FastifyInstance) {
  app.get("/muscles", async () => prisma.muscle.findMany({ orderBy: { name: "asc" } }));

  app.post<{ Body: { name?: string; muscleGroup?: string } }>(
    "/muscles",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const name = req.body?.name?.trim();
      if (!name) return reply.code(400).send({ error: "name is required" });
      const muscle = await prisma.muscle.create({
        data: { name, muscleGroup: req.body?.muscleGroup?.trim() || null },
      });
      return reply.code(201).send(muscle);
    },
  );

  app.get("/equipment", async () => prisma.equipment.findMany({ orderBy: { name: "asc" } }));

  app.post<{ Body: { name?: string } }>(
    "/equipment",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const name = req.body?.name?.trim();
      if (!name) return reply.code(400).send({ error: "name is required" });
      const equipment = await prisma.equipment.create({ data: { name } });
      return reply.code(201).send(equipment);
    },
  );

  app.get("/physical-qualities", async () =>
    prisma.physicalQuality.findMany({ orderBy: { name: "asc" } }),
  );

  app.post<{ Body: { name?: string } }>(
    "/physical-qualities",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const name = req.body?.name?.trim();
      if (!name) return reply.code(400).send({ error: "name is required" });
      const quality = await prisma.physicalQuality.create({ data: { name } });
      return reply.code(201).send(quality);
    },
  );

  app.get("/sports", async () => prisma.sport.findMany({ orderBy: { name: "asc" } }));

  app.post<{ Body: { name?: string } }>(
    "/sports",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const name = req.body?.name?.trim();
      if (!name) return reply.code(400).send({ error: "name is required" });
      const sport = await prisma.sport.create({ data: { name } });
      return reply.code(201).send(sport);
    },
  );
}
