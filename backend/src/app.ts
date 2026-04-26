import cors from "cors";
import express, { ErrorRequestHandler } from "express";

import authRouter from "./routes/auth.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import categoryRouter from "./routes/category.routes";
import itemRouter from "./routes/item.routes";
import locationRouter from "./routes/location.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", message: "Health check passed!" });
});

app.use("/api/auth", authRouter);

app.use("/api/categories", authMiddleware, categoryRouter);
app.use("/api/items", authMiddleware, itemRouter);
app.use("/api/locations", authMiddleware, locationRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
};

app.use(errorHandler);

export { app };
