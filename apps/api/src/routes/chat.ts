import type { FastifyInstance } from "fastify";
import type { ChatRequest, ChatResponse } from "@app-workout/shared";
import { runChat } from "../ai/chat.js";
import { attachLanguage } from "../auth.js";

const NOT_CONFIGURED_MESSAGE = {
  es: "El coach de IA todavia no esta configurado en este servidor (falta ANTHROPIC_API_KEY). El resto de la app funciona con normalidad.",
  en: "The AI coach isn't configured on this server yet (missing ANTHROPIC_API_KEY). The rest of the app works normally.",
};

export function registerChatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequest }>(
    "/chat",
    { onRequest: attachLanguage },
    async (req): Promise<ChatResponse> => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          message: { role: "assistant", content: NOT_CONFIGURED_MESSAGE[req.language] },
          citedExerciseIds: [],
        };
      }

      return runChat(apiKey, req.body.messages, req.language);
    },
  );
}
