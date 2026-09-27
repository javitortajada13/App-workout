// The approved V4 "Coaching Performance" typography direction: one family
// (Plus Jakarta Sans), hierarchy carried by a 5-tier weight ladder instead
// of switching families or leaning on italics. See PROJECT_STATE.md /
// the design-exploration writeup for the reasoning; this file is just the
// RN-side implementation of that ladder.
//
// Each tier is its OWN loaded font file (see root layout's useFonts call),
// not a single family + numeric `fontWeight`. That's a real difference
// from the web prototype: a browser can pick the right weight from one
// variable/multi-weight "Plus Jakarta Sans" family + `font-weight: 600`,
// but React Native (especially Android) does not reliably synthesize
// weights on a non-system font -- each weight is its own named font
// asset, and the `fontFamily` string IS the weight selector. Do not also
// set a numeric `fontWeight` alongside these -- that can make RN try to
// synthesize a further bold/light on top of an already-specific weight
// file, which is inconsistent across platforms.
export const Type = {
  // 400 -- reading text: coach voice (Coach Note / coaching cues),
  // objective, contraindications, chat bubbles, section body copy.
  reading: { fontFamily: "PlusJakartaSans_400Regular" },
  // Real italic face (not RN's synthesized slant) -- used only for the
  // per-exercise instance note, a distinct role from Coach Note itself.
  readingItalic: { fontFamily: "PlusJakartaSans_400Regular_Italic", fontStyle: "italic" as const },
  // 500 -- metadata / qualifiers / chips / secondary text.
  meta: { fontFamily: "PlusJakartaSans_500Medium" },
  // 600 -- "name" roles: exercise names, session/program titles, link names.
  name: { fontFamily: "PlusJakartaSans_600SemiBold" },
  // 700 -- small-caps utility labels, buttons, nav labels.
  label: { fontFamily: "PlusJakartaSans_700Bold" },
  // 800 -- page/hero headings and dosage numbers.
  heading: { fontFamily: "PlusJakartaSans_800ExtraBold" },
} as const;

// Font map for `useFonts()` in the root layout. Re-exported from here (not
// imported from @expo-google-fonts directly all over the app) so every
// screen's `fontFamily` string above stays in sync with what's actually
// loaded.
export {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_400Regular_Italic,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
