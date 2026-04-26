import { Router } from "express";

import { createLocation, deleteLocation, getLocations } from "../controllers/location.controller";
import { validate } from "../middleware/validate.middleware";
import { createLocationSchema } from "../validators/schemas";

const router = Router();

router.get("/", getLocations);
router.post("/", validate(createLocationSchema), createLocation);
router.delete("/:id", deleteLocation);

export default router;
