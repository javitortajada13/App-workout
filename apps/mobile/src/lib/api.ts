import type {
  ChatMessage,
  ChatResponse,
  ExerciseDetail,
  MyProgramSummary,
  ProgramDetail,
  SessionDetail,
} from "@app-workout/shared";

import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: await authHeaders() });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

// Athlete-scoped: an athlete sees only their own active program, a coach
// sees every non-archived one (see apps/api/src/routes/programs.ts).
// Replaces the old fetchPrograms()/GET /programs, which returned every
// program in the database to anyone, logged in or not.
export function fetchMyPrograms() {
  return get<MyProgramSummary[]>("/me/programs");
}

// Called once per session after login purely for its side effect: hitting
// any authenticated route makes the API auto-provision this user's
// Profile row (see apps/api/src/auth.ts). Without this, nothing in the
// app ever called an authenticated endpoint -- /programs works logged
// out too -- so a real login never actually created a Profile.
export interface Me {
  id: string;
  email: string;
  role: "coach" | "athlete";
  language: "es" | "en";
}

export function fetchMe() {
  return get<Me>("/me");
}

export function fetchProgram(id: string) {
  return get<ProgramDetail>(`/programs/${id}`);
}

export function fetchSession(id: string) {
  return get<SessionDetail>(`/sessions/${id}`);
}

export function fetchExercise(id: string) {
  return get<ExerciseDetail>(`/exercises/${id}`);
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  // Auth header included (even though /chat doesn't require login) so the
  // API can resolve this athlete's language preference and have the coach
  // reply in it -- see apps/api/src/auth.ts attachLanguage.
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    throw new Error(`Chat API error ${res.status}`);
  }
  return res.json() as Promise<ChatResponse>;
}

export function updateLanguage(language: "es" | "en") {
  return patch<Me>("/me", { language });
}
