import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  // Already connected — reuse existing connection (serverless caching)
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,  // fail fast in serverless (don't wait 30s)
    socketTimeoutMS: 10000,
    maxPoolSize: 1,                  // serverless: 1 connection per function
    bufferCommands: false,           // don't buffer if not connected
  });

  console.log("✅ MongoDB connected successfully");
};

export default connectDB;
