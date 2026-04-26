import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { getStringValue } from "../utils/helpers";

type CategoryNode = {
  id: string;
  name: string;
  userId: string;
  parentCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryNode[];
};

export const createCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const name = getStringValue(req.body.name)?.trim();
    const parentCategoryId =
      getStringValue(req.body.parentCategoryId, req.body.parent_category_id)?.trim() || null;

    if (!name) {
      return res.status(400).json({ message: "name is required." });
    }

    if (parentCategoryId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentCategoryId }
      });

      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found." });
      }

      if (parentCategory.userId !== userId) {
        return res.status(403).json({ message: "Parent category must belong to you." });
      }
    }

    const existingCategory = await prisma.category.findFirst({
      where: { userId, name, parentCategoryId }
    });

    if (existingCategory) {
      return res.status(409).json({
        message: "A category with this name already exists at this hierarchy level."
      });
    }

    const category = await prisma.category.create({
      data: { name, userId, parentCategoryId }
    });

    return res.status(201).json(category);
  } catch (error: unknown) {
    console.error("Error creating category:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "A category with this name already exists at this hierarchy level."
      });
    }

    return res.status(500).json({ message: "Failed to create category." });
  }
};

export const getCategoryTree = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [{ name: "asc" }]
    });

    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const category of categories) {
      nodeMap.set(category.id, {
        id: category.id,
        name: category.name,
        userId: category.userId,
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
    console.error("Error fetching category tree:", error);
    return res.status(500).json({ message: "Failed to fetch category tree." });
  }
};
