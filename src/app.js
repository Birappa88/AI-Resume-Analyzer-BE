import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import globalErrorHandler from "./middleware/errorHandler.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import AppError from "./utils/AppError.js";
import logger from "./utils/logger.js";

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────────
app.use(helmet());

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests from this IP. Please try again later.",
  },
});
app.use("/api", limiter);

// ─── Request Logging ──────────────────────────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (_req, res) =>
      res.statusCode < 400 && process.env.NODE_ENV === "test",
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/resumes", resumeRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────────
app.all("*", (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
