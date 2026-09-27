import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import type { SessionDetail } from "@app-workout/shared";

import { CoachNote } from "@/components/coach-note";
import { ExerciseRow } from "@/components/exercise-row";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Type } from "@/constants/typography";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { fetchSession } from "@/lib/api";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { strings } = useLanguage();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession(id)
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {error && (
        <ThemedView style={styles.container}>
          <ThemedText>
            {strings.session.loadError}: {error}
          </ThemedText>
        </ThemedView>
      )}
      {!error && !session && (
        <ThemedView style={styles.container}>
          <ActivityIndicator color={theme.text} />
        </ThemedView>
      )}

      {session && (
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title">{session.label}</ThemedText>

          {session.blocks.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyBlock}>
              <ThemedText themeColor="textSecondary">{strings.session.noBlocks}</ThemedText>
            </ThemedView>
          )}

          {session.blocks.map((block) => (
            <View key={block.id} style={styles.block}>
              <View style={styles.blockHeader}>
                <ThemedText style={[styles.blockLabel, { color: theme.text }]}>
                  {strings.session.block} {block.order}
                </ThemedText>
                {block.rounds ? (
                  <View style={[styles.roundsChip, { backgroundColor: theme.coachNoteBg }]}>
                    <ThemedText style={[styles.roundsText, { color: theme.accent }]}>
                      {block.rounds} {strings.session.times}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {block.purpose && <CoachNote label={strings.session.coachNoteLabel} text={block.purpose} />}

              <View style={styles.exerciseList}>
                {block.exercises.map((be) => (
                  <ExerciseRow key={be.id} be={be} previewLabel={strings.exercise.videoPreview} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  emptyBlock: { borderRadius: Spacing.three, padding: Spacing.three },
  block: { gap: Spacing.two },
  blockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  blockLabel: { ...Type.label, fontSize: 12, letterSpacing: 0.24, textTransform: "uppercase" },
  roundsChip: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  roundsText: { ...Type.label, fontSize: 12, fontVariant: ["tabular-nums"] },
  exerciseList: { gap: 2 },
});
