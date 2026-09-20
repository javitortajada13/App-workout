import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";

// `undefined` = still checking for a stored session, `null` = confirmed
// logged out. Conditionally rendering which Stack.Screen entries exist is a
// long-standing expo-router pattern for gating a whole app behind auth --
// simpler and more version-stable than newer navigator-specific auth APIs,
// which matters here since apps/mobile/AGENTS.md flags this SDK's
// navigation APIs as having changed recently.
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

  if (session === undefined) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <Stack>
      {session ? (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="program/[id]" options={{ title: "Programa" }} />
          <Stack.Screen name="session/[id]" options={{ title: "Sesion" }} />
          <Stack.Screen name="exercise/[id]" options={{ title: "Ejercicio" }} />
        </>
      ) : (
        <Stack.Screen name="login" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
