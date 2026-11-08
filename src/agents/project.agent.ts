import { askClaude } from "../config/claude.js";

const SYSTEM = `You are a Senior AI Engineer who designs portfolio-worthy practice projects.
Format output as clear Markdown.`;

export class ProjectAgent {
  static generate(learnedSoFar: string, level = "beginner") {
    return askClaude(
      SYSTEM,
      `The learner says: "${learnedSoFar}". Level: ${level}.
Design ONE hands-on project that practices exactly this. Include:
- Title and one-line pitch
- Requirements
- Dataset (or how to get one)
- Step-by-step tasks
- Deliverables
- Scoring rubric (out of 10)`,
    );
  }
}
