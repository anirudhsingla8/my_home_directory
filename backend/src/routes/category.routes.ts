import { Router } from "express";

import {
  createCategory,
  deleteCategory,
  getCategoryTree,
  seedDefaultCategories,
  updateCategory
} from "../controllers/category.controller";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { createCategorySchema } from "../validators/schemas";

const router = Router();

// Read-only: any authenticated user.
router.get("/tree", getCategoryTree);

// Rename: any authenticated user (per product spec — users can update labels).
router.patch("/:id", validate(createCategorySchema), updateCategory);

// Mutating the catalogue (create / delete / seed) is admin-only — keeps the
// shared namespace clean.
router.post("/", requireRole("ADMIN"), validate(createCategorySchema), createCategory);
router.delete("/:id", requireRole("ADMIN"), deleteCategory);
router.post("/seed-defaults", requireRole("ADMIN"), seedDefaultCategories);

export default router;
