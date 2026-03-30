import express from "express";
import {
  getAllBookmarks,
  getBookmarkById,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  getFolders,
} from "../controllers/bookmarkController";
import { authenticateToken, optionalAuth } from "../middleware/auth";

const router = express.Router();

router.get("/", authenticateToken, getAllBookmarks);
router.get("/folders", authenticateToken, getFolders);
router.get("/:id", optionalAuth, getBookmarkById);
router.post("/", authenticateToken, createBookmark);
router.put("/:id", authenticateToken, updateBookmark);
router.delete("/:id", authenticateToken, deleteBookmark);

export default router;
