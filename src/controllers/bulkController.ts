import { Response } from "express";
import mongoose from "mongoose";
import Bookmark from "../models/Bookmark";
import Tag from "../models/Tag";
import Activity from "../models/Activity";
import { AuthRequest } from "../types";
import { sanitizeString } from "../utils/validation";

// Helper: resolve or create tags
const resolveTagIds = async (
  tagNames: string[],
  userId: string
): Promise<mongoose.Types.ObjectId[]> => {
  const ids: mongoose.Types.ObjectId[] = [];
  for (const name of tagNames) {
    const sanitized = sanitizeString(name);
    if (!sanitized) continue;
    const tag = await Tag.findOneAndUpdate(
      { user_id: userId, name: sanitized },
      { user_id: userId, name: sanitized },
      { upsert: true, new: true }
    );
    ids.push(tag._id);
  }
  return ids;
};

// POST /api/bookmarks/import
export const importBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { bookmarks } = req.body;

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return res.status(400).json({ success: false, error: "No bookmarks to import" });
    }

    if (bookmarks.length > 500) {
      return res.status(400).json({ success: false, error: "Maximum 500 bookmarks per import" });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of bookmarks) {
      try {
        if (!item.url) {
          skipped++;
          continue;
        }

        // Validate URL
        try {
          new URL(item.url);
        } catch {
          skipped++;
          errors.push(`Invalid URL: ${item.url}`);
          continue;
        }

        const tagIds =
          item.tags && Array.isArray(item.tags) && item.tags.length > 0
            ? await resolveTagIds(item.tags, req.user.userId)
            : [];

        await Bookmark.create({
          user_id: req.user.userId,
          title: sanitizeString(item.title || item.url),
          url: item.url,
          description: item.description || null,
          favicon: item.favicon || null,
          folder: item.folder || "Imported",
          is_public: false,
          tags: tagIds,
        });

        imported++;
      } catch (err: any) {
        if (err.code === 11000) {
          skipped++;
        } else {
          errors.push(`Failed: ${item.url}`);
          skipped++;
        }
      }
    }

    await Activity.create({
      user_id: req.user.userId,
      type: "bookmark_created",
      metadata: { action: "import", count: imported },
    });

    res.json({
      success: true,
      data: { imported, skipped, errors: errors.slice(0, 10) },
      message: `Imported ${imported} bookmarks, skipped ${skipped}`,
    });
  } catch (error) {
    console.error("Import bookmarks error:", error);
    res.status(500).json({ success: false, error: "Failed to import bookmarks" });
  }
};

// GET /api/bookmarks/export
export const exportBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { format = "json" } = req.query;

    const bookmarks = await Bookmark.find({ user_id: req.user.userId })
      .populate("tags")
      .sort({ createdAt: -1 })
      .lean();

    const data = bookmarks.map((b: any) => ({
      title: b.title,
      url: b.url,
      description: b.description || "",
      folder: b.folder,
      tags: (b.tags || []).map((t: any) => t.name),
      is_public: b.is_public,
      created_at: b.createdAt,
    }));

    if (format === "html") {
      // Netscape bookmark HTML format (browser-compatible import)
      let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;

      // Group by folder
      const folders: Record<string, typeof data> = {};
      for (const bm of data) {
        const f = bm.folder || "Unsorted";
        if (!folders[f]) folders[f] = [];
        folders[f].push(bm);
      }

      for (const [folder, bms] of Object.entries(folders)) {
        html += `    <DT><H3>${escapeHtml(folder)}</H3>\n    <DL><p>\n`;
        for (const bm of bms) {
          const ts = Math.floor(new Date(bm.created_at).getTime() / 1000);
          html += `        <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${ts}">${escapeHtml(bm.title)}</A>\n`;
          if (bm.description) {
            html += `        <DD>${escapeHtml(bm.description)}\n`;
          }
        }
        html += `    </DL><p>\n`;
      }

      html += `</DL><p>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="bookmarks.html"');
      return res.send(html);
    }

    // Default: JSON
    res.json({ success: true, data });
  } catch (error) {
    console.error("Export bookmarks error:", error);
    res.status(500).json({ success: false, error: "Failed to export bookmarks" });
  }
};

// POST /api/bookmarks/bulk-delete
export const bulkDeleteBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "No bookmarks selected" });
    }

    if (ids.length > 100) {
      return res.status(400).json({ success: false, error: "Maximum 100 bookmarks per bulk delete" });
    }

    const objectIds = ids
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const result = await Bookmark.deleteMany({
      _id: { $in: objectIds },
      user_id: req.user.userId,
    });

    res.json({
      success: true,
      data: { deleted: result.deletedCount },
      message: `Deleted ${result.deletedCount} bookmarks`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ success: false, error: "Failed to delete bookmarks" });
  }
};

// PUT /api/bookmarks/bulk-move
export const bulkMoveBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { ids, folder } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !folder) {
      return res.status(400).json({ success: false, error: "Invalid request" });
    }

    const objectIds = ids
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const result = await Bookmark.updateMany(
      { _id: { $in: objectIds }, user_id: req.user.userId },
      { $set: { folder: sanitizeString(folder) } }
    );

    res.json({
      success: true,
      data: { updated: result.modifiedCount },
      message: `Moved ${result.modifiedCount} bookmarks to "${folder}"`,
    });
  } catch (error) {
    console.error("Bulk move error:", error);
    res.status(500).json({ success: false, error: "Failed to move bookmarks" });
  }
};

// PUT /api/bookmarks/bulk-tag
export const bulkTagBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { ids, tags } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !Array.isArray(tags)) {
      return res.status(400).json({ success: false, error: "Invalid request" });
    }

    const tagIds = await resolveTagIds(tags, req.user.userId);

    const objectIds = ids
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const result = await Bookmark.updateMany(
      { _id: { $in: objectIds }, user_id: req.user.userId },
      { $addToSet: { tags: { $each: tagIds } } }
    );

    res.json({
      success: true,
      data: { updated: result.modifiedCount },
      message: `Tagged ${result.modifiedCount} bookmarks`,
    });
  } catch (error) {
    console.error("Bulk tag error:", error);
    res.status(500).json({ success: false, error: "Failed to tag bookmarks" });
  }
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
