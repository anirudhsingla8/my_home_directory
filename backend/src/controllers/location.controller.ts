import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getStringValue } from "../utils/helpers";

const log = logger.child("locations");

/**
 * Pull the best-effort client IP. Honours `X-Forwarded-For` (first hop) when
 * present so reverse proxies don't break detection. Returns `null` for
 * loopback / private addresses since those won't geolocate.
 */
const extractClientIp = (req: Request): string | null => {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff?.split(",")[0]?.trim();
  const candidate = raw || req.ip || req.socket.remoteAddress || "";
  if (!candidate) return null;
  // Strip IPv6-mapped IPv4 prefix.
  const normalized = candidate.replace(/^::ffff:/, "");
  if (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  ) {
    return null;
  }
  return normalized;
};

interface IpWhoIsResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  message?: string;
}

/**
 * GET /api/locations/detect — server-side IP geolocation. Used as the primary
 * source for the "we detected you're in <city>" prompt; the client falls back
 * to its own ipwho.is call if this returns null (e.g. local-dev requests).
 */
export const detectCity = async (req: Request, res: Response): Promise<Response> => {
  const ip = extractClientIp(req);
  const url = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      log.warn("IP geolocation upstream returned non-OK", { status: response.status, ip });
      return res.status(200).json({ city: null, region: null, country: null });
    }
    const data = (await response.json()) as IpWhoIsResponse;
    if (data.success === false) {
      log.warn("IP geolocation failed", { reason: data.message, ip });
      return res.status(200).json({ city: null, region: null, country: null });
    }
    const city = data.city?.trim();
    if (!city || city.toLowerCase() === "unknown") {
      return res.status(200).json({ city: null, region: data.region ?? null, country: data.country ?? null });
    }
    return res.status(200).json({
      city,
      region: data.region ?? null,
      country: data.country ?? null
    });
  } catch (error) {
    log.error("IP geolocation request failed", {
      error: error instanceof Error ? error.message : String(error),
      ip
    });
    return res.status(200).json({ city: null, region: null, country: null });
  }
};

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
    log.error("Error creating location", { error: error instanceof Error ? error.message : String(error) });
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
    log.error("Error fetching locations", { error: error instanceof Error ? error.message : String(error) });
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
    log.error("Error deleting location", { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete location: it still has items assigned to it."
      });
    }

    return res.status(500).json({ message: "Failed to delete location." });
  }
};
