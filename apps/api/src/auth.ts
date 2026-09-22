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

export type Lang = "es" | "en";

declare module "fastify" {
  interface FastifyRequest {
    user?: Profile;
    // Resolved display language for this request -- "es" unless the
    // caller is a logged-in Profile with language = "en". Set by
    // `authenticate` on protected routes, or by `attachLanguage` on
    // public ones. Always defined by the time a handler runs on any
    // route that registers either hook.
    language: Lang;
  }
}

function toLang(value: string | undefined): Lang {
  return value === "en" ? "en" : "es";
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

async function verifyBearerToken(req: FastifyRequest) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks));
  } catch {
    return null;
  }

  const supabaseId = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  if (!supabaseId || !email) return null;
  return { supabaseId, email };
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const claims = await verifyBearerToken(req);
  if (!claims) {
    return reply.code(401).send({ error: "Missing or invalid bearer token" });
  }

  req.user = await resolveProfile(claims.supabaseId, claims.email);
  req.language = toLang(req.user.language);
}

// For routes that stay public/unauthenticated (exercise & program detail,
// the chat endpoint) but still want to reply in the caller's language when
// possible. Best-effort and never fails the request: a missing or invalid
// token just falls back to `?lang=` if given, else Spanish. This is a
// second, separate token check from `authenticate` on purpose -- these
// routes don't require login, so we can't reuse a hook that 401s without
// one.
export async function attachLanguage(req: FastifyRequest) {
  const claims = await verifyBearerToken(req);
  if (claims) {
    const profile = await prisma.profile.findUnique({ where: { id: claims.supabaseId } });
    if (profile) {
      req.language = toLang(profile.language);
      return;
    }
  }

  const queryLang = (req.query as Record<string, unknown> | undefined)?.lang;
  req.language = toLang(typeof queryLang === "string" ? queryLang : undefined);
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
