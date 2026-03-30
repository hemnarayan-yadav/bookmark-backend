import { Response } from "express";
import mongoose from "mongoose";
import Tag from "../models/Tag";
import Bookmark from "../models/Bookmark";
import { createTagSchema, sanitizeString } from "../utils/validation";
import { AuthRequest } from "../types";

// GET /api/tags
export const getAllTags = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const tags = await Tag.find({ user_id: req.user.userId }).lean();

    // Count usage per tag
    const tagIds = tags.map((t) => t._id);
    const usageCounts = await Bookmark.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.user.userId), tags: { $in: tagIds } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    for (const u of usageCounts) countMap[u._id.toString()] = u.count;

    const result = tags
      .map((t) => ({
        id: t._id.toString(),
        user_id: t.user_id.toString(),
        name: t.name,
        createdAt: t.createdAt,
        usage_count: countMap[t._id.toString()] ?? 0,
      }))
      .sort((a, b) => b.usage_count - a.usage_count);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tags" });
  }
};

// POST /api/tags
export const createTag = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validatedData = createTagSchema.parse(req.body);
    const tagName = sanitizeString(validatedData.name);

    const tag = await Tag.create({ user_id: req.user.userId, name: tagName });

    res.status(201).json({
      success: true,
      data: {
        id: tag._id.toString(),
        user_id: tag.user_id.toString(),
        name: tag.name,
        createdAt: tag.createdAt,
      },
      message: "Tag created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "Tag already exists" });
    }
    console.error("Create tag error:", error);
    throw error;
  }
};

// DELETE /api/tags/:id
export const deleteTag = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Tag not found" });
    }

    const tag = await Tag.findOneAndDelete({ _id: id, user_id: req.user.userId });

    if (!tag) {
      return res.status(404).json({ success: false, error: "Tag not found or access denied" });
    }

    // Remove tag from all bookmarks
    await Bookmark.updateMany({ user_id: req.user.userId }, { $pull: { tags: tag._id } });

    res.json({ success: true, message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Delete tag error:", error);
    res.status(500).json({ success: false, error: "Failed to delete tag" });
  }
};
