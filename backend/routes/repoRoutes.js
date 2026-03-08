import { Router } from "express";
import * as repoController from "../controllers/repoController.js";

const router = Router();

router.post("/analyze", repoController.analyzeRepo);

export default router;
