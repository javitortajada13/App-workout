import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import type { MyProgramSummary } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchMyPrograms } from "@/lib/api";

export default function ProgramsScreen() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Programas</ThemedText>

        {error && <ThemedText>No se pudo conectar con el servidor: {error}</ThemedText>}
        {!error && programs === null && <ActivityIndicator color={theme.text} />}

        <FlatList
          data={programs ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/program/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {item.sportName} · {item.dayCount} sesiones ·{" "}
                {new Date(item.startDate).toLocaleDateString()} -{" "}
                {new Date(item.endDate).toLocaleDateString()}
              </ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            programs?.length === 0 ? (
              <ThemedText themeColor="textSecondary">Todavia no hay programas.</ThemedText>
            ) : null
          }
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.three },
  list: { gap: Spacing.two },
  row: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.half },
});
