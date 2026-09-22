import type { BlockExerciseSummary, EvidenceRating } from "@app-workout/shared";
import type { Lang } from "./i18n";
import { STRINGS } from "./i18n";

export function formatPrescription(
  be: Pick<BlockExerciseSummary, "prescriptionType" | "repsOrDuration" | "sets">,
  lang: Lang = "es",
) {
  const t = STRINGS[lang].prescription;
  const setsPrefix = be.sets ? `${be.sets} x ` : "";
  switch (be.prescriptionType) {
    case "reps":
      return `${setsPrefix}${be.repsOrDuration} ${t.reps}`;
    case "reps_per_side":
      return `${setsPrefix}${be.repsOrDuration} ${t.perSide}`;
    case "distance":
    case "time":
    default:
      return `${setsPrefix}${be.repsOrDuration}`;
  }
}

export function formatEvidence(rating: EvidenceRating | null, lang: Lang = "es") {
  if (!rating) return null;
  return STRINGS[lang].evidence[rating];
}
