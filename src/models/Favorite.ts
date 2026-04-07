import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  bookmark_id: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookmark_id: { type: Schema.Types.ObjectId, ref: "Bookmark", required: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ user_id: 1, bookmark_id: 1 }, { unique: true });
FavoriteSchema.index({ bookmark_id: 1 });

export default mongoose.model<IFavorite>("Favorite", FavoriteSchema);
