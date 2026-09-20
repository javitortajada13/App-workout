import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

// expo-secure-store, not AsyncStorage: this app is loaded through Expo Go
// (no custom dev client), whose fixed native module set does NOT include
// community packages like @react-native-async-storage/async-storage --
// confirmed on a real device ("Native module is null, cannot access legacy
// storage"), independent of which JS version of that package was
// installed. expo-secure-store is a first-party Expo SDK module, always
// present in Expo Go. Its ~2KB per-item limit could in principle be hit by
// a large Supabase session (many custom claims); if that ever happens the
// session write will throw a clear error rather than fail silently. Worth
// revisiting with an encrypted-AsyncStorage hybrid once the app moves to a
// custom EAS dev client, where community native modules are available.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set -- copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
