import express from "express";
import { getDashboardStats, getPlatformStats } from "../controllers/statsController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", authenticateToken, getDashboardStats);
router.get("/public", getPlatformStats);

export default router;
