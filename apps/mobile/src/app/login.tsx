import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import type { Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

// Not gated behind login: someone who doesn't read the app's current
// language has no way to even understand "Iniciar sesion" / "Log in" to
// get past this screen otherwise. Always shown in each language's own
// name (never translated) -- the same convention profile.tsx already uses
// for its language toggle. Uses setLocalLanguage (no bearer token exists
// yet); see use-language.tsx for how an explicit pick here becomes the
// athlete's real saved preference once they actually log in.
function LoginLanguageSwitch() {
  const theme = useTheme();
  const { language, setLocalLanguage } = useLanguage();
  const options: { lang: Lang; label: string }[] = [
    { lang: "es", label: "Español" },
    { lang: "en", label: "English" },
  ];
  return (
    <ThemedView style={styles.langSwitchRow}>
      {options.map(({ lang, label }) => {
        const active = language === lang;
        return (
          <Pressable
            key={lang}
            onPress={() => setLocalLanguage(lang)}
            style={({ pressed }) => [
              styles.langPill,
              {
                backgroundColor: active ? theme.accent : theme.backgroundElement,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText type="small" style={active ? { color: theme.accentContrast } : undefined}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

export default function LoginScreen() {
  const theme = useTheme();
  const { strings } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
    }
    // On success there is nothing else to do here: the root layout listens
    // to Supabase's auth state and swaps to the main app automatically.
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoginLanguageSwitch />
      <ThemedView style={styles.container}>
        <ThemedText type="title">{strings.login.title}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {strings.login.subtitle}
        </ThemedText>

        <ThemedView style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={strings.login.emailPlaceholder}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={strings.login.passwordPlaceholder}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable
            onPress={handleLogin}
            disabled={submitting || !email.trim() || !password}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.accent,
                opacity: pressed || submitting || !email.trim() || !password ? 0.6 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={theme.accentContrast} />
            ) : (
              <ThemedText style={{ color: theme.accentContrast }} type="smallBold">
                {strings.login.submit}
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  langSwitchRow: {
    position: "absolute",
    top: Spacing.four,
    right: Spacing.four,
    flexDirection: "row",
    gap: Spacing.one,
    zIndex: 1,
  },
  langPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  subtitle: { marginTop: -Spacing.two },
  form: { gap: Spacing.two, marginTop: Spacing.three },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  button: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: "center" },
  error: { color: "#c0392b" },
});
