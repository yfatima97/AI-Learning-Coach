import { Router } from "express";
import { ProgressController } from "../controllers/coach.controller.js";

export const progressRoutes = Router();

progressRoutes.get("/", ProgressController.summary); // dashboard data
progressRoutes.post("/quiz/:id/submit", ProgressController.submitQuiz); // { answers: [1, 0, 2, ...] }
progressRoutes.patch("/projects/:id", ProgressController.projectStatus); // { status: "done" }
