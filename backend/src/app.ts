import cors from "cors";
import express, { ErrorRequestHandler } from "express";

import authRouter from "./routes/auth.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import categoryRouter from "./routes/category.routes";
import itemRouter from "./routes/item.routes";
import locationRouter from "./routes/location.routes";
import shoppingListRouter from "./routes/shoppingList.routes";
import { logger } from "./lib/logger";

const app = express();

// Honour X-Forwarded-For so client IP detection works behind a reverse proxy
// (e.g. when deployed). For local dev this is a no-op.
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", message: "Health check passed!" });
});

app.use("/api/auth", authRouter);

app.use("/api/categories", authMiddleware, categoryRouter);
app.use("/api/items", authMiddleware, itemRouter);
app.use("/api/locations", authMiddleware, locationRouter);
app.use("/api/shopping-list", authMiddleware, shoppingListRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error("Unhandled error", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  res.status(500).json({ message: "Internal server error." });
};

app.use(errorHandler);

export { app };
