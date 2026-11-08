import { askClaude } from "../config/claude.js";

const SYSTEM = `You are a Senior AI Engineer and learning coach. You design realistic,
project-driven learning roadmaps for working adults. Format output as clear Markdown.`;

export class RoadmapAgent {
  static generate(skill: string, durationMonths: number, currentLevel = "beginner") {
    return askClaude(
      SYSTEM,
      `Create a detailed ${durationMonths}-month learning roadmap.
Goal: ${skill}
Current level: ${currentLevel}

For every month include:
1. Weekly topics
2. A hands-on project
3. Tools to learn
4. A milestone to check progress
5. Interview preparation focus`,
      "high",
    );
  }
}
