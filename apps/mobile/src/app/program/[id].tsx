import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ProgramDetail } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Type } from "@/constants/typography";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { fetchProgram } from "@/lib/api";
import { plural } from "@/lib/i18n";

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
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={[styles.dayChip, { backgroundColor: theme.coachNoteBg }]}>
                    <ThemedText style={[styles.dayChipText, { color: theme.accent }]}>{item.order}</ThemedText>
                  </View>
                  <View style={styles.rowMain}>
                    <View style={styles.rowHeader}>
                      <ThemedText type="smallBold">{item.label}</ThemedText>
                      {item.role !== "main" && (
                        <View style={[styles.roleTag, { backgroundColor: theme.background }]}>
                          <ThemedText style={[styles.roleTagText, { color: theme.textSecondary }]}>
                            {strings.program.role[item.role] ?? item.role}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText themeColor="textSecondary" type="small">
                      {item.blockCount === 0
                        ? strings.program.noBlocks
                        : `${item.blockCount} ${plural(item.blockCount, strings.program.block)} · ${item.exerciseCount} ${plural(item.exerciseCount, strings.program.exercise)}`}
                    </ThemedText>
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.chevron}>
                    &#8250;
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three - 2,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three - 1,
  },
  dayChip: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayChipText: { ...Type.heading, fontSize: 16, fontVariant: ["tabular-nums"] },
  rowMain: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  roleTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  roleTagText: { ...Type.label, fontSize: 10, letterSpacing: 0.24, textTransform: "uppercase" },
  chevron: { fontSize: 18 },
});
