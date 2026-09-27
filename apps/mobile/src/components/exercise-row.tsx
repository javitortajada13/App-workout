import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { BlockExerciseSummary } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { Thumbnail } from "@/components/thumbnail";
import { Spacing } from "@/constants/theme";
import { Type } from "@/constants/typography";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { parsePrescription } from "@/lib/prescription";

interface ExerciseRowProps {
  be: BlockExerciseSummary;
  previewLabel: string;
}

// Card C: the decided exercise-row layout after the V2/V3/V4 exploration
// and the dedicated card-typography pass. The dosage lives in a small,
// CONSTANT-width rail (safe because parsePrescription() already stripped
// descriptive text out of it, so the real dosage core is always short --
// "2x10", "25", "8 y 8"); the name column never has to shrink or wrap
// around it. The qualifier moves to a quiet caption under the name, where
// it wraps freely with no width budget of its own. This is what makes the
// layout resilient to real long names/prescriptions without a
// character-count guess.
export function ExerciseRow({ be, previewLabel }: ExerciseRowProps) {
  const theme = useTheme();
  const router = useRouter();
  const { language } = useLanguage();
  const { dosageText, qualifier } = parsePrescription(be, language);

  return (
    <Pressable
      onPress={() => router.push(`/exercise/${be.exercise.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Thumbnail videoUrl={be.exercise.videoUrl} size="row" previewLabel={previewLabel} />
      <View style={styles.content}>
        <ThemedText style={[styles.name, { color: theme.text }]}>{be.exercise.name}</ThemedText>
        {qualifier ? (
          <ThemedText style={[styles.qualifier, { color: theme.textSecondary }]}>{qualifier}</ThemedText>
        ) : null}
        {be.instanceNote && (
          <ThemedText style={[styles.instanceNote, { color: theme.textSecondary }]}>{be.instanceNote}</ThemedText>
        )}
      </View>
      <View style={styles.rail}>
        <ThemedText style={[styles.dosage, { color: theme.accent }]}>{dosageText}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three - 4,
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three - 2,
    marginBottom: Spacing.two,
  },
  content: { flex: 1, minWidth: 0 },
  name: { ...Type.name, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.26 },
  qualifier: { ...Type.meta, fontSize: 12, lineHeight: 16, marginTop: 2 },
  instanceNote: { ...Type.readingItalic, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  rail: { minWidth: 50, flexShrink: 0, alignItems: "flex-end" },
  dosage: { ...Type.heading, fontSize: 18.5, letterSpacing: -0.09, fontVariant: ["tabular-nums"] },
});
