/**
 * Shared utility functions used across controllers.
 */

/**
 * Returns the first truthy string value from the given arguments.
 * Useful for accepting both camelCase and snake_case field names from clients.
 */
export const getStringValue = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
};

export const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
};

export const parseOptionalString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || null;
};

export const parseNumber = (value: unknown, fieldName: string): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  return num;
};

export const parseDate = (value: unknown, fieldName: string): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a valid ISO date string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date string.`);
  }
  return parsed;
};

export const hasOwnProperty = (target: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(target, key);
