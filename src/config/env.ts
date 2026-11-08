import "dotenv/config";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY missing. Copy .env.example to .env and add your key.");
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
};
