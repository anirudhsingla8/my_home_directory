import {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { CategoryOption } from "../api";

type CategoryPickerProps = {
  categories: CategoryOption[];
  selectedId: string;
  onChange: (id: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

type PanelPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "below" | "above";
};

const PANEL_GAP = 4;
const VIEWPORT_MARGIN = 8;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 480;
const MIN_OPEN_HEIGHT = 200;
const PREFERRED_HEIGHT = 360;

const computePosition = (rect: DOMRect): PanelPosition => {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const desiredWidth = Math.max(rect.width, MIN_PANEL_WIDTH);
  const width = Math.min(desiredWidth, MAX_PANEL_WIDTH, viewportW - VIEWPORT_MARGIN * 2);

  let left = rect.left;
  if (left + width > viewportW - VIEWPORT_MARGIN) {
    left = viewportW - VIEWPORT_MARGIN - width;
  }
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

  const spaceBelow = viewportH - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - PANEL_GAP - VIEWPORT_MARGIN;

  const placeBelow = spaceBelow >= MIN_OPEN_HEIGHT || spaceBelow >= spaceAbove;

  if (placeBelow) {
    return {
      left,
      top: rect.bottom + PANEL_GAP,
      width,
      maxHeight: Math.max(MIN_OPEN_HEIGHT, Math.min(PREFERRED_HEIGHT, spaceBelow)),
      placement: "below"
    };
  }

  return {
    left,
    top: Math.max(VIEWPORT_MARGIN, rect.top - PANEL_GAP - Math.min(PREFERRED_HEIGHT, spaceAbove)),
    width,
    maxHeight: Math.max(MIN_OPEN_HEIGHT, Math.min(PREFERRED_HEIGHT, spaceAbove)),
    placement: "above"
  };
};

const splitBreadcrumb = (label: string): string[] =>
  label.split(" / ").filter(Boolean);

export function CategoryPicker({
  categories,
  selectedId,
  onChange,
  loading = false,
  disabled = false
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const listboxId = useId();

  const selected = categories.find((c) => c.id === selectedId);

  const lowerSearch = search.toLowerCase();
  const filtered = useMemo(() => {
    if (!search) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.label.toLowerCase().includes(lowerSearch)
    );
  }, [categories, search, lowerSearch]);

  const leafIndices = useMemo(
    () => filtered.reduce<number[]>((acc, cat, idx) => {
      if (cat.isLeaf) acc.push(idx);
      return acc;
    }, []),
    [filtered]
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const visible =
      rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    if (!visible) {
      setOpen(false);
      return;
    }
    setPosition(computePosition(rect));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    const handleOrientation = () => setOpen(false);

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightIndex(-1);
      return;
    }
    if (leafIndices.length === 0) {
      setHighlightIndex(-1);
      return;
    }
    const selectedFilteredIdx = filtered.findIndex((c) => c.id === selectedId && c.isLeaf);
    setHighlightIndex(selectedFilteredIdx >= 0 ? selectedFilteredIdx : leafIndices[0]);
  }, [open, filtered, leafIndices, selectedId]);

  useEffect(() => {
    if (highlightIndex < 0) return;
    const cat = filtered[highlightIndex];
    if (!cat) return;
    const node = optionRefs.current.get(cat.id);
    node?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, filtered]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (cat: CategoryOption) => {
      if (!cat.isLeaf) return;
      onChange(cat.id);
      setOpen(false);
      setSearch("");
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (leafIndices.length === 0) return;
      const currentLeafPos = leafIndices.indexOf(highlightIndex);
      const nextPos =
        currentLeafPos === -1
          ? direction === 1
            ? 0
            : leafIndices.length - 1
          : (currentLeafPos + direction + leafIndices.length) % leafIndices.length;
      setHighlightIndex(leafIndices[nextPos]);
    },
    [highlightIndex, leafIndices]
  );

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        event.preventDefault();
        if (leafIndices.length > 0) setHighlightIndex(leafIndices[0]);
        break;
      case "End":
        event.preventDefault();
        if (leafIndices.length > 0) setHighlightIndex(leafIndices[leafIndices.length - 1]);
        break;
      case "Enter": {
        event.preventDefault();
        const cat = filtered[highlightIndex];
        if (cat?.isLeaf) handleSelect(cat);
        break;
      }
      case "Escape":
        event.preventDefault();
        closePanel();
        break;
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleClear = (event: ReactMouseEvent) => {
    event.stopPropagation();
    onChange("");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
        Loading categories...
      </div>
    );
  }

  if (disabled || categories.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-400">
        No categories available
      </div>
    );
  }

  const breadcrumb = selected ? splitBreadcrumb(selected.label) : null;
  const activeCat = highlightIndex >= 0 ? filtered[highlightIndex] : undefined;
  const activeOptionId = activeCat ? `${listboxId}-opt-${activeCat.id}` : undefined;

  const panel = open && position && (
    <div
      ref={panelRef}
      role="presentation"
      onKeyDown={handlePanelKeyDown}
      className="fixed z-[100] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight + 64
      }}
    >
      <div className="border-b border-slate-100 p-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Subcategory options"
        className="overflow-y-auto p-1.5"
        style={{ maxHeight: position.maxHeight }}
      >
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-slate-400">
            No categories match "{search}"
          </p>
        )}

        {filtered.map((cat, idx) => {
          const isSelected = cat.id === selectedId;

          if (!cat.isLeaf) {
            return (
              <div
                key={cat.id}
                className="mt-1.5 first:mt-0 px-2 pb-0.5 pt-2"
                style={{ paddingLeft: `${8 + cat.depth * 12}px` }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {cat.name}
                </span>
              </div>
            );
          }

          const isHighlighted = idx === highlightIndex;
          return (
            <button
              key={cat.id}
              ref={(el) => {
                if (el) optionRefs.current.set(cat.id, el);
                else optionRefs.current.delete(cat.id);
              }}
              id={`${listboxId}-opt-${cat.id}`}
              role="option"
              aria-selected={isSelected}
              type="button"
              onClick={() => handleSelect(cat)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                isSelected
                  ? "bg-amber-50 font-medium text-amber-900"
                  : isHighlighted
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700"
              }`}
              style={{ paddingLeft: `${8 + cat.depth * 12}px` }}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? "bg-amber-500" : "bg-slate-300"}`} />
              <span className="truncate">{cat.name}</span>
              {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2.5 text-left text-sm transition ${
          open
            ? "border-amber-300 bg-white ring-1 ring-amber-300"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {breadcrumb ? (
          <span className="flex min-w-0 flex-1 items-center gap-1 text-slate-900">
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex min-w-0 items-center gap-1">
                {i > 0 && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span
                  className={`truncate ${
                    i === breadcrumb.length - 1
                      ? "rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-900"
                      : "text-xs text-slate-500"
                  }`}
                >
                  {part}
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-slate-400">Select a subcategory...</span>
        )}

        <span className="flex shrink-0 items-center gap-1">
          {breadcrumb && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
              aria-label="Clear selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
