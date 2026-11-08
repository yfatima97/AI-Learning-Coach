import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { config } from "./env.js";

// Reads ANTHROPIC_API_KEY from the environment.
export const claude = new Anthropic();

// Shared request settings for every agent.
// `fallbacks: "default"` lets the API retry on a fallback model if a request is declined.
export const baseParams = {
  model: config.model,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

/** Ask Claude for free-form text (markdown). */
export async function askClaude(system: string, prompt: string, effort: "low" | "medium" | "high" = "medium") {
  const response = await claude.beta.messages
    .stream({
      ...baseParams,
      max_tokens: 32000,
      system,
      output_config: { effort },
      messages: [{ role: "user", content: prompt }],
    })
    .finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request.");
  }
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/** Ask Claude for JSON that matches a Zod schema (structured outputs). */
export async function askClaudeJSON<T extends z.ZodType>(
  system: string,
  prompt: string,
  schema: T,
  effort: "low" | "medium" | "high" = "medium",
): Promise<z.infer<T>> {
  const response = await claude.beta.messages.parse({
    ...baseParams,
    max_tokens: 16000,
    system,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request.");
  }
  if (!response.parsed_output) {
    throw new Error("Claude returned output that did not match the schema.");
  }
  return response.parsed_output as z.infer<T>;
}
