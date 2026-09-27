import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import type { MyProgramSummary, SessionSummary } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Type } from "@/constants/typography";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { fetchMyPrograms, fetchProgram } from "@/lib/api";
import { plural } from "@/lib/i18n";

export default function HomeScreen() {
  const theme = useTheme();
  const { strings } = useLanguage();
  const router = useRouter();
  const [programs, setPrograms] = useState<MyProgramSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetSession, setTargetSession] = useState<SessionSummary | null>(null);

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

  // The hero "start here" card needs a specific session to link to, which
  // /me/programs (a program SUMMARY) doesn't carry -- fetch the same
  // program's full detail (the existing /programs/:id endpoint, already
  // used by the Program screen) purely for its sessions list. Honest
  // default: the first session that actually has content, matching what
  // the approved design validated -- the schema has no
  // completion/scheduling field, so this is never framed as a
  // personalized "recommendation."
  useFocusEffect(
    useCallback(() => {
      if (!current) return;
      let cancelled = false;
      fetchProgram(current.id)
        .then((program) => {
          if (cancelled) return;
          const target = program.sessions.find((s) => s.blockCount > 0) ?? program.sessions[0] ?? null;
          setTargetSession(target);
        })
        .catch(() => {
          // Non-fatal: the program row below still works without the hero.
        });
      return () => {
        cancelled = true;
      };
    }, [current?.id]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{strings.home.greeting}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {strings.home.subtitle}
        </ThemedText>

        {error && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>
              {strings.home.connectionError}: {error}
            </ThemedText>
          </ThemedView>
        )}

        {!error && programs === null && <ActivityIndicator color={theme.text} />}

        {current && targetSession && (
          <Pressable
            onPress={() => router.push(`/session/${targetSession.id}`)}
            style={({ pressed }) => [
              styles.hero,
              { backgroundColor: theme.accent, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <ThemedText style={[styles.heroKicker, { color: theme.accentContrast }]}>
              {strings.home.startHere}
            </ThemedText>
            <ThemedText style={[styles.heroTitle, { color: theme.accentContrast }]}>
              {targetSession.label}
            </ThemedText>
            <ThemedText style={[styles.heroMeta, { color: theme.accentContrast }]}>
              {targetSession.blockCount} {plural(targetSession.blockCount, strings.program.block)} ·{" "}
              {targetSession.exerciseCount} {plural(targetSession.exerciseCount, strings.program.exercise)}
            </ThemedText>
            <View style={[styles.heroCta, { backgroundColor: theme.accentContrast + "2E" }]}>
              <ThemedText style={[styles.heroCtaText, { color: theme.accentContrast }]}>
                {strings.home.viewSession} &#8594;
              </ThemedText>
            </View>
          </Pressable>
        )}

        {current && (
          <>
            <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
              {strings.home.currentProgram}
            </ThemedText>
            <Pressable
              onPress={() => router.push(`/program/${current.id}`)}
              style={({ pressed }) => [
                styles.programRow,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.dayChip, { backgroundColor: theme.coachNoteBg }]}>
                <ThemedText style={[styles.dayChipText, { color: theme.accent }]}>{current.dayCount}</ThemedText>
              </View>
              <View style={styles.programRowMain}>
                <ThemedText type="smallBold">{current.name}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {current.sportName} · {current.dayCount} {plural(current.dayCount, strings.home.session)}
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary" style={styles.chevron}>
                &#8250;
              </ThemedText>
            </Pressable>
          </>
        )}

        {programs?.length === 0 && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>{strings.home.noProgram}</ThemedText>
          </ThemedView>
        )}

        <Pressable
          onPress={() => router.push("/(tabs)/coach")}
          style={({ pressed }) => [
            styles.coachButton,
            { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ThemedText style={{ color: theme.accentContrast }} type="button">
            {strings.home.askCoach}
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
  subtitle: { marginTop: -Spacing.two },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  hero: {
    borderRadius: 22,
    padding: Spacing.three + 4,
    paddingBottom: Spacing.three + 2,
  },
  heroKicker: { ...Type.label, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", opacity: 0.85, marginBottom: 10 },
  heroTitle: { ...Type.heading, fontSize: 22, letterSpacing: -0.33, marginBottom: 4 },
  heroMeta: { ...Type.meta, fontSize: 13, opacity: 0.82, marginBottom: 16 },
  heroCta: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  heroCtaText: { ...Type.label, fontSize: 13.5 },
  sectionLabel: { marginTop: Spacing.one },
  programRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three - 2,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three - 1,
  },
  dayChip: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayChipText: { ...Type.heading, fontSize: 16, fontVariant: ["tabular-nums"] },
  programRowMain: { flex: 1, gap: 2 },
  chevron: { fontSize: 18 },
  coachButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: Spacing.four,
  },
});
