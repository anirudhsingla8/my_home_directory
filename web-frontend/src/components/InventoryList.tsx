import axios from "axios";
import { useEffect, useState } from "react";

import { Item, fetchItems } from "../api";
import { useInventory } from "../context/InventoryContext";

const formatExpiryDate = (value: string | null) => {
  if (!value) {
    return "No expiry date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Invalid date";
  }

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export function InventoryList() {
  const { userId, locationId, selectedCategory, refreshKey, searchQuery } = useInventory();
  const categoryId = selectedCategory?.id;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setError(null);
      return;
    }

    const loadItems = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchItems({
          userId,
          locationId,
          categoryId,
          search: searchQuery
        });

        setItems(data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message ?? "Could not load inventory items.");
        } else {
          setError("Could not load inventory items.");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadItems();
  }, [categoryId, locationId, refreshKey, userId, searchQuery]);

  return (
    <section className="rounded-[28px] border border-white/60 bg-slate-50/80 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Inventory</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Responsive Item Cards</h2>
        </div>
        {categoryId ? (
          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-950">
            Filtered by category
          </span>
        ) : null}
      </div>

      {!userId ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-800">Your inventory awaits</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Log in and your User ID will auto-populate. Then add your first item to get started!
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-14">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
          <p className="mt-4 text-sm font-medium text-slate-500">Fetching your items…</p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {!loading && !error && userId && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-800">Welcome! No items yet.</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Use the form above to add your first inventory item — track groceries, gadgets, anything!
          </p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_40px_-30px_rgba(15,23,42,0.9)]"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-[linear-gradient(135deg,#fef3c7,#fde68a,#f8fafc)] text-sm font-medium text-slate-500">
                  No image uploaded
                </div>
              )}

              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
                    <p className="text-sm text-slate-500">{item.category?.name ?? "Uncategorized"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {item.quantity} {item.unit}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-800">Expiry:</span>{" "}
                    {formatExpiryDate(item.expiryDate)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Location:</span>{" "}
                    {item.location?.name ?? "Unknown location"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
