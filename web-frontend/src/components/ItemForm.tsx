import axios from "axios";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { CategoryOption, Item, createItem, fetchCategoryTree, flattenCategoryTree } from "../api";
import { useInventory } from "../context/InventoryContext";

type FormState = {
  name: string;
  quantity: string;
  unit: string;
  categoryId: string;
  expiryDate: string;
  imageFile: File | null;
};

const initialState: FormState = {
  name: "",
  quantity: "1",
  unit: "pcs",
  categoryId: "",
  expiryDate: "",
  imageFile: null
};

export function ItemForm() {
  const { userId, locationId, triggerRefresh: onCreated } = useInventory();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      return;
    }

    const loadCategories = async () => {
      setLoadingCategories(true);
      setError(null);

      try {
        const tree = await fetchCategoryTree(userId);
        const flattened = flattenCategoryTree(tree);

        setCategories(flattened);
        setFormState((current) => ({
          ...current,
          categoryId: flattened[0]?.id ?? ""
        }));
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message ?? "Could not load categories.");
        } else {
          setError("Could not load categories.");
        }
      } finally {
        setLoadingCategories(false);
      }
    };

    void loadCategories();
  }, [userId]);

  const updateField = (field: keyof Omit<FormState, "imageFile">) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((current) => ({
        ...current,
        [field]: event.target.value
      }));
    };
  };

  const updateImage = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((current) => ({
      ...current,
      imageFile: event.target.files?.[0] ?? null
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId || !locationId) {
      setError("Both user ID and location ID are required before creating items.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const createdItem = await createItem({
        name: formState.name,
        quantity: Number(formState.quantity),
        unit: formState.unit,
        categoryId: formState.categoryId,
        userId,
        locationId,
        expiryDate: formState.expiryDate || undefined,
        imageFile: formState.imageFile
      });

      setFormState({
        ...initialState,
        categoryId: categories[0]?.id ?? ""
      });
      setSuccess(`${createdItem.name} was added to inventory.`);
      onCreated?.();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Could not create the item.");
      } else {
        setError("Could not create the item.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.75)] backdrop-blur">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">New Item</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">Add Inventory Item</h2>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={formState.name}
              onChange={updateField("name")}
              placeholder="Potato"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Quantity</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formState.quantity}
              onChange={updateField("quantity")}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Unit</span>
            <input
              type="text"
              value={formState.unit}
              onChange={updateField("unit")}
              placeholder="kg"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              value={formState.categoryId}
              onChange={updateField("categoryId")}
              required
              disabled={loadingCategories || categories.length === 0}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {categories.length === 0 ? (
                <option value="">
                  {loadingCategories ? "Loading categories..." : "No categories available"}
                </option>
              ) : null}

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {`${"— ".repeat(category.depth)}${category.name}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Expiry Date</span>
            <input
              type="date"
              value={formState.expiryDate}
              onChange={updateField("expiryDate")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={updateImage}
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-slate-500"
            />
          </label>
        </div>

        {error ? <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {success ? (
          <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm text-emerald-700">{success}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !userId || !locationId || categories.length === 0}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? "Saving Item..." : "Create Item"}
        </button>
      </form>
    </section>
  );
}
