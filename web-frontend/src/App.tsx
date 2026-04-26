import { Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";

import { createLocation, showToast } from "./api";
import { CategoryTree } from "./components/CategoryTree";
import { InventoryList } from "./components/InventoryList";
import { ItemForm } from "./components/ItemForm";
import { AuthScreen } from "./components/AuthScreen";
import { AutoLocationBanner } from "./components/AutoLocationBanner";
import { LocationAutocomplete } from "./components/LocationAutocomplete";
import { InventoryProvider, useInventory } from "./context/InventoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// ─── Inline SVG Icons ────────────────────────────────────────────────

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

const CircleHalfIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 4v12a6 6 0 000-12z" clipRule="evenodd" />
  </svg>
);

const themeIconMap = {
  light: SunIcon,
  dark: MoonIcon,
  grey: CircleHalfIcon
} as const;

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const Icon = themeIconMap[theme];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label={`Theme: ${theme}`}
        title={`Theme: ${theme}`}
      >
        <Icon />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
          {(["light", "dark", "grey"] as const).map((t) => {
            const ThemeIcon = themeIconMap[t];
            const active = t === theme;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setTheme(t); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                  active ? "bg-amber-50 font-semibold text-amber-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ThemeIcon />
                <span className="capitalize">{t}</span>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Alerts Widget ───────────────────────────────────────────────────

function AlertsWidget() {
  const { alerts } = useInventory();

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertIcon />
        <h3 className="text-sm font-semibold">Needs Attention ({alerts.length})</h3>
      </div>
      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
        {alerts.map((item) => {
          const isLowStock = item.quantity <= 1;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`h-2 w-2 shrink-0 rounded-full ${isLowStock ? "bg-rose-500" : "bg-amber-500"}`} />
                <span className="truncate font-medium text-slate-800">{item.name}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {item.quantity} {item.unit}
                </span>
              </div>
              <span className={`shrink-0 ml-2 rounded-md px-2 py-0.5 text-xs font-medium ${
                isLowStock
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {isLowStock ? "Low" : "Expiring"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────────────

function TopBar() {
  const { user, logout } = useAuth();
  const { locations, selectedLocationId, setSelectedLocationId, reloadLocations, searchQuery, setSearchQuery } = useInventory();

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearchChange = useCallback((value: string) => {
    setDebouncedSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearchQuery(value), 350);
  }, [setSearchQuery]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCreateLocation = async (name: string) => {
    try {
      const loc = await createLocation(name);
      reloadLocations();
      setSelectedLocationId(loc.id);
      showToast(`"${loc.name}" location created`, "success");
    } catch (err) {
      const message =
        typeof err === "object" && err !== null && "response" in err &&
        // axios error shape
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : "Failed to create location";
      showToast(message, "error");
      throw err;
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-900">
            <HomeIcon />
          </div>
          <span className="hidden sm:block text-sm font-bold text-slate-900">Home Inventory</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={debouncedSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
        </div>

        {/* Location selector */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          <LocationAutocomplete existing={locations} onCreate={handleCreateLocation} />
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          <ThemeSwitcher />
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900 leading-tight">{user?.name || "User"}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Dashboard Layout ────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm3 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function FilterSidebarContent() {
  const { selectedCategory, setSelectedCategory, locations, selectedLocationId, setSelectedLocationId } = useInventory();

  return (
    <div className="space-y-4">
      {/* Mobile-only location selector */}
      <div className="space-y-2 lg:hidden">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Location
        </label>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <CategoryTree />

      {selectedCategory && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-600">Filtering by</p>
            <p className="truncate text-sm font-semibold text-slate-900">{selectedCategory.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="shrink-0 ml-2 rounded-md p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-700"
            aria-label="Clear filter"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <AlertsWidget />
    </div>
  );
}

function DashboardPageContent() {
  const { selectedCategory } = useInventory();
  const [showForm, setShowForm] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const lastSelectedIdRef = useRef<string | undefined>(selectedCategory?.id);

  // Auto-close drawer when a category is picked (changes from prior value)
  useEffect(() => {
    if (lastSelectedIdRef.current !== selectedCategory?.id) {
      lastSelectedIdRef.current = selectedCategory?.id;
      setFiltersOpen(false);
    }
  }, [selectedCategory?.id]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (filtersOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [filtersOpen]);

  // Close drawer on Escape
  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtersOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />

      <div className="pt-4 sm:pt-6">
        <AutoLocationBanner />
      </div>

      <div className="mx-auto max-w-7xl px-3 pb-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto sidebar-scroll">
            <FilterSidebarContent />
          </aside>

          {/* Main content */}
          <main className="space-y-4 sm:space-y-5 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Inventory</h1>
                <p className="hidden sm:block text-sm text-slate-500">Manage your household items</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  aria-label="Open filters"
                >
                  <FilterIcon />
                  <span>Filters</span>
                  {selectedCategory && (
                    <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-900">
                      1
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(!showForm)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-semibold transition ${
                    showForm
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  <PlusIcon />
                  <span className="hidden sm:inline">{showForm ? "Hide Form" : "Add Item"}</span>
                  <span className="sm:hidden">{showForm ? "Hide" : "Add"}</span>
                </button>
              </div>
            </div>

            {/* Collapsible form */}
            {showForm && (
              <div className="collapsible-enter">
                <ItemForm
                  onCreated={() => setShowForm(false)}
                />
              </div>
            )}

            <InventoryList />
          </main>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          filtersOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setFiltersOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm transform overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ease-out lg:hidden ${
          filtersOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!filtersOpen}
        aria-label="Filters"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close filters"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-4">
          <FilterSidebarContent />
        </div>
      </aside>
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────

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
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
