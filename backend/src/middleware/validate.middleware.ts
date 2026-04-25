import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with structured error messages on failure.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => e.message);
        res.status(400).json({
          message: messages[0],
          errors: messages
        });
        return;
      }
      res.status(400).json({ message: "Invalid request body." });
    }
  };
};
