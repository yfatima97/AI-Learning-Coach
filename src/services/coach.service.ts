import { RoadmapAgent } from "../agents/roadmap.agent.js";
import { ProjectAgent } from "../agents/project.agent.js";
import { QuizAgent } from "../agents/quiz.agent.js";
import { InterviewAgent } from "../agents/interview.agent.js";
import { ReviewAgent } from "../agents/review.agent.js";
import { KnowledgeAgent } from "../agents/knowledge.agent.js";
import { reviewGithubRepo } from "../tools/github.tool.js";
import { scheduleStudyPlan, type ScheduleInput } from "../tools/calendar.tool.js";
import { ProgressService } from "./progress.service.js";

/**
 * One place that runs an agent AND records the result, used by the REST API,
 * the Coach agent's tools and the MCP server, so progress is tracked however
 * the learner reaches the coach.
 */
export const CoachService = {
  async roadmap(skill: string, months = 12, level?: string) {
    const roadmap = await RoadmapAgent.generate(skill, months, level);
    const goal = await ProgressService.saveGoal(skill, months, level, roadmap);
    return { goalId: goal.id, roadmap };
  },
  async project(learned: string, level?: string) {
    const brief = await ProjectAgent.generate(learned, level);
    const project = await ProgressService.saveProject(brief);
    return { projectId: project.id, title: project.title, project: brief };
  },
  async quiz(topic: string, difficulty?: string, count?: number) {
    const quiz = await QuizAgent.generate(topic, difficulty, count);
    const saved = await ProgressService.saveQuiz(quiz);
    return { quizId: saved.id, ...quiz };
  },
  async interview(role?: string, level?: string) {
    const interview = await InterviewAgent.generate(role, level);
    const saved = await ProgressService.saveInterview(interview);
    return { interviewId: saved.id, ...interview };
  },
  async review(submission: string, context?: string, projectId?: string) {
    const review = await ReviewAgent.review(submission, context);
    const saved = await ProgressService.saveSubmission("code", submission, review, projectId);
    return { submissionId: saved.id, ...review };
  },
  async reviewRepo(url: string, context?: string, projectId?: string) {
    const result = await reviewGithubRepo(url, context);
    const saved = await ProgressService.saveSubmission("github", url, result, projectId);
    return { submissionId: saved.id, ...result };
  },
  schedule: (input: ScheduleInput) => scheduleStudyPlan(input),
  ask: (question: string) => KnowledgeAgent.ask(question),
  progress: () => ProgressService.summary(),
};
