// API contract types shared between apps/api (response shapes) and apps/mobile
// (API client). No runtime dependencies, no Prisma imports — this is the
// boundary between the database model and what the client actually sees.

export type PrescriptionType = "reps" | "reps_per_side" | "distance" | "time";
export type SessionRole = "warmup" | "main" | "recovery";
export type BlockType = "straight" | "superset" | "circuit" | "contrast_pair";
export type ExerciseLinkType =
  | "progression"
  | "regression"
  | "variation"
  | "alternative";
export type Emphasis = "primary" | "secondary";
export type EvidenceRating =
  | "strong"
  | "moderate"
  | "limited"
  | "conflicting"
  | "insufficient";
export type ProgramStatus = "draft" | "active" | "archived";

export interface PhysicalQualityRef {
  id: string;
  name: string;
  emphasis: Emphasis;
}

export interface MuscleRef {
  id: string;
  name: string;
  muscleGroup: string | null;
  emphasis: Emphasis;
}

export interface EquipmentRef {
  id: string;
  name: string;
  required: boolean;
}

export interface ExerciseSummary {
  id: string;
  name: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

export interface ExerciseLinkRef {
  id: string;
  relationshipType: ExerciseLinkType;
  rationale: string | null;
  exercise: ExerciseSummary;
}

export interface SportTransferRef {
  id: string;
  sportName: string;
  description: string;
  evidenceRating: EvidenceRating;
}

export interface ExerciseDetail extends ExerciseSummary {
  aliases: string[];
  objective: string;
  description: string | null;
  movementComplexity: string | null;
  contraindications: string | null;
  coachingCues: string | null;
  evidenceRating: EvidenceRating | null;
  physicalQualities: PhysicalQualityRef[];
  muscles: MuscleRef[];
  equipment: EquipmentRef[];
  links: ExerciseLinkRef[];
  sportTransfers: SportTransferRef[];
}

export interface BlockExerciseSummary {
  id: string;
  order: number;
  prescriptionType: PrescriptionType;
  sets: number | null;
  repsOrDuration: string;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  instanceNote: string | null;
  exercise: ExerciseSummary;
}

export interface BlockSummary {
  id: string;
  order: number;
  blockType: BlockType;
  rounds: number | null;
  purpose: string | null;
  exercises: BlockExerciseSummary[];
}

export interface SessionSummary {
  id: string;
  label: string;
  order: number;
  role: SessionRole;
  blockCount: number;
  exerciseCount: number;
}

export interface SessionDetail extends SessionSummary {
  blocks: BlockSummary[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  sportName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
}

export interface ProgramDetail extends ProgramSummary {
  sessions: SessionSummary[];
}

// What GET /me/programs returns -- athlete-scoped, so it also carries
// status (an athlete never sees archived programs, but a coach does, and
// needs to be able to tell them apart).
export interface MyProgramSummary extends ProgramSummary {
  status: ProgramStatus;
}

export interface AthleteSummary {
  id: string;
  email: string;
  name: string | null;
  athleteLevel: string | null;
  coachNotes: string | null;
  activeProgram: { id: string; name: string } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
  citedExerciseIds: string[];
}
