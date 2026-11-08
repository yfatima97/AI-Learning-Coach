import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { claude, baseParams } from "../config/claude.js";
import { CoachService } from "../services/coach.service.js";
import { formatSources } from "./knowledge.agent.js";
import { search } from "../vector/store.js";

/**
 * The Coach (orchestrator) is itself a Claude agent. Each specialist agent and
 * tool is exposed to it as a tool, and Claude decides which ones to call and in
 * what order to reach the learner's goal (Phase 13: agent workflow).
 * Every result goes through CoachService, so it is saved to the progress database.
 */
const json = (x: unknown) => JSON.stringify(x);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const tools = [
  betaZodTool({
    name: "get_progress",
    description:
      "Get the learner's current goal, project queue, quiz scores by topic (with weak topics), review ratings and interview count. " +
      "Check this first when recommending next steps or adapting the plan.",
    inputSchema: z.object({}),
    run: async () => json(await CoachService.progress()),
  }),
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
    description: "Create a month-by-month learning roadmap for a goal. Saves it as the learner's current goal.",
    inputSchema: z.object({ skill: z.string(), durationMonths: z.number().int(), currentLevel: z.string().optional() }),
    run: async ({ skill, durationMonths, currentLevel }) => json(await CoachService.roadmap(skill, durationMonths, currentLevel)),
  }),
  betaZodTool({
    name: "create_project",
    description: "Design one hands-on project for what the learner has just studied. Adds it to their project queue.",
    inputSchema: z.object({ learnedSoFar: z.string(), level: z.string().optional() }),
    run: async ({ learnedSoFar, level }) => json(await CoachService.project(learnedSoFar, level)),
  }),
  betaZodTool({
    name: "create_quiz",
    description: "Generate a multiple choice quiz on a topic (saved so the learner's answers can be graded).",
    inputSchema: z.object({ topic: z.string(), difficulty: z.string().optional(), count: z.number().int().optional() }),
    run: async ({ topic, difficulty, count }) => json(await CoachService.quiz(topic, difficulty, count)),
  }),
  betaZodTool({
    name: "create_mock_interview",
    description: "Generate mock interview questions for a role.",
    inputSchema: z.object({ role: z.string().optional(), level: z.string().optional() }),
    run: async ({ role, level }) => json(await CoachService.interview(role, level)),
  }),
  betaZodTool({
    name: "review_submission",
    description: "Review a learner's code or written work and score it out of 10. Pass projectId if it is for a queued project.",
    inputSchema: z.object({ submission: z.string(), context: z.string().optional(), projectId: z.string().optional() }),
    run: async ({ submission, context, projectId }) => json(await CoachService.review(submission, context, projectId)),
  }),
  betaZodTool({
    name: "review_github_repo",
    description: "Fetch a public GitHub repo (README + main source files) and review it, scored out of 10.",
    inputSchema: z.object({ url: z.string(), context: z.string().optional(), projectId: z.string().optional() }),
    run: async ({ url, context, projectId }) => json(await CoachService.reviewRepo(url, context, projectId)),
  }),
  betaZodTool({
    name: "schedule_study_plan",
    description: "Plan dated study sessions for a goal and save them as an .ics calendar file.",
    inputSchema: z.object({
      goal: z.string(),
      weeks: z.number().int().optional(),
      days: z.array(z.enum(DAYS)).optional(),
      startDate: z.string().optional().describe("YYYY-MM-DD"),
      startTime: z.string().optional().describe("HH:MM 24h"),
      minutesPerSession: z.number().int().optional(),
    }),
    run: async (args) => json(await CoachService.schedule(args)),
  }),
];

const SYSTEM = `You are an AI Learning Coach. Help the learner reach their goal by
planning, teaching, assessing, reviewing and adapting. Use your tools to check their
progress, search their study materials, create roadmaps, projects, quizzes, mock
interviews, reviews (including GitHub repos) and calendar study schedules; call only
the tools the request needs. When recommending what to do next, look at their progress
first and target weak topics. Finish with a short, friendly summary and the single best next step.`;

export class CoachOrchestrator {
  static async chat(history: Anthropic.Beta.BetaMessageParam[]) {
    const finalMessage = await claude.beta.messages
      .toolRunner({
        ...baseParams,
        max_tokens: 32000,
        max_iterations: 8,
        system: SYSTEM,
        tools,
        messages: history,
        stream: true,
      })
      .runUntilDone();

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
