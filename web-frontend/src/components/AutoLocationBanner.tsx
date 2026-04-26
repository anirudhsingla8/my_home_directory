import axios from "axios";
import { useEffect, useState } from "react";

import { createLocation, detectCityFromIP, showToast } from "../api";
import { useInventory } from "../context/InventoryContext";

const SKIP_FLAG = "inv:autoLocSkipped";

const wasSkipped = (): boolean => {
  try {
    return localStorage.getItem(SKIP_FLAG) === "true";
  } catch {
    return false;
  }
};

const markSkipped = () => {
  try {
    localStorage.setItem(SKIP_FLAG, "true");
  } catch {
    /* ignore quota errors */
  }
};

export function AutoLocationBanner() {
  const { locations, reloadLocations, setSelectedLocationId } = useInventory();
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<boolean>(() => wasSkipped());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (skipped) return;
    if (locations.length > 0) return;

    const controller = new AbortController();
    let cancelled = false;

    detectCityFromIP(controller.signal).then((city) => {
      if (cancelled) return;
      if (city) setDetectedCity(city);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [skipped, locations.length]);

  if (skipped || locations.length > 0 || !detectedCity) {
    return null;
  }

  const handleUse = async () => {
    setSubmitting(true);
    try {
      const loc = await createLocation(detectedCity);
      reloadLocations();
      setSelectedLocationId(loc.id);
      showToast(`"${loc.name}" set as your first location`, "success");
      setDetectedCity(null);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Could not save location."
        : "Could not save location.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    markSkipped();
    setSkipped(true);
  };

  return (
    <div className="mx-auto mb-4 max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              We detected you're in {detectedCity}
            </p>
            <p className="text-xs text-slate-600">
              Use it as your first location? You can rename or add more anytime.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-amber-100 hover:text-slate-900 disabled:opacity-40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleUse}
            disabled={submitting}
            className="rounded-lg bg-amber-400 px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
          >
            {submitting ? "Saving..." : `Use ${detectedCity}`}
          </button>
        </div>
      </div>
    </div>
  );
}
