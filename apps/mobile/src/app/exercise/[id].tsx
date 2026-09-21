import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ExerciseDetail } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YoutubeEmbedWeb } from "@/components/youtube-embed-web";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatEvidence } from "@/lib/format";
import { fetchExercise } from "@/lib/api";
import { youtubeVideoId } from "@/lib/video";

const LINK_LABEL: Record<string, string> = {
  progression: "Progresion",
  regression: "Regresion (mas facil)",
  variation: "Variacion",
  alternative: "Alternativa",
};

function Chip({ label, sublabel }: { label: string; sublabel?: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small">{label}</ThemedText>
      {sublabel && (
        <ThemedText type="small" themeColor="textSecondary">
          {" "}
          · {sublabel}
        </ThemedText>
      )}
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="label" themeColor="textSecondary">
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setExercise(null);
    fetchExercise(id)
      .then((data) => {
        if (!cancelled) setExercise(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ThemedView style={styles.container}>
          <ThemedText>No se pudo cargar el ejercicio: {error}</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ThemedView style={styles.container}>
          <ActivityIndicator color={theme.text} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  const evidenceLabel = formatEvidence(exercise.evidenceRating);
  const videoId = exercise.videoUrl ? youtubeVideoId(exercise.videoUrl) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">{exercise.name}</ThemedText>

        {Platform.OS === "web" && videoId ? (
          <ThemedView style={styles.videoEmbed}>
            <YoutubeEmbedWeb videoId={videoId} title={exercise.name} />
          </ThemedView>
        ) : (
          exercise.videoUrl && (
            <Pressable
              onPress={() => Linking.openURL(exercise.videoUrl!)}
              style={({ pressed }) => [
                styles.videoButton,
                { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <ThemedText style={{ color: theme.accentContrast }} type="smallBold">
                Ver video
              </ThemedText>
            </Pressable>
          )
        )}

        {exercise.coachingCues && (
          <Section title="Como hacerlo">
            <ThemedText>{exercise.coachingCues}</ThemedText>
          </Section>
        )}

        {exercise.equipment.length > 0 && (
          <Section title="Equipamiento">
            <ThemedView style={styles.chipRow}>
              {exercise.equipment.map((e) => (
                <Chip key={e.id} label={e.name} sublabel={e.required ? undefined : "opcional"} />
              ))}
            </ThemedView>
          </Section>
        )}

        <Section title="Por que">
          <ThemedText>{exercise.objective}</ThemedText>
        </Section>

        {exercise.physicalQualities.length > 0 && (
          <Section title="Que entrena">
            <ThemedView style={styles.chipRow}>
              {exercise.physicalQualities.map((q) => (
                <Chip key={q.id} label={q.name} sublabel={q.emphasis === "secondary" ? "secundaria" : undefined} />
              ))}
            </ThemedView>
          </Section>
        )}

        {exercise.muscles.length > 0 && (
          <Section title="Musculos">
            <ThemedView style={styles.chipRow}>
              {exercise.muscles.map((m) => (
                <Chip key={m.id} label={m.name} />
              ))}
            </ThemedView>
          </Section>
        )}

        {exercise.contraindications && (
          <Section title="Contraindicaciones">
            <ThemedView
              style={[
                styles.warningBox,
                { backgroundColor: theme.warningBg, borderColor: theme.warningBorder },
              ]}
            >
              <ThemedText>{exercise.contraindications}</ThemedText>
            </ThemedView>
          </Section>
        )}

        {evidenceLabel && (
          <Section title="Evidencia cientifica">
            <ThemedText>{evidenceLabel}</ThemedText>
          </Section>
        )}

        {exercise.sportTransfers.length > 0 && (
          <Section title="Transferencia al deporte">
            {exercise.sportTransfers.map((st, i) => (
              <ThemedView key={i} style={styles.transferRow}>
                <ThemedText type="smallBold">{st.sportName}</ThemedText>
                <ThemedText>{st.description}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {formatEvidence(st.evidenceRating)}
                </ThemedText>
              </ThemedView>
            ))}
          </Section>
        )}

        {exercise.links.length > 0 && (
          <Section title="Variaciones">
            {exercise.links.map((link, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(`/exercise/${link.exercise.id}`)}
                style={({ pressed }) => [
                  styles.linkRow,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText type="smallBold">{link.exercise.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.accent, fontWeight: "700" }}>
                  {LINK_LABEL[link.relationshipType] ?? link.relationshipType}
                </ThemedText>
                {link.rationale && (
                  <ThemedText themeColor="textSecondary" type="small">
                    {link.rationale}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: { flexDirection: "row", borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  warningBox: { borderWidth: 1, borderRadius: Spacing.three, padding: Spacing.three },
  videoButton: {
    alignSelf: "flex-start",
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  videoEmbed: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Spacing.three,
    overflow: "hidden",
  },
  transferRow: { gap: Spacing.half },
  linkRow: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.half },
});
