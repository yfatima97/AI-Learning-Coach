import { askClaudeJSON } from "../config/claude.js";
import { QuizSchema } from "../types/coach.types.js";

const SYSTEM = `You are an expert instructor who writes fair, unambiguous multiple choice questions.`;

export class QuizAgent {
  static generate(topic: string, difficulty = "beginner", count = 10) {
    return askClaudeJSON(
      SYSTEM,
      `Create ${count} multiple choice questions.
Topic: ${topic}
Difficulty: ${difficulty}
Each question has exactly 4 options and one correct answer.`,
      QuizSchema,
      "low",
    );
  }
}
