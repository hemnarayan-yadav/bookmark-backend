import { Request, Response } from "express";
import mongoose from "mongoose";
import Bookmark from "../models/Bookmark";
import Tag from "../models/Tag";

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
    user_id: t.user_id?.toString?.() ?? "",
    name: t.name ?? "",
    createdAt: t.createdAt ?? new Date(),
  })),
  user: doc.user_id?.username
    ? {
        id: doc.user_id._id?.toString?.(),
        username: doc.user_id.username,
        email: "",
        full_name: doc.user_id.full_name,
        avatar_url: doc.user_id.avatar_url,
        createdAt: doc.user_id.createdAt,
      }
    : undefined,
});

// GET /api/public/bookmarks
export const getPublicBookmarks = async (req: Request, res: Response) => {
  try {
    const { tag, search, limit = "50", offset = "0" } = req.query;

    const filter: any = { is_public: true };

    if (search) {
      const regex = new RegExp(String(search), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }

    let bookmarks = await Bookmark.find(filter)
      .populate("tags")
      .populate("user_id", "username full_name avatar_url createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (tag) {
      bookmarks = bookmarks.filter((b: any) =>
        b.tags.some((t: any) => t.name === tag)
      );
    }

    // Also filter by username search
    if (search) {
      const regex = new RegExp(String(search), "i");
      bookmarks = bookmarks.filter(
        (b: any) =>
          regex.test(b.title ?? "") ||
          regex.test(b.description ?? "") ||
          regex.test((b.user_id as any)?.username ?? "")
      );
    }

    const total = bookmarks.length;
    const start = parseInt(String(offset));
    const end = start + parseInt(String(limit));
    const paged = bookmarks.slice(start, end);

    res.json({ success: true, data: paged.map(formatBookmark), total });
  } catch (error) {
    console.error("Get public bookmarks error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch public bookmarks" });
  }
};

// GET /api/public/bookmarks/:username
export const getUserPublicBookmarks = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    // Find user by username
    const User = mongoose.model("User");
    const user = await User.findOne({ username, is_active: true }).lean() as any;
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const bookmarks = await Bookmark.find({ user_id: user._id, is_public: true })
      .populate("tags")
      .populate("user_id", "username full_name avatar_url createdAt")
      .sort({ createdAt: -1 })
      .skip(parseInt(String(offset)))
      .limit(parseInt(String(limit)))
      .lean();

    res.json({ success: true, data: bookmarks.map(formatBookmark) });
  } catch (error) {
    console.error("Get user public bookmarks error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch bookmarks" });
  }
};

// GET /api/public/tags
export const getPopularTags = async (req: Request, res: Response) => {
  try {
    // Aggregate most-used tags across all public bookmarks
    const result = await Bookmark.aggregate([
      { $match: { is_public: true } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
      {
        $lookup: {
          from: "tags",
          localField: "_id",
          foreignField: "_id",
          as: "tag",
        },
      },
      { $unwind: "$tag" },
      {
        $project: {
          _id: 0,
          id: { $toString: "$tag._id" },
          name: "$tag.name",
          count: 1,
        },
      },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get popular tags error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tags" });
  }
};
