import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import type { MyProgramSummary } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchMyPrograms } from "@/lib/api";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [programs, setPrograms] = useState<MyProgramSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchMyPrograms()
        .then((data) => {
          if (!cancelled) setPrograms(data);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const current = programs?.[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Hola
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Tu coach de preparacion fisica para padel
        </ThemedText>

        {error && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>No se pudo conectar con el servidor: {error}</ThemedText>
          </ThemedView>
        )}

        {!error && programs === null && <ActivityIndicator color={theme.text} />}

        {current && (
          <Pressable
            onPress={() => router.push(`/program/${current.id}`)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText themeColor="textSecondary" type="small">
              Programa actual
            </ThemedText>
            <ThemedText type="subtitle">{current.name}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {current.dayCount} sesiones · {current.sportName}
            </ThemedText>
          </Pressable>
        )}

        {programs?.length === 0 && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>Todavia no hay programas asignados.</ThemedText>
          </ThemedView>
        )}

        <Pressable
          onPress={() => router.push("/(tabs)/coach")}
          style={({ pressed }) => [
            styles.coachButton,
            { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ThemedText style={{ color: theme.background }} type="smallBold">
            Preguntale al coach
          </ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  title: { textAlign: "left" },
  subtitle: { marginTop: -Spacing.two },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  coachButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: Spacing.four,
  },
});
