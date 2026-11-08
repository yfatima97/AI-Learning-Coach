import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { coachRoutes } from "./routes/coach.routes.js";
import { progressRoutes } from "./routes/progress.routes.js";
import { requirePassword } from "./middleware/access.js";
import { projectRoot } from "./config/load-env.js";

export const app = express();

app.use(requirePassword);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/coach", coachRoutes);
app.use("/api/progress", progressRoutes);

// In production the API also serves the built Angular app (npm run build creates it),
// so the whole coach runs as one Azure App Service on one URL.
const webDir = path.join(projectRoot, "frontend", "dist", "frontend", "browser");
if (existsSync(webDir)) {
  app.use(express.static(webDir));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => res.sendFile(path.join(webDir, "index.html")));
}

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Rate limited by the Claude API, try again shortly." });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return res.status(500).json({ error: "Invalid ANTHROPIC_API_KEY." });
  }
  if (err instanceof Anthropic.APIError) {
    return res.status(502).json({ error: `Claude API error: ${err.message}` });
  }
  res.status(err.status ?? 500).json({ error: err.message });
});
