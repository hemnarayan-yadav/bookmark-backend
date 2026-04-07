import mongoose, { Schema, Document } from "mongoose";

export interface ICollection extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_public: boolean;
  share_token: string | null;
  bookmarks: mongoose.Types.ObjectId[];
  collaborators: {
    user_id: mongoose.Types.ObjectId;
    role: "viewer" | "editor";
    added_at: Date;
  }[];
  view_count: number;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: null, maxlength: 500 },
    color: { type: String, default: "#3b82f6" },
    icon: { type: String, default: "folder" },
    is_public: { type: Boolean, default: false },
    share_token: { type: String, default: null },
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "Bookmark" }],
    collaborators: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
        added_at: { type: Date, default: Date.now },
      },
    ],
    view_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CollectionSchema.index({ user_id: 1 });
CollectionSchema.index({ is_public: 1 });
CollectionSchema.index({ share_token: 1 }, { unique: true, sparse: true });
CollectionSchema.index({ "collaborators.user_id": 1 });

export default mongoose.model<ICollection>("Collection", CollectionSchema);
