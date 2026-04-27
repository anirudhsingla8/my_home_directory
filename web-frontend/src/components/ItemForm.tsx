import axios from "axios";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { CategoryOption, createItem, fetchCategoryTree, flattenCategoryTree, showToast } from "../api";
import { useInventory } from "../context/InventoryContext";
import { CategoryPicker } from "./CategoryPicker";
import { GROUP_LABELS, UNITS, UnitGroup, findUnit, isQuantityValidForUnit } from "../lib/units";

type FormState = {
  name: string;
  quantity: string;
  minQuantity: string;
  unit: string;
  categoryId: string;
  expiryDate: string;
  imageFile: File | null;
};

type FieldErrors = Partial<Record<"name" | "quantity" | "minQuantity" | "unit" | "categoryId" | "submit", string>>;

const LS_LAST_UNIT = "inv:lastUnit";
const LS_LAST_CATEGORY = "inv:lastCategoryId";

const readLocal = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

const writeLocal = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
};

const buildInitialState = (): FormState => {
  const stored = readLocal(LS_LAST_UNIT);
  const unit = UNITS.some((u) => u.value === stored) ? stored : "pcs";
  return {
    name: "",
    quantity: "1",
    minQuantity: "1",
    unit,
    categoryId: readLocal(LS_LAST_CATEGORY),
    expiryDate: "",
    imageFile: null
  };
};

type ItemFormProps = {
  onCreated?: () => void;
};

export function ItemForm({ onCreated }: ItemFormProps) {
  const { selectedLocationId, triggerRefresh } = useInventory();
  const [formState, setFormState] = useState<FormState>(buildInitialState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      setErrors((prev) => ({ ...prev, submit: undefined }));

      try {
        const tree = await fetchCategoryTree();
        const flattened = flattenCategoryTree(tree);
        setCategories(flattened);

        setFormState((current) => {
          const stillValid = flattened.some((c) => c.isLeaf && c.id === current.categoryId);
          if (stillValid) return current;
          const firstLeaf = flattened.find((c) => c.isLeaf);
          return { ...current, categoryId: firstLeaf?.id ?? "" };
        });
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.message ?? "Could not load categories."
          : "Could not load categories.";
        setErrors((prev) => ({ ...prev, submit: message }));
      } finally {
        setLoadingCategories(false);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    if (!formState.imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(formState.imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formState.imageFile]);

  const updateField = (field: keyof Omit<FormState, "imageFile">) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormState((current) => ({ ...current, [field]: value }));
      if (errors[field as keyof FieldErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  };

  const handleUnitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setFormState((current) => {
      const def = findUnit(next);
      const round = def && !def.allowsDecimals;
      const trimDecimal = (s: string) => {
        if (!s) return s;
        const n = Number(s);
        if (Number.isNaN(n)) return s;
        return Math.floor(n).toString();
      };
      return {
        ...current,
        unit: next,
        quantity: round ? trimDecimal(current.quantity) : current.quantity,
        minQuantity: round ? trimDecimal(current.minQuantity) : current.minQuantity
      };
    });
    if (errors.unit || errors.quantity || errors.minQuantity) {
      setErrors((prev) => ({ ...prev, unit: undefined, quantity: undefined, minQuantity: undefined }));
    }
  };

  const groupedUnits = useMemo(() => {
    const groups: Record<UnitGroup, typeof UNITS> = {
      count: [], weight: [], volume: [], length: []
    };
    for (const u of UNITS) groups[u.group].push(u);
    return groups;
  }, []);

  const currentUnitDef = findUnit(formState.unit);
  const allowsDecimals = currentUnitDef ? currentUnitDef.allowsDecimals : true;

  const updateImage = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((current) => ({ ...current, imageFile: event.target.files?.[0] ?? null }));
  };

  const handleCategoryChange = (id: string) => {
    setFormState((prev) => ({ ...prev, categoryId: id }));
    if (errors.categoryId) {
      setErrors((prev) => ({ ...prev, categoryId: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!formState.name.trim()) next.name = "Name is required.";
    const qty = Number(formState.quantity);
    if (!formState.quantity || Number.isNaN(qty) || qty < 0) {
      next.quantity = "Enter a non-negative number.";
    } else if (formState.unit && !isQuantityValidForUnit(qty, formState.unit)) {
      next.quantity = `${formState.unit} must be a whole number.`;
    }
    if (formState.minQuantity !== "") {
      const min = Number(formState.minQuantity);
      if (Number.isNaN(min) || min < 0) {
        next.minQuantity = "Enter a non-negative number.";
      } else if (formState.unit && !isQuantityValidForUnit(min, formState.unit)) {
        next.minQuantity = `${formState.unit} must be a whole number.`;
      }
    }
    if (!formState.unit.trim()) next.unit = "Unit is required.";
    if (!formState.categoryId) next.categoryId = "Select a subcategory.";
    if (!selectedLocationId) next.submit = "Please select a location in the top bar before adding items.";
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const createdItem = await createItem({
        name: formState.name.trim(),
        quantity: Number(formState.quantity),
        minQuantity: formState.minQuantity === "" ? undefined : Number(formState.minQuantity),
        unit: formState.unit.trim(),
        categoryId: formState.categoryId,
        locationId: selectedLocationId,
        expiryDate: formState.expiryDate || undefined,
        imageFile: formState.imageFile
      });

      writeLocal(LS_LAST_UNIT, formState.unit.trim());
      writeLocal(LS_LAST_CATEGORY, formState.categoryId);

      setFormState({
        name: "",
        quantity: "1",
        minQuantity: formState.minQuantity,
        unit: formState.unit,
        categoryId: formState.categoryId,
        expiryDate: "",
        imageFile: null
      });
      showToast(`"${createdItem.name}" added to inventory`, "success");
      triggerRefresh();
      onCreated?.();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Could not create the item."
        : "Could not create the item.";
      setErrors({ submit: message });
    } finally {
      setSubmitting(false);
    }
  };

  const leafCount = useMemo(() => categories.filter((c) => c.isLeaf).length, [categories]);

  const fieldClass = (field: keyof FieldErrors) =>
    `w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:bg-white focus:outline-none focus:ring-1 ${
      errors[field]
        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-300"
        : "border-slate-200 focus:border-amber-300 focus:ring-amber-300"
    }`;

  const FieldError = ({ field }: { field: keyof FieldErrors }) =>
    errors[field] ? (
      <p className="text-xs text-rose-600">{errors[field]}</p>
    ) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">New Item</h2>
        <span className="text-xs text-slate-400">
          <span className="text-rose-500">*</span> required
        </span>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {/* Required fields */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-medium text-slate-500">
              Name <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              value={formState.name}
              onChange={updateField("name")}
              placeholder="e.g. Potato"
              aria-invalid={!!errors.name}
              className={fieldClass("name")}
            />
            <FieldError field="name" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">
              Quantity <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              min="0"
              step={allowsDecimals ? "0.01" : "1"}
              value={formState.quantity}
              onChange={updateField("quantity")}
              aria-invalid={!!errors.quantity}
              className={fieldClass("quantity")}
            />
            <FieldError field="quantity" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">
              Min stock <span className="text-slate-400">(alert below)</span>
            </span>
            <input
              type="number"
              min="0"
              step={allowsDecimals ? "0.01" : "1"}
              value={formState.minQuantity}
              onChange={updateField("minQuantity")}
              aria-invalid={!!errors.minQuantity}
              className={fieldClass("minQuantity")}
            />
            <FieldError field="minQuantity" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">
              Unit <span className="text-rose-500">*</span>
            </span>
            <select
              value={formState.unit}
              onChange={handleUnitChange}
              aria-invalid={!!errors.unit}
              className={fieldClass("unit")}
            >
              {(Object.keys(groupedUnits) as UnitGroup[]).map((group) => (
                <optgroup key={group} label={GROUP_LABELS[group]}>
                  {groupedUnits[group].map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <FieldError field="unit" />
          </label>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-medium text-slate-500">
              Subcategory <span className="text-rose-500">*</span>
            </span>
            <CategoryPicker
              categories={categories}
              selectedId={formState.categoryId}
              onChange={handleCategoryChange}
              loading={loadingCategories}
              disabled={leafCount === 0}
            />
            <FieldError field="categoryId" />
          </div>
        </div>

        {/* Optional fields */}
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Optional
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Expiry date</span>
              <input
                type="date"
                value={formState.expiryDate}
                onChange={updateField("expiryDate")}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Image</span>
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={updateImage}
                  className="block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:border-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {errors.submit && (
          <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600">{errors.submit}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || !selectedLocationId || leafCount === 0}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {submitting ? "Saving..." : !selectedLocationId ? "Select a location first" : "Add Item"}
          </button>
        </div>
      </form>
    </section>
  );
}
