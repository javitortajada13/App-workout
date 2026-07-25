import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerChatRoutes } from "./routes/chat.js";
import { registerProgramRoutes } from "./routes/programs.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok" }));

registerProgramRoutes(app);
registerChatRoutes(app);

const port = Number(process.env.PORT) || 3000;

app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    app.log.error(err);
    process.exitCode = 1;
  });
