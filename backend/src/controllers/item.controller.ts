import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { uploadImageBuffer } from "../utils/storage";
import {
  getStringValue,
  parseRequiredString,
  parseOptionalString,
  parseNumber,
  parseDate,
  hasOwnProperty
} from "../utils/helpers";

const itemInclude = {
  category: true,
  location: true
} satisfies Prisma.ItemInclude;

const validateItemRelations = async ({
  userId,
  categoryId,
  locationId
}: {
  userId: string;
  categoryId: string;
  locationId: string;
}): Promise<void> => {
  const [category, location] = await Promise.all([
    prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, userId: true }
    }),
    prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, userId: true }
    })
  ]);

  if (!category) {
    throw new Error("categoryId references a missing category.");
  }

  if (!location) {
    throw new Error("locationId references a missing location.");
  }

  if (category.userId !== userId) {
    throw new Error("Category must belong to you.");
  }

  if (location.userId !== userId) {
    throw new Error("Location must belong to you.");
  }
};

export const createItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;

    const name = parseRequiredString(req.body.name, "name");
    const quantity = parseNumber(req.body.quantity, "quantity");
    const unit = parseRequiredString(req.body.unit, "unit");
    const categoryId = parseRequiredString(
      getStringValue(req.body.categoryId, req.body.category_id),
      "categoryId"
    );
    const locationId = parseRequiredString(
      getStringValue(req.body.locationId, req.body.location_id),
      "locationId"
    );
    const expiryDate =
      parseDate(getStringValue(req.body.expiryDate, req.body.expiry_date), "expiryDate") ?? null;
    const warrantyExpiry =
      parseDate(
        getStringValue(req.body.warrantyExpiry, req.body.warranty_expiry),
        "warrantyExpiry"
      ) ?? null;
    const notes = parseOptionalString(req.body.notes) ?? null;

    await validateItemRelations({ userId, categoryId, locationId });

    let imageUrl: string | null = null;

    if (req.file) {
      imageUrl = await uploadImageBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: "items"
      });
    }

    const item = await prisma.item.create({
      data: {
        name,
        quantity,
        unit,
        userId,
        categoryId,
        locationId,
        expiryDate,
        warrantyExpiry,
        notes,
        imageUrl
      },
      include: itemInclude
    });

    return res.status(201).json(item);
  } catch (error: unknown) {
    console.error("Error creating item:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(400).json({
        message: "categoryId or locationId references an invalid record."
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Failed to create item." });
  }
};

export const getItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const categoryId = getStringValue(req.query.categoryId, req.query.category_id);
    const locationId = getStringValue(req.query.locationId, req.query.location_id);
    const search = getStringValue(req.query.search);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.ItemWhereInput = { userId };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (categoryId) {
      const userCategories = await prisma.category.findMany({
        where: { userId },
        select: { id: true, parentCategoryId: true }
      });

      const childrenByParent = new Map<string, string[]>();
      for (const cat of userCategories) {
        if (cat.parentCategoryId) {
          const arr = childrenByParent.get(cat.parentCategoryId) ?? [];
          arr.push(cat.id);
          childrenByParent.set(cat.parentCategoryId, arr);
        }
      }

      const descendants = new Set<string>();
      const queue: string[] = [categoryId];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (descendants.has(id)) continue;
        descendants.add(id);
        for (const childId of childrenByParent.get(id) ?? []) queue.push(childId);
      }

      where.categoryId = { in: Array.from(descendants) };
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: itemInclude,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit
      }),
      prisma.item.count({ where })
    ]);

    return res.status(200).json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ message: "Failed to fetch items." });
  }
};

export const getItemById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const itemId = getStringValue(req.params.id);

    if (!itemId) {
      return res.status(400).json({ message: "Item id is required." });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: itemInclude
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found." });
    }

    if (item.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this item." });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    return res.status(500).json({ message: "Failed to fetch item." });
  }
};

export const updateItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const itemId = getStringValue(req.params.id);

    if (!itemId) {
      return res.status(400).json({ message: "Item id is required." });
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found." });
    }

    if (existingItem.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this item." });
    }

    const data: Prisma.ItemUncheckedUpdateInput = {};

    if (hasOwnProperty(req.body, "name")) {
      data.name = parseRequiredString(req.body.name, "name");
    }

    if (hasOwnProperty(req.body, "quantity")) {
      data.quantity = parseNumber(req.body.quantity, "quantity");
    }

    if (hasOwnProperty(req.body, "unit")) {
      data.unit = parseRequiredString(req.body.unit, "unit");
    }

    const categoryId = getStringValue(req.body.categoryId, req.body.category_id);
    if (categoryId !== undefined) {
      data.categoryId = parseRequiredString(categoryId, "categoryId");
    }

    const locationId = getStringValue(req.body.locationId, req.body.location_id);
    if (locationId !== undefined) {
      data.locationId = parseRequiredString(locationId, "locationId");
    }

    if (hasOwnProperty(req.body, "notes")) {
      data.notes = parseOptionalString(req.body.notes);
    }

    if (hasOwnProperty(req.body, "expiryDate") || hasOwnProperty(req.body, "expiry_date")) {
      data.expiryDate = parseDate(
        getStringValue(req.body.expiryDate, req.body.expiry_date),
        "expiryDate"
      );
    }

    if (hasOwnProperty(req.body, "warrantyExpiry") || hasOwnProperty(req.body, "warranty_expiry")) {
      data.warrantyExpiry = parseDate(
        getStringValue(req.body.warrantyExpiry, req.body.warranty_expiry),
        "warrantyExpiry"
      );
    }

    const resolvedCategoryId =
      typeof data.categoryId === "string" ? data.categoryId : existingItem.categoryId;
    const resolvedLocationId =
      typeof data.locationId === "string" ? data.locationId : existingItem.locationId;

    await validateItemRelations({
      userId,
      categoryId: resolvedCategoryId,
      locationId: resolvedLocationId
    });

    if (req.file) {
      data.imageUrl = await uploadImageBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: "items"
      });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data,
      include: itemInclude
    });

    return res.status(200).json(updatedItem);
  } catch (error: unknown) {
    console.error("Error updating item:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(400).json({
        message: "categoryId or locationId references an invalid record."
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Failed to update item." });
  }
};

export const deleteItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const itemId = getStringValue(req.params.id);

    if (!itemId) {
      return res.status(400).json({ message: "Item id is required." });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { userId: true }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found." });
    }

    if (item.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this item." });
    }

    await prisma.item.delete({ where: { id: itemId } });

    return res.status(200).json({ message: "Item deleted successfully." });
  } catch (error: unknown) {
    console.error("Error deleting item:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Item not found." });
    }

    return res.status(500).json({ message: "Failed to delete item." });
  }
};

export const getAlertItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const items = await prisma.item.findMany({
      where: {
        userId,
        OR: [
          { quantity: { lte: 1 } },
          { expiryDate: { lte: thirtyDaysFromNow, not: null } }
        ]
      },
      include: itemInclude,
      orderBy: [{ expiryDate: "asc" }, { quantity: "asc" }]
    });

    return res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching alert items:", error);
    return res.status(500).json({ message: "Failed to fetch alert items." });
  }
};
