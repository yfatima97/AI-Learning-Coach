import { askClaudeJSON } from "../config/claude.js";
import { ReviewSchema } from "../types/coach.types.js";

const SYSTEM = `You are a Senior Staff Engineer reviewing a learner's submission.
Be specific and encouraging, but honest. Reference concrete lines or patterns.`;

export class ReviewAgent {
  static review(submission: string, context = "") {
    return askClaudeJSON(
      SYSTEM,
      `Review this submission.${context ? `\nAssignment context: ${context}` : ""}

<submission>
${submission}
</submission>

Provide strengths, weaknesses, concrete improvements and a rating out of 10.`,
      ReviewSchema,
      "high",
    );
  }
}
