import { Router } from "express";
import { CoachController } from "../controllers/coach.controller.js";

export const coachRoutes = Router();

coachRoutes.post("/roadmap", CoachController.roadmap);
coachRoutes.post("/project", CoachController.project);
coachRoutes.post("/quiz", CoachController.quiz);
coachRoutes.post("/interview", CoachController.interview);
coachRoutes.post("/review", CoachController.review);
coachRoutes.post("/chat", CoachController.chat); // agentic: Claude picks the agents
