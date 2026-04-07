import express from "express";
import {
  getAllBookmarks,
  getBookmarkById,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  getFolders,
} from "../controllers/bookmarkController";
import {
  importBookmarks,
  exportBookmarks,
  bulkDeleteBookmarks,
  bulkMoveBookmarks,
  bulkTagBookmarks,
} from "../controllers/bulkController";
import { authenticateToken, optionalAuth } from "../middleware/auth";

const router = express.Router();

// Bulk operations (must be before /:id routes)
router.post("/import", authenticateToken, importBookmarks);
router.get("/export", authenticateToken, exportBookmarks);
router.post("/bulk-delete", authenticateToken, bulkDeleteBookmarks);
router.put("/bulk-move", authenticateToken, bulkMoveBookmarks);
router.put("/bulk-tag", authenticateToken, bulkTagBookmarks);

router.get("/", authenticateToken, getAllBookmarks);
router.get("/folders", authenticateToken, getFolders);
router.get("/:id", optionalAuth, getBookmarkById);
router.post("/", authenticateToken, createBookmark);
router.put("/:id", authenticateToken, updateBookmark);
router.delete("/:id", authenticateToken, deleteBookmark);

export default router;
