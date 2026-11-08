import type Anthropic from "@anthropic-ai/sdk";
import { RoadmapAgent } from "../agents/roadmap.agent.js";
import { ProjectAgent } from "../agents/project.agent.js";
import { QuizAgent } from "../agents/quiz.agent.js";
import { InterviewAgent } from "../agents/interview.agent.js";
import { ReviewAgent } from "../agents/review.agent.js";
import { KnowledgeAgent } from "../agents/knowledge.agent.js";
import { CoachOrchestrator } from "../agents/orchestrator.agent.js";

export class CoachService {
  static roadmap = (skill: string, months: number, level?: string) => RoadmapAgent.generate(skill, months, level);
  static project = (learned: string, level?: string) => ProjectAgent.generate(learned, level);
  static quiz = (topic: string, difficulty?: string, count?: number) => QuizAgent.generate(topic, difficulty, count);
  static interview = (role?: string, level?: string) => InterviewAgent.generate(role, level);
  static review = (submission: string, context?: string) => ReviewAgent.review(submission, context);
  static ask = (question: string) => KnowledgeAgent.ask(question);
  static chat = (history: Anthropic.Beta.BetaMessageParam[]) => CoachOrchestrator.chat(history);
}
