import { z } from "zod";
import { askClaudeJSON } from "../config/claude.js";
import { CoachService } from "../services/coach.service.js";
import { ReviewAgent } from "../agents/review.agent.js";

/**
 * Phase 13: the agent workflow.
 *
 * When the learner says something like "Teach me AI Engineering", specialist
 * agents run as one pipeline and hand their results to each other:
 *
 *   Intake ─▶ Roadmap Agent ─▶ ┬─ Project Agent ─┬─▶ Review Agent ─▶ Progress update
 *                              └─ Quiz Agent ────┘
 *
 * - Intake reads the request (skill, duration, level).
 * - The Roadmap Agent writes the plan; a planner pulls out month 1's focus.
 * - The Project and Quiz agents both build on month 1, so they run in parallel.
 * - The Review Agent checks the starter project fits the learner's level.
 * - Progress is reloaded so the dashboard and the coach see the new plan.
 *
 * Each step reports its status through `emit`, so the UI can show the agents
 * working live. Everything is saved through CoachService.
 */

export type StepId = "intake" | "roadmap" | "project" | "quiz" | "review" | "progress";
export type StepStatus = "running" | "done" | "error";

export type WorkflowEvent =
  | { type: "step"; step: StepId; status: StepStatus; summary?: string; data?: unknown }
  | { type: "complete"; result: WorkflowResult }
  | { type: "error"; message: string };

export interface WorkflowResult {
  goal: { goalId: string; skill: string; durationMonths: number; level: string };
  focus: Focus;
  project: { projectId: string; title: string };
  quiz: { quizId: string; topic: string; questionCount: number };
  review: { rating: number; summary: string; improvements: string[] };
  nextStep: string;
}

export const STEPS: { id: StepId; agent: string; label: string }[] = [
  { id: "intake", agent: "Coach", label: "Understand your goal" },
  { id: "roadmap", agent: "Roadmap Agent", label: "Build your roadmap" },
  { id: "project", agent: "Project Agent", label: "Design a starter project" },
  { id: "quiz", agent: "Quiz Agent", label: "Write a skills check" },
  { id: "review", agent: "Review Agent", label: "Check the plan fits you" },
  { id: "progress", agent: "Progress Tracker", label: "Update your progress" },
];

const IntakeSchema = z.object({
  skill: z.string().describe("The skill or career goal, short, e.g. 'AI Engineering'"),
  durationMonths: z.number().int().describe("Plan length in months, 1 to 12. Use 6 if not stated."),
  level: z.enum(["beginner", "intermediate", "advanced"]).describe("Use beginner if not stated."),
});

const FocusSchema = z.object({
  month1Theme: z.string().describe("Month 1's theme in a few words"),
  quizTopic: z.string().describe("The single most important topic to quiz on first"),
  projectBrief: z.string().describe("One or two sentences: what the learner will know after month 1, to base a project on"),
});
type Focus = z.infer<typeof FocusSchema>;

export async function runLearningWorkflow(
  request: string,
  emit: (e: WorkflowEvent) => void = () => {},
  overrides: Partial<z.infer<typeof IntakeSchema>> = {},
): Promise<WorkflowResult> {
  // Runs one step and reports running/done/error around it.
  async function step<T>(id: StepId, work: () => Promise<T>, summarize: (r: T) => string, data?: (r: T) => unknown) {
    emit({ type: "step", step: id, status: "running" });
    try {
      const result = await work();
      emit({ type: "step", step: id, status: "done", summary: summarize(result), data: data?.(result) });
      return result;
    } catch (err) {
      emit({ type: "step", step: id, status: "error", summary: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }

  // 1. Intake: turn free text into structured goal settings.
  const intake = await step(
    "intake",
    async () => {
      const parsed = await askClaudeJSON(
        "You extract a learner's goal from their message. Be faithful to what they said.",
        `Learner's message: "${request}"`,
        IntakeSchema,
        "low",
      );
      const merged = { ...parsed, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)) };
      return { ...merged, durationMonths: Math.min(12, Math.max(1, Math.round(merged.durationMonths))) };
    },
    (r) => `${r.skill} · ${r.durationMonths}-month plan · ${r.level}`,
    (r) => r,
  );

  // 2. Roadmap Agent, then a quick planner hand-off that picks month 1's focus.
  const roadmapStep = await step(
    "roadmap",
    async () => {
      const roadmap = await CoachService.roadmap(intake.skill, intake.durationMonths, intake.level);
      const focus = await askClaudeJSON(
        "You read a learning roadmap and pick out what the learner should focus on first.",
        `<roadmap>\n${roadmap.roadmap}\n</roadmap>\n\nWhat is month 1 about?`,
        FocusSchema,
        "low",
      );
      return { ...roadmap, focus };
    },
    (r) => `Month 1: ${r.focus.month1Theme}`,
    (r) => ({ goalId: r.goalId, roadmap: r.roadmap, focus: r.focus }),
  );
  const { focus } = roadmapStep;

  // 3 + 4. Project and Quiz agents both build on month 1, so run them side by side.
  const [project, quiz] = await Promise.all([
    step(
      "project",
      () => CoachService.project(`${focus.projectBrief} (Month 1 of a roadmap for ${intake.skill})`, intake.level),
      (r) => r.title,
      (r) => ({ projectId: r.projectId, title: r.title, project: r.project }),
    ),
    step(
      "quiz",
      () => CoachService.quiz(focus.quizTopic, intake.level, 5),
      (r) => `${r.questions.length} questions on ${r.topic}`,
      (r) => ({ quizId: r.quizId, topic: r.topic, questionCount: r.questions.length }),
    ),
  ]);

  // 5. Review Agent: does the starter project suit this learner? (Not saved as a
  //    code review, so it doesn't change the learner's review average.)
  const review = await step(
    "review",
    () =>
      ReviewAgent.review(
        project.project,
        `This is a starter project generated for a ${intake.level} learner in month 1 (${focus.month1Theme}) ` +
          `of a ${intake.durationMonths}-month ${intake.skill} roadmap. Rate how well it fits their level and ` +
          `goal, and suggest how they can get the most out of it.`,
      ),
    (r) => `Plan fit ${r.rating}/10`,
    (r) => r,
  );

  // 6. Progress update: reload the learner's progress so the dashboard reflects the new plan.
  await step(
    "progress",
    () => CoachService.progress(),
    (p) => `Goal set · ${p.projects.queue.length} project${p.projects.queue.length === 1 ? "" : "s"} in your queue`,
  );

  const result: WorkflowResult = {
    goal: { goalId: roadmapStep.goalId, skill: intake.skill, durationMonths: intake.durationMonths, level: intake.level },
    focus,
    project: { projectId: project.projectId, title: project.title },
    quiz: { quizId: quiz.quizId, topic: quiz.topic, questionCount: quiz.questions.length },
    review: { rating: review.rating, summary: review.summary, improvements: review.improvements },
    nextStep: `Take the ${quiz.topic} quiz to see where you stand, then start "${project.title}".`,
  };
  emit({ type: "complete", result });
  return result;
}
