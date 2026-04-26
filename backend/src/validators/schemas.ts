import { z } from "zod";

export const signupSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .min(1, "Email is required.")
    .email("Please provide a valid email address."),
  password: z
    .string({ required_error: "Password is required." })
    .min(6, "Password must be at least 6 characters long.")
    .max(128, "Password must be at most 128 characters long."),
  name: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .min(1, "Email is required.")
    .email("Please provide a valid email address."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required.")
});

export const createItemSchema = z.object({
  name: z
    .string({ required_error: "Item name is required." })
    .trim()
    .min(1, "Item name cannot be empty."),
  quantity: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z
      .number({ required_error: "Quantity is required." })
      .min(0, "Quantity cannot be negative.")
  ),
  unit: z
    .string({ required_error: "Unit is required." })
    .trim()
    .min(1, "Unit cannot be empty."),
  categoryId: z.string().trim().min(1, "categoryId is required.").optional(),
  category_id: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1, "locationId is required.").optional(),
  location_id: z.string().trim().min(1).optional(),
  expiryDate: z.string().optional(),
  expiry_date: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional()
});

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required." })
    .trim()
    .min(1, "Category name cannot be empty.")
    .max(100, "Category name must be at most 100 characters."),
  parentCategoryId: z.string().trim().nullable().optional(),
  parent_category_id: z.string().trim().nullable().optional()
});

export const createLocationSchema = z.object({
  name: z
    .string({ required_error: "Location name is required." })
    .trim()
    .min(1, "Location name cannot be empty.")
    .max(100, "Location name must be at most 100 characters.")
});
