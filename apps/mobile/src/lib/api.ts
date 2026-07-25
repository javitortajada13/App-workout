import type {
  ChatMessage,
  ChatResponse,
  ExerciseDetail,
  ProgramDetail,
  ProgramSummary,
  SessionDetail,
} from "@app-workout/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchPrograms() {
  return get<ProgramSummary[]>("/programs");
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
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    throw new Error(`Chat API error ${res.status}`);
  }
  return res.json() as Promise<ChatResponse>;
}
