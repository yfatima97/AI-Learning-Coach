import { askClaudeJSON } from "../config/claude.js";
import { InterviewSchema } from "../types/coach.types.js";

const SYSTEM = `You are a hiring manager running technical interviews for AI roles.`;

export class InterviewAgent {
  static generate(role = "AI Engineer", level = "junior", count = 8) {
    return askClaudeJSON(
      SYSTEM,
      `Run a mock interview for a ${level} ${role}.
Write ${count} questions mixing fundamentals (embeddings, RAG vs fine-tuning, MCP, agents),
system design and behavioural questions. For each, say what a strong answer covers.`,
      InterviewSchema,
    );
  }
}
