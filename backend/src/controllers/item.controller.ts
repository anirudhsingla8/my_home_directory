import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { uploadImageBuffer } from "../utils/storage";

const getStringValue = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
};

const hasOwnProperty = (target: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(target, key);

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
};

const parseOptionalString = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

const parseNumber = (value: unknown, fieldName: string): number => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return numericValue;
};

const parseDate = (value: unknown, fieldName: string): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a valid ISO date string.`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date string.`);
  }

  return parsedDate;
};

const itemInclude = {
  category: true,
  location: true,
  user: true
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
  const [user, category, location] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    }),
    prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, userId: true }
    }),
    prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, userId: true }
    })
  ]);

  if (!user) {
    throw new Error("userId references a missing user.");
  }

  if (!category) {
    throw new Error("categoryId references a missing category.");
  }

  if (!location) {
    throw new Error("locationId references a missing location.");
  }

  if (category.userId !== userId) {
    throw new Error("categoryId must belong to the same user.");
  }

  if (location.userId !== userId) {
    throw new Error("locationId must belong to the same user.");
  }
};

export const createItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const name = parseRequiredString(req.body.name, "name");
    const quantity = parseNumber(req.body.quantity, "quantity");
    const unit = parseRequiredString(req.body.unit, "unit");
    const userId = parseRequiredString(
      getStringValue(req.body.userId, req.body.user_id),
      "userId"
    );
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

    await validateItemRelations({
      userId,
      categoryId,
      locationId
    });

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
        message: "userId, categoryId, or locationId references an invalid record."
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Failed to create item."
    });
  }
};

export const getItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = getStringValue(req.query.userId, req.query.user_id);
    const categoryId = getStringValue(req.query.categoryId, req.query.category_id);
    const locationId = getStringValue(req.query.locationId, req.query.location_id);
    const search = getStringValue(req.query.search);

    const where: Prisma.ItemWhereInput = {};

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive"
      };
    }

    if (userId) {
      where.userId = userId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const items = await prisma.item.findMany({
      where,
      include: itemInclude,
      orderBy: [{ createdAt: "desc" }]
    });

    return res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching items:", error);

    return res.status(500).json({
      message: "Failed to fetch items."
    });
  }
};

export const getItemById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const itemId = getStringValue(req.params.id);

    if (!itemId) {
      return res.status(400).json({
        message: "Item id is required."
      });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: itemInclude
    });

    if (!item) {
      return res.status(404).json({
        message: "Item not found."
      });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error("Error fetching item:", error);

    return res.status(500).json({
      message: "Failed to fetch item."
    });
  }
};

export const updateItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const itemId = getStringValue(req.params.id);

    if (!itemId) {
      return res.status(400).json({
        message: "Item id is required."
      });
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return res.status(404).json({
        message: "Item not found."
      });
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

    const userId = getStringValue(req.body.userId, req.body.user_id);
    if (userId !== undefined) {
      data.userId = parseRequiredString(userId, "userId");
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

    if (
      hasOwnProperty(req.body, "warrantyExpiry") ||
      hasOwnProperty(req.body, "warranty_expiry")
    ) {
      data.warrantyExpiry = parseDate(
        getStringValue(req.body.warrantyExpiry, req.body.warranty_expiry),
        "warrantyExpiry"
      );
    }

    const resolvedUserId = typeof data.userId === "string" ? data.userId : existingItem.userId;
    const resolvedCategoryId =
      typeof data.categoryId === "string" ? data.categoryId : existingItem.categoryId;
    const resolvedLocationId =
      typeof data.locationId === "string" ? data.locationId : existingItem.locationId;

    await validateItemRelations({
      userId: resolvedUserId,
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
        message: "userId, categoryId, or locationId references an invalid record."
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Failed to update item."
    });
  }
};

export const deleteItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const itemId = getStringValue(req.params.id);

    if (!itemId) {
      return res.status(400).json({
        message: "Item id is required."
      });
    }

    await prisma.item.delete({
      where: { id: itemId }
    });

    return res.status(200).json({
      message: "Item deleted successfully."
    });
  } catch (error: unknown) {
    console.error("Error deleting item:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({
        message: "Item not found."
      });
    }

    return res.status(500).json({
      message: "Failed to delete item."
    });
  }
};

export const getAlertItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = getStringValue(req.query.userId, req.query.user_id);

    if (!userId) {
      return res.status(400).json({
        message: "userId is required."
      });
    }

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

    return res.status(500).json({
      message: "Failed to fetch alert items."
    });
  }
};
