import { Response } from "express";
import User from "../models/User";
import Bookmark from "../models/Bookmark";
import { AuthRequest, UpdateProfileDTO, ChangePasswordDTO } from "../types";
import { hashPassword, comparePassword, validatePasswordStrength } from "../utils/password";

// GET /api/users/profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const user = await User.findById(req.user.userId).select("-password_hash").lean();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const total_bookmarks = await Bookmark.countDocuments({ user_id: req.user.userId });
    const public_bookmarks = await Bookmark.countDocuments({ user_id: req.user.userId, is_public: true });

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        createdAt: user.createdAt,
        last_login: user.last_login,
        total_bookmarks,
        public_bookmarks,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
};

// PUT /api/users/profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { full_name, avatar_url }: UpdateProfileDTO = req.body;

    if (full_name === undefined && avatar_url === undefined) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, select: "-password_hash" }
    ).lean();

    res.json({ success: true, data: user, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
};

// PUT /api/users/change-password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { current_password, new_password }: ChangePasswordDTO = req.body;

    const passwordValidation = validatePasswordStrength(new_password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, error: passwordValidation.message });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isCurrentValid = await comparePassword(current_password, user.password_hash);
    if (!isCurrentValid) {
      return res.status(401).json({ success: false, error: "Current password is incorrect" });
    }

    user.password_hash = await hashPassword(new_password);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, error: "Failed to change password" });
  }
};

// GET /api/users/:username/public-profile
export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username, is_active: true })
      .select("_id username full_name avatar_url createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const public_bookmarks = await Bookmark.countDocuments({ user_id: user._id, is_public: true });

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        createdAt: user.createdAt,
        public_bookmarks,
      },
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
};
