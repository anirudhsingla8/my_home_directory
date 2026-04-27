import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { seedGlobalCategories } from "../lib/defaultCategories";
import { getStringValue } from "../utils/helpers";

const log = logger.child("categories");

type CategoryNode = {
  id: string;
  name: string;
  parentCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryNode[];
};

/**
 * Filter applied to every read/write — categories are global (not owned by a
 * user). Legacy per-user rows (userId IS NOT NULL) are intentionally excluded
 * so the picker only shows the shared catalogue.
 */
const GLOBAL_CATEGORY_FILTER = { userId: null } as const;

export const createCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const name = getStringValue(req.body.name)?.trim();
    const parentCategoryId =
      getStringValue(req.body.parentCategoryId, req.body.parent_category_id)?.trim() || null;

    if (!name) {
      return res.status(400).json({ message: "name is required." });
    }

    if (parentCategoryId) {
      const parentCategory = await prisma.category.findFirst({
        where: { id: parentCategoryId, ...GLOBAL_CATEGORY_FILTER }
      });

      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found." });
      }
    }

    const existingCategory = await prisma.category.findFirst({
      where: { ...GLOBAL_CATEGORY_FILTER, name, parentCategoryId }
    });

    if (existingCategory) {
      return res.status(409).json({
        message: "A category with this name already exists at this hierarchy level."
      });
    }

    const category = await prisma.category.create({
      data: { name, userId: null, parentCategoryId }
    });

    log.info("Global category created", { id: category.id, name, by: req.user?.id });
    return res.status(201).json(category);
  } catch (error: unknown) {
    log.error("Error creating category", { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "A category with this name already exists at this hierarchy level."
      });
    }

    return res.status(500).json({ message: "Failed to create category." });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const categoryId = getStringValue(req.params.id);
    const newName = getStringValue(req.body.name)?.trim();

    if (!categoryId) {
      return res.status(400).json({ message: "Category id is required." });
    }
    if (!newName) {
      return res.status(400).json({ message: "name is required." });
    }

    const existing = await prisma.category.findFirst({
      where: { id: categoryId, ...GLOBAL_CATEGORY_FILTER },
      select: { id: true, parentCategoryId: true, name: true }
    });

    if (!existing) {
      return res.status(404).json({ message: "Category not found." });
    }

    if (existing.name === newName) {
      return res.status(200).json(existing);
    }

    const conflict = await prisma.category.findFirst({
      where: {
        ...GLOBAL_CATEGORY_FILTER,
        name: newName,
        parentCategoryId: existing.parentCategoryId,
        id: { not: categoryId }
      }
    });

    if (conflict) {
      return res.status(409).json({
        message: "A category with this name already exists at this hierarchy level."
      });
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { name: newName }
    });

    log.info("Category renamed", { id: categoryId, by: req.user?.id });
    return res.status(200).json(updated);
  } catch (error) {
    log.error("Error updating category", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: "Failed to update category." });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const categoryId = getStringValue(req.params.id);

    if (!categoryId) {
      return res.status(400).json({ message: "Category id is required." });
    }

    const existing = await prisma.category.findFirst({
      where: { id: categoryId, ...GLOBAL_CATEGORY_FILTER },
      select: { id: true }
    });

    if (!existing) {
      return res.status(404).json({ message: "Category not found." });
    }

    await prisma.category.delete({ where: { id: categoryId } });

    log.info("Category deleted", { id: categoryId, by: req.user?.id });
    return res.status(200).json({ message: "Category deleted successfully." });
  } catch (error) {
    log.error("Error deleting category", { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete category: items are still assigned to it."
      });
    }

    return res.status(500).json({ message: "Failed to delete category." });
  }
};

export const getCategoryTree = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const categories = await prisma.category.findMany({
      where: GLOBAL_CATEGORY_FILTER,
      orderBy: [{ name: "asc" }]
    });

    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const category of categories) {
      nodeMap.set(category.id, {
        id: category.id,
        name: category.name,
        parentCategoryId: category.parentCategoryId,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        children: []
      });
    }

    for (const category of categories) {
      const currentNode = nodeMap.get(category.id);
      if (!currentNode) continue;

      if (category.parentCategoryId) {
        const parentNode = nodeMap.get(category.parentCategoryId);
        if (parentNode) {
          parentNode.children.push(currentNode);
          continue;
        }
      }

      roots.push(currentNode);
    }

    return res.status(200).json(roots);
  } catch (error) {
    log.error("Error fetching category tree", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: "Failed to fetch category tree." });
  }
};

/**
 * POST /api/categories/seed-defaults — admin-only. Idempotently populates the
 * global tree from `DEFAULT_CATEGORIES`. Safe to re-run.
 */
export const seedDefaultCategories = async (req: Request, res: Response): Promise<Response> => {
  try {
    const created = await seedGlobalCategories(prisma);
    log.info("Default categories seeded", { created, by: req.user?.id });
    return res.status(200).json({ message: "Default categories seeded.", created });
  } catch (error) {
    log.error("Failed to seed default categories", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to seed default categories." });
  }
};
