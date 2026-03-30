import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import bookmarkRoutes from "./routes/bookmarkRoutes";
import tagRoutes from "./routes/tagRoutes";
import publicRoutes from "./routes/publicRoutes";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// CORS setup
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:5173",
      "https://smart-bookmark.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect DB on every request (cached — only actually connects once)
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("❌ DB connection error:", error);
    _res.status(500).json({ success: false, error: "Database connection failed" });
  }
});

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "🚀 Smart Bookmark Manager API is live!",
    version: "2.0.0",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/public", publicRoutes);

// Global error handler
app.use(errorHandler);

// Export for Vercel (must be default export)
export default app;

// Local dev server
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`💻 Server running locally on http://localhost:${PORT}`);
  });
}
