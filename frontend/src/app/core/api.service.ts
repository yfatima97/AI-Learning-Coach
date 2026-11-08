import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Progress {
  currentGoal: { skill: string; durationMonths: number; startedAt: string } | null;
  projects: {
    total: number;
    done: number;
    completionPercent: number;
    queue: { id: string; title: string; status: ProjectStatus }[];
  };
  quizzes: {
    attempts: number;
    averagePercent: number | null;
    byTopic: { topic: string; attempts: number; averagePercent: number }[];
    weakTopics: string[];
  };
  reviews: { count: number; averageRating: number | null; latest: { kind: string; rating: number; at: string }[] };
  mockInterviews: number;
}
export type ProjectStatus = 'todo' | 'in_progress' | 'submitted' | 'done';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
export interface Quiz {
  quizId: string;
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
}
export interface QuizResult {
  topic: string;
  score: number;
  total: number;
  percent: number;
  results: { question: string; yourAnswer: number | null; correctIndex: number; correct: boolean; explanation: string }[];
}
export interface Review {
  submissionId: string;
  rating: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  repo?: string;
  filesReviewed?: string[];
}
export interface AskResult {
  answer: string;
  sources: { id: number; ref: string; score: number }[];
}
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Thin typed wrapper over the backend API (proxied to localhost:5000 in dev). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private post = <T>(url: string, body: unknown) => firstValueFrom(this.http.post<T>(url, body));

  progress = () => firstValueFrom(this.http.get<Progress>('/api/progress'));
  setProjectStatus = (id: string, status: ProjectStatus) =>
    firstValueFrom(this.http.patch(`/api/progress/projects/${id}`, { status }));

  chat = (messages: ChatMessage[]) => this.post<{ reply: string }>('/api/coach/chat', { messages });
  quiz = (topic: string, difficulty: string, count: number) =>
    this.post<Quiz>('/api/coach/quiz', { topic, difficulty, count });
  submitQuiz = (quizId: string, answers: number[]) =>
    this.post<QuizResult>(`/api/progress/quiz/${quizId}/submit`, { answers });
  review = (submission: string, context?: string) => this.post<Review>('/api/coach/review', { submission, context });
  reviewRepo = (url: string) => this.post<Review>('/api/coach/review-repo', { url });
  ask = (question: string) => this.post<AskResult>('/api/coach/ask', { question });
  roadmap = (skill: string, durationMonths: number, currentLevel: string) =>
    this.post<{ goalId: string; roadmap: string }>('/api/coach/roadmap', { skill, durationMonths, currentLevel });
  project = (learnedSoFar: string, level: string) =>
    this.post<{ projectId: string; title: string; project: string }>('/api/coach/project', { learnedSoFar, level });
}

/** Turn an HttpErrorResponse (or anything) into a friendly message. */
export function errorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { error?: string }; message?: string };
  if (e?.status === 0) return 'Cannot reach the API. Is the backend running (npm run dev in the project folder)?';
  return e?.error?.error ?? e?.message ?? 'Something went wrong.';
}
