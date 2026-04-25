import { Router } from "express";

import { createCategory, getCategoryTree } from "../controllers/category.controller";
import { validate } from "../middleware/validate.middleware";
import { createCategorySchema } from "../validators/schemas";

const router = Router();

router.post("/", validate(createCategorySchema), createCategory);
router.get("/tree", getCategoryTree);

export default router;
