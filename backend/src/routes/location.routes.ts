import { Router } from "express";

import { createLocation, deleteLocation, detectCity, getLocations } from "../controllers/location.controller";
import { validate } from "../middleware/validate.middleware";
import { createLocationSchema } from "../validators/schemas";

const router = Router();

router.get("/", getLocations);
router.get("/detect", detectCity);
router.post("/", validate(createLocationSchema), createLocation);
router.delete("/:id", deleteLocation);

export default router;
