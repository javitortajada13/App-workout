import type { BlockExerciseSummary, EvidenceRating } from "@app-workout/shared";

export function formatPrescription(be: Pick<BlockExerciseSummary, "prescriptionType" | "repsOrDuration" | "sets">) {
  const setsPrefix = be.sets ? `${be.sets} x ` : "";
  switch (be.prescriptionType) {
    case "reps":
      return `${setsPrefix}${be.repsOrDuration} reps`;
    case "reps_per_side":
      return `${setsPrefix}${be.repsOrDuration} (por lado)`;
    case "distance":
    case "time":
    default:
      return `${setsPrefix}${be.repsOrDuration}`;
  }
}

const EVIDENCE_LABEL: Record<EvidenceRating, string> = {
  strong: "Evidencia solida",
  moderate: "Evidencia moderada",
  limited: "Evidencia limitada",
  conflicting: "Evidencia conflictiva",
  insufficient: "Evidencia insuficiente",
};

export function formatEvidence(rating: EvidenceRating | null) {
  if (!rating) return null;
  return EVIDENCE_LABEL[rating];
}
