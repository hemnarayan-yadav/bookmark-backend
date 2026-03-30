import mongoose, { Schema, Document } from "mongoose";

export interface ITag extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Compound unique: one user can't have duplicate tag names
TagSchema.index({ user_id: 1, name: 1 }, { unique: true });

export default mongoose.model<ITag>("Tag", TagSchema);
