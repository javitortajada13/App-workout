import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { SessionDetail } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatPrescription } from "@/lib/format";
import { fetchSession } from "@/lib/api";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
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
          <ThemedText>No se pudo cargar la sesion: {error}</ThemedText>
        </ThemedView>
      )}
      {!error && !session && (
        <ThemedView style={styles.container}>
          <ActivityIndicator color={theme.text} />
        </ThemedView>
      )}

      {session && (
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title" style={styles.title}>
            {session.label}
          </ThemedText>

          {session.blocks.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyBlock}>
              <ThemedText themeColor="textSecondary">
                Todavia no hay bloques cargados para esta sesion.
              </ThemedText>
            </ThemedView>
          )}

          {session.blocks.map((block) => (
            <ThemedView key={block.id} style={styles.block}>
              <ThemedView style={styles.blockHeader}>
                <ThemedText type="smallBold">Bloque {block.order}</ThemedText>
                {block.rounds ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    {block.rounds} veces
                  </ThemedText>
                ) : null}
              </ThemedView>

              {block.purpose && (
                <ThemedText themeColor="textSecondary" type="small" style={styles.purpose}>
                  {block.purpose}
                </ThemedText>
              )}

              <ThemedView style={styles.exerciseList}>
                {block.exercises.map((be) => (
                  <Pressable
                    key={be.id}
                    onPress={() => router.push(`/exercise/${be.exercise.id}`)}
                    style={({ pressed }) => [
                      styles.exerciseRow,
                      { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <ThemedText>{be.exercise.name}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {formatPrescription(be)}
                    </ThemedText>
                    {be.instanceNote && (
                      <ThemedText themeColor="textSecondary" type="small" style={styles.note}>
                        {be.instanceNote}
                      </ThemedText>
                    )}
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  title: { textAlign: "left", fontSize: 28, lineHeight: 34 },
  emptyBlock: { borderRadius: Spacing.three, padding: Spacing.three },
  block: { gap: Spacing.two },
  blockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  purpose: { fontStyle: "italic" },
  exerciseList: { gap: Spacing.two },
  exerciseRow: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.half },
  note: { fontStyle: "italic" },
});
