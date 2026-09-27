import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatResponse } from "@app-workout/shared";
import type { Lang } from "../auth.js";
import { CHAT_TOOLS, getExerciseDetailTool, searchExercises } from "./tools.js";

// The whole point: the model is a strength & conditioning coach that
// explains and selects, grounded in the tools -- it never invents an
// exercise fact, and it says so plainly when the evidence is thin.
// Written in Spanish (an internal instruction to the model, never shown to
// the athlete) -- the reply-language line at the end is what actually
// controls what the athlete sees. Tool results already come back in that
// same language (see tools.ts / mappers.ts pick()), so the model isn't
// translating on the fly -- it's reading and writing in one language per
// turn.
const SYSTEM_PROMPT_BASE = `Eres un entrenador experto en preparacion fisica y readiness para padel, trabajando dentro de una app que trata cada ejercicio como un objeto de conocimiento estructurado, no como una entrada de una libreria generica.

Reglas que no puedes romper:
- Nunca inventes ni recuerdes de memoria el objetivo, las contraindicaciones, o la evidencia de un ejercicio. Usa siempre "search_exercises" y "get_exercise_detail" para fundamentar cualquier afirmacion sobre un ejercicio concreto.
- Cuando recomiendes o expliques un ejercicio, di por que fue elegido (que cualidad fisica entrena, que objetivo cumple) usando los datos de la herramienta, no una explicacion generica.
- Si el usuario pide una alternativa (no tiene el equipamiento, le duele algo, quiere que sea mas facil), usa las variaciones ya conectadas en get_exercise_detail (progresiones, regresiones, alternativas) en lugar de inventar un sustituto.
- Si la evidencia cientifica de una afirmacion es limitada o conflictiva, dilo explicitamente en vez de sonar mas seguro de lo que los datos permiten.
- Adapta la profundidad de tu explicacion al nivel del usuario -- no asumas que todos quieren la misma cantidad de detalle tecnico.
- Se conciso y directo, como un entrenador real hablando con un jugador, no como un informe.`;

const REPLY_LANGUAGE_INSTRUCTION: Record<Lang, string> = {
  es: "\n\nResponde siempre en espanol, sea cual sea el idioma en el que escriba el usuario.",
  en: "\n\nAlways reply in English, no matter what language the user writes in.",
};

const NO_ANSWER_FALLBACK: Record<Lang, string> = {
  es: "No he podido generar una respuesta con la informacion disponible.",
  en: "I wasn't able to generate a response with the information available.",
};

const MAX_ITERATIONS = 5;

export async function runChat(
  apiKey: string,
  history: ChatMessage[],
  lang: Lang = "es",
): Promise<ChatResponse> {
  const client = new Anthropic({ apiKey });
  const citedExerciseIds = new Set<string>();
  const systemPrompt = SYSTEM_PROMPT_BASE + REPLY_LANGUAGE_INSTRUCTION[lang];

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let finalText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools: CHAT_TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result: unknown;
      if (block.name === "search_exercises") {
        const found = await searchExercises(block.input as Record<string, unknown>, lang);
        for (const item of found) citedExerciseIds.add(item.id);
        result = found;
      } else if (block.name === "get_exercise_detail") {
        const input = block.input as { exerciseId: string };
        result = await getExerciseDetailTool(input.exerciseId, lang);
        citedExerciseIds.add(input.exerciseId);
      } else {
        result = { error: `Unknown tool: ${block.name}` };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    message: {
      role: "assistant",
      content: finalText || NO_ANSWER_FALLBACK[lang],
    },
    citedExerciseIds: Array.from(citedExerciseIds),
  };
}
