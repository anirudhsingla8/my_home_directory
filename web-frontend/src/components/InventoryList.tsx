import axios from "axios";
import { useEffect, useState } from "react";

import { Item, fetchItems, deleteItem, showToast } from "../api";
import { useInventory } from "../context/InventoryContext";

const formatExpiryDate = (value: string | null): string => {
  if (!value) return "No expiry";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const getExpiryStatus = (value: string | null): "ok" | "warning" | "expired" | "none" => {
  if (!value) return "none";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "none";
  const now = new Date();
  const daysLeft = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "warning";
  return "ok";
};

const expiryBadgeStyles = {
  ok: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  expired: "bg-rose-50 text-rose-700",
  none: "bg-slate-50 text-slate-500"
};

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

export function InventoryList() {
  const {
    selectedLocationId,
    selectedCategory,
    refreshKey,
    searchQuery,
    removeAlertOptimistic,
    triggerRefresh
  } = useInventory();
  const categoryId = selectedCategory?.id;

  const [items, setItems] = useState<Item[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [categoryId, selectedLocationId, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const loadItems = async () => {
      setRefreshing(true);
      setError(null);

      try {
        const data = await fetchItems({
          locationId: selectedLocationId || undefined,
          categoryId,
          search: searchQuery || undefined,
          page
        });
        if (cancelled) return;

        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } catch (err) {
        if (cancelled) return;
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message ?? "Could not load inventory items.");
        } else {
          setError("Could not load inventory items.");
        }
      } finally {
        if (cancelled) return;
        setRefreshing(false);
        setHasLoadedOnce(true);
      }
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [categoryId, selectedLocationId, refreshKey, searchQuery, page]);

  const handleDelete = async (item: Item) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

    setDeletingId(item.id);
    // Optimistic local update — instant feedback
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setTotal((prev) => Math.max(0, prev - 1));
    removeAlertOptimistic(item.id);

    try {
      await deleteItem(item.id);
      showToast(`"${item.name}" deleted`, "success");
      triggerRefresh();
    } catch {
      showToast("Failed to delete item", "error");
      triggerRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const showInitialLoader = refreshing && !hasLoadedOnce;

  return (
    <section>
      {/* Header with count + subtle refresh indicator */}
      {total > 0 && !showInitialLoader && (
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
          <span>
            {total} item{total !== 1 ? "s" : ""}
            {selectedCategory ? ` in ${selectedCategory.name}` : ""}
          </span>
          {refreshing && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
              <span>Syncing</span>
            </span>
          )}
        </div>
      )}

      {/* Initial load only — full spinner */}
      {showInitialLoader && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-amber-500" />
          <p className="mt-3 text-sm text-slate-400">Loading items...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      )}

      {/* Empty state — only when load is complete and no items */}
      {hasLoadedOnce && !error && items.length === 0 && !refreshing && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">No items found</p>
          <p className="mt-1 max-w-[240px] text-xs text-slate-400">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different search.`
              : "Click \"Add Item\" above to get started."}
          </p>
        </div>
      )}

      {/* Item grid — keep showing during background refresh */}
      {!showInitialLoader && !error && items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const expiryStatus = getExpiryStatus(item.expiryDate);
              const isLowStock = item.quantity <= 1;

              return (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60"
                >
                  {/* Image */}
                  {item.imageUrl ? (
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Delete button overlay */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-400 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        title="Delete item"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <p className="mt-1 text-[11px] text-slate-400">No photo</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        title="Delete item"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">{item.name}</h3>
                        <p className="truncate text-xs text-slate-400">{item.category?.name ?? "Uncategorized"}</p>
                      </div>
                      <div className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                        isLowStock ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {item.quantity} {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${expiryBadgeStyles[expiryStatus]}`}>
                        {expiryStatus === "expired" && "Expired: "}
                        {expiryStatus === "warning" && "Expiring: "}
                        {formatExpiryDate(item.expiryDate)}
                      </span>
                      {item.location && (
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {item.location.name}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                        page === pageNum
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
