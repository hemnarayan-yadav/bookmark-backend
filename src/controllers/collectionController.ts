import { Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import Collection from "../models/Collection";
import Bookmark from "../models/Bookmark";
import Activity from "../models/Activity";
import { AuthRequest } from "../types";
import { sanitizeString } from "../utils/validation";

const formatCollection = (doc: any) => ({
  id: doc._id.toString(),
  user_id: doc.user_id?._id?.toString?.() ?? doc.user_id?.toString(),
  name: doc.name,
  description: doc.description,
  color: doc.color,
  icon: doc.icon,
  is_public: doc.is_public,
  share_token: doc.share_token,
  bookmark_count: doc.bookmarks?.length ?? 0,
  bookmarks: (doc.bookmarks ?? []).map((b: any) =>
    typeof b === "object" && b._id
      ? {
          id: b._id.toString(),
          title: b.title,
          url: b.url,
          favicon: b.favicon,
          description: b.description,
        }
      : b.toString()
  ),
  collaborators: (doc.collaborators ?? []).map((c: any) => ({
    user_id: c.user_id?._id?.toString?.() ?? c.user_id?.toString(),
    username: c.user_id?.username ?? "",
    avatar_url: c.user_id?.avatar_url ?? null,
    role: c.role,
    added_at: c.added_at,
  })),
  view_count: doc.view_count ?? 0,
  owner: doc.user_id?.username
    ? {
        id: doc.user_id._id?.toString?.(),
        username: doc.user_id.username,
        full_name: doc.user_id.full_name,
        avatar_url: doc.user_id.avatar_url,
      }
    : undefined,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// GET /api/collections
export const getAllCollections = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const collections = await Collection.find({
      $or: [
        { user_id: req.user.userId },
        { "collaborators.user_id": req.user.userId },
      ],
    })
      .populate("user_id", "username full_name avatar_url")
      .populate("collaborators.user_id", "username avatar_url")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: collections.map(formatCollection) });
  } catch (error) {
    console.error("Get collections error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch collections" });
  }
};

// GET /api/collections/:id
export const getCollectionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    const collection = await Collection.findById(id)
      .populate("user_id", "username full_name avatar_url createdAt")
      .populate("bookmarks")
      .populate("collaborators.user_id", "username avatar_url")
      .lean();

    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    const ownerId = (collection.user_id as any)?._id?.toString() ?? collection.user_id?.toString();
    const isOwner = ownerId === req.user?.userId;
    const isCollaborator = collection.collaborators.some(
      (c: any) => (c.user_id?._id?.toString() ?? c.user_id?.toString()) === req.user?.userId
    );

    if (!isOwner && !isCollaborator && !collection.is_public) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    // Increment view count for non-owners
    if (!isOwner) {
      await Collection.findByIdAndUpdate(id, { $inc: { view_count: 1 } });
    }

    // Populate bookmark tags
    const populatedBookmarks = await Bookmark.find({
      _id: { $in: collection.bookmarks.map((b: any) => b._id || b) },
    })
      .populate("tags")
      .lean();

    const result = formatCollection(collection);
    result.bookmarks = populatedBookmarks.map((b: any) => ({
      id: b._id.toString(),
      title: b.title,
      url: b.url,
      favicon: b.favicon,
      description: b.description,
      is_public: b.is_public,
      folder: b.folder,
      tags: (b.tags ?? []).map((t: any) => ({
        id: t._id.toString(),
        name: t.name,
      })),
      createdAt: b.createdAt,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get collection error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch collection" });
  }
};

// POST /api/collections
export const createCollection = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { name, description, color, icon, is_public } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Collection name is required" });
    }

    const collection = await Collection.create({
      user_id: req.user.userId,
      name: sanitizeString(name),
      description: description || null,
      color: color || "#3b82f6",
      icon: icon || "folder",
      is_public: is_public || false,
    });

    await Activity.create({
      user_id: req.user.userId,
      type: "collection_created",
      metadata: { collection_id: collection._id, name: collection.name },
    });

    const populated = await Collection.findById(collection._id)
      .populate("user_id", "username full_name avatar_url")
      .lean();

    res.status(201).json({
      success: true,
      data: formatCollection(populated),
      message: "Collection created successfully",
    });
  } catch (error) {
    console.error("Create collection error:", error);
    res.status(500).json({ success: false, error: "Failed to create collection" });
  }
};

// PUT /api/collections/:id
export const updateCollection = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    if (collection.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { name, description, color, icon, is_public } = req.body;

    if (name !== undefined) collection.name = sanitizeString(name);
    if (description !== undefined) collection.description = description;
    if (color !== undefined) collection.color = color;
    if (icon !== undefined) collection.icon = icon;
    if (is_public !== undefined) collection.is_public = is_public;

    await collection.save();

    const populated = await Collection.findById(id)
      .populate("user_id", "username full_name avatar_url")
      .populate("collaborators.user_id", "username avatar_url")
      .lean();

    res.json({
      success: true,
      data: formatCollection(populated),
      message: "Collection updated successfully",
    });
  } catch (error) {
    console.error("Update collection error:", error);
    res.status(500).json({ success: false, error: "Failed to update collection" });
  }
};

// DELETE /api/collections/:id
export const deleteCollection = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    if (collection.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await collection.deleteOne();

    res.json({ success: true, message: "Collection deleted successfully" });
  } catch (error) {
    console.error("Delete collection error:", error);
    res.status(500).json({ success: false, error: "Failed to delete collection" });
  }
};

// POST /api/collections/:id/bookmarks
export const addBookmarkToCollection = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;
    const { bookmark_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(bookmark_id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    // Check if user is owner or editor
    const userId = req.user!.userId;
    const isOwner = collection.user_id.toString() === userId;
    const isEditor = collection.collaborators.some(
      (c) => c.user_id.toString() === userId && c.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    // Check if bookmark already in collection
    if (collection.bookmarks.some((b) => b.toString() === bookmark_id)) {
      return res.status(409).json({ success: false, error: "Bookmark already in collection" });
    }

    collection.bookmarks.push(new mongoose.Types.ObjectId(bookmark_id));
    await collection.save();

    res.json({ success: true, message: "Bookmark added to collection" });
  } catch (error) {
    console.error("Add bookmark to collection error:", error);
    res.status(500).json({ success: false, error: "Failed to add bookmark" });
  }
};

// DELETE /api/collections/:id/bookmarks/:bookmarkId
export const removeBookmarkFromCollection = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id, bookmarkId } = req.params;

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    const userId = req.user!.userId;
    const isOwner = collection.user_id.toString() === userId;
    const isEditor = collection.collaborators.some(
      (c) => c.user_id.toString() === userId && c.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    collection.bookmarks = collection.bookmarks.filter(
      (b) => b.toString() !== bookmarkId
    );
    await collection.save();

    res.json({ success: true, message: "Bookmark removed from collection" });
  } catch (error) {
    console.error("Remove bookmark from collection error:", error);
    res.status(500).json({ success: false, error: "Failed to remove bookmark" });
  }
};

// POST /api/collections/:id/share
export const generateShareLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    if (collection.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    if (!collection.share_token) {
      collection.share_token = crypto.randomBytes(32).toString("hex");
      await collection.save();
    }

    await Activity.create({
      user_id: req.user.userId,
      type: "collection_shared",
      metadata: { collection_id: collection._id, name: collection.name },
    });

    res.json({
      success: true,
      data: { share_token: collection.share_token },
      message: "Share link generated",
    });
  } catch (error) {
    console.error("Generate share link error:", error);
    res.status(500).json({ success: false, error: "Failed to generate share link" });
  }
};

// GET /api/collections/shared/:token
export const getSharedCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    const collection = await Collection.findOne({ share_token: token })
      .populate("user_id", "username full_name avatar_url createdAt")
      .populate("bookmarks")
      .populate("collaborators.user_id", "username avatar_url")
      .lean();

    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    await Collection.findByIdAndUpdate(collection._id, { $inc: { view_count: 1 } });

    // Populate bookmark tags
    const populatedBookmarks = await Bookmark.find({
      _id: { $in: collection.bookmarks.map((b: any) => b._id || b) },
    })
      .populate("tags")
      .lean();

    const result = formatCollection(collection);
    result.bookmarks = populatedBookmarks.map((b: any) => ({
      id: b._id.toString(),
      title: b.title,
      url: b.url,
      favicon: b.favicon,
      description: b.description,
      is_public: b.is_public,
      tags: (b.tags ?? []).map((t: any) => ({
        id: t._id.toString(),
        name: t.name,
      })),
      createdAt: b.createdAt,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get shared collection error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch collection" });
  }
};

// POST /api/collections/:id/collaborators
export const addCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id } = req.params;
    const { username, role = "viewer" } = req.body;

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    if (collection.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Only the owner can add collaborators" });
    }

    const User = mongoose.model("User");
    const targetUser = await User.findOne({ username, is_active: true });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (targetUser._id.toString() === req.user.userId) {
      return res.status(400).json({ success: false, error: "Cannot add yourself as collaborator" });
    }

    const alreadyCollaborator = collection.collaborators.some(
      (c) => c.user_id.toString() === targetUser._id.toString()
    );

    if (alreadyCollaborator) {
      return res.status(409).json({ success: false, error: "User is already a collaborator" });
    }

    collection.collaborators.push({
      user_id: targetUser._id,
      role: role as "viewer" | "editor",
      added_at: new Date(),
    });

    await collection.save();

    res.json({ success: true, message: `${username} added as ${role}` });
  } catch (error) {
    console.error("Add collaborator error:", error);
    res.status(500).json({ success: false, error: "Failed to add collaborator" });
  }
};

// DELETE /api/collections/:id/collaborators/:userId
export const removeCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { id, odataId } = req.params;

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    if (collection.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Only the owner can remove collaborators" });
    }

    collection.collaborators = collection.collaborators.filter(
      (c) => c.user_id.toString() !== odataId
    );

    await collection.save();

    res.json({ success: true, message: "Collaborator removed" });
  } catch (error) {
    console.error("Remove collaborator error:", error);
    res.status(500).json({ success: false, error: "Failed to remove collaborator" });
  }
};
