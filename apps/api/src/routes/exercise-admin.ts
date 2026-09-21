// M3: the exercise-library write API. Reads already existed (GET
// /exercises/:id in routes/programs.ts, backed by mappers.ts) -- this is
// what lets a coach actually grow the knowledge graph (exercises, and
// their muscles/equipment/physical-qualities/links/sport-transfers)
// instead of it only ever being seeded from a script. All coach-only:
// this is shared knowledge, not per-athlete data.
import type { FastifyInstance } from "fastify";
import { authenticate, requireCoach } from "../auth.js";
import { isRecordNotFoundError, isUniqueConstraintError, prisma } from "../db.js";
import { Emphasis, EvidenceRating, ExerciseLinkType } from "../generated/prisma/enums.js";

interface ExerciseBody {
  name?: string;
  aliases?: string[];
  objective?: string;
  description?: string | null;
  movementComplexity?: string | null;
  contraindications?: string | null;
  coachingCues?: string | null;
  evidenceRating?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
}

function isValidEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === "string" && Object.values(enumObject).includes(value);
}

export function registerExerciseAdminRoutes(app: FastifyInstance) {
  app.post<{ Body: ExerciseBody }>(
    "/exercises",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const { name, objective, evidenceRating } = req.body ?? {};
      if (!name?.trim()) return reply.code(400).send({ error: "name is required" });
      if (!objective?.trim()) return reply.code(400).send({ error: "objective is required" });
      if (evidenceRating != null && !isValidEnumValue(EvidenceRating, evidenceRating)) {
        return reply.code(400).send({ error: "Invalid evidenceRating" });
      }

      try {
        const exercise = await prisma.exercise.create({
          data: {
            name: name.trim(),
            objective: objective.trim(),
            aliases: req.body.aliases ?? [],
            description: req.body.description ?? null,
            movementComplexity: req.body.movementComplexity ?? null,
            contraindications: req.body.contraindications ?? null,
            coachingCues: req.body.coachingCues ?? null,
            evidenceRating: evidenceRating as EvidenceRating | null,
            videoUrl: req.body.videoUrl ?? null,
            thumbnailUrl: req.body.thumbnailUrl ?? null,
          },
        });
        return reply.code(201).send(exercise);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return reply.code(409).send({ error: "An exercise with this name already exists" });
        }
        throw err;
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: ExerciseBody }>(
    "/exercises/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const body = req.body ?? {};
      if (body.name !== undefined && !body.name.trim()) {
        return reply.code(400).send({ error: "name cannot be empty" });
      }
      if (body.objective !== undefined && !body.objective.trim()) {
        return reply.code(400).send({ error: "objective cannot be empty" });
      }
      if (body.evidenceRating != null && !isValidEnumValue(EvidenceRating, body.evidenceRating)) {
        return reply.code(400).send({ error: "Invalid evidenceRating" });
      }

      try {
        const exercise = await prisma.exercise.update({
          where: { id: req.params.id },
          data: {
            ...(body.name !== undefined && { name: body.name.trim() }),
            ...(body.aliases !== undefined && { aliases: body.aliases }),
            ...(body.objective !== undefined && { objective: body.objective.trim() }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.movementComplexity !== undefined && {
              movementComplexity: body.movementComplexity,
            }),
            ...(body.contraindications !== undefined && {
              contraindications: body.contraindications,
            }),
            ...(body.coachingCues !== undefined && { coachingCues: body.coachingCues }),
            ...(body.evidenceRating !== undefined && {
              evidenceRating: body.evidenceRating as EvidenceRating | null,
            }),
            ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
            ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
          },
        });
        return exercise;
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Exercise not found" });
        }
        if (isUniqueConstraintError(err)) {
          return reply.code(409).send({ error: "An exercise with this name already exists" });
        }
        throw err;
      }
    },
  );

  // Refuses to delete an exercise that's actually prescribed somewhere --
  // silently cascading that away would quietly break a coach's existing
  // programs. The coach has to remove it from those blocks first.
  app.delete<{ Params: { id: string } }>(
    "/exercises/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const usageCount = await prisma.blockExercise.count({
        where: { exerciseId: req.params.id },
      });
      if (usageCount > 0) {
        return reply.code(409).send({
          error: `Exercise is used in ${usageCount} program block(s); remove it from those first`,
        });
      }

      try {
        await prisma.exercise.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Exercise not found" });
        }
        throw err;
      }
    },
  );

  // --- Relationships: physical qualities, muscles, equipment ---
  // Same shape for all three: PUT upserts the link (idempotent -- calling
  // it again just updates emphasis/required), DELETE removes it.

  app.put<{ Params: { exerciseId: string; qualityId: string }; Body: { emphasis?: string } }>(
    "/exercises/:exerciseId/physical-qualities/:qualityId",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const emphasis = req.body?.emphasis ?? Emphasis.primary;
      if (!isValidEnumValue(Emphasis, emphasis)) {
        return reply.code(400).send({ error: "Invalid emphasis" });
      }
      const { exerciseId, qualityId } = req.params;
      try {
        return await prisma.exercisePhysicalQuality.upsert({
          where: { exerciseId_qualityId: { exerciseId, qualityId } },
          update: { emphasis },
          create: { exerciseId, qualityId, emphasis },
        });
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Exercise or physical quality not found" });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { exerciseId: string; qualityId: string } }>(
    "/exercises/:exerciseId/physical-qualities/:qualityId",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.exercisePhysicalQuality.delete({
          where: {
            exerciseId_qualityId: {
              exerciseId: req.params.exerciseId,
              qualityId: req.params.qualityId,
            },
          },
        });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Link not found" });
        throw err;
      }
    },
  );

  app.put<{ Params: { exerciseId: string; muscleId: string }; Body: { emphasis?: string } }>(
    "/exercises/:exerciseId/muscles/:muscleId",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const emphasis = req.body?.emphasis ?? Emphasis.primary;
      if (!isValidEnumValue(Emphasis, emphasis)) {
        return reply.code(400).send({ error: "Invalid emphasis" });
      }
      const { exerciseId, muscleId } = req.params;
      try {
        return await prisma.exerciseMuscle.upsert({
          where: { exerciseId_muscleId: { exerciseId, muscleId } },
          update: { emphasis },
          create: { exerciseId, muscleId, emphasis },
        });
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Exercise or muscle not found" });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { exerciseId: string; muscleId: string } }>(
    "/exercises/:exerciseId/muscles/:muscleId",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.exerciseMuscle.delete({
          where: {
            exerciseId_muscleId: { exerciseId: req.params.exerciseId, muscleId: req.params.muscleId },
          },
        });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Link not found" });
        throw err;
      }
    },
  );

  app.put<{
    Params: { exerciseId: string; equipmentId: string };
    Body: { required?: boolean };
  }>(
    "/exercises/:exerciseId/equipment/:equipmentId",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const required = req.body?.required ?? true;
      const { exerciseId, equipmentId } = req.params;
      try {
        return await prisma.exerciseEquipment.upsert({
          where: { exerciseId_equipmentId: { exerciseId, equipmentId } },
          update: { required },
          create: { exerciseId, equipmentId, required },
        });
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Exercise or equipment not found" });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { exerciseId: string; equipmentId: string } }>(
    "/exercises/:exerciseId/equipment/:equipmentId",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.exerciseEquipment.delete({
          where: {
            exerciseId_equipmentId: {
              exerciseId: req.params.exerciseId,
              equipmentId: req.params.equipmentId,
            },
          },
        });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Link not found" });
        throw err;
      }
    },
  );

  // --- Progressions/regressions/variations/alternatives graph ---

  app.post<{
    Params: { exerciseId: string };
    Body: { toExerciseId?: string; relationshipType?: string; rationale?: string };
  }>(
    "/exercises/:exerciseId/links",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const { toExerciseId, relationshipType, rationale } = req.body ?? {};
      const fromExerciseId = req.params.exerciseId;
      if (!toExerciseId) return reply.code(400).send({ error: "toExerciseId is required" });
      if (toExerciseId === fromExerciseId) {
        return reply.code(400).send({ error: "An exercise cannot link to itself" });
      }
      if (!isValidEnumValue(ExerciseLinkType, relationshipType)) {
        return reply.code(400).send({ error: "Invalid relationshipType" });
      }

      try {
        const link = await prisma.exerciseLink.create({
          data: { fromExerciseId, toExerciseId, relationshipType, rationale: rationale ?? null },
        });
        return reply.code(201).send(link);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return reply.code(409).send({ error: "This link already exists" });
        }
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "One of the exercises was not found" });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/exercise-links/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.exerciseLink.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Link not found" });
        throw err;
      }
    },
  );

  // --- Sport transfer (its own evidenced claim, not a fixed field) ---

  app.post<{
    Params: { exerciseId: string };
    Body: { sportId?: string; description?: string; evidenceRating?: string };
  }>(
    "/exercises/:exerciseId/sport-transfers",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const { sportId, description, evidenceRating } = req.body ?? {};
      if (!sportId) return reply.code(400).send({ error: "sportId is required" });
      if (!description?.trim()) return reply.code(400).send({ error: "description is required" });
      if (!isValidEnumValue(EvidenceRating, evidenceRating)) {
        return reply.code(400).send({ error: "Invalid evidenceRating" });
      }

      try {
        const transfer = await prisma.sportTransfer.create({
          data: {
            exerciseId: req.params.exerciseId,
            sportId,
            description: description.trim(),
            evidenceRating,
          },
        });
        return reply.code(201).send(transfer);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return reply
            .code(409)
            .send({ error: "This exercise already has a transfer claim for this sport" });
        }
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Exercise or sport not found" });
        }
        throw err;
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { description?: string; evidenceRating?: string };
  }>(
    "/sport-transfers/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const body = req.body ?? {};
      if (body.description !== undefined && !body.description.trim()) {
        return reply.code(400).send({ error: "description cannot be empty" });
      }
      if (body.evidenceRating != null && !isValidEnumValue(EvidenceRating, body.evidenceRating)) {
        return reply.code(400).send({ error: "Invalid evidenceRating" });
      }

      try {
        return await prisma.sportTransfer.update({
          where: { id: req.params.id },
          data: {
            ...(body.description !== undefined && { description: body.description.trim() }),
            ...(body.evidenceRating !== undefined && { evidenceRating: body.evidenceRating }),
          },
        });
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Sport transfer not found" });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/sport-transfers/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.sportTransfer.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Sport transfer not found" });
        }
        throw err;
      }
    },
  );
}
