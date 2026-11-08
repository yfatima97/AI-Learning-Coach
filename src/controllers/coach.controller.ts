import type { Request, Response, NextFunction } from "express";
import { CoachService } from "../services/coach.service.js";
import { ProgressService } from "../services/progress.service.js";
import { CoachOrchestrator } from "../agents/orchestrator.agent.js";
import { runLearningWorkflow, STEPS, type WorkflowEvent } from "../workflows/learning.workflow.js";

type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

function required(body: Record<string, unknown>, ...keys: string[]) {
  const missing = keys.filter((k) => body?.[k] === undefined || body[k] === "");
  if (missing.length) {
    const err = new Error(`Missing field(s): ${missing.join(", ")}`) as Error & { status?: number };
    err.status = 400;
    throw err;
  }
}

export const CoachController = {
  roadmap: wrap(async (req, res) => {
    required(req.body, "skill");
    const { skill, durationMonths = 12, currentLevel } = req.body;
    res.json(await CoachService.roadmap(skill, Number(durationMonths), currentLevel));
  }),
  project: wrap(async (req, res) => {
    required(req.body, "learnedSoFar");
    res.json(await CoachService.project(req.body.learnedSoFar, req.body.level));
  }),
  quiz: wrap(async (req, res) => {
    required(req.body, "topic");
    const { topic, difficulty, count } = req.body;
    res.json(await CoachService.quiz(topic, difficulty, count ? Number(count) : undefined));
  }),
  interview: wrap(async (req, res) => {
    res.json(await CoachService.interview(req.body?.role, req.body?.level));
  }),
  review: wrap(async (req, res) => {
    required(req.body, "submission");
    res.json(await CoachService.review(req.body.submission, req.body.context, req.body.projectId));
  }),
  schedule: wrap(async (req, res) => {
    required(req.body, "goal");
    res.json(await CoachService.schedule(req.body));
  }),
  reviewRepo: wrap(async (req, res) => {
    required(req.body, "url");
    res.json(await CoachService.reviewRepo(req.body.url, req.body.context, req.body.projectId));
  }),
  ask: wrap(async (req, res) => {
    required(req.body, "question");
    res.json(await CoachService.ask(req.body.question));
  }),
  chat: wrap(async (req, res) => {
    required(req.body, "messages");
    res.json(await CoachOrchestrator.chat(req.body.messages));
  }),

  /**
   * Phase 13 agent workflow. Streams newline-delimited JSON so the UI can show
   * each agent working: {"type":"steps"} first, then {"type":"step"} updates,
   * then {"type":"complete"} (or {"type":"error"}).
   */
  workflow: wrap(async (req, res) => {
    required(req.body, "goal");
    const { goal, durationMonths, level } = req.body;
    res.status(200).set({ "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const send = (e: WorkflowEvent | { type: "steps"; steps: typeof STEPS }) => res.write(JSON.stringify(e) + "\n");
    send({ type: "steps", steps: STEPS });
    try {
      await runLearningWorkflow(String(goal), send, {
        durationMonths: durationMonths ? Number(durationMonths) : undefined,
        level: level || undefined,
      });
    } catch (err) {
      send({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
    res.end();
  }),
};

export const ProgressController = {
  summary: wrap(async (_req, res) => {
    res.json(await ProgressService.summary());
  }),
  getQuiz: wrap(async (req, res) => {
    res.json(await ProgressService.getQuiz(String(req.params.id)));
  }),
  submitQuiz: wrap(async (req, res) => {
    required(req.body, "answers");
    if (!Array.isArray(req.body.answers)) throw Object.assign(new Error("answers must be an array of option indexes"), { status: 400 });
    res.json(await ProgressService.submitQuiz(String(req.params.id), req.body.answers.map(Number)));
  }),
  projectStatus: wrap(async (req, res) => {
    required(req.body, "status");
    res.json(await ProgressService.setProjectStatus(String(req.params.id), req.body.status));
  }),
};
