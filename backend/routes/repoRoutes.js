import { Router } from "express";
import * as repoController from "../controllers/repoController.js";

const router = Router();

router.post("/analyze", repoController.analyzeRepo);
router.get("/analyze-stream", repoController.analyzeRepoStream);
router.get("/diff", repoController.getCommitDiff);

export default router;
