import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="program/[id]" options={{ title: "Programa" }} />
      <Stack.Screen name="session/[id]" options={{ title: "Sesion" }} />
      <Stack.Screen name="exercise/[id]" options={{ title: "Ejercicio" }} />
    </Stack>
  );
}
