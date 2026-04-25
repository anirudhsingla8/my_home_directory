import { Router } from "express";
import multer from "multer";

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
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
