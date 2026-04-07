import { Response } from "express";
import User from "../models/User";
import { AuthRequest, RegisterDTO, LoginDTO, UserPublic } from "../types";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "../utils/password";
import { generateTokenPair, verifyToken } from "../utils/jwt";

// Register new user
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, full_name }: RegisterDTO = req.body;

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, error: passwordValidation.message });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ success: false, error: "Username or email already exists" });
    }

    const password_hash = await hashPassword(password);

    const newUser = await User.create({
      username,
      email,
      password_hash,
      full_name: full_name || null,
    });

    const tokens = generateTokenPair({
      userId: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
    });

    const user: UserPublic = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      full_name: newUser.full_name,
      avatar_url: newUser.avatar_url,
      createdAt: newUser.createdAt,
    };

    res.status(201).json({ success: true, data: { user, tokens }, message: "User registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
};

// Login
export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password }: LoginDTO = req.body;

    const user = await User.findOne({ email, is_active: true });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    user.last_login = new Date();
    await user.save();

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    const userPublic: UserPublic = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      createdAt: user.createdAt,
    };

    res.json({ success: true, data: { user: userPublic, tokens }, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Login failed" });
  }
};

// Get current user (me)
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const user = await User.findById(req.user.userId).select("-password_hash");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
};

// Refresh token
export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: "Refresh token required" });
    }

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
    }

    const user = await User.findById(payload.userId).select("-password_hash");
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: "User not found or inactive" });
    }

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    res.json({ success: true, data: { tokens } });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ success: false, error: "Token refresh failed" });
  }
};

// Logout (client-side token removal; server-side is stateless)
export const logout = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: "Logged out successfully" });
};

