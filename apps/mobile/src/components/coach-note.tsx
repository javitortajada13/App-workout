import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Type } from "@/constants/typography";
import { useTheme } from "@/hooks/use-theme";

interface CoachNoteProps {
  label: string;
  text: string;
  // "note": the small teal callout under a block header (session screen).
  // "cues": the larger version on the exercise-detail screen. Same
  // component, same upright treatment -- the coach's voice reads
  // consistently everywhere it appears, just at two real sizes.
  variant?: "note" | "cues";
}

// Kept upright deliberately (not italic) -- the one refinement from the
// earlier weight-500 version is the body copy's weight (400, not 500),
// which is what keeps it from visually competing with the weight-600
// exercise names in the cards right below it. Everything else
// (background, glyph, label) is the same component in both places.
export function CoachNote({ label, text, variant = "note" }: CoachNoteProps) {
  const theme = useTheme();
  const isCues = variant === "cues";

  return (
    <View
      style={[
        styles.container,
        isCues && styles.containerCues,
        { backgroundColor: theme.coachNoteBg, borderColor: theme.coachNoteBorder },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.glyph, isCues && styles.glyphCues, { backgroundColor: theme.accent }]}>
          <ThemedText style={[styles.glyphMark, { color: theme.accentContrast }]}>&#8221;</ThemedText>
        </View>
        <View style={styles.body}>
          <ThemedText style={[styles.label, { color: theme.accent }]}>{label}</ThemedText>
          <ThemedText style={[styles.text, isCues && styles.textCues, { color: theme.text }]}>{text}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.two + 2,
  },
  containerCues: { padding: Spacing.three - 1 },
  row: { flexDirection: "row", gap: Spacing.two },
  glyph: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  glyphCues: { width: 22, height: 22, borderRadius: 11 },
  glyphMark: { ...Type.heading, fontStyle: "italic", fontSize: 12, lineHeight: 14 },
  body: { flex: 1 },
  label: {
    ...Type.label,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  text: { ...Type.reading, fontSize: 13.5, lineHeight: 20 },
  textCues: { fontSize: 15, lineHeight: 23 },
});
