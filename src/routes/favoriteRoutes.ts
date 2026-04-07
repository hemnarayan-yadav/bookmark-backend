import express from "express";
import {
  toggleFavorite,
  getFavorites,
  checkFavorite,
  getFavoriteIds,
} from "../controllers/favoriteController";
import { authenticateToken, optionalAuth } from "../middleware/auth";

const router = express.Router();

router.get("/", authenticateToken, getFavorites);
router.get("/ids", authenticateToken, getFavoriteIds);
router.get("/check/:bookmarkId", optionalAuth, checkFavorite);
router.post("/:bookmarkId", authenticateToken, toggleFavorite);

export default router;
