import { Response } from "express";
import mongoose from "mongoose";
import Bookmark from "../models/Bookmark";
import Collection from "../models/Collection";
import Tag from "../models/Tag";
import Favorite from "../models/Favorite";
import Activity from "../models/Activity";
import { AuthRequest } from "../types";

// GET /api/stats/dashboard
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const [
      totalBookmarks,
      publicBookmarks,
      totalCollections,
      totalTags,
      totalFavorites,
      folderStats,
      tagStats,
      recentActivity,
      bookmarksByMonth,
    ] = await Promise.all([
      Bookmark.countDocuments({ user_id: userId }),
      Bookmark.countDocuments({ user_id: userId, is_public: true }),
      Collection.countDocuments({
        $or: [{ user_id: userId }, { "collaborators.user_id": userId }],
      }),
      Tag.countDocuments({ user_id: userId }),
      Favorite.countDocuments({ user_id: userId }),

      // Bookmarks per folder
      Bookmark.aggregate([
        { $match: { user_id: userId } },
        { $group: { _id: "$folder", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Top tags by usage
      Bookmark.aggregate([
        { $match: { user_id: userId } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
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
      ]),

      // Recent activity (last 20)
      Activity.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),

      // Bookmarks created per month (last 12 months)
      Bookmark.aggregate([
        {
          $match: {
            user_id: userId,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Calculate top domains
    const domainStats = await Bookmark.aggregate([
      { $match: { user_id: userId } },
      {
        $addFields: {
          domain: {
            $arrayElemAt: [
              { $split: [{ $arrayElemAt: [{ $split: ["$url", "//"] }, 1] }, "/"] },
              0,
            ],
          },
        },
      },
      { $group: { _id: "$domain", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total_bookmarks: totalBookmarks,
          public_bookmarks: publicBookmarks,
          private_bookmarks: totalBookmarks - publicBookmarks,
          total_collections: totalCollections,
          total_tags: totalTags,
          total_favorites: totalFavorites,
        },
        folders: folderStats.map((f) => ({ name: f._id, count: f.count })),
        top_tags: tagStats,
        top_domains: domainStats.map((d) => ({ domain: d._id, count: d.count })),
        bookmarks_by_month: bookmarksByMonth.map((b) => ({
          year: b._id.year,
          month: b._id.month,
          count: b.count,
        })),
        recent_activity: recentActivity.map((a) => ({
          id: a._id.toString(),
          type: a.type,
          metadata: a.metadata,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
};

// GET /api/stats/public — global platform stats
export const getPlatformStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalPublicBookmarks, totalCollections, topContributors] =
      await Promise.all([
        mongoose.model("User").countDocuments({ is_active: true }),
        Bookmark.countDocuments({ is_public: true }),
        Collection.countDocuments({ is_public: true }),
        Bookmark.aggregate([
          { $match: { is_public: true } },
          { $group: { _id: "$user_id", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: 0,
              username: "$user.username",
              avatar_url: "$user.avatar_url",
              bookmark_count: "$count",
            },
          },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        total_users: totalUsers,
        total_public_bookmarks: totalPublicBookmarks,
        total_public_collections: totalCollections,
        top_contributors: topContributors,
      },
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch platform stats" });
  }
};
