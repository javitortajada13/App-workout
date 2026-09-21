// M4: the program-builder write API. Lets a coach actually build a
// program (Program -> Session -> Block -> BlockExercise) through the API
// instead of only ever via prisma/seed.ts. Coach-only throughout --
// building a program is coach work, not athlete-visible until assigned.
//
// Programs are deliberately never deleted here (see PROJECT_STATE.md
// section 13: program history must be preserved, a reassignment archives
// rather than replaces) -- there's no DELETE /programs/:id. Sessions,
// blocks, and block-exercises are just the coach's own in-progress
// structure and can be deleted freely; Postgres cascades handle cleaning
// up their children (see schema.prisma's onDelete: Cascade).
import type { FastifyInstance } from "fastify";
import { authenticate, requireCoach } from "../auth.js";
import {
  isForeignKeyConstraintError,
  isRecordNotFoundError,
  isUniqueConstraintError,
  prisma,
} from "../db.js";
import { BlockType, PrescriptionType, SessionRole } from "../generated/prisma/enums.js";

function isValidEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === "string" && Object.values(enumObject).includes(value);
}

export function registerProgramAdminRoutes(app: FastifyInstance) {
  // --- Program ---

  app.post<{
    Body: { name?: string; startDate?: string; endDate?: string; sportId?: string; coachNote?: string };
  }>("/programs", { onRequest: [authenticate, requireCoach] }, async (req, reply) => {
    const { name, startDate, endDate, sportId, coachNote } = req.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: "name is required" });
    if (!sportId) return reply.code(400).send({ error: "sportId is required" });
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!start || Number.isNaN(start.getTime())) {
      return reply.code(400).send({ error: "startDate must be a valid date" });
    }
    if (!end || Number.isNaN(end.getTime())) {
      return reply.code(400).send({ error: "endDate must be a valid date" });
    }

    try {
      // New programs start unassigned (draft) -- use the existing
      // POST /athletes/:id/assign-program to hand it to an athlete, which
      // also handles archiving their previous active one.
      const program = await prisma.program.create({
        data: { name: name.trim(), startDate: start, endDate: end, sportId, coachNote: coachNote ?? null, status: "draft" },
      });
      return reply.code(201).send(program);
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        return reply.code(404).send({ error: "Sport not found" });
      }
      throw err;
    }
  });

  app.patch<{
    Params: { id: string };
    Body: { name?: string; startDate?: string; endDate?: string; sportId?: string; coachNote?: string | null };
  }>("/programs/:id", { onRequest: [authenticate, requireCoach] }, async (req, reply) => {
    const body = req.body ?? {};
    if (body.name !== undefined && !body.name.trim()) {
      return reply.code(400).send({ error: "name cannot be empty" });
    }
    let start: Date | undefined;
    if (body.startDate !== undefined) {
      start = new Date(body.startDate);
      if (Number.isNaN(start.getTime())) {
        return reply.code(400).send({ error: "startDate must be a valid date" });
      }
    }
    let end: Date | undefined;
    if (body.endDate !== undefined) {
      end = new Date(body.endDate);
      if (Number.isNaN(end.getTime())) {
        return reply.code(400).send({ error: "endDate must be a valid date" });
      }
    }

    try {
      return await prisma.program.update({
        where: { id: req.params.id },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(start !== undefined && { startDate: start }),
          ...(end !== undefined && { endDate: end }),
          ...(body.sportId !== undefined && { sportId: body.sportId }),
          ...(body.coachNote !== undefined && { coachNote: body.coachNote }),
        },
      });
    } catch (err) {
      if (isRecordNotFoundError(err)) {
        return reply.code(404).send({ error: "Program not found" });
      }
      if (isForeignKeyConstraintError(err)) {
        return reply.code(404).send({ error: "Sport not found" });
      }
      throw err;
    }
  });

  // --- Session ---

  app.post<{
    Params: { programId: string };
    Body: { label?: string; order?: number; role?: string };
  }>(
    "/programs/:programId/sessions",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const { label, order, role } = req.body ?? {};
      if (!label?.trim()) return reply.code(400).send({ error: "label is required" });
      if (typeof order !== "number" || !Number.isInteger(order)) {
        return reply.code(400).send({ error: "order must be an integer" });
      }
      if (role != null && !isValidEnumValue(SessionRole, role)) {
        return reply.code(400).send({ error: "Invalid role" });
      }

      try {
        const session = await prisma.session.create({
          data: { programId: req.params.programId, label: label.trim(), order, role: role ?? SessionRole.main },
        });
        return reply.code(201).send(session);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return reply.code(409).send({ error: "A session with this order already exists in this program" });
        }
        if (isForeignKeyConstraintError(err)) return reply.code(404).send({ error: "Program not found" });
        throw err;
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { label?: string; order?: number; role?: string };
  }>("/sessions/:id", { onRequest: [authenticate, requireCoach] }, async (req, reply) => {
    const body = req.body ?? {};
    if (body.label !== undefined && !body.label.trim()) {
      return reply.code(400).send({ error: "label cannot be empty" });
    }
    if (body.order !== undefined && !Number.isInteger(body.order)) {
      return reply.code(400).send({ error: "order must be an integer" });
    }
    if (body.role != null && !isValidEnumValue(SessionRole, body.role)) {
      return reply.code(400).send({ error: "Invalid role" });
    }

    try {
      return await prisma.session.update({
        where: { id: req.params.id },
        data: {
          ...(body.label !== undefined && { label: body.label.trim() }),
          ...(body.order !== undefined && { order: body.order }),
          ...(body.role !== undefined && { role: body.role }),
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return reply.code(409).send({ error: "A session with this order already exists in this program" });
      }
      if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Session not found" });
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>(
    "/sessions/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.session.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Session not found" });
        throw err;
      }
    },
  );

  // --- Block ---

  app.post<{
    Params: { sessionId: string };
    Body: { order?: number; blockType?: string; rounds?: number | null; purpose?: string | null };
  }>(
    "/sessions/:sessionId/blocks",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const { order, blockType, rounds, purpose } = req.body ?? {};
      if (typeof order !== "number" || !Number.isInteger(order)) {
        return reply.code(400).send({ error: "order must be an integer" });
      }
      if (blockType != null && !isValidEnumValue(BlockType, blockType)) {
        return reply.code(400).send({ error: "Invalid blockType" });
      }

      try {
        const block = await prisma.block.create({
          data: {
            sessionId: req.params.sessionId,
            order,
            blockType: blockType ?? BlockType.straight,
            rounds: rounds ?? null,
            purpose: purpose ?? null,
          },
        });
        return reply.code(201).send(block);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return reply.code(409).send({ error: "A block with this order already exists in this session" });
        }
        if (isForeignKeyConstraintError(err)) return reply.code(404).send({ error: "Session not found" });
        throw err;
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { order?: number; blockType?: string; rounds?: number | null; purpose?: string | null };
  }>("/blocks/:id", { onRequest: [authenticate, requireCoach] }, async (req, reply) => {
    const body = req.body ?? {};
    if (body.order !== undefined && !Number.isInteger(body.order)) {
      return reply.code(400).send({ error: "order must be an integer" });
    }
    if (body.blockType != null && !isValidEnumValue(BlockType, body.blockType)) {
      return reply.code(400).send({ error: "Invalid blockType" });
    }

    try {
      return await prisma.block.update({
        where: { id: req.params.id },
        data: {
          ...(body.order !== undefined && { order: body.order }),
          ...(body.blockType !== undefined && { blockType: body.blockType }),
          ...(body.rounds !== undefined && { rounds: body.rounds }),
          ...(body.purpose !== undefined && { purpose: body.purpose }),
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return reply.code(409).send({ error: "A block with this order already exists in this session" });
      }
      if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Block not found" });
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>(
    "/blocks/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.block.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Block not found" });
        throw err;
      }
    },
  );

  // --- BlockExercise (the prescription) ---

  app.post<{
    Params: { blockId: string };
    Body: {
      order?: number;
      exerciseId?: string;
      prescriptionType?: string;
      sets?: number | null;
      repsOrDuration?: string;
      load?: string | null;
      tempo?: string | null;
      rest?: string | null;
      instanceNote?: string | null;
    };
  }>(
    "/blocks/:blockId/exercises",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      const { order, exerciseId, prescriptionType, repsOrDuration } = req.body ?? {};
      if (typeof order !== "number" || !Number.isInteger(order)) {
        return reply.code(400).send({ error: "order must be an integer" });
      }
      if (!exerciseId) return reply.code(400).send({ error: "exerciseId is required" });
      if (!repsOrDuration?.trim()) {
        return reply.code(400).send({ error: "repsOrDuration is required" });
      }
      if (prescriptionType != null && !isValidEnumValue(PrescriptionType, prescriptionType)) {
        return reply.code(400).send({ error: "Invalid prescriptionType" });
      }

      try {
        const blockExercise = await prisma.blockExercise.create({
          data: {
            blockId: req.params.blockId,
            order,
            exerciseId,
            prescriptionType: prescriptionType ?? PrescriptionType.reps,
            repsOrDuration: repsOrDuration.trim(),
            sets: req.body.sets ?? null,
            load: req.body.load ?? null,
            tempo: req.body.tempo ?? null,
            rest: req.body.rest ?? null,
            instanceNote: req.body.instanceNote ?? null,
          },
        });
        return reply.code(201).send(blockExercise);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return reply.code(409).send({ error: "An exercise with this order already exists in this block" });
        }
        if (isForeignKeyConstraintError(err)) {
          return reply.code(404).send({ error: "Block or exercise not found" });
        }
        throw err;
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: {
      order?: number;
      prescriptionType?: string;
      sets?: number | null;
      repsOrDuration?: string;
      load?: string | null;
      tempo?: string | null;
      rest?: string | null;
      instanceNote?: string | null;
    };
  }>("/block-exercises/:id", { onRequest: [authenticate, requireCoach] }, async (req, reply) => {
    const body = req.body ?? {};
    if (body.order !== undefined && !Number.isInteger(body.order)) {
      return reply.code(400).send({ error: "order must be an integer" });
    }
    if (body.repsOrDuration !== undefined && !body.repsOrDuration.trim()) {
      return reply.code(400).send({ error: "repsOrDuration cannot be empty" });
    }
    if (body.prescriptionType != null && !isValidEnumValue(PrescriptionType, body.prescriptionType)) {
      return reply.code(400).send({ error: "Invalid prescriptionType" });
    }

    try {
      return await prisma.blockExercise.update({
        where: { id: req.params.id },
        data: {
          ...(body.order !== undefined && { order: body.order }),
          ...(body.prescriptionType !== undefined && { prescriptionType: body.prescriptionType }),
          ...(body.sets !== undefined && { sets: body.sets }),
          ...(body.repsOrDuration !== undefined && { repsOrDuration: body.repsOrDuration.trim() }),
          ...(body.load !== undefined && { load: body.load }),
          ...(body.tempo !== undefined && { tempo: body.tempo }),
          ...(body.rest !== undefined && { rest: body.rest }),
          ...(body.instanceNote !== undefined && { instanceNote: body.instanceNote }),
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return reply.code(409).send({ error: "An exercise with this order already exists in this block" });
      }
      if (isRecordNotFoundError(err)) return reply.code(404).send({ error: "Block exercise not found" });
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>(
    "/block-exercises/:id",
    { onRequest: [authenticate, requireCoach] },
    async (req, reply) => {
      try {
        await prisma.blockExercise.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch (err) {
        if (isRecordNotFoundError(err)) {
          return reply.code(404).send({ error: "Block exercise not found" });
        }
        throw err;
      }
    },
  );
}
