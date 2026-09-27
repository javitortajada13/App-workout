import type { EvidenceRating } from "@app-workout/shared";
import type { Lang } from "./i18n";
import { STRINGS } from "./i18n";

export function formatEvidence(rating: EvidenceRating | null, lang: Lang = "es") {
  if (!rating) return null;
  return STRINGS[lang].evidence[rating];
}
