import axios from "axios";
import { FormEvent, useEffect, useState } from "react";

import {
  ShoppingListItem,
  addShoppingItem,
  clearCompletedShoppingItems,
  deleteShoppingItem,
  fetchShoppingList,
  showToast,
  updateShoppingItem
} from "../api";

type ShoppingListProps = {
  open: boolean;
  onClose: () => void;
};

export function ShoppingList({ open, onClose }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchShoppingList();
      setItems(data);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to load shopping list."
        : "Failed to load shopping list.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void reload();
  }, [open]);

  if (!open) return null;

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const item = await addShoppingItem({
        name: name.trim(),
        quantity: quantity ? Number(quantity) : 1,
        unit: unit.trim() || null
      });
      setItems((prev) => [item, ...prev]);
      setName("");
      setQuantity("1");
      setUnit("");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to add item."
        : "Failed to add item.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: ShoppingListItem) => {
    const next = !item.completed;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: next } : i)));
    try {
      await updateShoppingItem(item.id, { completed: next });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: item.completed } : i)));
      showToast("Failed to update item.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const prev = items;
    setItems((curr) => curr.filter((i) => i.id !== id));
    try {
      await deleteShoppingItem(id);
    } catch {
      setItems(prev);
      showToast("Failed to delete item.", "error");
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm("Remove all completed items?")) return;
    try {
      const { deleted } = await clearCompletedShoppingItems();
      setItems((prev) => prev.filter((i) => !i.completed));
      showToast(`Removed ${deleted} item${deleted === 1 ? "" : "s"}.`, "success");
    } catch {
      showToast("Failed to clear items.", "error");
    }
  };

  const pending = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Shopping list</h2>
            <p className="text-xs text-slate-500">{pending.length} pending · {completed.length} done</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-[1fr_80px_70px_auto] gap-2 border-b border-slate-100 p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            Add
          </button>
        </form>

        <div className="p-4">
          {loading && <p className="text-center text-sm text-slate-500">Loading...</p>}
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Your shopping list is empty.</p>
          )}

          {pending.length > 0 && (
            <ul className="space-y-1.5">
              {pending.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggle(item)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Delete"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {completed.length > 0 && (
            <>
              <div className="mt-5 mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</h3>
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-1.5">
                {completed.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggle(item)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-500 line-through">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
