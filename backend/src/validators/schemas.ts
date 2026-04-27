import { z } from "zod";

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please provide a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .max(128, "Password must be at most 128 characters long."),
  name: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required.")
});

export const createItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required."),
  quantity: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number({ error: "Quantity is required." }).min(0, "Quantity cannot be negative.")
  ),
  minQuantity: z
    .preprocess(
      (val) => (typeof val === "string" ? Number(val) : val),
      z.number().min(0, "minQuantity cannot be negative.")
    )
    .optional(),
  min_quantity: z
    .preprocess(
      (val) => (typeof val === "string" ? Number(val) : val),
      z.number().min(0)
    )
    .optional(),
  unit: z.string().trim().min(1, "Unit is required."),
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
    .string()
    .trim()
    .min(1, "Category name is required.")
    .max(100, "Category name must be at most 100 characters."),
  parentCategoryId: z.string().trim().nullable().optional(),
  parent_category_id: z.string().trim().nullable().optional()
});

export const createLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Location name is required.")
    .max(100, "Location name must be at most 100 characters.")
});
