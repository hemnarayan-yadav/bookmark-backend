import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  refreshToken,
} from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, getMe);

export default router;
