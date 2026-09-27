import "react-native-url-polyfill/auto";

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

// Storage adapter differs by platform, both for real reasons found on real
// devices/builds, not guesses:
// - Native (iOS/Android via Expo Go): expo-secure-store, not AsyncStorage.
//   This app is loaded through Expo Go (no custom dev client), whose fixed
//   native module set does NOT include community packages like
//   @react-native-async-storage/async-storage -- confirmed on a real
//   device ("Native module is null, cannot access legacy storage"),
//   independent of which JS version of that package was installed.
//   expo-secure-store is a first-party Expo SDK module, always present in
//   Expo Go. Its ~2KB per-item limit could in principle be hit by a large
//   Supabase session; if that ever happens the write throws a clear error
//   rather than failing silently.
// - Web: expo-secure-store has no web implementation at all (confirmed via
//   `expo export -p web`: "getValueWithKeyAsync is not a function") --
//   falls back to plain localStorage, which every browser has natively.
const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const webStorage = {
  getItem: (key: string) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set -- copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? webStorage : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
