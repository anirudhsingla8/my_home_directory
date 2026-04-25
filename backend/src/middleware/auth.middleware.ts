import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured.");
  }
  return secret;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Invalid token." });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string };
    
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
    return;
  }
};
