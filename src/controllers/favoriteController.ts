import { Response } from "express";
import mongoose from "mongoose";
import Favorite from "../models/Favorite";
import Bookmark from "../models/Bookmark";
import Activity from "../models/Activity";
import { AuthRequest } from "../types";

const formatBookmark = (doc: any) => ({
  id: doc._id.toString(),
  user_id: doc.user_id?._id?.toString?.() ?? doc.user_id?.toString(),
  title: doc.title,
  url: doc.url,
  description: doc.description,
  favicon: doc.favicon,
  folder: doc.folder,
  is_public: doc.is_public,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  tags: (doc.tags ?? []).map((t: any) => ({
    id: t._id?.toString?.() ?? t.toString(),
    name: t.name ?? "",
  })),
  user: doc.user_id?.username
    ? {
        id: doc.user_id._id?.toString?.(),
        username: doc.user_id.username,
        full_name: doc.user_id.full_name,
        avatar_url: doc.user_id.avatar_url,
      }
    : undefined,
});

// POST /api/favorites/:bookmarkId
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { bookmarkId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookmarkId)) {
      return res.status(400).json({ success: false, error: "Invalid bookmark ID" });
    }

    // Check the bookmark exists
    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    // Only allow favoriting public bookmarks or own bookmarks
    if (!bookmark.is_public && bookmark.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Cannot favorite a private bookmark" });
    }

    const existing = await Favorite.findOne({
      user_id: req.user.userId,
      bookmark_id: bookmarkId,
    });

    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, data: { favorited: false }, message: "Unfavorited" });
    }

    await Favorite.create({
      user_id: req.user.userId,
      bookmark_id: bookmarkId,
    });

    await Activity.create({
      user_id: req.user.userId,
      type: "bookmark_favorited",
      metadata: { bookmark_id: bookmarkId, title: bookmark.title },
    });

    res.json({ success: true, data: { favorited: true }, message: "Favorited" });
  } catch (error) {
    console.error("Toggle favorite error:", error);
    res.status(500).json({ success: false, error: "Failed to toggle favorite" });
  }
};

// GET /api/favorites
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const favorites = await Favorite.find({ user_id: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    const bookmarkIds = favorites.map((f) => f.bookmark_id);

    const bookmarks = await Bookmark.find({ _id: { $in: bookmarkIds } })
      .populate("tags")
      .populate("user_id", "username full_name avatar_url createdAt")
      .lean();

    res.json({ success: true, data: bookmarks.map(formatBookmark) });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch favorites" });
  }
};

// GET /api/favorites/check/:bookmarkId
export const checkFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { favorited: false } });
    }

    const { bookmarkId } = req.params;

    const exists = await Favorite.exists({
      user_id: req.user.userId,
      bookmark_id: bookmarkId,
    });

    res.json({ success: true, data: { favorited: !!exists } });
  } catch (error) {
    console.error("Check favorite error:", error);
    res.status(500).json({ success: false, error: "Failed to check favorite" });
  }
};

// GET /api/favorites/ids — returns list of favorited bookmark IDs for the user
export const getFavoriteIds = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: [] });
    }

    const favorites = await Favorite.find({ user_id: req.user.userId })
      .select("bookmark_id")
      .lean();

    const ids = favorites.map((f) => f.bookmark_id.toString());
    res.json({ success: true, data: ids });
  } catch (error) {
    console.error("Get favorite IDs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch favorite IDs" });
  }
};
