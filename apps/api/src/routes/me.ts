import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth.js";

// The first protected route -- exists purely to prove end-to-end that a
// Supabase-issued token reaches this API, gets verified, and resolves to a
// real Profile row. Nothing else is locked down behind auth yet (see
// PROJECT_STATE.md section 13 for the M1/M2 boundary).
export function registerMeRoutes(app: FastifyInstance) {
  app.get("/me", { onRequest: authenticate }, async (req) => req.user);
}
