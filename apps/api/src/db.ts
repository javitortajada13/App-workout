import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

// Prisma's error for a violated @unique/@@unique constraint. Routes that
// create/update rows with a unique name (Exercise.name, ExerciseLink's
// [from,to,type], etc.) check this to return a clean 409 instead of a
// raw 500.
export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// Prisma's error when an update/delete's `where` matches no row -- used
// to turn "the id doesn't exist" into a clean 404 instead of a 500.
export function isRecordNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

// Prisma's error when a create/upsert references a foreign key that
// doesn't exist (e.g. an exerciseId or sportId that isn't a real row).
// Distinct from P2025 above: empirically verified against real
// Postgres -- a bad FK on create/upsert throws P2003, never P2025 (which
// is specific to update/delete finding no matching row).
export function isForeignKeyConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}
