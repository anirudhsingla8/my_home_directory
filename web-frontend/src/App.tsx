import { Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";

import { Item, fetchAlertItems } from "./api";
import { CategoryTree } from "./components/CategoryTree";
import { InventoryList } from "./components/InventoryList";
import { ItemForm } from "./components/ItemForm";
import { AuthScreen } from "./components/AuthScreen";
import { InventoryProvider, useInventory } from "./context/InventoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AlertsWidget() {
  const { userId, refreshKey } = useInventory();
  const [alerts, setAlerts] = useState<Item[]>([]);

  useEffect(() => {
    if (!userId) {
      setAlerts([]);
      return;
    }
    fetchAlertItems(userId).then(setAlerts).catch(console.error);
  }, [userId, refreshKey]);

  if (!userId || alerts.length === 0) return null;

  return (
    <div className="mb-6 rounded-[24px] border border-orange-500/30 bg-orange-50 p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wider text-orange-700">
        Needs Attention ({alerts.length})
      </h3>
      <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-auto">
        {alerts.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-sm text-orange-950 bg-white p-3 rounded-xl border border-orange-100"
          >
            <span className="font-medium">
              {item.name}{" "}
              <span className="text-orange-500 font-normal">
                ({item.quantity} {item.unit})
              </span>
            </span>
            <span className="rounded-full bg-orange-200 px-3 py-1 text-xs font-semibold text-orange-800">
              {item.quantity <= 1 ? "Low Stock" : "Expiring"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPageContent() {
  const { user, logout } = useAuth();
  const {
    locationId,
    setLocationId,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery
  } = useInventory();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.25),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#fff7ed_48%,_#e2e8f0)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(51,65,85,0.88),rgba(120,53,15,0.75))] px-6 py-8 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.85)] sm:px-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">
              Home Inventory System
            </p>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user?.name || "Inventory User"}</p>
                <p className="text-xs text-slate-300">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                Log Out
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Manage your household inventory with confidence.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Search, filter, organise by category, track expiry dates, and upload photos — all from one dashboard.
              </p>

              <div className="mt-6 flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-300 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items by name..."
                  className="w-full bg-transparent text-white placeholder-slate-300 outline-none"
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-medium text-amber-100">Backend context</p>
              <div className="mt-4 grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Location ID</span>
                  <input
                    type="text"
                    value={locationId}
                    onChange={(event) => setLocationId(event.target.value)}
                    placeholder="Paste a valid Location ID"
                    className="w-full rounded-2xl border border-white/15 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 focus:border-amber-300"
                  />
                </label>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <CategoryTree />

            <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.75)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Active Filter
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Selected category</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    {selectedCategory?.name ?? "All categories"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AlertsWidget />
            <ItemForm />
            <InventoryList />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <InventoryProvider>
      <Routes>
        <Route path="/" element={<DashboardPageContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </InventoryProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
