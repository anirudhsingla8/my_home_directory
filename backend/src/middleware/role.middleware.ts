import { Request, Response, NextFunction } from "express";

/**
 * Express middleware factory that restricts access to users with specific roles.
 * Must be used AFTER authMiddleware so that req.user is populated.
 *
 * @example
 * router.post("/", authMiddleware, requireRole("ADMIN"), createCategory);
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        message: "You do not have permission to perform this action."
      });
      return;
    }

    next();
  };
};
