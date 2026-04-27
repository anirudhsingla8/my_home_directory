/**
 * Units used across the inventory. Each unit declares whether it allows
 * fractional quantities so the form can constrain numeric inputs accordingly.
 * Mirrors web-frontend/src/lib/units.ts.
 */

export type UnitGroup = "count" | "weight" | "volume" | "length";

export interface UnitDef {
  value: string;
  label: string;
  allowsDecimals: boolean;
  group: UnitGroup;
}

export const UNITS: UnitDef[] = [
  { value: "pcs",     label: "pcs",     allowsDecimals: false, group: "count" },
  { value: "packs",   label: "packs",   allowsDecimals: false, group: "count" },
  { value: "boxes",   label: "boxes",   allowsDecimals: false, group: "count" },
  { value: "bottles", label: "bottles", allowsDecimals: false, group: "count" },
  { value: "cans",    label: "cans",    allowsDecimals: false, group: "count" },
  { value: "jars",    label: "jars",    allowsDecimals: false, group: "count" },
  { value: "bags",    label: "bags",    allowsDecimals: false, group: "count" },
  { value: "rolls",   label: "rolls",   allowsDecimals: false, group: "count" },
  { value: "dozen",   label: "dozen",   allowsDecimals: false, group: "count" },
  { value: "kg",  label: "kg",  allowsDecimals: true, group: "weight" },
  { value: "g",   label: "g",   allowsDecimals: true, group: "weight" },
  { value: "lbs", label: "lbs", allowsDecimals: true, group: "weight" },
  { value: "oz",  label: "oz",  allowsDecimals: true, group: "weight" },
  { value: "L",   label: "L",   allowsDecimals: true, group: "volume" },
  { value: "mL",  label: "mL",  allowsDecimals: true, group: "volume" },
  { value: "gal", label: "gal", allowsDecimals: true, group: "volume" },
  { value: "m",  label: "m",  allowsDecimals: true, group: "length" },
  { value: "cm", label: "cm", allowsDecimals: true, group: "length" }
];

export const GROUP_LABELS: Record<UnitGroup, string> = {
  count: "Count",
  weight: "Weight",
  volume: "Volume",
  length: "Length"
};

export const findUnit = (value: string | undefined | null): UnitDef | undefined =>
  UNITS.find((u) => u.value === value);

export const isQuantityValidForUnit = (quantity: number, unit: string): boolean => {
  if (!Number.isFinite(quantity) || quantity < 0) return false;
  const def = findUnit(unit);
  if (!def) return true;
  if (def.allowsDecimals) return true;
  return Number.isInteger(quantity);
};
