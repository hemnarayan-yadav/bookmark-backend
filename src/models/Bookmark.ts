import mongoose, { Schema, Document } from "mongoose";

export interface IBookmark extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  title: string;
  url: string;
  description: string | null;
  favicon: string | null;
  folder: string;
  is_public: boolean;
  tags: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    favicon: { type: String, default: null },
    folder: { type: String, default: "Unsorted", trim: true },
    is_public: { type: Boolean, default: false },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
  },
  { timestamps: true }
);

// Compound unique: same user can't bookmark the same URL twice
BookmarkSchema.index({ user_id: 1, url: 1 }, { unique: true });

export default mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
