import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  // Local-only, no network call -- for the login screen, which has no
  // bearer token yet to authorize PATCH /me. Lets someone who can't read
  // the app's current language switch it before they can even log in. See
  // the auth-state-change effect below for how an explicit pre-login pick
  // becomes the athlete's real saved preference once they do log in.
  setLocalLanguage: (lang: Lang) => void;
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
  // Tracks an explicit pre-login pick (login.tsx's language switch) made
  // THIS app session, so it can be pushed to the server as the athlete's
  // real preference right after they log in -- otherwise fetchMe()'s
  // server value would silently win and revert their choice back to
  // whatever was last saved (e.g. a fresh Profile's "es" default), which
  // would defeat the entire point of letting someone pick a language
  // before they can read the login screen at all.
  const explicitChoiceRef = useRef<Lang | null>(null);

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
        .then(async (me) => {
          const pending = explicitChoiceRef.current;
          if (pending && pending !== me.language) {
            try {
              const updated = await updateLanguage(pending);
              explicitChoiceRef.current = null;
              setLanguageState(updated.language);
              await setCached(updated.language);
              return;
            } catch (err) {
              // Couldn't sync the pre-login pick server-side (e.g. offline)
              // -- fall through and use whatever the server actually has
              // rather than leaving the UI stuck on an unsaved choice.
              console.error("Failed to sync pre-login language choice", err);
            }
          }
          explicitChoiceRef.current = null;
          setLanguageState(me.language);
          setCached(me.language).catch(() => {});
        })
        .catch((error) => console.error("Failed to load language preference", error));
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  function setLocalLanguage(lang: Lang) {
    explicitChoiceRef.current = lang;
    setLanguageState(lang);
    setCached(lang).catch(() => {});
  }

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
    <LanguageContext.Provider
      value={{ language, strings: STRINGS[language], setLanguage, setLocalLanguage, error }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
