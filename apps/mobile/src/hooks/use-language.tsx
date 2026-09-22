import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { fetchMe, updateLanguage } from "@/lib/api";
import type { Lang, Strings } from "@/lib/i18n";
import { STRINGS } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

// Same native/web storage split as lib/supabase.ts, and for the same
// reason (expo-secure-store has no web implementation; AsyncStorage isn't
// available in Expo Go) -- just caching a 2-char language code here, so
// SecureStore's ~2KB item limit is a non-issue.
const CACHE_KEY = "app-workout-language";

function getCached(): Promise<string | null> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.localStorage?.getItem(CACHE_KEY) ?? null);
  }
  return SecureStore.getItemAsync(CACHE_KEY);
}

function setCached(value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(CACHE_KEY, value);
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(CACHE_KEY, value);
}

interface LanguageContextValue {
  language: Lang;
  strings: Strings;
  setLanguage: (lang: Lang) => Promise<void>;
  // Set when the last setLanguage() call failed to save server-side --
  // the toggle used to update the screen instantly regardless of whether
  // the PATCH actually succeeded, which silently left the UI showing
  // "English" while the server (and therefore every translated response)
  // stayed on Spanish. Never swallow this again: the caller (profile.tsx)
  // must show it.
  error: string | null;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Owns its own auth-state effect (rather than threading language down from
// the root layout's existing fetchMe() call) to keep the two concerns --
// "does a Profile row exist" vs "what language does it want" -- decoupled.
// The extra fetchMe() call per auth change is an idempotent GET; not worth
// coupling the two for.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>("es");
  const [error, setError] = useState<string | null>(null);

  // Read the last-known language immediately so the UI doesn't flash back
  // to Spanish on every app open while the network round-trip to /me is
  // still in flight.
  useEffect(() => {
    getCached().then((cached) => {
      if (cached === "en" || cached === "es") setLanguageState(cached);
    });
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      fetchMe()
        .then((me) => {
          setLanguageState(me.language);
          setCached(me.language).catch(() => {});
        })
        .catch((error) => console.error("Failed to load language preference", error));
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Deliberately NOT optimistic: wait for the server to actually confirm
  // the save before changing what the screen shows, and surface a real
  // error if it fails. The previous optimistic version updated the screen
  // immediately regardless of whether the PATCH succeeded, which hid a
  // real save failure -- the toggle looked switched to English forever
  // while the server (and therefore every piece of translated content)
  // silently stayed on Spanish.
  async function setLanguage(lang: Lang) {
    setError(null);
    try {
      const me = await updateLanguage(lang);
      setLanguageState(me.language);
      await setCached(me.language);
    } catch (err) {
      console.error("Failed to save language preference", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <LanguageContext.Provider value={{ language, strings: STRINGS[language], setLanguage, error }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
