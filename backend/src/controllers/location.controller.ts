import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { getStringValue } from "../utils/helpers";

export const createLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const name = getStringValue(req.body.name);

    if (!name) {
      return res.status(400).json({ message: "name is required." });
    }

    const existing = await prisma.location.findFirst({
      where: { userId, name: { equals: name, mode: "insensitive" } }
    });

    if (existing) {
      return res.status(409).json({
        message: `A location named "${existing.name}" already exists.`
      });
    }

    try {
      const location = await prisma.location.create({
        data: { name, userId }
      });
      return res.status(201).json(location);
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        return res.status(409).json({
          message: `A location named "${name}" already exists.`
        });
      }
      throw createError;
    }
  } catch (error) {
    console.error("Error creating location:", error);
    return res.status(500).json({ message: "Failed to create location." });
  }
};

export const getLocations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;

    const locations = await prisma.location.findMany({
      where: { userId },
      orderBy: [{ name: "asc" }]
    });

    return res.status(200).json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({ message: "Failed to fetch locations." });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const locationId = getStringValue(req.params.id);

    if (!locationId) {
      return res.status(400).json({ message: "Location id is required." });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { userId: true }
    });

    if (!location) {
      return res.status(404).json({ message: "Location not found." });
    }

    if (location.userId !== userId) {
      return res.status(403).json({ message: "You do not have access to this location." });
    }

    await prisma.location.delete({ where: { id: locationId } });

    return res.status(200).json({ message: "Location deleted successfully." });
  } catch (error: unknown) {
    console.error("Error deleting location:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete location: it still has items assigned to it."
      });
    }

    return res.status(500).json({ message: "Failed to delete location." });
  }
};
