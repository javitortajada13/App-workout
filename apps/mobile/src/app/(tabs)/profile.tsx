import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import type { Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

function LanguageOption({ lang, label }: { lang: Lang; label: string }) {
  const theme = useTheme();
  const { language, setLanguage } = useLanguage();
  const [saving, setSaving] = useState(false);
  const active = language === lang;

  async function handlePress() {
    setSaving(true);
    await setLanguage(lang);
    setSaving(false);
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={saving}
      style={({ pressed }) => [
        styles.languageOption,
        {
          backgroundColor: active ? theme.accent : theme.backgroundElement,
          opacity: pressed || saving ? 0.7 : 1,
        },
      ]}
    >
      {saving ? (
        <ActivityIndicator color={active ? theme.accentContrast : theme.text} />
      ) : (
        <ThemedText type="smallBold" style={active ? { color: theme.accentContrast } : undefined}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { strings, error } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{strings.profile.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{strings.profile.subtitle}</ThemedText>

        <ThemedView style={styles.languageSection}>
          <ThemedText type="label" themeColor="textSecondary">
            {strings.profile.language}
          </ThemedText>
          <ThemedView style={styles.languageRow}>
            <LanguageOption lang="es" label={strings.profile.spanish} />
            <LanguageOption lang="en" label={strings.profile.english} />
          </ThemedView>
          {error && (
            <ThemedText type="small" style={{ color: theme.warningBorder }}>
              {strings.profile.languageError}
            </ThemedText>
          )}
        </ThemedView>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText type="smallBold">{strings.profile.signOut}</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.two },
  languageSection: { marginTop: Spacing.three, gap: Spacing.two },
  languageRow: { flexDirection: "row", gap: Spacing.two },
  languageOption: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  signOutButton: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
});
