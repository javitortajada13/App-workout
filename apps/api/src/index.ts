import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAthleteRoutes } from "./routes/athletes.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerExerciseAdminRoutes } from "./routes/exercise-admin.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerProgramAdminRoutes } from "./routes/program-admin.js";
import { registerProgramRoutes } from "./routes/programs.js";
import { registerTaxonomyRoutes } from "./routes/taxonomy.js";

const app = Fastify({ logger: true });

// @fastify/cors's own default `methods` is just 'GET,HEAD,POST' (confirmed
// by reading node_modules/@fastify/cors/index.js -- not documented
// prominently anywhere obvious). Every write in this API -- the language
// toggle, and the whole admin app's PATCH/PUT/DELETE routes -- was
// silently CORS-blocked by the browser whenever the request originated
// from a different origin than the API itself (i.e. always, in
// production: app-workout-web and app-workout-admin are separate
// origins from app-workout-api). A blocked-by-CORS fetch() surfaces to
// the client as a generic network/connection error, which is why this
// looked like a connectivity problem instead of a server config one.
await app.register(cors, { origin: true, methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] });

app.get("/health", async () => ({ status: "ok" }));

registerProgramRoutes(app);
registerChatRoutes(app);
registerMeRoutes(app);
registerAthleteRoutes(app);
registerExerciseAdminRoutes(app);
registerTaxonomyRoutes(app);
registerProgramAdminRoutes(app);

const port = Number(process.env.PORT) || 3000;

app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    app.log.error(err);
    process.exitCode = 1;
  });
