import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { fetchMe } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// `undefined` = still checking for a stored session, `null` = confirmed
// logged out. Uses Stack.Protected (the current expo-router API for
// auth-gated navigation) rather than conditionally rendering which
// Stack.Screen entries exist: the latter looked like a simpler, more
// stable choice, but real-device testing showed it going stale after
// sign-out -- state updated, but the native stack never reconciled which
// screens should exist, leaving the previous (tabs) content on screen.
// Stack.Protected exists specifically to handle that transition correctly.
export default function RootLayout() {
  const theme = useTheme();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error) => {
        // Never leave the app stuck on the loading spinner -- fall through
        // to the login screen and let the user retry rather than hanging
        // forever with no visible error.
        console.error("Failed to read auth session", error);
        setSession(null);
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Ensures the app-side Profile row exists as soon as there's a session
  // -- see fetchMe's own comment for why this call has to happen
  // somewhere. Errors are swallowed: this is a background sync, not
  // something that should block or break navigation if the API is
  // briefly unreachable.
  useEffect(() => {
    if (session) {
      fetchMe().catch((error) => console.error("Failed to sync profile", error));
    }
  }, [session]);

  if (session === undefined) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="program/[id]" options={{ title: "Programa" }} />
        <Stack.Screen name="session/[id]" options={{ title: "Sesion" }} />
        <Stack.Screen name="exercise/[id]" options={{ title: "Ejercicio" }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
