import { Request } from "express";

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  avatar_url: string | null;
  createdAt: Date;
  updatedAt: Date;
  last_login: Date | null;
  is_active: boolean;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  createdAt: Date;
}

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  full_name?: string;
  avatar_url?: string;
}

export interface ChangePasswordDTO {
  current_password: string;
  new_password: string;
}

// Bookmark Types
export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  favicon: string | null;
  folder: string;
  is_public: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkWithTags extends Bookmark {
  tags: Tag[];
  user?: UserPublic;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  createdAt: Date;
  usage_count?: number;
}

export interface CreateBookmarkDTO {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  folder?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateBookmarkDTO {
  title?: string;
  description?: string;
  folder?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface MetadataResult {
  title: string;
  description: string;
  favicon: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// JWT Types
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
