import { Router } from "express";
import { CoachController } from "../controllers/coach.controller.js";

export const coachRoutes = Router();

coachRoutes.post("/roadmap", CoachController.roadmap);
coachRoutes.post("/project", CoachController.project);
coachRoutes.post("/quiz", CoachController.quiz);
coachRoutes.post("/interview", CoachController.interview);
coachRoutes.post("/review", CoachController.review);
coachRoutes.post("/schedule", CoachController.schedule); // calendar tool -> .ics
coachRoutes.post("/review-repo", CoachController.reviewRepo); // GitHub tool
coachRoutes.post("/ask", CoachController.ask); // RAG over knowledge/
coachRoutes.post("/chat", CoachController.chat); // agentic: Claude picks the agents
coachRoutes.post("/workflow", CoachController.workflow); // Phase 13: Roadmap -> Project + Quiz -> Review -> Progress (streams NDJSON)
