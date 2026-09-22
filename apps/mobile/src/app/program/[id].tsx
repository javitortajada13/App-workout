import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ProgramDetail } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { fetchProgram } from "@/lib/api";

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { strings } = useLanguage();
  const router = useRouter();
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProgram(id)
      .then((data) => {
        if (!cancelled) setProgram(data);
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
      <ThemedView style={styles.container}>
        {error && (
          <ThemedText>
            {strings.program.loadError}: {error}
          </ThemedText>
        )}
        {!error && !program && <ActivityIndicator color={theme.text} />}

        {program && (
          <>
            <ThemedText type="title">{program.name}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {program.sportName} · {new Date(program.startDate).toLocaleDateString()} -{" "}
              {new Date(program.endDate).toLocaleDateString()}
            </ThemedText>

            <FlatList
              data={program.sessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/session/${item.id}`)}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ThemedView style={styles.rowHeader}>
                    <ThemedText type="smallBold">{item.label}</ThemedText>
                    {item.role !== "main" && (
                      <ThemedText themeColor="textSecondary" type="small">
                        {strings.program.role[item.role] ?? item.role}
                      </ThemedText>
                    )}
                  </ThemedView>
                  <ThemedText themeColor="textSecondary" type="small">
                    {item.blockCount === 0
                      ? strings.program.noBlocks
                      : `${item.blockCount} ${strings.program.blocks} · ${item.exerciseCount} ${strings.program.exercises}`}
                  </ThemedText>
                </Pressable>
              )}
            />
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two },
  list: { gap: Spacing.two, paddingTop: Spacing.two },
  row: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.half },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
