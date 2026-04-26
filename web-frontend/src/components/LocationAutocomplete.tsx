import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

import { Location, PlaceSuggestion, searchPlaces } from "../api";

type LocationAutocompleteProps = {
  existing: Location[];
  onCreate: (name: string) => Promise<void> | void;
  disabled?: boolean;
};

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
};

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
const VIEWPORT_MARGIN = 8;
const MIN_DROPDOWN_WIDTH = 240;
const MAX_DROPDOWN_WIDTH = 360;

const computePosition = (rect: DOMRect): DropdownPosition => {
  const viewportW = window.innerWidth;
  const desiredWidth = Math.max(rect.width, MIN_DROPDOWN_WIDTH);
  const width = Math.min(desiredWidth, MAX_DROPDOWN_WIDTH, viewportW - VIEWPORT_MARGIN * 2);
  let left = rect.left;
  if (left + width > viewportW - VIEWPORT_MARGIN) {
    left = viewportW - VIEWPORT_MARGIN - width;
  }
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
  return {
    left,
    top: rect.bottom + 4,
    width
  };
};

const findExisting = (
  existing: Location[],
  candidate: string
): Location | undefined => {
  const needle = candidate.trim().toLowerCase();
  if (!needle) return undefined;
  return existing.find((loc) => loc.name.trim().toLowerCase() === needle);
};

export function LocationAutocomplete({ existing, onCreate, disabled }: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const listboxId = useId();

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    setPosition(computePosition(inputRef.current.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, suggestions.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      handleCancel();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      setHighlightIndex(-1);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (query.trim().length < MIN_QUERY) {
      setSuggestions([]);
      setHighlightIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      void searchPlaces(query, controller.signal).then((results) => {
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setHighlightIndex(results.length > 0 ? 0 : -1);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const reset = () => {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    setHighlightIndex(-1);
    setError(null);
    setPosition(null);
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleCancel = () => {
    if (submitting) return;
    reset();
  };

  const handleSubmit = async (rawName: string) => {
    const name = rawName.trim();
    if (!name) {
      setError("Please enter a location name.");
      return;
    }

    const dup = findExisting(existing, name);
    if (dup) {
      setError(`You already have a location named "${dup.name}".`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreate(name);
      reset();
    } catch {
      // onCreate is responsible for showing toast on failure
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setHighlightIndex((idx) => (idx + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setHighlightIndex((idx) => (idx - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick =
        highlightIndex >= 0 && suggestions[highlightIndex]
          ? suggestions[highlightIndex].name
          : query;
      void handleSubmit(pick);
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        disabled={disabled}
        className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <span className="hidden lg:inline">Location</span>
      </button>
    );
  }

  const showDropdown = open && (suggestions.length > 0 || error);
  const dropdown = showDropdown && position && (
    <div
      ref={dropdownRef}
      role="presentation"
      className="fixed z-[100] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
      style={{ left: position.left, top: position.top, width: position.width }}
    >
      {error && (
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}
      {suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Location suggestions"
          className="max-h-60 overflow-y-auto p-1.5"
        >
          {suggestions.map((s, idx) => {
            const isHighlighted = idx === highlightIndex;
            return (
              <button
                key={`${s.name}-${idx}`}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => void handleSubmit(s.name)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  isHighlighted ? "bg-slate-100 text-slate-900" : "text-slate-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Location name..."
        autoFocus
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={suggestions.length > 0 ? listboxId : undefined}
        aria-autocomplete="list"
        className={`w-44 rounded-lg border bg-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 ${
          error
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-300"
            : "border-slate-200 focus:border-amber-300 focus:ring-amber-300"
        }`}
      />
      <button
        type="button"
        onClick={() => void handleSubmit(query)}
        disabled={submitting || !query.trim()}
        className="rounded-lg bg-amber-400 px-2.5 py-2 text-sm font-medium text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
      >
        {submitting ? "..." : "Add"}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={submitting}
        className="rounded-lg px-2 py-2 text-sm text-slate-400 transition hover:text-slate-600 disabled:opacity-40"
      >
        Cancel
      </button>

      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
