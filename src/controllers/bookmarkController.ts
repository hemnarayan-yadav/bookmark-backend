import { Response } from "express";
import mongoose from "mongoose";
import Bookmark from "../models/Bookmark";
import Tag from "../models/Tag";
import Activity from "../models/Activity";
import { fetchMetadata } from "../utils/metadataFetcher";
import { sanitizeString } from "../utils/validation";
import { AuthRequest } from "../types";

// Helper: resolve or create tags, return ObjectId array
const resolveTagIds = async (
  tagNames: string[],
  userId: string
): Promise<mongoose.Types.ObjectId[]> => {
  const ids: mongoose.Types.ObjectId[] = [];
  for (const name of tagNames) {
    const sanitized = sanitizeString(name);
    const tag = await Tag.findOneAndUpdate(
      { user_id: userId, name: sanitized },
      { user_id: userId, name: sanitized },
      { upsert: true, new: true }
    );
    ids.push(tag._id);
  }
  return ids;
};

// Helper: build lean bookmark response with populated tags
const formatBookmark = (doc: any) => {
  return {
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
  };
};

// GET /api/bookmarks
export const getAllBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { folder, tag, search } = req.query;

    const filter: any = { user_id: req.user.userId };
    if (folder) filter.folder = folder;
    if (search) {
      const regex = new RegExp(String(search), "i");
      filter.$or = [{ title: regex }, { url: regex }, { description: regex }];
    }

    const bookmarks = await Bookmark.find(filter).populate("tags").sort({ createdAt: -1 }).lean();

    let result = bookmarks;
    if (tag) {
      result = bookmarks.filter((b: any) =>
        b.tags.some((t: any) => t.name === tag)
      );
    }

    res.json({ success: true, data: result.map(formatBookmark) });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch bookmarks" });
  }
};

// GET /api/bookmarks/:id
export const getBookmarkById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    const bookmark = await Bookmark.findById(id)
      .populate("tags")
      .populate("user_id", "username full_name avatar_url createdAt")
      .lean();

    if (!bookmark) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    const ownerId = (bookmark.user_id as any)?._id?.toString() ?? bookmark.user_id?.toString();
    if (ownerId !== req.user?.userId && !bookmark.is_public) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({ success: true, data: formatBookmark(bookmark) });
  } catch (error) {
    console.error("Get bookmark error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch bookmark" });
  }
};

// POST /api/bookmarks
export const createBookmark = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { url, tags, folder = "Unsorted", is_public = false } = req.body;
    let { title, description, favicon } = req.body;

    if (!title || !description || !favicon) {
      const metadata = await fetchMetadata(url);
      title = title || metadata.title;
      description = description || metadata.description;
      favicon = favicon || metadata.favicon;
    }

    const tagIds = tags && tags.length > 0
      ? await resolveTagIds(tags, req.user.userId)
      : [];

    const bookmark = await Bookmark.create({
      user_id: req.user.userId,
      title: sanitizeString(title),
      url,
      description,
      favicon,
      folder,
      is_public,
      tags: tagIds,
    });

    const populated = await Bookmark.findById(bookmark._id).populate("tags").lean();

    await Activity.create({
      user_id: req.user.userId,
      type: "bookmark_created",
      metadata: { bookmark_id: bookmark._id, title: bookmark.title, url: bookmark.url },
    });

    res.status(201).json({
      success: true,
      data: formatBookmark(populated),
      message: "Bookmark created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "You already have a bookmark with this URL" });
    }
    console.error("Create bookmark error:", error);
    res.status(500).json({ success: false, error: "Failed to create bookmark" });
  }
};

// PUT /api/bookmarks/:id
export const updateBookmark = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    const existing = await Bookmark.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    if (existing.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { title, description, folder, is_public, tags } = req.body;

    if (title !== undefined) existing.title = sanitizeString(title);
    if (description !== undefined) existing.description = description;
    if (folder !== undefined) existing.folder = folder;
    if (is_public !== undefined) existing.is_public = is_public;
    if (tags !== undefined) existing.tags = await resolveTagIds(tags, req.user.userId);

    await existing.save();

    const populated = await Bookmark.findById(id).populate("tags").lean();

    res.json({
      success: true,
      data: formatBookmark(populated),
      message: "Bookmark updated successfully",
    });
  } catch (error) {
    console.error("Update bookmark error:", error);
    res.status(500).json({ success: false, error: "Failed to update bookmark" });
  }
};

// DELETE /api/bookmarks/:id
export const deleteBookmark = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    const bookmark = await Bookmark.findById(id);
    if (!bookmark) {
      return res.status(404).json({ success: false, error: "Bookmark not found" });
    }

    if (bookmark.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await bookmark.deleteOne();

    await Activity.create({
      user_id: req.user.userId,
      type: "bookmark_deleted",
      metadata: { title: bookmark.title, url: bookmark.url },
    });

    res.json({ success: true, message: "Bookmark deleted successfully" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    res.status(500).json({ success: false, error: "Failed to delete bookmark" });
  }
};

// GET /api/bookmarks/folders
export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const folders = await Bookmark.distinct("folder", { user_id: req.user.userId });

    res.json({ success: true, data: folders });
  } catch (error) {
    console.error("Get folders error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch folders" });
  }
};
