// Verifies Supabase-issued access tokens and resolves them to an app-side
// Profile row. Supabase owns identity (auth.users, passwords, sessions) --
// this file never talks to Supabase's Auth API itself. It only verifies a
// JWT a client already obtained from Supabase, using Supabase's public
// signing keys (JWKS), then mirrors a Profile row keyed by the same user id
// in our own Postgres. See PROJECT_STATE.md section 13 for the decision.
import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "./db.js";
import type { Profile } from "./generated/prisma/client.js";

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set");
}

const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));

declare module "fastify" {
  interface FastifyRequest {
    user?: Profile;
  }
}

async function resolveProfile(supabaseId: string, email: string) {
  const existing = await prisma.profile.findUnique({ where: { id: supabaseId } });
  if (existing) return existing;

  // First time we see this Supabase user: auto-provision a Profile row,
  // defaulting to "athlete". Promoting someone to "coach" is a deliberate,
  // separate step -- never automatic.
  return prisma.profile.create({
    data: { id: supabaseId, email, role: "athlete" },
  });
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks));
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }

  const supabaseId = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  if (!supabaseId || !email) {
    return reply.code(401).send({ error: "Token missing required claims" });
  }

  req.user = await resolveProfile(supabaseId, email);
}

// Use as a second onRequest hook after `authenticate` (Fastify runs
// onRequest hooks in array order, so req.user is guaranteed set by the
// time this runs). Kept separate from `authenticate` rather than a
// role param, since most routes need no role check at all.
export async function requireCoach(req: FastifyRequest, reply: FastifyReply) {
  if (req.user?.role !== "coach") {
    return reply.code(403).send({ error: "Coach role required" });
  }
}
