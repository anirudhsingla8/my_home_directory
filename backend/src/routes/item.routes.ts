import { Router } from "express";
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

import {
  createItem,
  deleteItem,
  getAlertItems,
  getItemById,
  getItems,
  updateItem
} from "../controllers/item.controller";
import { validate } from "../middleware/validate.middleware";
import { createItemSchema } from "../validators/schemas";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed."));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

const router = Router();

router.get("/alerts", getAlertItems);
router.get("/", getItems);
router.get("/:id", getItemById);
router.post("/", upload.single("image"), validate(createItemSchema), createItem);
router.put("/:id", upload.single("image"), updateItem);
router.patch("/:id", upload.single("image"), updateItem);
router.delete("/:id", deleteItem);

export default router;
