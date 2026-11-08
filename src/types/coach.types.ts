import { z } from "zod";

export const QuizSchema = z.object({
  topic: z.string(),
  difficulty: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).describe("Exactly 4 options, labelled A-D in order"),
      correctIndex: z.number().int().describe("0-based index of the correct option"),
      explanation: z.string(),
    }),
  ),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const ReviewSchema = z.object({
  rating: z.number().int().describe("Overall score from 1 to 10"),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvements: z.array(z.string()),
});
export type Review = z.infer<typeof ReviewSchema>;

export const InterviewSchema = z.object({
  role: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      whatGoodLooksLike: z.string().describe("Key points a strong answer covers"),
    }),
  ),
});
export type Interview = z.infer<typeof InterviewSchema>;
