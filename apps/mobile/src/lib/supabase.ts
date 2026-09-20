import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Plain AsyncStorage, not SecureStore -- this app is loaded through Expo Go
// (no custom dev client), which only bundles a fixed, curated set of native
// modules. AsyncStorage is part of that set; several of the more "hardened"
// options (SecureStore + a manual AES layer for values over its ~2KB limit)
// pull in native modules that are not guaranteed to be present in Expo Go
// and would silently break on a real device. Revisit once the app moves to
// a custom EAS dev client / standalone build.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set -- copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
