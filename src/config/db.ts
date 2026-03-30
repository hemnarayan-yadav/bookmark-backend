import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Cache connection across serverless invocations
let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  await mongoose.connect(uri);
  isConnected = true;
  console.log("✅ MongoDB connected successfully");
};

export default connectDB;
