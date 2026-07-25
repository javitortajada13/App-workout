import type { FastifyInstance } from "fastify";
import type { ChatRequest, ChatResponse } from "@app-workout/shared";
import { runChat } from "../ai/chat.js";

export function registerChatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequest }>("/chat", async (req): Promise<ChatResponse> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        message: {
          role: "assistant",
          content:
            "El coach de IA todavia no esta configurado en este servidor (falta ANTHROPIC_API_KEY). El resto de la app funciona con normalidad.",
        },
        citedExerciseIds: [],
      };
    }

    return runChat(apiKey, req.body.messages);
  });
}
