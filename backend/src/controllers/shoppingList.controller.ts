import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import {
  getStringValue,
  parseRequiredString,
  parseOptionalString,
  parseNumber,
  hasOwnProperty
} from "../utils/helpers";

const log = logger.child("shopping-list");

export const listShoppingItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const items = await prisma.shoppingListItem.findMany({
      where: { userId },
      orderBy: [{ completed: "asc" }, { createdAt: "desc" }]
    });
    return res.status(200).json(items);
  } catch (error) {
    log.error("Failed to list shopping items", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to load shopping list." });
  }
};

export const addShoppingItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const name = parseRequiredString(req.body.name, "name");
    const quantityRaw = req.body.quantity;
    const quantity =
      quantityRaw === undefined || quantityRaw === null || quantityRaw === ""
        ? 1
        : parseNumber(quantityRaw, "quantity");
    if (quantity < 0) throw new Error("quantity cannot be negative.");
    const unit = parseOptionalString(req.body.unit) ?? null;
    const notes = parseOptionalString(req.body.notes) ?? null;
    const createdFromItemId =
      getStringValue(req.body.createdFromItemId, req.body.created_from_item_id) ?? null;

    const item = await prisma.shoppingListItem.create({
      data: {
        userId,
        name,
        quantity,
        unit,
        notes,
        createdFromItemId
      }
    });

    return res.status(201).json(item);
  } catch (error) {
    log.error("Failed to add shopping item", {
      error: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to add shopping item." });
  }
};

export const addFromInventoryItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const itemId = getStringValue(req.params.itemId);
    if (!itemId) {
      return res.status(400).json({ message: "Item id is required." });
    }

    const inventoryItem = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, unit: true, userId: true, minQuantity: true }
    });

    if (!inventoryItem) {
      return res.status(404).json({ message: "Item not found." });
    }

    if (inventoryItem.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this item." });
    }

    // Skip duplicates: if a non-completed entry already exists for this source item, return it.
    const existing = await prisma.shoppingListItem.findFirst({
      where: { userId, createdFromItemId: itemId, completed: false }
    });
    if (existing) {
      return res.status(200).json(existing);
    }

    const created = await prisma.shoppingListItem.create({
      data: {
        userId,
        name: inventoryItem.name,
        quantity: inventoryItem.minQuantity > 0 ? inventoryItem.minQuantity : 1,
        unit: inventoryItem.unit,
        createdFromItemId: itemId
      }
    });

    return res.status(201).json(created);
  } catch (error) {
    log.error("Failed to add from inventory", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to add to shopping list." });
  }
};

export const updateShoppingItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const id = getStringValue(req.params.id);
    if (!id) return res.status(400).json({ message: "id is required." });

    const existing = await prisma.shoppingListItem.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Shopping item not found." });
    if (existing.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this item." });
    }

    const data: Prisma.ShoppingListItemUncheckedUpdateInput = {};

    if (hasOwnProperty(req.body, "name")) {
      data.name = parseRequiredString(req.body.name, "name");
    }
    if (hasOwnProperty(req.body, "quantity")) {
      const q = parseNumber(req.body.quantity, "quantity");
      if (q < 0) throw new Error("quantity cannot be negative.");
      data.quantity = q;
    }
    if (hasOwnProperty(req.body, "unit")) {
      data.unit = parseOptionalString(req.body.unit) ?? null;
    }
    if (hasOwnProperty(req.body, "notes")) {
      data.notes = parseOptionalString(req.body.notes) ?? null;
    }
    if (hasOwnProperty(req.body, "completed")) {
      const completed = Boolean(req.body.completed);
      data.completed = completed;
      data.completedAt = completed ? new Date() : null;
    }

    const updated = await prisma.shoppingListItem.update({ where: { id }, data });
    return res.status(200).json(updated);
  } catch (error) {
    log.error("Failed to update shopping item", {
      error: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update shopping item." });
  }
};

export const deleteShoppingItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const id = getStringValue(req.params.id);
    if (!id) return res.status(400).json({ message: "id is required." });

    const existing = await prisma.shoppingListItem.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Shopping item not found." });
    if (existing.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this item." });
    }

    await prisma.shoppingListItem.delete({ where: { id } });
    return res.status(200).json({ message: "Shopping item deleted." });
  } catch (error) {
    log.error("Failed to delete shopping item", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to delete shopping item." });
  }
};

export const clearCompletedShoppingItems = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const result = await prisma.shoppingListItem.deleteMany({
      where: { userId, completed: true }
    });
    return res.status(200).json({ deleted: result.count });
  } catch (error) {
    log.error("Failed to clear completed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to clear completed items." });
  }
};
