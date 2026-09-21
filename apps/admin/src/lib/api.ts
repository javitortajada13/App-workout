// Thin fetch wrapper for the coach-only write API (see
// apps/api/src/routes/{athletes,exercise-admin,program-admin,taxonomy}.ts).
// Mirrors apps/mobile/src/lib/api.ts's shape (authHeaders + get/post/etc)
// rather than sharing code with it -- the two apps hit different endpoint
// sets for different reasons, and duplicating this much is cheaper than a
// premature shared HTTP-client abstraction.
import type { AthleteSummary, MyProgramSummary } from "@app-workout/shared";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL;

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: "coach" | "athlete";
  athleteLevel: string | null;
}

export interface Muscle {
  id: string;
  name: string;
  muscleGroup: string | null;
}

export interface Equipment {
  id: string;
  name: string;
}

export interface PhysicalQuality {
  id: string;
  name: string;
}

export interface Sport {
  id: string;
  name: string;
}

export interface ExerciseListItem {
  id: string;
  name: string;
  objective: string;
  evidenceRating: string | null;
}

export interface ExerciseDetailAdmin {
  id: string;
  name: string;
  aliases: string[];
  objective: string;
  description: string | null;
  movementComplexity: string | null;
  contraindications: string | null;
  coachingCues: string | null;
  evidenceRating: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  physicalQualities: { id: string; name: string; emphasis: string }[];
  muscles: { id: string; name: string; muscleGroup: string | null; emphasis: string }[];
  equipment: { id: string; name: string; required: boolean }[];
  links: {
    id: string;
    relationshipType: string;
    rationale: string | null;
    exercise: { id: string; name: string };
  }[];
  sportTransfers: {
    id: string;
    sportName: string;
    description: string;
    evidenceRating: string;
  }[];
}

export interface ProgramAdmin {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  coachNote: string | null;
  sportName: string;
  sessions: SessionAdmin[];
}

export interface SessionAdmin {
  id: string;
  label: string;
  order: number;
  role: string;
  blocks: BlockAdmin[];
}

export interface BlockAdmin {
  id: string;
  order: number;
  blockType: string;
  rounds: number | null;
  purpose: string | null;
  exercises: BlockExerciseAdmin[];
}

export interface BlockExerciseAdmin {
  id: string;
  order: number;
  prescriptionType: string;
  sets: number | null;
  repsOrDuration: string;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  instanceNote: string | null;
  exercise: { id: string; name: string };
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}: ${JSON.stringify(body)}`);
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let parsedBody: unknown;
    try {
      parsedBody = await res.json();
    } catch {
      parsedBody = await res.text();
    }
    throw new ApiError(res.status, parsedBody);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const patch = <T>(path: string, body?: unknown) => request<T>("PATCH", path, body);
const put = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
const del = (path: string) => request<void>("DELETE", path);

export function fetchMe() {
  return get<Profile>("/me");
}

// --- Athletes ---
export const fetchAthletes = () => get<AthleteSummary[]>("/athletes");
export const assignProgram = (athleteId: string, programId: string) =>
  post(`/athletes/${athleteId}/assign-program`, { programId });
export const updateAthlete = (
  athleteId: string,
  body: Partial<{ name: string | null; athleteLevel: string | null; coachNotes: string | null }>,
) => patch<AthleteSummary>(`/athletes/${athleteId}`, body);

// --- Coach's own program list (also used to pick an unassigned program) ---
export const fetchMyPrograms = () => get<MyProgramSummary[]>("/me/programs");

// --- Taxonomy ---
export const fetchMuscles = () => get<Muscle[]>("/muscles");
export const createMuscle = (name: string, muscleGroup?: string) =>
  post<Muscle>("/muscles", { name, muscleGroup });
export const fetchEquipment = () => get<Equipment[]>("/equipment");
export const createEquipment = (name: string) => post<Equipment>("/equipment", { name });
export const fetchPhysicalQualities = () => get<PhysicalQuality[]>("/physical-qualities");
export const createPhysicalQuality = (name: string) =>
  post<PhysicalQuality>("/physical-qualities", { name });
export const fetchSports = () => get<Sport[]>("/sports");
export const createSport = (name: string) => post<Sport>("/sports", { name });

// --- Exercises ---
export const fetchExerciseList = () => get<ExerciseListItem[]>("/exercises");
export const fetchExercise = (id: string) => get<ExerciseDetailAdmin>(`/exercises/${id}`);

export interface ExerciseWriteBody {
  name: string;
  objective: string;
  aliases?: string[];
  description?: string | null;
  movementComplexity?: string | null;
  contraindications?: string | null;
  coachingCues?: string | null;
  evidenceRating?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
}

export const createExercise = (body: ExerciseWriteBody) =>
  post<ExerciseListItem>("/exercises", body);
export const updateExercise = (id: string, body: Partial<ExerciseWriteBody>) =>
  patch<ExerciseListItem>(`/exercises/${id}`, body);
export const deleteExercise = (id: string) => del(`/exercises/${id}`);

export const setExerciseQuality = (exerciseId: string, qualityId: string, emphasis: string) =>
  put(`/exercises/${exerciseId}/physical-qualities/${qualityId}`, { emphasis });
export const removeExerciseQuality = (exerciseId: string, qualityId: string) =>
  del(`/exercises/${exerciseId}/physical-qualities/${qualityId}`);
export const setExerciseMuscle = (exerciseId: string, muscleId: string, emphasis: string) =>
  put(`/exercises/${exerciseId}/muscles/${muscleId}`, { emphasis });
export const removeExerciseMuscle = (exerciseId: string, muscleId: string) =>
  del(`/exercises/${exerciseId}/muscles/${muscleId}`);
export const setExerciseEquipment = (exerciseId: string, equipmentId: string, required: boolean) =>
  put(`/exercises/${exerciseId}/equipment/${equipmentId}`, { required });
export const removeExerciseEquipment = (exerciseId: string, equipmentId: string) =>
  del(`/exercises/${exerciseId}/equipment/${equipmentId}`);

export const createExerciseLink = (
  exerciseId: string,
  toExerciseId: string,
  relationshipType: string,
  rationale?: string,
) => post(`/exercises/${exerciseId}/links`, { toExerciseId, relationshipType, rationale });
export const deleteExerciseLink = (linkId: string) => del(`/exercise-links/${linkId}`);

export const createSportTransfer = (
  exerciseId: string,
  sportId: string,
  description: string,
  evidenceRating: string,
) => post(`/exercises/${exerciseId}/sport-transfers`, { sportId, description, evidenceRating });
export const deleteSportTransfer = (id: string) => del(`/sport-transfers/${id}`);

// --- Programs / sessions / blocks / block-exercises ---
export const fetchProgram = (id: string) => get<ProgramAdmin>(`/programs/${id}`);

export const createProgram = (body: {
  name: string;
  startDate: string;
  endDate: string;
  sportId: string;
  coachNote?: string;
}) => post<ProgramAdmin>("/programs", body);
export const updateProgram = (
  id: string,
  body: Partial<{ name: string; startDate: string; endDate: string; sportId: string; coachNote: string | null }>,
) => patch<ProgramAdmin>(`/programs/${id}`, body);

export const createSession = (
  programId: string,
  body: { label: string; order: number; role?: string },
) => post<SessionAdmin>(`/programs/${programId}/sessions`, body);
export const updateSession = (
  id: string,
  body: Partial<{ label: string; order: number; role: string }>,
) => patch<SessionAdmin>(`/sessions/${id}`, body);
export const deleteSession = (id: string) => del(`/sessions/${id}`);

export const createBlock = (
  sessionId: string,
  body: { order: number; blockType?: string; rounds?: number | null; purpose?: string | null },
) => post<BlockAdmin>(`/sessions/${sessionId}/blocks`, body);
export const updateBlock = (
  id: string,
  body: Partial<{ order: number; blockType: string; rounds: number | null; purpose: string | null }>,
) => patch<BlockAdmin>(`/blocks/${id}`, body);
export const deleteBlock = (id: string) => del(`/blocks/${id}`);

export const createBlockExercise = (
  blockId: string,
  body: {
    order: number;
    exerciseId: string;
    prescriptionType?: string;
    sets?: number | null;
    repsOrDuration: string;
    load?: string | null;
    tempo?: string | null;
    rest?: string | null;
    instanceNote?: string | null;
  },
) => post<BlockExerciseAdmin>(`/blocks/${blockId}/exercises`, body);
export const updateBlockExercise = (
  id: string,
  body: Partial<{
    order: number;
    prescriptionType: string;
    sets: number | null;
    repsOrDuration: string;
    load: string | null;
    tempo: string | null;
    rest: string | null;
    instanceNote: string | null;
  }>,
) => patch<BlockExerciseAdmin>(`/block-exercises/${id}`, body);
export const deleteBlockExercise = (id: string) => del(`/block-exercises/${id}`);

export { ApiError };
