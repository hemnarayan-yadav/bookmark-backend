import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  getPublicProfile,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.put("/password", authenticateToken, changePassword);

// Public routes
router.get("/:username/public", getPublicProfile);

export default router;
