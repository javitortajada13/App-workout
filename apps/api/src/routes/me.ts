import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth.js";
import { prisma } from "../db.js";

// The first protected route -- exists purely to prove end-to-end that a
// Supabase-issued token reaches this API, gets verified, and resolves to a
// real Profile row. Nothing else is locked down behind auth yet (see
// PROJECT_STATE.md section 13 for the M1/M2 boundary).
export function registerMeRoutes(app: FastifyInstance) {
  app.get("/me", { onRequest: authenticate }, async (req) => req.user);

  // Self-service: an athlete (or coach) sets their own display language --
  // deliberately separate from PATCH /athletes/:id (coach-only, edits
  // someone else's profile). Only `language` is writable here; name/level/
  // notes stay coach-managed.
  app.patch<{ Body: { language?: string } }>(
    "/me",
    { onRequest: authenticate },
    async (req, reply) => {
      const language = req.body?.language;
      if (language !== "es" && language !== "en") {
        return reply.code(400).send({ error: "language must be 'es' or 'en'" });
      }
      return prisma.profile.update({
        where: { id: req.user!.id },
        data: { language },
      });
    },
  );
}
