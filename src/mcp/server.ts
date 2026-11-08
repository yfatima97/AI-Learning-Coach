/**
 * AI Learning Coach as an MCP server (Phase 10).
 *
 * Any MCP client (Claude Desktop, Claude Code, IDEs) can launch this over stdio
 * and call the coach's agents and tools directly. See README "MCP server".
 * Never write to stdout here: stdout carries the MCP protocol. Use console.error.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { formatSources } from "../agents/knowledge.agent.js";
import { search } from "../vector/store.js";
import { CoachService } from "../services/coach.service.js";
import { ProgressService } from "../services/progress.service.js";

const server = new McpServer({ name: "ai-learning-coach", version: "1.0.0" });

/** Wrap a function so its result (string or object) becomes MCP text content, and errors are reported, not thrown. */
function handler<A>(fn: (args: A) => Promise<unknown>) {
  return async (args: A) => {
    try {
      const result = await fn(args);
      const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

server.registerTool(
  "create_roadmap",
  {
    title: "Create learning roadmap",
    description: "Create a month-by-month learning roadmap with weekly topics, projects, tools and milestones.",
    inputSchema: { skill: z.string(), durationMonths: z.number().int().default(12), currentLevel: z.string().optional() },
  },
  handler(({ skill, durationMonths, currentLevel }) => CoachService.roadmap(skill, durationMonths, currentLevel)),
);

server.registerTool(
  "create_project",
  {
    title: "Create practice project",
    description: "Design one hands-on project (requirements, dataset, tasks, deliverables, rubric) for what the learner just studied.",
    inputSchema: { learnedSoFar: z.string(), level: z.string().optional() },
  },
  handler(({ learnedSoFar, level }) => CoachService.project(learnedSoFar, level)),
);

server.registerTool(
  "create_quiz",
  {
    title: "Create quiz",
    description: "Generate multiple choice questions with answers and explanations.",
    inputSchema: { topic: z.string(), difficulty: z.string().optional(), count: z.number().int().optional() },
  },
  handler(({ topic, difficulty, count }) => CoachService.quiz(topic, difficulty, count)),
);

server.registerTool(
  "create_mock_interview",
  {
    title: "Mock interview",
    description: "Generate mock interview questions for a role, with what a strong answer covers.",
    inputSchema: { role: z.string().optional(), level: z.string().optional() },
  },
  handler(({ role, level }) => CoachService.interview(role, level)),
);

server.registerTool(
  "review_submission",
  {
    title: "Review submission",
    description: "Review pasted code or written work: strengths, weaknesses, improvements and a score out of 10.",
    inputSchema: { submission: z.string(), context: z.string().optional(), projectId: z.string().optional() },
  },
  handler(({ submission, context, projectId }) => CoachService.review(submission, context, projectId)),
);

server.registerTool(
  "review_github_repo",
  {
    title: "Review GitHub repo",
    description: "Fetch a public GitHub repository (README + main source files) and review it like a senior engineer, scored out of 10.",
    inputSchema: { url: z.string().describe("e.g. https://github.com/owner/repo"), context: z.string().optional(), projectId: z.string().optional() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  handler(({ url, context, projectId }) => CoachService.reviewRepo(url, context, projectId)),
);

server.registerTool(
  "schedule_study_plan",
  {
    title: "Schedule study plan",
    description: "Plan dated study sessions for a goal and save them as an .ics calendar file the learner can import.",
    inputSchema: {
      goal: z.string(),
      weeks: z.number().int().optional(),
      days: z.array(z.enum(DAYS)).optional().describe("Study days, default Mon/Wed/Fri"),
      startDate: z.string().optional().describe("YYYY-MM-DD, default next Monday"),
      startTime: z.string().optional().describe("HH:MM 24h local time, default 19:00"),
      minutesPerSession: z.number().int().optional(),
    },
  },
  handler((args) => CoachService.schedule(args)),
);

server.registerTool(
  "search_knowledge_base",
  {
    title: "Search study materials",
    description: "Search the learner's own study materials (knowledge/ folder) and return the most relevant passages.",
    inputSchema: { query: z.string() },
    annotations: { readOnlyHint: true },
  },
  handler(async ({ query }) => {
    const results = await search(query);
    return results.length ? formatSources(results) : "No matching material. Add files to knowledge/ and run npm run ingest.";
  }),
);

server.registerTool(
  "ask_knowledge_base",
  {
    title: "Ask study materials",
    description: "Answer a question from the learner's study materials, with citations.",
    inputSchema: { question: z.string() },
    annotations: { readOnlyHint: true },
  },
  handler(({ question }) => CoachService.ask(question)),
);

server.registerTool(
  "get_progress",
  {
    title: "Learning progress",
    description: "The learner's current goal, project queue, quiz scores by topic (with weak topics), review ratings and interview count.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  handler(() => ProgressService.summary()),
);

server.registerTool(
  "submit_quiz_answers",
  {
    title: "Submit quiz answers",
    description: "Grade the learner's answers to a saved quiz (0-based option indexes, in question order) and record the score.",
    inputSchema: { quizId: z.string(), answers: z.array(z.number().int()) },
  },
  handler(({ quizId, answers }) => ProgressService.submitQuiz(quizId, answers)),
);

server.registerTool(
  "update_project_status",
  {
    title: "Update project status",
    description: "Move a project through the queue: todo, in_progress, submitted or done.",
    inputSchema: { projectId: z.string(), status: z.enum(["todo", "in_progress", "submitted", "done"]) },
  },
  handler(({ projectId, status }) => ProgressService.setProjectStatus(projectId, status)),
);

await server.connect(new StdioServerTransport());
console.error("AI Learning Coach MCP server running on stdio");
