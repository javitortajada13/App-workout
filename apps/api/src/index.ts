import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAthleteRoutes } from "./routes/athletes.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerExerciseAdminRoutes } from "./routes/exercise-admin.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerProgramRoutes } from "./routes/programs.js";
import { registerTaxonomyRoutes } from "./routes/taxonomy.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok" }));

registerProgramRoutes(app);
registerChatRoutes(app);
registerMeRoutes(app);
registerAthleteRoutes(app);
registerExerciseAdminRoutes(app);
registerTaxonomyRoutes(app);

const port = Number(process.env.PORT) || 3000;

app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    app.log.error(err);
    process.exitCode = 1;
  });
