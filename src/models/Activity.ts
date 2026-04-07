import mongoose, { Schema, Document } from "mongoose";

export type ActivityType =
  | "bookmark_created"
  | "bookmark_deleted"
  | "bookmark_shared"
  | "collection_created"
  | "collection_shared"
  | "bookmark_favorited"
  | "profile_updated";

export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  type: ActivityType;
  metadata: Record<string, any>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "bookmark_created",
        "bookmark_deleted",
        "bookmark_shared",
        "collection_created",
        "collection_shared",
        "bookmark_favorited",
        "profile_updated",
      ],
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivitySchema.index({ user_id: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

export default mongoose.model<IActivity>("Activity", ActivitySchema);
