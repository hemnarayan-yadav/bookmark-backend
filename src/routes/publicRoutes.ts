import express from "express";
import {
  getPublicBookmarks,
  getUserPublicBookmarks,
  getPopularTags,
} from "../controllers/publicController";
import { getSharedCollection } from "../controllers/collectionController";

const router = express.Router();

router.get("/bookmarks", getPublicBookmarks);
router.get("/users/:username/bookmarks", getUserPublicBookmarks);
router.get("/tags", getPopularTags);
router.get("/collections/shared/:token", getSharedCollection);

export default router;
