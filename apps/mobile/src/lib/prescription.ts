import type { BlockExerciseSummary } from "@app-workout/shared";
import type { Lang } from "./i18n";

// Splits repsOrDuration into a short numeric "dosage" (the thing you need
// to scan mid-set: "2x10", "8", "25") and a quieter descriptive
// "qualifier" ("pasos por lado", "por lado", "segundos" / "steps per
// side", "per side", "seconds"). Two reasons:
// 1. Hierarchy -- the dosage needs to be instantly scannable; the
//    qualifier is supporting detail, not a second headline.
// 2. repsOrDuration sometimes already bakes the qualifier into the string
//    itself (e.g. "10 por lado" for a reps_per_side row). Showing that
//    whole string as the "number" AND separately appending a
//    prescriptionType-derived unit underneath duplicates it (e.g. "por
//    lado" twice). Splitting the real string at its first descriptive
//    word fixes that at the root.
//
// Language-aware now that the server actually translates repsOrDuration
// (see BlockExercise.repsOrDurationEn): the string this function receives
// may already be English, so both the trigger words used to find the
// split point AND the prescriptionType-based fallback qualifier (used
// when the string is a bare number with no embedded word at all, e.g.
// "12 y 12" / "12 and 12") have to match the caller's language. Passing
// the wrong language here doesn't crash -- it just fails to find a split
// and/or shows the wrong-language fallback, so the caller must pass the
// same `language` the surrounding screen is already rendering in.
const QUALIFIER_TRIGGERS: Record<Lang, string[]> = {
  es: [
    "pasos por lado",
    "metros ida y vuelta",
    "ida y vuelta",
    "por lado",
    "repeticiones",
    "segundos",
    "minutos",
    "pasos",
    "metros",
    "por",
  ],
  en: [
    "steps per side",
    "meters there and back",
    "there and back",
    "per side",
    "reps",
    "seconds",
    "minutes",
    "steps",
    "meters",
  ],
};

const FALLBACK_QUALIFIER: Record<Lang, Partial<Record<BlockExerciseSummary["prescriptionType"], string>>> = {
  es: { reps_per_side: "por lado", distance: "distancia", time: "tiempo" },
  en: { reps_per_side: "per side", distance: "distance", time: "time" },
};

export interface ParsedPrescription {
  dosageText: string;
  qualifier: string;
}

export function parsePrescription(
  be: Pick<BlockExerciseSummary, "prescriptionType" | "repsOrDuration" | "sets">,
  lang: Lang = "es",
): ParsedPrescription {
  const raw = be.repsOrDuration.trim();
  const lower = raw.toLowerCase();
  const triggers = QUALIFIER_TRIGGERS[lang];

  let splitIdx = -1;
  for (const trigger of triggers) {
    const idx = lower.indexOf(trigger);
    if (idx > 0 && (splitIdx === -1 || idx < splitIdx)) splitIdx = idx;
  }

  let dosage = raw;
  let qualifier = "";
  if (splitIdx > 0) {
    dosage = raw.slice(0, splitIdx).trim();
    qualifier = raw.slice(splitIdx).trim();
  }

  if (!qualifier) {
    // Plain "reps" with nothing extracted: leave empty -- a bare number
    // already reads as reps in a training context.
    qualifier = FALLBACK_QUALIFIER[lang][be.prescriptionType] ?? "";
  }

  const dosageText = (be.sets ? `${be.sets}×` : "") + dosage;
  return { dosageText, qualifier };
}
