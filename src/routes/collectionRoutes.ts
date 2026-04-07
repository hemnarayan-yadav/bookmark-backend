import express from "express";
import {
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookmarkToCollection,
  removeBookmarkFromCollection,
  generateShareLink,
  getSharedCollection,
  addCollaborator,
  removeCollaborator,
} from "../controllers/collectionController";
import { authenticateToken, optionalAuth } from "../middleware/auth";

const router = express.Router();

// Shared collection (public — no auth required)
router.get("/shared/:token", optionalAuth, getSharedCollection);

// Protected routes
router.get("/", authenticateToken, getAllCollections);
router.get("/:id", optionalAuth, getCollectionById);
router.post("/", authenticateToken, createCollection);
router.put("/:id", authenticateToken, updateCollection);
router.delete("/:id", authenticateToken, deleteCollection);

// Bookmark management in collections
router.post("/:id/bookmarks", authenticateToken, addBookmarkToCollection);
router.delete("/:id/bookmarks/:bookmarkId", authenticateToken, removeBookmarkFromCollection);

// Sharing
router.post("/:id/share", authenticateToken, generateShareLink);

// Collaborators
router.post("/:id/collaborators", authenticateToken, addCollaborator);
router.delete("/:id/collaborators/:odataId", authenticateToken, removeCollaborator);

export default router;
