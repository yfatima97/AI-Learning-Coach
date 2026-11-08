import type { Request, Response, NextFunction } from "express";
import { CoachService } from "../services/coach.service.js";
import { scheduleStudyPlan } from "../tools/calendar.tool.js";
import { reviewGithubRepo } from "../tools/github.tool.js";

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
    res.json({ roadmap: await CoachService.roadmap(skill, Number(durationMonths), currentLevel) });
  }),
  project: wrap(async (req, res) => {
    required(req.body, "learnedSoFar");
    res.json({ project: await CoachService.project(req.body.learnedSoFar, req.body.level) });
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
    res.json(await CoachService.review(req.body.submission, req.body.context));
  }),
  schedule: wrap(async (req, res) => {
    required(req.body, "goal");
    res.json(await scheduleStudyPlan(req.body));
  }),
  reviewRepo: wrap(async (req, res) => {
    required(req.body, "url");
    res.json(await reviewGithubRepo(req.body.url, req.body.context));
  }),
  ask: wrap(async (req, res) => {
    required(req.body, "question");
    res.json(await CoachService.ask(req.body.question));
  }),
  chat: wrap(async (req, res) => {
    required(req.body, "messages");
    res.json(await CoachService.chat(req.body.messages));
  }),
};
