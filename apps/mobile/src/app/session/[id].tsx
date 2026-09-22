import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { SessionDetail } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { formatPrescription } from "@/lib/format";
import { fetchSession } from "@/lib/api";
import { youtubeThumbnailUrl } from "@/lib/video";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { language, strings } = useLanguage();
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
                <ThemedText type="label" themeColor="textSecondary">
                  {strings.session.block} {block.order}
                </ThemedText>
                {block.rounds ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    {block.rounds} {strings.session.times}
                  </ThemedText>
                ) : null}
              </View>

              {block.purpose && (
                <ThemedText themeColor="textSecondary" type="small" style={styles.purpose}>
                  {block.purpose}
                </ThemedText>
              )}

              <View style={styles.exerciseList}>
                {block.exercises.map((be) => {
                  const thumbnail =
                    be.exercise.thumbnailUrl ??
                    (be.exercise.videoUrl ? youtubeThumbnailUrl(be.exercise.videoUrl) : null);
                  return (
                    <Pressable
                      key={be.id}
                      onPress={() => router.push(`/exercise/${be.exercise.id}`)}
                      style={({ pressed }) => [
                        styles.exerciseRow,
                        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      {thumbnail ? (
                        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
                      ) : (
                        <View style={[styles.thumbnail, { backgroundColor: theme.background }]} />
                      )}
                      <View style={styles.exerciseInfo}>
                        <ThemedText type="smallBold">{be.exercise.name}</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {formatPrescription(be, language)}
                        </ThemedText>
                        {be.instanceNote && (
                          <ThemedText themeColor="textSecondary" type="small" style={styles.note}>
                            {be.instanceNote}
                          </ThemedText>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
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
  blockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  purpose: { fontStyle: "italic" },
  exerciseList: { gap: Spacing.two },
  exerciseRow: { flexDirection: "row", alignItems: "center", borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  thumbnail: { width: 56, height: 56, borderRadius: Spacing.two },
  exerciseInfo: { flex: 1, gap: Spacing.half },
  note: { fontStyle: "italic" },
});
