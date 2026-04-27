import { Router } from "express";

import {
  addFromInventoryItem,
  addShoppingItem,
  clearCompletedShoppingItems,
  deleteShoppingItem,
  listShoppingItems,
  updateShoppingItem
} from "../controllers/shoppingList.controller";

const router = Router();

router.get("/", listShoppingItems);
router.post("/", addShoppingItem);
router.post("/from-item/:itemId", addFromInventoryItem);
router.post("/clear-completed", clearCompletedShoppingItems);
router.patch("/:id", updateShoppingItem);
router.delete("/:id", deleteShoppingItem);

export default router;
