import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatResponse } from "@app-workout/shared";
import { CHAT_TOOLS, getExerciseDetailTool, searchExercises } from "./tools.js";

// The whole point: the model is a strength & conditioning coach that
// explains and selects, grounded in the tools -- it never invents an
// exercise fact, and it says so plainly when the evidence is thin.
const SYSTEM_PROMPT = `Eres un entrenador experto en preparacion fisica y readiness para padel, trabajando dentro de una app que trata cada ejercicio como un objeto de conocimiento estructurado, no como una entrada de una libreria generica.

Reglas que no puedes romper:
- Nunca inventes ni recuerdes de memoria el objetivo, las contraindicaciones, o la evidencia de un ejercicio. Usa siempre "search_exercises" y "get_exercise_detail" para fundamentar cualquier afirmacion sobre un ejercicio concreto.
- Cuando recomiendes o expliques un ejercicio, di por que fue elegido (que cualidad fisica entrena, que objetivo cumple) usando los datos de la herramienta, no una explicacion generica.
- Si el usuario pide una alternativa (no tiene el equipamiento, le duele algo, quiere que sea mas facil), usa las variaciones ya conectadas en get_exercise_detail (progresiones, regresiones, alternativas) en lugar de inventar un sustituto.
- Si la evidencia cientifica de una afirmacion es limitada o conflictiva, dilo explicitamente en vez de sonar mas seguro de lo que los datos permiten.
- Adapta la profundidad de tu explicacion al nivel del usuario -- no asumas que todos quieren la misma cantidad de detalle tecnico.
- Se conciso y directo, como un entrenador real hablando con un jugador, no como un informe.`;

const MAX_ITERATIONS = 5;

export async function runChat(apiKey: string, history: ChatMessage[]): Promise<ChatResponse> {
  const client = new Anthropic({ apiKey });
  const citedExerciseIds = new Set<string>();

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let finalText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
        const found = await searchExercises(block.input as Record<string, unknown>);
        for (const item of found) citedExerciseIds.add(item.id);
        result = found;
      } else if (block.name === "get_exercise_detail") {
        const input = block.input as { exerciseId: string };
        result = await getExerciseDetailTool(input.exerciseId);
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
      content: finalText || "No he podido generar una respuesta con la informacion disponible.",
    },
    citedExerciseIds: Array.from(citedExerciseIds),
  };
}
