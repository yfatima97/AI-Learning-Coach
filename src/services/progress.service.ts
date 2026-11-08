import { prisma } from "../db/client.js";
import type { Quiz, Review, Interview } from "../types/coach.types.js";

/**
 * Persistence + progress analytics (Phase 11).
 * Single-learner for now: everything belongs to one user (LEARNER_NAME, default "me").
 * Authentication can map real users onto this later.
 */
const LEARNER = process.env.LEARNER_NAME || "me";

async function learnerId() {
  const user = await prisma.user.upsert({ where: { name: LEARNER }, update: {}, create: { name: LEARNER } });
  return user.id;
}

const titleOf = (markdown: string) =>
  markdown.match(/^#+\s*(?:Project:\s*)?(.+)$/m)?.[1]?.replace(/[*_`]/g, "").trim().slice(0, 120) || "Untitled project";

export const ProgressService = {
  async saveGoal(skill: string, durationMonths: number, level: string | undefined, roadmap: string) {
    const userId = await learnerId();
    await prisma.goal.updateMany({ where: { userId, active: true }, data: { active: false } });
    return prisma.goal.create({ data: { userId, skill, durationMonths, level, roadmap } });
  },

  async saveProject(brief: string) {
    return prisma.project.create({ data: { userId: await learnerId(), title: titleOf(brief), brief } });
  },

  async setProjectStatus(id: string, status: string) {
    const allowed = ["todo", "in_progress", "submitted", "done"];
    if (!allowed.includes(status)) throw Object.assign(new Error(`status must be one of ${allowed.join(", ")}`), { status: 400 });
    if (!(await prisma.project.findUnique({ where: { id } }))) throw Object.assign(new Error("Project not found"), { status: 404 });
    return prisma.project.update({ where: { id }, data: { status } });
  },

  async saveQuiz(quiz: Quiz) {
    return prisma.quiz.create({
      data: { userId: await learnerId(), topic: quiz.topic, difficulty: quiz.difficulty, questions: quiz.questions },
    });
  },

  async getQuiz(id: string) {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw Object.assign(new Error("Quiz not found"), { status: 404 });
    return { quizId: quiz.id, topic: quiz.topic, difficulty: quiz.difficulty, questions: quiz.questions as Quiz["questions"] };
  },

  /** Grade a quiz attempt on the server, so scores can be trusted for progress tracking. */
  async submitQuiz(quizId: string, answers: number[]) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw Object.assign(new Error("Quiz not found"), { status: 404 });
    const questions = quiz.questions as Quiz["questions"];
    const results = questions.map((q, i) => ({
      question: q.question,
      yourAnswer: answers[i] ?? null,
      correctIndex: q.correctIndex,
      correct: answers[i] === q.correctIndex,
      explanation: q.explanation,
    }));
    const score = results.filter((r) => r.correct).length;
    await prisma.quizAttempt.create({ data: { quizId, answers, score, total: questions.length } });
    return { topic: quiz.topic, score, total: questions.length, percent: Math.round((score / questions.length) * 100), results };
  },

  async saveSubmission(kind: "code" | "github", source: string, review: Review, projectId?: string) {
    const sub = await prisma.submission.create({
      data: { userId: await learnerId(), kind, source: source.slice(0, 20_000), rating: review.rating, review, projectId },
    });
    if (projectId) await prisma.project.update({ where: { id: projectId }, data: { status: "submitted" } }).catch(() => {});
    return sub;
  },

  async saveInterview(interview: Interview) {
    return prisma.interview.create({
      data: { userId: await learnerId(), role: interview.role, questions: interview.questions },
    });
  },

  /** Everything the dashboard (and the Coach agent) needs to see how the learner is doing. */
  async summary() {
    const userId = await learnerId();
    const [goal, projects, attempts, submissions, interviews] = await Promise.all([
      prisma.goal.findFirst({ where: { userId, active: true }, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.quizAttempt.findMany({ where: { quiz: { userId } }, include: { quiz: true }, orderBy: { createdAt: "desc" } }),
      prisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.interview.count({ where: { userId } }),
    ]);

    const pct = (a: { score: number; total: number }) => (a.total ? (a.score / a.total) * 100 : 0);
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

    // Per-topic quiz average; topics under 70% are flagged for review.
    const byTopic = new Map<string, number[]>();
    for (const a of attempts) byTopic.set(a.quiz.topic, [...(byTopic.get(a.quiz.topic) ?? []), pct(a)]);
    const topics = [...byTopic].map(([topic, scores]) => ({ topic, attempts: scores.length, averagePercent: avg(scores)! }));

    const done = projects.filter((p) => p.status === "done").length;
    return {
      currentGoal: goal ? { skill: goal.skill, durationMonths: goal.durationMonths, startedAt: goal.createdAt } : null,
      projects: {
        total: projects.length,
        done,
        completionPercent: projects.length ? Math.round((done / projects.length) * 100) : 0,
        queue: projects.filter((p) => p.status !== "done").map((p) => ({ id: p.id, title: p.title, status: p.status })),
      },
      quizzes: {
        attempts: attempts.length,
        averagePercent: avg(attempts.map(pct)),
        byTopic: topics,
        weakTopics: topics.filter((t) => t.averagePercent < 70).map((t) => t.topic),
      },
      reviews: {
        count: submissions.length,
        averageRating: avg(submissions.map((s) => s.rating)),
        latest: submissions.slice(0, 5).map((s) => ({ kind: s.kind, rating: s.rating, at: s.createdAt })),
      },
      mockInterviews: interviews,
    };
  },
};
