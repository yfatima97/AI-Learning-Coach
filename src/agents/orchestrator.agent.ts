import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { claude, baseParams } from "../config/claude.js";
import { RoadmapAgent } from "./roadmap.agent.js";
import { ProjectAgent } from "./project.agent.js";
import { QuizAgent } from "./quiz.agent.js";
import { InterviewAgent } from "./interview.agent.js";
import { ReviewAgent } from "./review.agent.js";
import { formatSources } from "./knowledge.agent.js";
import { search } from "../vector/store.js";

/**
 * The Coach (orchestrator) is itself a Claude agent. Each specialist agent is
 * exposed to it as a tool, and Claude decides which ones to call and in what
 * order to reach the learner's goal (Phase 13: agent workflow).
 * Phase 9 added knowledge-base search; later phases add calendar and progress tools.
 */
const tools = [
  betaZodTool({
    name: "search_knowledge_base",
    description:
      "Search the learner's own study materials (books, notes, docs in knowledge/). " +
      "Use it before answering conceptual questions so answers match what they are studying. Cite results like [1].",
    inputSchema: z.object({ query: z.string().describe("What to look for, in plain words") }),
    run: async ({ query }) => {
      const results = await search(query);
      return results.length ? formatSources(results) : "No matching material in the knowledge base.";
    },
  }),
  betaZodTool({
    name: "create_roadmap",
    description: "Create a month-by-month learning roadmap for a goal.",
    inputSchema: z.object({
      skill: z.string(),
      durationMonths: z.number().int(),
      currentLevel: z.string().optional(),
    }),
    run: ({ skill, durationMonths, currentLevel }) => RoadmapAgent.generate(skill, durationMonths, currentLevel),
  }),
  betaZodTool({
    name: "create_project",
    description: "Design one hands-on project for what the learner has just studied.",
    inputSchema: z.object({ learnedSoFar: z.string(), level: z.string().optional() }),
    run: ({ learnedSoFar, level }) => ProjectAgent.generate(learnedSoFar, level),
  }),
  betaZodTool({
    name: "create_quiz",
    description: "Generate a multiple choice quiz on a topic.",
    inputSchema: z.object({
      topic: z.string(),
      difficulty: z.string().optional(),
      count: z.number().int().optional(),
    }),
    run: async ({ topic, difficulty, count }) => JSON.stringify(await QuizAgent.generate(topic, difficulty, count)),
  }),
  betaZodTool({
    name: "create_mock_interview",
    description: "Generate mock interview questions for a role.",
    inputSchema: z.object({ role: z.string().optional(), level: z.string().optional() }),
    run: async ({ role, level }) => JSON.stringify(await InterviewAgent.generate(role, level)),
  }),
  betaZodTool({
    name: "review_submission",
    description: "Review a learner's code or written work and score it out of 10.",
    inputSchema: z.object({ submission: z.string(), context: z.string().optional() }),
    run: async ({ submission, context }) => JSON.stringify(await ReviewAgent.review(submission, context)),
  }),
];

const SYSTEM = `You are an AI Learning Coach. Help the learner reach their goal by
planning, teaching, assessing and reviewing. Use your tools to search their study materials, create roadmaps,
projects, quizzes, mock interviews and reviews; call only the tools the request
needs. Finish with a short, friendly summary and the single best next step.`;

export class CoachOrchestrator {
  static async chat(history: Anthropic.Beta.BetaMessageParam[]) {
    const finalMessage = await claude.beta.messages.toolRunner({
      ...baseParams,
      max_tokens: 32000,
      max_iterations: 8,
      system: SYSTEM,
      tools,
      messages: history,
      stream: true,
    }).runUntilDone();

    if (finalMessage.stop_reason === "refusal") {
      throw new Error("Claude declined this request.");
    }
    const reply = finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    // Only the text goes back to the client. The raw content also holds thinking
    // blocks with long encrypted signatures, which are noise for a UI.
    // To continue the chat, the client appends { role: "assistant", content: reply }.
    return { reply };
  }
}
